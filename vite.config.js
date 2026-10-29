import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";

// Fenced code blocks are highlighted at build time, so no highlighter ships to
// the browser. Both themes are emitted as CSS variables (--shiki-light /
// --shiki-dark) and picked by the `.dark` class in src/index.css.
const shiki = [
  rehypeShiki,
  {
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    // An unknown or missing language falls back to plain text instead of failing the build.
    fallbackLanguage: "text",
  },
];

export default defineConfig({
  plugins: [{ enforce: "pre", ...mdx({ rehypePlugins: [shiki] }) }, react(), tailwindcss()],
  server: {
    port: 3000,
  },
});
