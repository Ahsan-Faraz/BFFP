"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { readStorage, useStoredString, writeStorage } from "@/lib/storage";

// Questions are plain strings in the MDX file. `backticks` render as code and
// **double asterisks** as bold; a blank line starts a new paragraph.
export type Question = { q: string; a: string; kind: "concept" | "scenario" };

export function Quiz({ id, questions }: { id: string; questions: Question[] }) {
  const storageKey = `quiz:${id}`;
  const raw = useStoredString(storageKey);
  const revealed = useMemo(() => new Set<number>(parseIndexes(raw)), [raw]);
  const [mode, setMode] = useState<"list" | "cards">("list");
  const [card, setCard] = useState(0);

  const setRevealed = (i: number, on: boolean) => {
    // read fresh from storage, not from the render closure, so rapid clicks don't drop updates
    const next = new Set(parseIndexes(readStorage(storageKey)));
    if (on) next.add(i);
    else next.delete(i);
    writeStorage(storageKey, JSON.stringify([...next]));
  };

  return (
    <div className="quiz">
      <div className="quiz-bar">
        <span className="quiz-progress">
          {revealed.size}/{questions.length} answers revealed
        </span>
        <div className="quiz-toggle" role="group" aria-label="Quiz mode">
          <button type="button" aria-pressed={mode === "list"} onClick={() => setMode("list")}>
            All questions
          </button>
          <button type="button" aria-pressed={mode === "cards"} onClick={() => setMode("cards")}>
            Flashcards
          </button>
        </div>
        <button type="button" className="quiz-reset" onClick={() => writeStorage(storageKey, null)}>
          Reset
        </button>
      </div>

      {mode === "list" ? (
        <ol className="quiz-list">
          {questions.map((question, i) => (
            <li key={i}>
              <QuizCard
                n={i + 1}
                question={question}
                open={revealed.has(i)}
                onToggle={(on) => setRevealed(i, on)}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="flashcards">
          <QuizCard
            key={card}
            n={card + 1}
            question={questions[card]}
            open={revealed.has(card)}
            onToggle={(on) => setRevealed(card, on)}
          />
          <div className="flashcard-nav">
            <button type="button" onClick={() => setCard((c) => Math.max(0, c - 1))} disabled={card === 0}>
              ← Previous
            </button>
            <span>
              Card {card + 1} of {questions.length}
            </span>
            <button
              type="button"
              className="primary"
              onClick={() => setCard((c) => Math.min(questions.length - 1, c + 1))}
              disabled={card === questions.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizCard({
  n,
  question,
  open,
  onToggle,
}: {
  n: number;
  question: Question;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  return (
    <div className={`quiz-card ${open ? "is-open" : ""}`}>
      <div className="quiz-q">
        <span className={`quiz-kind quiz-kind-${question.kind}`}>
          Q{n} · {question.kind}
        </span>
        <div>{renderText(question.q)}</div>
      </div>
      {open ? (
        <div className="quiz-a">
          {renderText(question.a)}
          <button type="button" className="quiz-hide" onClick={() => onToggle(false)}>
            Hide answer
          </button>
        </div>
      ) : (
        <button type="button" className="quiz-reveal" onClick={() => onToggle(true)}>
          Think first, then reveal answer
        </button>
      )}
    </div>
  );
}

function parseIndexes(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

function renderText(text: string): ReactNode {
  return text.split(/\n\s*\n/).map((para, i) => (
    <p key={i}>
      {para.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((chunk, j) =>
        chunk.startsWith("`") && chunk.endsWith("`") ? (
          <code key={j}>{chunk.slice(1, -1)}</code>
        ) : chunk.startsWith("**") && chunk.endsWith("**") ? (
          <strong key={j}>{chunk.slice(2, -2)}</strong>
        ) : (
          <Fragment key={j}>{chunk}</Fragment>
        ),
      )}
    </p>
  ));
}
