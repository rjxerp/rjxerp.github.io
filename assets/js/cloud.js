/* ==========================================================================
   AI先知局 · 个人作品集 — 云服务客户端（WorkBuddy Cloud Service）
   --------------------------------------------------------------------------
   初始化方式：CDN <script> 形式（本站为纯静态 HTML，无构建步骤、无 npm）
   客户端实例全局唯一：Auth / Database / Storage / LLM 共用同一实例。

   publicConfig 全部来自 workbuddy_cloud_service 激活后返回的公开配置，
   不含任何服务端密钥；publishableKey 仅标识应用，权限由服务端 Origin 校验。
   ========================================================================== */

/* ---------- 公开配置（由 workbuddy_cloud_service 返回） ---------- */
const CLOUD_PUBLIC_CONFIG = {
  endpoint: "https://ai-xianzhiju-portfolio.app.workbuddy.host",
  oauthRelayBaseUrl: "https://www.workbuddy.cn/v2/as/genie-baas/oauth",
  publishableKey: "wbpk_p0SZqV0huW17P0EkSwzk2j_6s8QJ964XLoFi19MN43XQyFFeCbRz6mY",
};

/* ---------- 客户端单例 ---------- */
let _cloud = null;
let _cloudInitError = null;

/**
 * 获取云客户端（懒初始化，失败时抛出可读错误）
 */
function getCloud() {
  if (_cloud) return _cloud;
  if (_cloudInitError) throw _cloudInitError;

  if (typeof WorkBuddyCloud === "undefined" || !WorkBuddyCloud.createWorkBuddyCloud) {
    _cloudInitError = new Error("云服务 SDK 未加载");
    throw _cloudInitError;
  }

  // endpoint 与 publishableKey 均为必填，不可省略 endpoint 依赖同源兜底
  _cloud = WorkBuddyCloud.createWorkBuddyCloud({
    endpoint: CLOUD_PUBLIC_CONFIG.endpoint,
    oauthRelayBaseUrl: CLOUD_PUBLIC_CONFIG.oauthRelayBaseUrl,
    publishableKey: CLOUD_PUBLIC_CONFIG.publishableKey,
  });

  return _cloud;
}

/** 云服务是否可用（SDK 已加载且初始化成功） */
function isCloudReady() {
  try {
    getCloud();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 统一的错误信息转换：面向用户的中文提示 + 诊断码
 * 不把原始行数据、token、邮箱等敏感内容透出到界面
 */
function cloudErrorMessage(err, fallback) {
  if (!err) return fallback || "操作失败，请稍后重试。";
  const code = err.code || err.error && err.error.code || "";
  const msg = err.message || (err.error && err.error.message) || "";

  if (code === "42501") return "没有权限执行该操作，请检查登录状态。";
  if (code === "42P01") return "数据表不存在，请联系站点管理员。";
  if (code === "23505") return "该记录已存在，请勿重复提交。";
  if (code === "auth_unauthenticated" || code === "invalid_grant") {
    return "登录状态已失效，请重新登录。";
  }
  if (code === "quota_rate_limited" || String(code).indexOf("quota_") === 0) {
    return "服务额度暂时受限，请稍后重试。";
  }
  if (code && String(code).indexOf("network") !== -1) {
    return "网络连接异常，请检查网络后重试。";
  }
  if (code && String(code).indexOf("backend") !== -1) {
    return "云服务暂时不可用，请稍后重试。";
  }
  return msg || fallback || "操作失败，请稍后重试。";
}

/* ---------- 工具函数 ---------- */

/** 解析数据库中的 JSON 文本字段，失败返回空数组 */
function parseJsonArray(text) {
  if (!text) return [];
  try {
    const v = typeof text === "string" ? JSON.parse(text) : text;
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

/** 转义 HTML，防止云端内容注入页面 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 格式化时间戳为本地可读字符串 */
function formatDateTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" + pad(d.getMonth() + 1) +
      "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) +
      ":" + pad(d.getMinutes())
    );
  } catch (e) {
    return "";
  }
}
