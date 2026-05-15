"use client";

import { useState } from "react";
import Link from "next/link";

type SynonymEntry = {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  coreMeaning: string;
  nuance: string;
  register: string;
  strength: string;
  bestFor: string;
  collocations: string[];
  ieltsUse: string;
  caution: string;
  example: string;
};

type UnifiedComparisonResult = {
  words: string[];
  userInput: string[];
  overview: string;
  quickestRule: string;
  recommended: { word: string; reason: string } | null;
  synonyms: SynonymEntry[];
  distinctions: { axis: string; explanation: string; choose: string }[];
  ieltsAdvice: {
    taskUse: string;
    sampleSentence: string;
    cautions: string;
  } | null;
};

function parseInputTerms(input: string) {
  return Array.from(
    new Set(
      input
        .trim()
        .split(/[\s,，、;；/|]+/)
        .map((term) => term.trim())
        .filter(Boolean)
    )
  );
}

function isUserInput(word: string, userInput: string[]) {
  return userInput.some(
    (u) => u.toLowerCase() === word.toLowerCase()
  );
}

async function saveToVocabulary(entry: SynonymEntry) {
  await fetch("/api/vocabulary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: entry.word,
      pronunciation: entry.pronunciation,
      partOfSpeech: entry.partOfSpeech,
      definition: entry.coreMeaning,
      register: entry.register,
      synonymCompare: [],
      collocations: entry.collocations.map((c) => ({ phrase: c, meaning: "" })),
      usageTips: `${entry.nuance} ${entry.caution}`,
      examples: [{ sentence: entry.example, context: "雅思写作" }],
      savedAt: Date.now(),
    }),
  });
}

const DIMENSIONS = [
  { key: "coreMeaning", label: "核心意思" },
  { key: "nuance", label: "细微差别" },
  { key: "register", label: "语域" },
  { key: "strength", label: "语气强度" },
  { key: "bestFor", label: "最适合" },
  { key: "collocations", label: "常见搭配" },
  { key: "ieltsUse", label: "雅思用法" },
  { key: "caution", label: "易错点" },
  { key: "example", label: "例句" },
] as const;

