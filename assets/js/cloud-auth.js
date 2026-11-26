/* ==========================================================================
   AI先知局 · 个人作品集 — 认证模块（WorkBuddy 账号登录）
   --------------------------------------------------------------------------
   Web 端 OAuth 流程：
     登录按钮 → signInWithOAuth({provider:'workbuddy', redirectTo}) → 返回 URL
     → 页面启动时 handleWorkBuddyCallback() 兑换会话
   约束：
     · redirectTo 必须是站点根路径（静态站点无 history fallback，子路径会 404）
     · 必须同一标签页跳转（PKCE 校验器存在 sessionStorage）
     · 回调必须在任何路由守卫之前处理，且成功后清理 code/state/provider
     · 保留应用自身的查询参数（sharecode 等），只删这三个 OAuth 参数
   ========================================================================== */

/** 是否处于 OAuth 回调中 */
function isOAuthCallback() {
  const url = new URL(location.href);
  return url.searchParams.has("code") || url.searchParams.has("error");
}

/**
 * 启动时恢复会话 / 处理 OAuth 回调
 * @returns {Promise<{session:Object|null, error:Object|null}>}
 */
async function restoreAuth() {
  const cloud = getCloud();

  // 普通访问：不调用任何 OAuth 处理器，仅恢复既有会话
  if (!isOAuthCallback()) {
    const { data, error } = await cloud.auth.getSession();
    return { session: data || null, error: error || null };
  }

  const url = new URL(location.href);
  const provider = url.searchParams.get("provider");

  if (provider !== "workbuddy") {
    return {
      session: null,
      error: { message: "授权回调缺少有效的登录方式，请重新登录。" },
    };
  }

  if (typeof cloud.auth.handleWorkBuddyCallback !== "function") {
    return {
      session: null,
      error: { message: "当前 SDK 版本不支持此登录方式，请刷新页面重试。" },
    };
  }

  const { data: session, error } = await cloud.auth.handleWorkBuddyCallback();

  if (error) {
    return { session: null, error };
  }

  if (session) {
    // 只清理 OAuth 参数，保留应用自身的查询参数
    for (const key of ["code", "state", "provider"]) {
      url.searchParams.delete(key);
    }
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    return { session, error: null };
  }

  // 空结果：既不是成功也不是失败，按普通访问继续
  const { data: existing } = await cloud.auth.getSession();
  return { session: existing || null, error: null };
}

/**
 * 发起 WorkBuddy 账号登录（同一标签页跳转）
 */
async function signInWithWorkBuddy() {
  const cloud = getCloud();

  const back = new URL(location.href);
  back.pathname = "/";
  // 转发业务参数，但剔除可能与 OAuth 冲突的键
  for (const key of ["code", "state", "provider"]) {
    back.searchParams.delete(key);
  }

  const { data, error } = await cloud.auth.signInWithOAuth({
    provider: "workbuddy",
    redirectTo: back.toString(),
  });

  if (error) throw error;
  if (!data || !data.url) throw new Error("未能获取登录地址，请重试。");

  // 必须同标签页跳转，不能用 window.open / target=_blank
  location.assign(data.url);
}

/** 退出登录 */
async function signOut() {
  const cloud = getCloud();
  const { error } = await cloud.auth.signOut();
  if (error) throw error;
}

/** 获取当前会话（不存在则返回 null） */
async function getCurrentSession() {
  const cloud = getCloud();
  const { data, error } = await cloud.auth.getSession();
  if (error) throw error;
  return data || null;
}

/** 用户显示名（provider 未返回时用首字母兜底） */
function displayNameOf(session) {
  if (!session || !session.user) return "";
  const name = session.user.name;
  if (name && String(name).trim()) return String(name).trim();
  const id = session.user.id;
  if (id) return String(id).slice(0, 2).toUpperCase();
  return "已登录";
}
