import {ContractError} from "../../lib/post-contract.mjs";

export function normalizeCategoryName(value) {
  if (typeof value !== "string") throw new ContractError("category name is required", "name");
  const name = value.trim();
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new ContractError("invalid category name", "name");
  }
  return name;
}

export function mergeCategoryNames(...groups) {
  const categories = [];
  const seen = new Set();
  for (const group of groups) {
    for (const value of group || []) {
      if (typeof value === "string" && !value.trim()) continue;
      const name = normalizeCategoryName(value);
      const key = name.toLocaleLowerCase("ko");
      if (seen.has(key)) continue;
      seen.add(key);
      categories.push(name);
    }
  }
  return categories;
}

function commitResult(result, categories) {
  return {
    categories,
    sha: result?.content?.sha ?? "",
    commitSha: result?.commit?.sha ?? ""
  };
}

export function createCategoryService(client, postService) {
  async function list() {
    const [config, posts] = await Promise.all([
      client.getCategoryConfig(),
      postService.list()
    ]);
    return {
      categories: mergeCategoryNames(config.categories, posts.map(post => post.category)),
      sha: config.sha
    };
  }

  return {
    list,
    async create(input) {
      const name = normalizeCategoryName(input?.name);
      const current = await list();
      if (current.categories.some(category => category.toLocaleLowerCase("ko") === name.toLocaleLowerCase("ko"))) {
        throw new ContractError("category already exists", "name");
      }
      if (current.sha && (typeof input?.sha !== "string" || !input.sha)) {
        throw new ContractError("category sha is required", "sha");
      }
      const categories = [...current.categories, name];
      const result = await client.writeCategoryConfig(categories, input?.sha || "");
      return commitResult(result, categories);
    }
  };
}
