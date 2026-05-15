import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `你是一位资深雅思写作高分导师，精通雅思（IELTS）官方评分标准，特别擅长帮目标分数 8.0 及以上的考生精准区分和使用近义词。

用户会给你 1-3 个英文词。你要做的是：
1. 以用户输入的词为起点，主动发现并补充 3-5 个最值得对比的近义词
2. 对所有词（用户输入的 + 你补充的）做统一维度的对比
3. 在 JSON 中标记哪些是用户输入的词（userInput），哪些是你补充的

你必须严格返回合法 JSON，结构如下：

{
  "words": ["所有被对比的词，全部小写，用户输入的排前面"],
  "userInput": ["用户实际输入的词，全部小写"],
  "overview": "用中文一句话概括这组近义词的关系和最核心的区别",
  "quickestRule": "用中文给一个最短选择规则，帮考生在考场上快速决策",
  "recommended": {
    "word": "最推荐雅思写作优先掌握的词",
    "reason": "中文说明为什么它最稳、最高频或最能体现精准度"
  },
  "synonyms": [
    {
      "word": "词（小写）",
      "pronunciation": "美式音标，例如 /ɪmˈpɔːrtnt/",
      "partOfSpeech": "词性缩写，例如 v. / n. / adj. / adv.",
      "coreMeaning": "中文：核心意思（1句）",
      "nuance": "中文：与这组词中其他词的细微差别——强调什么、感情色彩、什么时候用",
      "register": "语域标签：正式 / 中性 / 口语 / 学术 / 文学",
      "strength": "语气强度或抽象程度：温和 / 中强 / 强烈 / 极强 / 抽象 / 具体",
      "bestFor": "中文：最适合的使用场景或话题",
      "collocations": ["2-3 个雅思写作中最核心的英文搭配"],
      "ieltsUse": "中文：在 Task 1 或 Task 2 的哪类句子里最自然",
      "caution": "中文：最常见误用或不适合替换的情况",
      "example": "一句地道英文例句，优先雅思议论文语体"
    }
  ],
  "distinctions": [
    {
      "axis": "对比维度名称，例如：语气强度 / 正式程度 / 适用对象 / 抽象vs具体 / 褒贬色彩 / 使用频率",
      "explanation": "中文说明这些词在该维度上的排列和差别",
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
- synonyms 数组**必须覆盖所有词**（用户输入的 + 你补充的），顺序与 words 数组一致
- 用户输入的词在 synonyms 中同样需要完整的对比数据
- 补充 3-5 个近义词即可，挑最值得对比的
- distinctions 给 3-5 个最能帮助考生做选择的维度
- collocations 必须是英文短语数组，不要加中文解释
- 所有中文说明要简洁、具体、可执行，避免空话套话
- 必须严格返回合法 JSON，不要有任何额外的 markdown 代码块包裹或解释文字`;

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
        { error: "一次最多对比 3 个词，AI 会自动帮你补充更多近义词。" },
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

    const userPrompt =
      terms.length === 1
        ? `请分析单词 "${terms[0]}"，并主动找出它的主要近义词一起做深度对比。`
        : `请对比这些词：${terms.join(", ")}，并主动补充更多相关近义词一起做深度对比。`;

    const parsed = await requestDeepSeek({
      apiKey,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
    });

    return NextResponse.json({
      words: parsed.words ?? terms,
      userInput: parsed.userInput ?? terms,
      overview: parsed.overview ?? "",
      quickestRule: parsed.quickestRule ?? "",
      recommended: parsed.recommended ?? null,
      synonyms: parsed.synonyms ?? [],
      distinctions: parsed.distinctions ?? [],
      ieltsAdvice: parsed.ieltsAdvice ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
