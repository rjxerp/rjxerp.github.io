/* ==========================================================================
   AI先知局 · 个人作品集 — 云数据层
   --------------------------------------------------------------------------
   所有数据访问经由 cloud.database（PostgREST / supabase-js 兼容接口）。
   规则：
     · 客户端绝不传 owner_id —— 由 DEFAULT auth.uid() 填充，RLS 校验属主
     · 写入后用 .select() 取回实际受影响的行，空数组代表被 RLS 拦截（不是成功）
     · 每次调用都检查 error，不静默失败
   ========================================================================== */

/* --------------------------------------------------------------------------
   作品数据（projects）
   表策略：公开读（SELECT USING true），属主可写
   -------------------------------------------------------------------------- */

/**
 * 读取全部作品
 * @returns {Promise<Array>} 作品数组；失败抛错
 */
async function fetchProjects() {
  const cloud = getCloud();
  const { data, error } = await cloud.database
    .from("projects")
    .select("slug,title,subtitle,category,badge,summary,repo_url,detail_url,cover_image,tech_stack,features,facts,sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data.map((row) => ({
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || "",
    category: row.category || "app",
    badge: row.badge || "作品",
    summary: row.summary || "",
    repoUrl: row.repo_url || "",
    detailUrl: row.detail_url || "",
    coverImage: row.cover_image || "",
    techStack: parseJsonArray(row.tech_stack),
    features: parseJsonArray(row.features),
    facts: parseJsonArray(row.facts),
  }));
}

/**
 * 按 slug 读取单个作品
 */
async function fetchProjectBySlug(slug) {
  const cloud = getCloud();
  const { data, error } = await cloud.database
    .from("projects")
    .select("slug,title,subtitle,category,badge,summary,repo_url,detail_url,tech_stack,features,facts,sort_order")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle || "",
    category: data.category || "app",
    badge: data.badge || "作品",
    summary: data.summary || "",
    repoUrl: data.repo_url || "",
    detailUrl: data.detail_url || "",
    techStack: parseJsonArray(data.tech_stack),
    features: parseJsonArray(data.features),
    facts: parseJsonArray(data.facts),
  };
}

/* --------------------------------------------------------------------------
   留言（messages）
   表策略：任何人可匿名插入；仅站主（site_config 记录的 uid）可读取
   -------------------------------------------------------------------------- */

/**
 * 提交留言
 *
 * 注意两个 PostgreSQL RLS 细节：
 *  1. owner_id 由 DEFAULT auth.uid() 填充，客户端不传
 *  2. 匿名访客执行 insert().select() 会被 RLS 拒绝——RETURNING 会触发
 *     SELECT 策略求值，而访客不满足任何 SELECT 策略。因此这里先 insert，
 *     再用独立 receipt（客户端生成的随机串）通过 RPC 精确回读自己那一行。
 *
 * @param {{name:string, contact:string, body:string}} payload
 * @returns {Promise<{id:number, created_at:string, receipt:string}>}
 */
async function submitMessage(payload) {
  const cloud = getCloud();

  // 随机回执：仅用于让提交者确认自己的那条记录，猜不到就无法读取
  const receipt =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);

  const { error } = await cloud.database
    .from("messages")
    .insert({
      visitor_name: String(payload.name || "").slice(0, 80),
      visitor_contact: String(payload.contact || "").slice(0, 120),
      body: String(payload.body || "").slice(0, 2000),
      receipt: receipt,
    });

  if (error) throw error;

  // 回读确认写入生效（写入被拦截时这里拿不到行）
  const { data: rows, error: readErr } = await cloud.database.rpc(
    "get_message_by_receipt",
    { p_receipt: receipt }
  );
  if (readErr) {
    // 回执读取失败不影响留言已入库的事实
    return { id: null, created_at: new Date().toISOString(), receipt };
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) {
    throw new Error("留言提交未生效，请稍后重试。");
  }
  return { id: row.id, created_at: row.created_at, receipt: receipt };
}

/**
 * 读取留言列表（仅站主可调用）
 * @returns {Promise<Array>}
 */
async function fetchMessages() {
  const cloud = getCloud();
  const { data, error } = await cloud.database
    .from("messages")
    .select("id,visitor_name,visitor_contact,body,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.visitor_name || "（未署名）",
    contact: row.visitor_contact || "",
    body: row.body || "",
    status: row.status || "new",
    createdAt: row.created_at,
  }));
}

/**
 * 更新留言状态（仅站主可调用）
 */
async function updateMessageStatus(id, status) {
  const cloud = getCloud();
  const { data, error } = await cloud.database
    .from("messages")
    .update({ status })
    .eq("id", id)
    .select();

  if (error) throw error;
  const affected = Array.isArray(data) ? data : [];
  if (affected.length === 0) {
    throw new Error("该留言不存在，或你没有权限修改。");
  }
  return affected[0];
}

/**
 * 删除留言（仅站主可调用）
 */
async function deleteMessage(id) {
  const cloud = getCloud();
  const { data, error } = await cloud.database
    .from("messages")
    .delete()
    .eq("id", id)
    .select();

  if (error) throw error;
  const removed = Array.isArray(data) ? data : [];
  if (removed.length === 0) {
    throw new Error("该留言不存在，或你没有权限删除。");
  }
  return removed[0];
}

/* --------------------------------------------------------------------------
   站主身份
   -------------------------------------------------------------------------- */

/**
 * 判断当前登录用户是否为站主
 * 通过 site_config 表自身的 RLS 策略判定：只有站主能读到那一行
 */
async function checkOwnerStatus() {
  const cloud = getCloud();
  const { data, error } = await cloud.database
    .from("site_config")
    .select("id")
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

/**
 * 首次认领站主身份（仅在 site_config 为空时可写入）
 */
async function claimOwner() {
  const cloud = getCloud();
  const { data: session, error: sessErr } = await cloud.auth.getSession();
  if (sessErr || !session) throw new Error("请先登录后再认领站主身份。");

  const { data, error } = await cloud.database
    .from("site_config")
    .insert({ owner_uid: session.user.id })
    .select("id");

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("认领失败：站主身份可能已被占用。");
  return row;
}
