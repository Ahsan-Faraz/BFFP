import Link from "next/link";
import { getTopics } from "@/lib/content";
import { ResumeLink } from "@/components/ReadingTracker";

export default function Home() {
  const topics = getTopics();
  return (
    <div className="content">
      <h1>Backend from First Principles</h1>
      <p className="lead">
        My backend study notes: short sections, step-by-step diagrams, key code snippets, and a quiz at the end of
        each topic.
      </p>
      <ResumeLink />
      <ol className="home-topics">
        {topics.map((t, i) => (
          <li key={t.slug}>
            {t.ready ? (
              <Link href={`/${t.slug}`}>
                <span className="topic-num">{i + 1}</span>
                <span>
                  <strong>{t.title}</strong>
                  <span className="home-meta">{t.sections.length} sections + quiz</span>
                </span>
              </Link>
            ) : (
              <div className="is-disabled">
                <span className="topic-num">{i + 1}</span>
                <span>
                  <strong>{t.title}</strong>
                  <span className="home-meta">Not built yet</span>
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
