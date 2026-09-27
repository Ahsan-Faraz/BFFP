import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { getTopics } from "@/lib/content";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Backend from First Principles", template: "%s · Backend from First Principles" },
  description: "Personal study notes: HTTP, routing, serialization, and auth — with quizzes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const topics = getTopics();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className="shell">
          <Sidebar topics={topics} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
