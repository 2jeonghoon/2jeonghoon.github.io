import MarkdownIt from "markdown-it";

import {ContractError, parsePostSource, serializePostSource, validatePostInput, validateSlug} from "../../lib/post-contract.mjs";

const markdown = new MarkdownIt({html: false, linkify: false, typographer: false});

function commitResult(result) {
  return {
    commitSha: result?.commit?.sha ?? "",
    contentSha: result?.content?.sha ?? ""
  };
}

export function createPostService(client) {
  return {
    async list() {
      const entries = await client.listPostEntries();
      return Promise.all(entries.map(async entry => {
        const slug = validateSlug(entry.name.slice(0, -3));
        const item = await client.getPost(slug);
        const post = parsePostSource({filePath: `${slug}.md`, source: item.source});
        return {slug, title: post.title, date: post.date, category: post.category, draft: post.draft, sha: item.sha};
      }));
    },
    async get(slug) {
      validateSlug(slug);
      const item = await client.getPost(slug);
      return {...parsePostSource({filePath: `${slug}.md`, source: item.source}), sha: item.sha};
    },
    preview(input) {
      const post = validatePostInput(input);
      return {html: markdown.render(post.body)};
    },
    async create(input) {
      const post = validatePostInput(input);
      return commitResult(await client.createPost(post.slug, serializePostSource(post)));
    },
    async update(slug, input) {
      validateSlug(slug);
      if (input.slug !== slug) throw new ContractError("slug is immutable", "slug");
      if (typeof input.sha !== "string" || !input.sha) throw new ContractError("sha is required", "sha");
      const post = validatePostInput(input);
      return commitResult(await client.updatePost(slug, serializePostSource(post), input.sha));
    },
    async delete(slug, input) {
      validateSlug(slug);
      if (input?.confirmation !== slug) throw new ContractError("slug confirmation is required", "confirmation");
      if (typeof input?.sha !== "string" || !input.sha) throw new ContractError("sha is required", "sha");
      return commitResult(await client.deletePost(slug, input.sha));
    }
  };
}
