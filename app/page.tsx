"use client";

import { useState } from "react";
import Link from "next/link";

type SynonymItem = { word: string; nuance: string; example: string };
type CollocationItem = { phrase: string; meaning: string };
type ExampleItem = { sentence: string; context: string };
type IeltsAdvice = {
  suitability: string;
  bandImpression: string;
  topics: string[];
  sampleSentence: string;
  cautions: string;
};

type SingleLookupResult = {
  type?: "single";
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  register: string;
  synonymCompare: SynonymItem[];
  collocations: CollocationItem[];
  usageTips: string;
  examples: ExampleItem[];
  ieltsAdvice?: IeltsAdvice;
};

type ComparisonItem = {
  word: string;
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

type ComparisonResult = {
  type: "comparison";
  words: string[];
  overview: string;
  quickestRule: string;
  recommended: {
    word: string;
    reason: string;
  };
  items: ComparisonItem[];
  distinctions: {
    axis: string;
    explanation: string;
    choose: string;
  }[];
  ieltsAdvice: {
    taskUse: string;
    sampleSentence: string;
    cautions: string;
  };
};

type LookupResult = SingleLookupResult | ComparisonResult;
type SavedEntry = SingleLookupResult & { savedAt: number };

const STORAGE_KEY = "vocab-app:saved-words";

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

function saveToVocabulary(entry: SingleLookupResult) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const list: SavedEntry[] = raw ? JSON.parse(raw) : [];
  const existingIndex = list.findIndex((x) => x.word === entry.word);
  const newEntry: SavedEntry = { ...entry, savedAt: Date.now() };
  if (existingIndex >= 0) {
    list[existingIndex] = newEntry;
  } else {
    list.unshift(newEntry);
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function Home() {
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [saved, setSaved] = useState(false);
  const inputTermCount = parseInputTerms(word).length;
  const comparisonMode = inputTermCount > 1;

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const target = word.trim();
    if (!target) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "查询失败");
      }
      setResult(data as LookupResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!result || result.type === "comparison") return;
    saveToVocabulary(result);
    setSaved(true);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">📚 Vocab Lab</h1>
          <Link
            href="/vocabulary"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            我的生词本 →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2 mb-8">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="输入一个词，或 2-3 个近义词：important, significant, crucial"
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !word.trim()}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (comparisonMode ? "对比中…" : "查询中…") : comparisonMode ? "对比" : "查询"}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="text-zinc-500 text-sm">AI 正在分析，请稍候…</div>
        )}

        {result && <ResultCard result={result} saved={saved} onSave={handleSave} />}

        {!result && !loading && !error && (
          <div className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            <p className="mb-2">💡 这个 App 会帮你：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>输入 2-3 个近义词时，先帮你做横向对比</li>
              <li>看到目标词最常见的搭配</li>
              <li>在不同语境下的地道例句</li>
              <li>实用的使用建议</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function ResultCard({
  result,
  saved,
  onSave,
}: {
  result: LookupResult;
  saved: boolean;
  onSave: () => void;
}) {
  if (result.type === "comparison") {
    return <ComparisonCard result={result} />;
  }

  return <SingleResultCard result={result} saved={saved} onSave={onSave} />;
}

function SingleResultCard({
  result,
  saved,
  onSave,
}: {
  result: SingleLookupResult;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <article className="space-y-6">
      <section className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-3xl font-bold">{result.word}</h2>
              <span className="text-zinc-500">{result.pronunciation}</span>
              <span className="text-sm px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                {result.partOfSpeech}
              </span>
              {result.register && (
                <span className="text-sm px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                  {result.register}
                </span>
              )}
            </div>
            <p className="mt-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {result.definition}
            </p>
          </div>
          <button
            onClick={onSave}
            disabled={saved}
            className="shrink-0 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {saved ? "已收藏 ✓" : "⭐ 加入生词本"}
          </button>
        </div>
      </section>

      <Section title="🔀 同义词对比">
        <div className="space-y-3">
          {result.synonymCompare?.map((item) => (
            <div
              key={item.word}
              className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="font-semibold text-blue-700 dark:text-blue-400">
                {item.word}
              </div>
              <p className="text-sm mt-1 text-zinc-700 dark:text-zinc-300">
                {item.nuance}
              </p>
              <p className="text-sm mt-2 italic text-zinc-600 dark:text-zinc-400">
                “{item.example}”
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="🔗 常见搭配">
        <div className="grid sm:grid-cols-2 gap-2">
          {result.collocations?.map((item) => (
            <div
              key={item.phrase}
              className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="font-medium">{item.phrase}</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                {item.meaning}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="✍️ 使用建议">
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 leading-relaxed text-zinc-700 dark:text-zinc-300">
          {result.usageTips}
        </div>
      </Section>

      {result.ieltsAdvice && (
        <Section title="🎯 雅思 8.0+ 写作建议">
          <div className="p-5 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-900 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                适用任务
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {result.ieltsAdvice.suitability}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                Band 印象
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {result.ieltsAdvice.bandImpression}
              </p>
            </div>

            {result.ieltsAdvice.topics?.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                  适配话题
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.ieltsAdvice.topics.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                Band 8.5 范例句
              </div>
              <p className="text-sm italic leading-relaxed text-zinc-800 dark:text-zinc-100 border-l-2 border-indigo-400 pl-3">
                “{result.ieltsAdvice.sampleSentence}”
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
                ⚠️ 考场注意
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {result.ieltsAdvice.cautions}
              </p>
            </div>
          </div>
        </Section>
      )}

      <Section title="📝 语境例句">
        <div className="space-y-3">
          {result.examples?.map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="text-xs text-zinc-500 mb-1">{item.context}</div>
              <p className="text-zinc-800 dark:text-zinc-200">“{item.sentence}”</p>
            </div>
          ))}
        </div>
      </Section>
    </article>
  );
}

function ComparisonCard({ result }: { result: ComparisonResult }) {
  return (
    <article className="space-y-6">
      <section className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2 mb-3">
          {result.words?.map((word) => (
            <span
              key={word}
              className="text-sm px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900"
            >
              {word}
            </span>
          ))}
        </div>
        <h2 className="text-2xl font-bold">近义词对比</h2>
        <p className="mt-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {result.overview}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              最快选择规则
            </div>
            <p className="text-sm leading-relaxed">{result.quickestRule}</p>
          </div>

          {result.recommended && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
                优先掌握
              </div>
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">{result.recommended.word}</span>
                {"："}
                {result.recommended.reason}
              </p>
            </div>
          )}
        </div>
      </section>

      <Section title="逐词差异">
        <div className="space-y-3">
          {result.items?.map((item) => (
            <div
              key={item.word}
              className="p-5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xl font-semibold text-blue-700 dark:text-blue-400">
                    {item.word}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[item.register, item.strength].filter(Boolean).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoBlock label="核心意思" value={item.coreMeaning} />
                <InfoBlock label="最适合" value={item.bestFor} />
                <InfoBlock label="细微差别" value={item.nuance} />
                <InfoBlock label="雅思用法" value={item.ieltsUse} />
              </div>

              {item.collocations?.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    常见搭配
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.collocations.map((phrase) => (
                      <span
                        key={phrase}
                        className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 text-sm italic leading-relaxed text-zinc-700 dark:text-zinc-300 border-l-2 border-blue-300 dark:border-blue-700 pl-3">
                “{item.example}”
              </p>
              <p className="mt-3 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {item.caution}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="选择维度">
        <div className="grid gap-3">
          {result.distinctions?.map((item) => (
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
      </Section>

      {result.ieltsAdvice && (
        <Section title="雅思写作建议">
          <div className="p-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-4">
            <InfoBlock label="任务选择" value={result.ieltsAdvice.taskUse} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                Band 8.5 范例句
              </div>
              <p className="text-sm italic leading-relaxed text-zinc-800 dark:text-zinc-100 border-l-2 border-indigo-400 pl-3">
                “{result.ieltsAdvice.sampleSentence}”
              </p>
            </div>
            <InfoBlock label="考场注意" value={result.ieltsAdvice.cautions} />
          </div>
        </Section>
      )}
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}