export default function Home() {
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedComparisonResult | null>(null);
  const [streamingText, setStreamingText] = useState("");

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const target = word.trim();
    if (!target) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setStreamingText("");

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: target }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "查询失败");
      }

      // Read streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("浏览器不支持流式读取");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(fullText);
      }

      // Flush remaining
      fullText += decoder.decode();
      setStreamingText(fullText);

      const parsed = JSON.parse(fullText) as UnifiedComparisonResult;
      setResult(parsed);
      setStreamingText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">📚 Vocab Lab</h1>
          <Link
            href="/vocabulary"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            我的生词本 →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2 mb-8">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="输入 1-3 个词，AI 自动帮你补充更多近义词：important, significant, crucial"
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !word.trim()}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "对比中…" : "对比"}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <StreamingPreview text={streamingText} />
        )}

        {result && <ComparisonTable result={result} />}

        {!result && !loading && !error && (
          <div className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            <p className="mb-2">💡 这个 App 会帮你：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>输入 1-3 个近义词，AI 自动发现并补充更多相关词</li>
              <li>以表格形式横向对比所有词的多维度差异</li>
              <li>看到每个词的常见搭配和地道例句</li>
              <li>获取雅思 8.0+ 写作的实用选词建议</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function StreamingPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  // Try to extract partial info from the streaming JSON
  const partialWords = extractPartialStringArray(text, "words");
  const partialOverview = extractPartialString(text, "overview");

  return (
    <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
        </span>
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          AI 正在生成分析...
        </span>
        {text && (
          <span className="text-xs text-zinc-500 ml-auto">
            {text.length} 字符
          </span>
        )}
      </div>

      {/* Partial results preview */}
      {partialWords.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {partialWords.map((w) => (
            <span
              key={w}
              className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900"
            >
              {w}
            </span>
          ))}
          {partialWords.length === 0 && (
            <span className="text-xs text-zinc-500">正在发现近义词...</span>
          )}
        </div>
      )}

      {partialOverview && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
          {partialOverview}
        </p>
      )}

      {/* Expandable raw stream */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
      >
        {expanded ? "收起原始输出" : "查看原始输出"}
      </button>
      {expanded && text && (
        <pre className="mt-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </div>
  );
}

function extractPartialStringArray(text: string, key: string): string[] {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  const inner = match[1];
  const items = inner.match(/"([^"]+)"/g);
  return items ? items.map((s) => s.replace(/"/g, "")) : [];
}

function extractPartialString(text: string, key: string): string {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`));
  return match ? match[1] : "";
}

function ComparisonTable({ result }: { result: UnifiedComparisonResult }) {
  const { synonyms, userInput, overview, quickestRule, recommended, distinctions, ieltsAdvice } =
    result;
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(entry: SynonymEntry) {
    try {
      await saveToVocabulary(entry);
      setSavedWords((prev) => new Set(prev).add(entry.word));
    } catch {
      setSaveError(`收藏 "${entry.word}" 失败`);
    }
  }

  return (
    <article className="space-y-8">
      {/* Overview section */}
      <section className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2 mb-3">
          {synonyms.map((s) => (
            <span
              key={s.word}
              className={`text-sm px-2.5 py-1 rounded-full border ${
                isUserInput(s.word, userInput)
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {s.word}
              {isUserInput(s.word, userInput) && (
                <span className="ml-1 text-xs opacity-70">(你输入的)</span>
              )}
            </span>
          ))}
        </div>
        <h2 className="text-2xl font-bold">近义词对比</h2>
        <p className="mt-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">{overview}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              最快选择规则
            </div>
            <p className="text-sm leading-relaxed">{quickestRule}</p>
          </div>

          {recommended && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
                优先掌握
              </div>
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">{recommended.word}</span>
                {"："}
                {recommended.reason}
              </p>
            </div>
          )}
        </div>
      </section>

      {saveError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
          {saveError}
        </div>
      )}

      {/* Desktop: table view */}
      <section className="hidden md:block">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          多维度对比矩阵
        </h3>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900">
                <th className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-left font-semibold text-zinc-500 min-w-[100px]">
                  维度
                </th>
                {synonyms.map((s) => (
                  <th
                    key={s.word}
                    className="px-4 py-3 text-left font-semibold min-w-[220px] max-w-[280px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{s.word}</span>
                      {isUserInput(s.word, userInput) && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                          你输入的
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-normal text-zinc-500 mt-0.5">
                      {s.pronunciation} · {s.partOfSpeech}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((dim, rowIdx) => (
                <tr
                  key={dim.key}
                  className={rowIdx % 2 === 0 ? "bg-white dark:bg-zinc-950" : "bg-zinc-50/50 dark:bg-zinc-900/50"}
                >
                  <td className="sticky left-0 z-10 px-4 py-3 font-medium text-zinc-500 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800/50">
                    {dim.label}
                  </td>
                  {synonyms.map((s) => (
                    <td key={s.word} className="px-4 py-3 align-top leading-relaxed text-zinc-700 dark:text-zinc-300">
                      <CellContent entry={s} dimension={dim.key} />
                    </td>
                  ))}
                </tr>
              ))}
              {/* Save row */}
              <tr>
                <td className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800" />
                {synonyms.map((s) => (
                  <td
                    key={s.word}
                    className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <button
                      onClick={() => handleSave(s)}
                      disabled={savedWords.has(s.word)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savedWords.has(s.word) ? "已收藏 ✓" : "⭐ 收藏"}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Mobile: card view */}
      <section className="md:hidden space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          逐词详情
        </h3>
        {synonyms.map((s) => (
          <div
            key={s.word}
            className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold">{s.word}</h4>
                  {isUserInput(s.word, userInput) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                      你输入的
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {s.pronunciation} · {s.partOfSpeech}
                </div>
              </div>
              <button
                onClick={() => handleSave(s)}
                disabled={savedWords.has(s.word)}
                className="shrink-0 px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {savedWords.has(s.word) ? "已收藏 ✓" : "⭐ 收藏"}
              </button>
            </div>

            <div className="space-y-3">
              {DIMENSIONS.map((dim) => (
                <div key={dim.key}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">
                    {dim.label}
                  </div>
                  <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <CellContent entry={s} dimension={dim.key} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Distinctions */}
      {distinctions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            选择维度
          </h3>
          <div className="grid gap-3">
            {distinctions.map((item) => (
              <div
                key={item.axis}
                className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                <div className="font-semibold">{item.axis}</div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {item.explanation}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-blue-700 dark:text-blue-300">
                  {item.choose}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* IELTS Advice */}
      {ieltsAdvice && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            🎯 雅思写作建议
          </h3>
          <div className="p-5 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-900 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                任务选择
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {ieltsAdvice.taskUse}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                Band 8.5 范例句
              </div>
              <p className="text-sm italic leading-relaxed text-zinc-800 dark:text-zinc-100 border-l-2 border-indigo-400 pl-3">
                "{ieltsAdvice.sampleSentence}"
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
                ⚠️ 考场注意
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {ieltsAdvice.cautions}
              </p>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

function CellContent({
  entry,
  dimension,
}: {
  entry: SynonymEntry;
  dimension: (typeof DIMENSIONS)[number]["key"];
}) {
  const value = entry[dimension];

  if (dimension === "collocations" && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((c, i) => (
          <span
            key={i}
            className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            {c}
          </span>
        ))}
      </div>
    );
  }

  if (dimension === "example") {
    return <span className="italic">"{value}"</span>;
  }

  return <>{value}</>;
}
