# AI先知局 · 个人作品集

个人开发与设计作品展示站点。静态站点 + WorkBuddy 云服务后端，零构建步骤。

## 线上地址

| 通道 | 地址 | 云服务 |
|---|---|---|
| **WorkBuddy 托管** | https://ai-xianzhiju-portfolio.app.workbuddy.host/?sharecode=3C6NVU5V2C | ✅ 全功能（Origin 与云端一致） |
| GitHub Pages（永久） | https://rjxerp.github.io/ | ⚠️ 云功能不可用（Origin 不匹配，自动降级为静态内容） |

> **重要**：云服务（云端作品库、留言入库、AI 顾问）依赖 Origin 精确匹配，
> **仅在 WorkBuddy 托管域名下可用**。GitHub Pages 上会显示「云服务未连接」
> 并回退到静态内置数据 —— 这是设计好的降级行为，不是故障。

## 页面结构

| 路径 | 说明 | 云端能力 |
|---|---|---|
| `index.html` | 首页：定位 + 精选作品 + 能力 + AI 摘要 | 精选作品读云端；AI 自动概括技术方向 |
| `works.html` | 作品列表：7 个项目 + 分类筛选 + AI 顾问 | 数据读云端；筛选按云端分类重建；AI 问答 |
| `projects/<slug>.html` | 项目详情：概览、功能、技术栈、源码 | 按 slug 从云端同步概览/事实表/技术栈 |
| `about.html` | 关于我：简介、能力条、经历时间线 | — |
| `contact.html` | 联系方式 + 留言表单 + 站主工作台 | 留言入库；站主登录后看收件箱 |
| `404.html` | 404 引导页 | — |

## 云服务架构

```
浏览器
  └─ WorkBuddyCloud SDK（CDN 形式，纯 HTML 项目无需构建）
       ├─ cloud.database   → projects（公开读）/ messages（匿名写、站主读）
       ├─ cloud.auth       → WorkBuddy 账号登录（站主身份）
       ├─ cloud.llm        → 免密钥大模型（AI 顾问 / AI 摘要）
       └─ cloud.storage    → 作品截图上传（需登录）
```

### 数据表

| 表 | 用途 | 访问权限 |
|---|---|---|
| `projects` | 作品数据（技术栈、功能项、事实表均为 JSON 字段） | 公开读；属主可写 |
| `messages` | 访客留言 + 提交回执 `receipt` | 匿名可插入；仅站主可读/改/删 |
| `site_config` | 站主 uid（单行，uid 作主键防抢占） | 仅站主可读；首次可认领 |

### RLS 策略要点

- 客户端**绝不传** `owner_id`，由 `DEFAULT auth.uid()` 填充，RLS 校验属主
- 匿名访客**没有** `messages` 的 SELECT 权限 → 访客之间互相看不到留言
- 站主读收件箱靠 `site_config` 子查询判定身份
- 提交回执：客户端生成随机 `receipt`，通过 `get_message_by_receipt()` RPC 精确回读自己那一行

## 封面图

公开作品封面图用**本地静态图**（云存储签名 URL 最长 1 小时即过期，不适合公开展示）。

```bash
cd G:/MyWeb/tools
node prepare_cover.js --slug menmianchuzu "D:/截图/租赁合同管理.png"
```

图片落到 `site/assets/img/projects/<slug>.jpg`，页面按 slug 自动认领；
缺图时自动回退 SVG 图标，不会出现破图。

- **操作手册**：[COVER-STEPS.md](./COVER-STEPS.md)（照着做即可）
- **原理说明**：[COVER-GUIDE.md](./COVER-GUIDE.md)

## 项目详情页

| slug | 项目 | 源码 |
|---|---|---|
| `menmianchuzu` | 租赁合同管理系统 | github.com/rjxerp/menmianchuzu |
| `files-to-md` | 文档格式转换工具 | github.com/rjxerp/files_To_MD |
| `sdcbsf` | 水电费抄收管理系统 | github.com/rjxerp/sdcbsf |
| `htdqtx` | 合同到期提醒工具 | github.com/rjxerp/htdqtx |
| `zhangdanguanli` | 账单管理系统 | github.com/rjxerp/zhangdanguanli |
| `qi-xia` | 七虾技能包 v3.2.6 | github.com/rjxerp/qi-xia |
| `wuxia-skill` | 五虾协作体系 v6.0 | github.com/rjxerp/wuxia-skill |

内容全部取自各仓库真实 README 与目录结构，无虚构项目。

## 技术约定

- **SDK 形态**：纯静态 HTML 无构建步骤 → 按规范用 CDN `<script>` 形式，
  初始化只创建**一个**客户端实例，四个模块共用
- **脚本顺序**：内联脚本必须包在 `DOMContentLoaded` 里 ——
  内联 `defer` 脚本不参与外部 defer 队列，否则会在 `cloud.js` 之前执行导致 `ReferenceError`
- **渐进增强**：云端不可达时保留静态内容并明确告知，不静默失败
- **设计令牌**：全部集中在 `assets/css/design-system.css` 的 `:root` 八变量
- **响应式**：断点 920px（导航切换 + 栅格 3→2 列）、760px（栅格 2→1 列）
- **动效三保险**：`no-js` 兜底 + 3 秒强制显示 + `prefers-reduced-motion` 降级

## 本地预览

```bash
cd site && python -m http.server 8899 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:8899/
```

本地 localhost 的 Origin 与云端不一致，云功能会提示「云服务未连接」并回退静态内容，
这是预期行为。完整云功能验证请访问 WorkBuddy 托管域名。

## 重新部署

### WorkBuddy（保留云服务域名，必须用同一 applicationId）

```bash
# 通过平台发布，传入 appId=wbapp_p0SZqV0huW17P0EkSwzk2j
```

### GitHub Pages

```bash
cd site && git add -A && git commit -m "update site"
git push origin main
```

## 验证工具

`G:/MyWeb/tools/` 下自建：

| 脚本 | 用途 |
|---|---|
| `verify_all.py` | 多页全量结构校验（内链死链、重复 id、label 关联等） |
| `verify_cloud.js` | 云服务关键路径实测（SDK/数据库/LLM/写入/RLS 隔离） |
| `verify_ai_ui.js` | AI 顾问 UI 真实点击测试 |
| `verify_form_ui.js` | 留言表单真实提交测试 |
| `measure_overflow_cdp.js` | CDP 精确视口（375px）横向溢出实测 |
| `check_mobile_ui.js` | 移动端汉堡菜单/字号/点击目标断言 |
| `check_responsive.js` | 多断点栅格与导航行为断言 |
| `build_projects.py` | 7 个详情页由数据批量生成 |

## 版权

模板基于 [Dopefolio](https://github.com/rammcodes/Dopefolio)（GPL-3.0）改造，页脚保留署名。
站点内容版权与事实真实性归作者所有。
