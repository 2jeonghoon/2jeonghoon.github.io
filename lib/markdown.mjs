import MarkdownIt from "markdown-it";
import katex from "katex";
import texmath from "markdown-it-texmath";

// Shared by published posts and the authenticated editor preview.
const markdown = new MarkdownIt({html: false, linkify: false, typographer: false})
  .use(texmath, {
    engine: katex,
    delimiters: "dollars",
    katexOptions: {trust: false, throwOnError: false, output: "htmlAndMathml"}
  });

export function renderMarkdown(source) {
  return markdown.render(source);
}
