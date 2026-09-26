import React from "react";
import PostLayout from "../components/PostLayout";
import { parse } from "yaml";
import rawPosts from "../../content/posts.yml?raw";

const registry = parse(rawPosts);

// Blog modules are discovered eagerly: .jsx posts export their own default
// component (they render their own PostLayout); .mdx posts export a body-only
// default component that we wrap with PostLayout, using the registry as the
// single source of metadata.
const modules = import.meta.glob("../pages/blog/*.{jsx,mdx}", { eager: true });

/** Registry sorted newest-first. */
export const posts = [...registry].sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
);

function mdxRoute(post) {
  const MdxPost = function MdxPost() {
    const Body = modules[`../pages/blog/${post.file}`].default;
    return React.createElement(
      PostLayout,
      { title: post.title, subtitle: post.summary },
      React.createElement(Body),
    );
  };
  return MdxPost;
}

/** slug -> React component. */
export const postRoutes = Object.fromEntries(
  posts.map((post) => [
    post.slug,
    post.file.endsWith(".mdx")
      ? mdxRoute(post)
      : modules[`../pages/blog/${post.file}`].default,
  ]),
);

export default posts;
