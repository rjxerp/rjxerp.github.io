/* ==========================================================================
   AI先知局 · 个人作品集 — 文件存储（Storage）
   --------------------------------------------------------------------------
   · 存储仅对已登录用户开放：任何操作前先取会话，无会话则提示登录
   · 路径必须用 SDK 的 userPath / sharedPath 生成，绝不接受完整 object key
   · 下载使用签名 URL（默认 600 秒，最长 3600 秒），属短期凭据，不落日志
   · 上传须限制类型与大小，不信任客户端文件名
   ========================================================================== */

/** 允许上传的图片类型 */
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
/** 单文件大小上限（5MB） */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * 校验待上传文件
 * @returns {string} 错误信息，空串表示通过
 */
function validateUploadFile(file) {
  if (!file) return "请选择要上传的图片。";
  if (ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
    return "仅支持 PNG / JPG / WebP / GIF 格式的图片。";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "图片大小不能超过 5MB。";
  }
  return "";
}

/**
 * 上传项目截图到站主的共享目录
 * @param {File} file
 * @param {string} slug 作品标识，用作目录名
 * @returns {Promise<{path:string, signedUrl:string}>}
 */
async function uploadProjectScreenshot(file, slug) {
  const cloud = getCloud();

  const { data: session, error: sessErr } = await cloud.auth.getSession();
  if (sessErr || !session) {
    throw new Error("请先登录后再上传图片。");
  }

  const check = validateUploadFile(file);
  if (check) throw new Error(check);

  // 目录名只允许安全字符
  const safeSlug = String(slug || "misc")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "misc";

  const ext = (file.name.match(/\.(png|jpe?g|webp|gif)$/i) || [".png"])[0].toLowerCase();
  const filename = "shot-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext;

  const sharedPath = cloud.storage.sharedPath(
    session.user.id,
    "projects/" + safeSlug + "/" + filename
  );

  const uploaded = await cloud.storage.upload(sharedPath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploaded.error) throw uploaded.error;

  const signed = await cloud.storage.createSignedUrl(sharedPath, 3600);
  if (signed.error) throw signed.error;

  return { path: sharedPath, signedUrl: signed.data.url };
}

/**
 * 列出站主共享目录下的文件
 * @param {string} prefix 目录前缀
 */
async function listStoredFiles(prefix) {
  const cloud = getCloud();

  const { data: session, error: sessErr } = await cloud.auth.getSession();
  if (sessErr || !session) throw new Error("请先登录后再查看文件。");

  const res = await cloud.storage.list(prefix || "shared", {
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });
  if (res.error) throw res.error;

  const list = (res.data && (res.data.files || res.data.items || res.data)) || [];
  return Array.isArray(list) ? list : [];
}

/**
 * 为已存储的文件生成临时访问链接
 */
async function getSignedUrl(path, ttl) {
  const cloud = getCloud();
  const signed = await cloud.storage.createSignedUrl(path, ttl || 600);
  if (signed.error) throw signed.error;
  return signed.data.url;
}
