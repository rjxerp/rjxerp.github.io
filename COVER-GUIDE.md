# 封面图替换指南

站点的"图片位"分两处，都支持三种来源，优先级从高到低：

| 优先级 | 来源 | 适合场景 | 需要重新部署？ |
|---|---|---|---|
| 1 | 云端 `projects.cover_image` 字段 | 想随时换图、不想改代码 | ❌ 不用 |
| 2 | 本地 `assets/img/projects/<slug>.jpg` | 公开作品截图（**推荐**） | ✅ 要 |
| 3 | 内联 SVG 图标（回退） | 暂时没有图 | — |

图片加载失败（文件不存在 / 路径写错）时会**自动回退到 SVG 图标**，不会留下破图或空白框。

---

## 方式一：本地静态图（推荐，公开作品集用这个）

### 第 1 步：准备图片

从各项目的 GitHub 仓库里下载 README 或说明文档中的界面截图，保存到本地任意目录。

### 第 2 步：压缩并放到正确位置

用自带的压缩工具（自动缩到 1600px 以内、JPEG 质量 82）：

```bash
cd G:/MyWeb/tools
node prepare_cover.js --slug menmianchuzu "D:/截图/租赁合同管理.png"
node prepare_cover.js --slug qi-xia "D:/截图/七虾.png"
node prepare_cover.js --slug files-to-md "D:/截图/转换工具.png"
```

也可以一次处理多张：

```bash
node prepare_cover.js --slug htdqtx "D:/截图/a.png" "D:/截图/b.png"
```

> 不指定 `--slug` 时，用图片文件名作为 slug（自动转小写、非法字符转 `-`）。

输出位置：`G:/MyWeb/site/assets/img/projects/<slug>.jpg`

### 第 3 步：文件名必须等于 slug

图片文件名要和数据库里的 `projects.slug` 完全一致，页面才会自动匹配：

| slug | 对应项目 |
|---|---|
| `menmianchuzu` | 租赁合同管理系统 |
| `files-to-md` | 文档格式转换工具 |
| `sdcbsf` | 水电费抄收管理系统 |
| `htdqtx` | 合同到期提醒工具 |
| `zhangdanguanli` | 账单管理系统 |
| `qi-xia` | 七虾技能包 v3.2.6 |
| `wuxia-skill` | 五虾协作体系 v6.0 |

### 第 4 步：发布

```bash
# 方式 A：GitHub Pages
cd G:/MyWeb/site && git add -A && git commit -m "add cover images"
git push origin main

# 方式 B：WorkBuddy（带云功能，用这个工具发布，appId 复用）
#   workbuddy_sites_deploy，directory=G:\MyWeb\site，appId=wbapp_p0SZqV0huW17P0EkSwzk2j
```

---

## 方式二：云端字段（不用重新部署）

`projects` 表新增了 `cover_image` 字段，填入图片地址即可，改完刷新页面就生效。

### 用法

在云端数据库执行 SQL（把地址换成你的）：

```sql
UPDATE projects
SET cover_image = 'assets/img/projects/menmianchuzu.jpg'
WHERE slug = 'menmianchuzu';
```

也可以填完整 URL（会优先于本地路径）：

```sql
UPDATE projects
SET cover_image = 'https://example.com/shot.png'
WHERE slug = 'qi-xia';
```

> 注意：`cover_image` 指向的本地路径，其实际文件仍需在 `site/assets/img/projects/` 下；
> 只有填完整 URL 时才真正免部署。

---

## 方式三：云存储（仅登录用户可见，不适合公开展示）

`assets/js/cloud-storage.js` 已实现上传逻辑：

```js
const { path, signedUrl } = await uploadProjectScreenshot(file, "menmianchuzu");
```

- 上传到 `shared/<你的uid>/projects/<slug>/` 目录
- 限制：PNG / JPG / WebP / GIF，单张 ≤ 5MB
- **签名 URL 最长 3600 秒（1 小时）就会过期**

⚠️ 因为签名 URL 会过期，**不适合用作公开作品封面的长期地址**。适合场景：站主工作台里预览原图、给访客临时生成下载链接。

---

## 尺寸与体积要求

| 项目 | 要求 | 原因 |
|---|---|---|
| 宽度 | ≤ 1600px | 超出无意义，徒增体积 |
| 比例 | 16:9 或 16:10 | 与图片位比例一致，少裁切 |
| 格式 | JPG（工具自动转换） | 兼容性最好 |
| 单张体积 | ≤ 400KB | 单图超 400KB 会拖慢首屏 |
| 全站总量 | ≤ 2MB | 站点性能预算 |

`prepare_cover.js` 已自动处理前两项；超限时工具会给出黄色警告。

---

## 图片位在哪

| 页面 | 位置 | 选择器 |
|---|---|---|
| 作品列表 / 首页 | 卡片顶部大图（16:10） | `.work-card__figure` |
| 项目详情页 | 预览区大图（16:9） | `.detail-figure__inner` |

两处共用 `assets/js/cloud-cover.js` 的 `renderCover()` 渲染逻辑，
遵循"有图用图、没图回退图标"的策略。

---

## 常见问题

**图片放进去但不显示？**
1. 确认文件名 = slug（大小写、下划线、连字符都要一致）
2. 确认文件在 `site/assets/img/projects/` 而不是别处
3. 确认发布了（本地改了没发布，线上看不到）
4. 浏览器 F12 → Network → 过滤 Img，看是否 404

**图片变形 / 有白边？**
工具默认用 `object-fit: cover` 裁切填满。若你的图比例特殊，
可把 `design-system.css` 中 `.cover-img` 的 `object-position` 改成 `top center`
（贴顶显示，不裁底部）或 `center center`（居中，默认）。

**想给不同项目配不同图片但不想一个个放文件？**
用方式二的 `cover_image` 字段，每条记录一个地址。
