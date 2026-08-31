import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  python: "python",
  py: "python",
  sql: "sql",
  plsql: "sql",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascript",
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "xml",
  xml: "xml",
  svg: "xml",
  css: "css",
  yaml: "yaml",
  yml: "yaml",
  markdown: "markdown",
  md: "markdown",
};

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("python", python);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("markdown", markdown);

export function normalizeCodeLanguage(language: string) {
  return LANGUAGE_ALIASES[language.trim().toLowerCase()] ?? "";
}

export function highlightCode(code: string, language: string) {
  const normalizedLanguage = normalizeCodeLanguage(language);
  if (!normalizedLanguage) return null;
  return hljs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true }).value;
}
