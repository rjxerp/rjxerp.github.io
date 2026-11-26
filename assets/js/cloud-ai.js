/* ==========================================================================
   AI先知局 · 个人作品集 — AI 作品顾问（LLM API）
   --------------------------------------------------------------------------
   · 免密钥调用，用户无需自备 API Key
   · 仅支持流式（stream: true），非流式会被 SDK 拒绝
   · 每条会话必须以 system 消息开头
   · 模型从 cloud.llm.models.list() 动态获取，绝不硬编码
   · 模型输出不可信，渲染前统一转义
   ========================================================================== */

/** 模型目录缓存 */
let _modelCache = null;

/**
 * 获取可用模型列表（取第一个未禁用的）
 * @returns {Promise<{id:string,name:string}|null>}
 */
async function getLLMModel() {
  if (_modelCache) return _modelCache;

  const cloud = getCloud();
  const models = await cloud.llm.models.list();

  if (!Array.isArray(models) || models.length === 0) {
    return null; // 空列表是合法结果，交由调用方展示空状态
  }

  const model = models.find((m) => m.disabled !== true && m.enabled !== false);
  if (!model) return null;

  _modelCache = { id: model.id, name: model.name || model.id };
  return _modelCache;
}

/**
 * 把作品列表压缩成模型可读的上下文
 */
function buildProjectsContext(projects) {
  if (!projects || !projects.length) return "（当前云端暂无作品数据）";
  return projects
    .map((p) => {
      const tools = (p.techStack || []).slice(0, 6).join("、");
      const feats = (p.features || []).slice(0, 4).join("；");
      return [
        `【${p.title}】${p.subtitle || ""}`,
        `类别：${p.badge || p.category}`,
        `简介：${p.summary || ""}`,
        tools ? `技术栈：${tools}` : "",
        feats ? `主要能力：${feats}` : "",
        p.repoUrl ? `源码：${p.repoUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

/**
 * 把模型返回的轻量 Markdown 转成安全 HTML
 * 只支持 **加粗** 与段落换行，其余一律按纯文本转义
 * 模型输出不可信 —— 所有文本先转义再插入，绝不执行
 */
function renderAiText(text) {
  var escaped = escapeHtml(text || "");
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

/**
 * 向 AI 提问并流式返回答案
 * @param {string} question 用户问题
 * @param {Array} projects 作品数据（作为上下文）
 * @param {(text:string)=>void} onChunk 增量回调
 * @param {AbortSignal} [signal] 中止信号
 * @returns {Promise<{content:string, finishReason:string|null, tokens:number}>}
 */
async function askAssistant(question, projects, onChunk, signal) {
  const model = await getLLMModel();
  if (!model) {
    throw new Error("当前没有可用的 AI 模型，请稍后再试。");
  }

  const cloud = getCloud();

  const systemPrompt = [
    "你是「AI先知局」的作品集 AI 顾问。",
    "你只能依据下面提供的作品信息回答问题，不要编造作品、版本号、技术栈或联系方式。",
    "如果问题超出这些作品的范围，直接说明没有相关作品，并简要介绍站主的业务方向。",
    "回答用简体中文，简洁具体，不超过 200 字。",
    "",
    "作品资料：",
    buildProjectsContext(projects),
  ].join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: String(question || "").slice(0, 500) },
  ];

  let content = "";
  let finishReason = null;
  let tokens = 0;

  for await (const chunk of cloud.llm.chat.completions.create({
    model: model.id,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  })) {
    const choice = chunk.choices[0];
    const delta = choice && choice.delta;

    // 只累加内容，reasoning_content 是思考过程，不计入回答
    if (delta && delta.content) {
      content += delta.content;
      if (onChunk) onChunk(delta.content);
    }
    if (choice && choice.finish_reason) {
      finishReason = choice.finish_reason;
    }
    if (chunk.usage && chunk.usage.total_tokens) {
      tokens = chunk.usage.total_tokens;
    }
  }

  return { content, finishReason, tokens, model: model.name };
}

/**
 * 生成作品摘要（一次性任务，仍走流式收集完整文本）
 * @param {Array} projects
 * @returns {Promise<string>}
 */
async function summarizePortfolio(projects) {
  const model = await getLLMModel();
  if (!model) throw new Error("当前没有可用的 AI 模型，请稍后再试。");

  const cloud = getCloud();

  const messages = [
    {
      role: "system",
      content:
        "你是作品集编辑。根据给定的作品资料，用三句话概括这位开发者的技术方向与擅长领域，不要编造任何信息。",
    },
    {
      role: "user",
      content: buildProjectsContext(projects),
    },
  ];

  let answer = "";
  for await (const chunk of cloud.llm.chat.completions.create({
    model: model.id,
    messages,
    stream: true,
  })) {
    const delta = chunk.choices[0] && chunk.choices[0].delta;
    if (delta && delta.content) answer += delta.content;
  }
  return answer.trim();
}
