import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SINGLE_WORD_PROMPT = `你是一位资深雅思写作高分导师，精通雅思（IELTS）官方评分标准，特别擅长指导目标分数 8.0 及以上的考生在写作中精准使用高级词汇。你的所有建议都围绕"如何在雅思考场上，用这个词拿到 Band 8+ 的词汇分"这一核心目标。

用户会给你一个英文单词，你需要返回一个 JSON 对象，结构如下：

{
  "type": "single",
  "word": "原词（小写）",
  "pronunciation": "美式音标，例如 /ɪˈluːsɪdeɪt/",
  "partOfSpeech": "词性，用英文缩写，例如 v. / n. / adj.",
  "definition": "简洁准确的中文释义（1-2句）",
  "register": "语域标签，例如 正式 / 中性 / 口语 / 学术 / 文学",
  "synonymCompare": [
    {
      "word": "同义词1",
      "nuance": "用中文说明它与目标词的细微差别（什么时候用、强调什么、感情色彩）",
      "example": "一句地道的英文例句"
    }
  ],
  "collocations": [
    { "phrase": "常见搭配短语", "meaning": "中文解释" }
  ],
  "usageTips": "中文写的使用建议，说明常见误用、适用语境、写作中如何恰当使用（2-4句）",
  "examples": [
    { "sentence": "地道英文例句", "context": "该例句所属的语境（中文），例如：学术论文/商务邮件/日常对话/新闻报道" }
  ],
  "ieltsAdvice": {
    "suitability": "用中文说明在雅思哪个写作任务中更合适：'Task 2 议论文'、'Task 1 图表描述'、'两个 Task 都适用' 或 '不建议在雅思写作中使用（说明原因）'。要具体说明在该任务的哪个部分（开头/主体段/结论/举例/让步论证等）用最自然",
    "bandImpression": "用中文说明这个词在考官眼里的 Band 印象（针对目标 8.0+ 考生），例如：'Band 8+ 考生的标配精准词，用对能体现 lexical resource 的准确性与自然度' 或 'Band 9 级的精准词，但误用会立刻暴露非母语痕迹，比单纯用 Band 7 的同义词更危险'。明确告诉考生：这是'安全高分词'还是'高风险冒险词'",
    "topics": ["这个词在雅思真题中最常出现的话题领域，用中文，例如：教育、科技、环境、城市化、健康、媒体、政府、犯罪、全球化、就业、文化"],
    "sampleSentence": "一句 Band 8.5 水准的雅思 Task 2 议论文范例句：要求语法多样（复合句或带 that/which 从句、分词结构、倒装等任选其一）、逻辑严密、用词精准、可直接套用到考场写作",
    "cautions": "中文写的考场使用警示（2-3句），针对 8.0+ 考生：是否存在容易被模板化滥用的风险、常见搭配错误、是否有更自然稳妥的替代、哪类题目中用会显得刻意或偏题、以及考官可能如何看待这个选择"
  }
}

要求：
- synonymCompare 给 3 个最值得对比的同义词（优先给考生容易混淆、或雅思范文里频繁出现的同义词）
- collocations 给 4-6 个高频搭配（优先给在雅思作文中真正会用上的搭配，而不是文学或罕见搭配）
- examples 给 3 个不同语境的例句，其中至少 1 句要明显是雅思议论文语体
- topics 给 2-4 个该词最契合的雅思高频话题
- 必须严格返回合法 JSON，不要有任何额外的 markdown 代码块包裹或解释文字
- 所有中文说明要简洁、具体、可执行，避免空话套话
- 雅思建议部分要务实诚恳：如果这个词在考场上是"纸面华丽但实战鸡肋"的词，要直接告诉考生，并推荐更稳妥的替代方向`;

