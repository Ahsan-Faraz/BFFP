import type { MDXComponents } from "mdx/types";
import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement } from "react";
import { Callout, Summary } from "@/components/Callout";
import { CodeBlock } from "@/components/CodeBlock";
import { StepDiagram } from "@/components/StepDiagram";
import { JwtDecoder } from "@/components/JwtDecoder";
import { Quiz } from "@/components/Quiz";
import { JwtTamper } from "@/components/JwtTamper";
import { RbacSimulator } from "@/components/RbacSimulator";
import { CookiePlayground } from "@/components/CookiePlayground";
import { IdempotencySimulator } from "@/components/IdempotencySimulator";
import { RouteMatcher } from "@/components/RouteMatcher";
import { JsonPlayground } from "@/components/JsonPlayground";
import { slugify } from "@/lib/slug";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

const components: MDXComponents = {
  // Section headings get stable ids so the sidebar, search and "last read" can link to them.
  h2: ({ children }) => {
    const id = slugify(textOf(children));
    return (
      <h2 id={id}>
        <a href={`#${id}`} className="anchor">
          {children}
        </a>
      </h2>
    );
  },
  // Fenced code blocks -> highlighted CodeBlock.
  pre: ({ children }) => {
    const code = Children.only(children) as ReactElement<{ className?: string; children?: string }>;
    const lang = code.props.className?.replace("language-", "") ?? "text";
    return <CodeBlock code={String(code.props.children ?? "").replace(/\n$/, "")} lang={lang} />;
  },
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
  // Available in every MDX file without imports.
  Callout,
  Summary,
  StepDiagram,
  JwtDecoder,
  JwtTamper,
  RbacSimulator,
  CookiePlayground,
  IdempotencySimulator,
  RouteMatcher,
  JsonPlayground,
  Quiz,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
