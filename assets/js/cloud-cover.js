/* ==========================================================================
   AI先知局 · 个人作品集 — 封面图渲染
   --------------------------------------------------------------------------
   图片位的三级回退策略：
     1. 云端 cover_image 字段（可在数据库中随时改地址，无需改代码）
     2. 本地静态图 assets/img/projects/<slug>.jpg（按 slug 自动匹配）
     3. 都没有 → 回退到内联 SVG 图标（保持原有视觉，不留空框）

   图片加载失败（如文件不存在）时自动隐藏 img、显示 SVG 图标。
   所有路径均做转义，不信任任何外部输入。
   ========================================================================== */

/** 封面图的默认尺寸与压缩要求（与站点性能预算一致） */
const COVER_SPEC = {
  width: 1600,
  quality: 82,
  maxKB: 400,
  ratio: "16 / 10",
};

/**
 * 判断项目是否有可用封面图
 * @param {Object} p 项目对象
 * @param {string} basePath 相对路径前缀（详情页为 "../"，列表页为 ""）
 * @returns {string} 图片地址，无则空串
 */
function getCoverSrc(p, basePath) {
  if (!p) return "";

  // 1) 云端字段优先（允许填相对路径或完整 URL）
  if (p.coverImage) {
    var v = String(p.coverImage).trim();
    if (v) {
      if (/^https?:\/\//i.test(v)) return v;
      return (basePath || "") + v.replace(/^\.?\//, "");
    }
  }

  // 2) 本地静态图按 slug 自动匹配（.jpg / .png / .webp）
  if (p.slug) {
    return (basePath || "") + "assets/img/projects/" + p.slug + ".jpg";
  }

  return "";
}

/**
 * 生成封面图区域 HTML
 * @param {Object} p 项目对象
 * @param {string} basePath 相对路径前缀
 * @param {string} svgIcon 内联 SVG 图标（回退用）
 * @returns {string}
 */
function renderCover(p, basePath, svgIcon) {
  var src = getCoverSrc(p, basePath);
  var alt = (p && p.title ? p.title : "项目") + " 界面截图";
  var icon = svgIcon || "";

  if (!src) {
    return icon;
  }

  // img 用 onerror 隐藏，露出下层的 SVG 图标
  return (
    '<img class="cover-img" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) +
    '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' +
    icon
  );
}

/**
 * 项目详情页大图区域（独立结构，覆盖整块预览区）
 * @param {Object} p 项目对象
 * @param {string} basePath 相对路径前缀
 * @param {string} svgIcon 内联 SVG 图标
 * @returns {string}
 */
function renderDetailCover(p, basePath, svgIcon) {
  var src = getCoverSrc(p, basePath);
  var alt = (p && p.title ? p.title : "项目") + " 界面截图";
  var icon = svgIcon || "";

  if (!src) {
    return icon;
  }

  return (
    '<img class="cover-img cover-img--detail" src="' + escapeHtml(src) +
    '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async"' +
    ' onerror="this.style.display=\'none\'">' +
    icon
  );
}