const COMPARISON_PROMPT = `你是一位资深雅思写作高分导师，精通雅思（IELTS）官方评分标准，特别擅长帮目标分数 8.0 及以上的考生区分近义词、半近义词和容易误替换的词。

用户会给你 2-3 个英文词。你要优先做"对比"，不要把它们拆成孤立的词条。即使这些词不是严格近义词，也要明确指出它们的关系和不能互换的地方，不要硬凑。

你必须严格返回合法 JSON，结构如下：

{
  "type": "comparison",
  "words": ["按用户输入顺序列出词，全部小写"],
  "overview": "用中文一句话说明这些词的关系和最大区别",
  "quickestRule": "用中文给一个最短选择规则，例如：写政策影响用 X，写个人感受用 Y",
  "recommended": {
    "word": "最推荐雅思写作优先掌握的词",
    "reason": "中文说明为什么它最稳、最高频或最能体现精准度"
  },
  "items": [
    {
      "word": "词",
      "coreMeaning": "中文说明核心意思",
      "nuance": "中文说明与其他输入词的细微差别",
      "register": "语域标签，例如 正式 / 中性 / 口语 / 学术 / 文学",
      "strength": "语气强度或抽象程度，例如 温和 / 强烈 / 抽象 / 具体",
      "bestFor": "最适合使用的场景或话题",
      "collocations": ["3-5 个雅思写作中自然的英文搭配"],
      "ieltsUse": "中文说明在 Task 1 或 Task 2 哪类句子里最自然",
      "caution": "中文说明最常见误用或不适合替换的情况",
      "example": "一句地道英文例句，优先雅思议论文语体"
    }
  ],
  "distinctions": [
    {
      "axis": "一个对比维度，例如 语气强度 / 适用对象 / 抽象程度 / 褒贬色彩",
      "explanation": "中文说明这些词在该维度上的差别",
      "choose": "中文给出选择建议"
    }
  ],
  "ieltsAdvice": {
    "taskUse": "中文说明在雅思写作中如何选择这些词，具体到 Task 1/Task 2 和段落功能",
    "sampleSentence": "一句 Band 8.5 水准的英文范例句，尽量自然地使用其中一个或多个词",
    "cautions": "中文写 2-3 句考场警示：哪些替换会显得不自然、哪些词更安全、哪些词风险更高"
  }
}

要求：
- items 必须覆盖用户输入的每一个词，顺序与用户输入一致
- distinctions 给 3-5 个最能帮助考生做选择的维度
- collocations 必须是英文短语数组，不要加中文解释
- 所有中文说明要简洁、具体、可执行，避免空话套话
- 不要有任何额外的 markdown 代码块包裹或解释文字`;

function parseTerms(input: string) {
  const terms = input
    .trim()
    .split(/[\s,，、;；/|]+/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(terms));
}

function isValidEnglishTerm(term: string) {
  return /^[a-z][a-z'-]*$/.test(term);
}

async function requestDeepSeek({
  apiKey,
  systemPrompt,
  userPrompt,
}: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API 错误：${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek 未返回有效内容");
  }

  return JSON.parse(content);
}

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word || typeof word !== "string") {
      return NextResponse.json(
        { error: "请提供要查询的单词" },
        { status: 400 }
      );
    }

    const terms = parseTerms(word);
    if (terms.length === 0) {
      return NextResponse.json(
        { error: "请提供要查询的单词" },
        { status: 400 }
      );
    }

    if (terms.length > 3) {
      return NextResponse.json(
        { error: "一次最多对比 3 个词，这样差异会更清楚。" },
        { status: 400 }
      );
    }

    if (terms.some((term) => !isValidEnglishTerm(term))) {
      return NextResponse.json(
        { error: "请只输入英文词汇，并用空格、逗号、斜杠或换行分隔。" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务器未配置 DEEPSEEK_API_KEY" },
        { status: 500 }
      );
    }

    if (terms.length === 1) {
      const parsed = await requestDeepSeek({
        apiKey,
        systemPrompt: SINGLE_WORD_PROMPT,
        userPrompt: `请分析单词：${terms[0]}`,
      });

      return NextResponse.json({
        ...parsed,
        type: "single",
        word: parsed.word ?? terms[0],
      });
    }

    const parsed = await requestDeepSeek({
      apiKey,
      systemPrompt: COMPARISON_PROMPT,
      userPrompt: `请对比这些词：${terms.join(", ")}`,
    });

    return NextResponse.json({
      ...parsed,
      type: "comparison",
      words: parsed.words ?? terms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
