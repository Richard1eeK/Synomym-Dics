"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
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

type SavedEntry = {
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
  savedAt: number;
};

const STORAGE_KEY = "vocab-app:saved-words";
const STORAGE_EVENT = "vocab-app:saved-words-changed";

function parseList(raw: string | null): SavedEntry[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedEntry[];
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function subscribeToVocabulary(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function saveList(list: SavedEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export default function VocabularyPage() {
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const savedListSnapshot = useSyncExternalStore(
    subscribeToVocabulary,
    getSnapshot,
    getServerSnapshot
  );

  const list = useMemo(() => parseList(savedListSnapshot), [savedListSnapshot]);

  function handleDelete(word: string) {
    if (!confirm(`确定要从生词本删除 "${word}" 吗？`)) return;
    const next = list.filter((x) => x.word !== word);
    saveList(next);
  }

  function startReview() {
    if (list.length === 0) return;
    setReviewIndex(0);
    setRevealed(false);
  }

  function nextCard() {
    if (reviewIndex === null) return;
    if (reviewIndex + 1 >= list.length) {
      setReviewIndex(null);
    } else {
      setReviewIndex(reviewIndex + 1);
      setRevealed(false);
    }
  }

  function exitReview() {
    setReviewIndex(null);
    setRevealed(false);
  }

  const reviewCard = reviewIndex !== null ? list[reviewIndex] : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            ← 返回查词
          </Link>
          <h1 className="text-lg font-semibold">📒 我的生词本</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {reviewCard ? (
          <ReviewCard
            card={reviewCard}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onNext={nextCard}
            onExit={exitReview}
            index={reviewIndex!}
            total={list.length}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                共 <span className="font-semibold">{list.length}</span> 个生词
              </div>
              {list.length > 0 && (
                <button
                  onClick={startReview}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  🎯 开始复习
                </button>
              )}
            </div>

            {list.length === 0 ? (
              <div className="text-zinc-500 text-sm p-8 text-center border border-dashed rounded-lg border-zinc-300 dark:border-zinc-700">
                生词本还是空的。去
                <Link href="/" className="text-blue-600 hover:underline mx-1">
                  查词页
                </Link>
                查一个词并收藏吧。
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map((entry) => (
                  <li
                    key={entry.word}
                    className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-lg font-semibold">{entry.word}</span>
                          <span className="text-sm text-zinc-500">{entry.pronunciation}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                            {entry.partOfSpeech}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-zinc-700 dark:text-zinc-300">
                          {entry.definition}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.word)}
                        className="text-xs text-red-600 hover:underline shrink-0"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ReviewCard({
  card,
  revealed,
  onReveal,
  onNext,
  onExit,
  index,
  total,
}: {
  card: SavedEntry;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
  onExit: () => void;
  index: number;
  total: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 text-sm text-zinc-500">
        <span>
          复习中 {index + 1} / {total}
        </span>
        <button onClick={onExit} className="hover:underline">
          退出复习
        </button>
      </div>

      <div className="p-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-h-[320px] flex flex-col">
        <div className="text-center">
          <h2 className="text-4xl font-bold">{card.word}</h2>
          <div className="mt-2 text-zinc-500">{card.pronunciation}</div>
        </div>

        {revealed ? (
          <div className="mt-6 space-y-4 flex-1">
            <div>
              <span className="text-xs text-zinc-500">词性</span>
              <p className="text-sm mt-0.5">{card.partOfSpeech}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500">释义</span>
              <p className="text-sm mt-0.5 leading-relaxed">{card.definition}</p>
            </div>
            {card.examples?.[0] && (
              <div>
                <span className="text-xs text-zinc-500">例句</span>
                <p className="text-sm mt-0.5 italic text-zinc-700 dark:text-zinc-300">
                  “{card.examples[0].sentence}”
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            先在心里想一下这个词的意思…
          </div>
        )}

        <div className="mt-6 flex gap-2 justify-center">
          {!revealed ? (
            <button
              onClick={onReveal}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              翻面查看
            </button>
          ) : (
            <button
              onClick={onNext}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {index + 1 >= total ? "完成复习" : "下一个 →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
