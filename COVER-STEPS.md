# 作品封面图放置操作手册

> 面向实际操作，按顺序照做即可。全程约 10 分钟。
> 配套工具已就绪、ffmpeg 已安装，无需额外配置。

---

## 速览

```
你的截图  →  压缩工具改名归档  →  自动显示在页面上
（任意名）    （指定 slug）      （文件名对得上就认领）
```

**核心规则：图片放进去后，文件名必须等于项目 slug，页面才会自动认领。**
文件名不对 = 页面继续显示图标，不会报错，但也看不到图。

---

## 第 0 步：记住这 7 个文件名

页面靠文件名自动匹配图片。**只有这 7 个名字有效**：

| 文件名 | 对应项目 | 项目类别 |
|---|---|---|
| `menmianchuzu.jpg` | 租赁合同管理系统 | 应用软件 |
| `files-to-md.jpg` | 文档格式转换工具 | 应用软件 |
| `sdcbsf.jpg` | 水电费抄收管理系统 | 应用软件 |
| `htdqtx.jpg` | 合同到期提醒工具 | 应用软件 |
| `zhangdanguanli.jpg` | 账单管理系统 | 应用软件 |
| `qi-xia.jpg` | 七虾技能包 v3.2.6 | AI 技能包 |
| `wuxia-skill.jpg` | 五虾协作体系 v6.0 | AI 技能包 |

注意区分：

- `files-to-md` 用**连字符**，不是下划线
- `wuxia-skill` 用**连字符**
- 只放几张完全没问题——放哪张换哪张，其余继续显示图标

---

## 第 1 步：把截图存到任意临时文件夹

建个临时文件夹，比如 `D:\截图\`，把图片丢进去。

- **原始文件名随便叫**，第 2 步会自动改名
- 建议每个项目挑一张最有代表性的界面图（首页或核心功能页）
- 支持 PNG / JPG / WebP / GIF，工具会自动转成 JPG

---

## 第 2 步：跑压缩命令

### 打开 Git Bash

开始菜单搜索 **Git Bash** 打开（不是 PowerShell、不是 CMD）。

### 进入工具目录

```bash
cd /g/MyWeb/tools
```

### 每个项目执行一条命令

把引号里的路径换成你的实际路径：

```bash
node prepare_cover.js --slug menmianchuzu "D:/截图/租赁合同管理.png"
node prepare_cover.js --slug files-to-md "D:/截图/文档转换.png"
node prepare_cover.js --slug sdcbsf "D:/截图/抄收系统.png"
node prepare_cover.js --slug htdqtx "D:/截图/合同提醒.png"
node prepare_cover.js --slug zhangdanguanli "D:/截图/账单管理.png"
node prepare_cover.js --slug qi-xia "D:/截图/七虾.png"
node prepare_cover.js --slug wuxia-skill "D:/截图/五虾.png"
```

### 输出示例

```
  ✓ menmianchuzu.jpg  1920×1200 → 1600px  46KB  (已缩放)
