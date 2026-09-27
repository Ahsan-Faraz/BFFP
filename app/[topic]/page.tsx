import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOPICS } from "@/lib/topics";
import { readyTopicSlugs } from "@/lib/content";
import { ReadingTracker, ResumeLink } from "@/components/ReadingTracker";

// One shared layout for every topic. The notes themselves live in /content/<topic>.mdx.

export function generateStaticParams() {
  return readyTopicSlugs().map((topic) => ({ topic }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[topic]">): Promise<Metadata> {
  const { topic } = await params;
  return { title: TOPICS.find((t) => t.slug === topic)?.title };
}

export default async function TopicPage({ params }: PageProps<"/[topic]">) {
  const { topic } = await params;
  const index = TOPICS.findIndex((t) => t.slug === topic);
  if (index < 0) notFound();
  const { default: Notes } = await import(`@/content/${topic}.mdx`);

  return (
    <div className="content">
      <p className="eyebrow">Topic {index + 1} of {TOPICS.length}</p>
      <h1>{TOPICS[index].title}</h1>
      <ResumeLink topic={topic} />
      <article className="mdx">
        <Notes />
      </article>
      <ReadingTracker topic={topic} />
    </div>
  );
}
