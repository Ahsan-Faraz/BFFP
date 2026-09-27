// The four topics, in sidebar order. `slug` must match the file name in /content.
export type Topic = { slug: string; title: string; short: string };

export const TOPICS: Topic[] = [
  { slug: "http", title: "HTTP & the request lifecycle", short: "HTTP" },
  { slug: "routing", title: "Routing", short: "Routing" },
  { slug: "serialization", title: "Serialization", short: "Serialization" },
  { slug: "auth", title: "Auth & Authorization", short: "Auth" },
];