```

看到 `✓` 表示这张处理成功。

### 常见输出说明

| 输出 | 含义 | 要不要处理 |
|---|---|---|
| `✓ xxx.jpg 1920×1200 → 1600px 46KB` | 正常 | 不用管 |
| `✓ xxx.jpg 800×600 → 800px 3KB` | 原图就小，不缩放 | 不用管 |
| `⚠ xxx.jpg ... 520KB (超过 400KB)` | 偏大 | 建议换张更小的截图 |
| `✗ 文件不存在: ...` | 路径写错了 | 改路径重跑 |
| `✗ 无法读取图片信息` | 不是图片文件 | 确认文件类型 |

### 批量处理（同一项目多张图）

```bash
node prepare_cover.js --slug sdcbsf "D:/截图/1.png" "D:/截图/2.png" "D:/截图/3.png"
```

### 不指定 slug（用文件名自动生成）

```bash
node prepare_cover.js "D:/截图/租赁合同管理.png"
```

此时文件名会被转成小写、非法字符换成 `-`，**但很可能和上表对不上**，所以还是建议显式写 `--slug`。

---

## 第 3 步：确认文件到位

```bash
ls -la /g/MyWeb/site/assets/img/projects/
```

期望看到：

```
menmianchuzu.jpg
files-to-md.jpg
qi-xia.jpg
```

文件应该都在 `G:\MyWeb\site\assets\img\projects\` 目录下。

---

## 第 4 步：本地先看一眼（推荐）

```bash
cd /g/MyWeb/site && python -m http.server 8899 --bind 127.0.0.1
```

浏览器打开：

- <http://127.0.0.1:8899/works.html> ← 作品列表，看卡片顶部图
- <http://127.0.0.1:8899/projects/menmianchuzu.html> ← 详情页，看大图区

> ⚠️ **本地会看到 9 张静态卡片而不是云端的 7 张**——因为本地地址的 Origin 与云端不一致，
> 作品数据回退到了静态版本。**但图片显示效果是真实的**，可以放心检查构图和清晰度。

看完按 `Ctrl+C` 停止服务。

---

## 第 5 步：发布上线

### 方式 A — GitHub Pages（永久地址 rjxerp.github.io）

```bash
cd /tmp && rm -rf ghpX && mkdir ghpX && cd ghpX
cp -r /g/MyWeb/site/. .
git init -q && git checkout -q -b main
git config user.name "lymin_li"
git config user.email "1988271@qq.com"
git add -A
git commit -q -m "add cover images"
export GH_TOKEN=$(gh auth token)
git remote add target https://github.com/rjxerp/rjxerp.github.io.git
git -c http.sslBackend=openssl push target main:main --force
```

> `gh auth token` 若提示未登录，先执行 `gh auth login`。

### 方式 B — WorkBuddy 托管（带 AI 顾问 + 留言入库）

用平台发布工具，参数必须是：

| 参数 | 值 |
|---|---|
| `directory` | `G:\MyWeb\site` |
| `appId` | `wbapp_p0SZqV0huW17P0EkSwzk2j` |

⚠️ **appId 必须复用**。换新的会导致域名变化，而云服务强制 Origin 精确匹配，
域名一变，AI 顾问、留言入库、站主工作台全部失效。

---

## 第 6 步：线上验收

打开 **https://ai-xianzhiju-portfolio.app.workbuddy.host/?sharecode=3C6NVU5V2C**

检查三处：

1. **作品列表页** → 卡片顶部是否出现你的截图
2. **项目详情页** → "界面与流程预览"区域是否显示大图
3. **状态条** → 应显示「已连接云端作品库 · 7 个项目」

---

## 排错手册

### 图放了但不显示

按顺序排查：

| # | 检查 | 怎么做 |
|---|---|---|
| 1 | 文件名对不对 | `ls /g/MyWeb/site/assets/img/projects/` 看名字，必须在上表 7 个里 |
| 2 | 目录对不对 | 必须在 `site/assets/img/projects/`，不是 `site/assets/img/` |
| 3 | 发布了吗 | 本地改了没发布，线上看不到 |
| 4 | 连字符不是下划线 | `files-to-md` ≠ `files_to_md` |
| 5 | 大小写 | 全部小写，`Menmianchuzu.jpg` 无效 |

### 图片变形 / 有白边

编辑 `site/assets/css/design-system.css`，找到 `.cover-img` 规则：

```css
object-position: center center;   /* 默认：居中裁切 */
```

改成：

```css
object-position: top center;      /* 贴顶显示，不裁底部 */
```

改完重新发布。

### 想撤掉某张图

删掉对应的 jpg 文件 → 重新发布 → 页面自动回退到图标。

### 换图不改代码（免重新部署）

数据库 `projects` 表的 `cover_image` 字段，改完刷新页面即生效：

```sql
UPDATE projects SET cover_image = 'assets/img/projects/qi-xia.jpg' WHERE slug = 'qi-xia';
```

> 注意：填**本地路径**时，文件本身仍需在 `site/assets/img/projects/` 下。
> 只有填**完整 URL** 才真正免部署。

---

## 尺寸与体积要求

| 项目 | 要求 | 原因 |
|---|---|---|
| 宽度 | ≤ 1600px | 超出无意义，徒增体积 |
| 比例 | 16:9 或 16:10 | 与图片位比例一致，少裁切 |
| 格式 | JPG（工具自动转换） | 兼容性最好 |
| 单张体积 | ≤ 400KB | 单图超 400KB 会拖慢首屏 |
| 全站总量 | ≤ 2MB | 站点性能预算 |

`prepare_cover.js` 已自动处理宽度、格式、质量三项；超限时给出黄色警告。

---

## 为什么不建议用云存储做公开封面

`assets/js/cloud-storage.js` 已实现上传逻辑（限制 PNG/JPG/WebP/GIF、≤5MB）：

```js
const { path, signedUrl } = await uploadProjectScreenshot(file, "menmianchuzu");
```

但**签名 URL 最长 3600 秒（1 小时）就会过期**，撑不住公开展示页的长期访问。

适合场景：站主工作台里预览原图、给访客临时生成下载链接。
**公开封面图请用本地静态图。**

---

## 相关文件速查

| 文件 | 作用 |
|---|---|
| `tools/prepare_cover.js` | 压缩 + 改名 + 归档工具 |
| `site/assets/img/projects/` | 图片存放目录 |
| `site/assets/js/cloud-cover.js` | 渲染逻辑（有图用图、没图回退） |
| `site/COVER-GUIDE.md` | 原理与架构说明 |
| `site/assets/css/design-system.css` | `.cover-img` 样式规则 |

---

## 一句话总结

**截图存到任意文件夹 → 跑 `node prepare_cover.js --slug <名字> "路径"` → 发布 → 完事。**

文件名对上就生效，对不上就继续显示图标（不会报错、不会破图）。
