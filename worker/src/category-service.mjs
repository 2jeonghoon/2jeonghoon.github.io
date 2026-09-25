import {ContractError, validatePostInput} from "../../lib/post-contract.mjs";

function key(value) {
  return value.toLocaleLowerCase("ko");
}

export function normalizeCategoryName(value) {
  if (typeof value !== "string") throw new ContractError("category name is required", "name");
  const name = value.trim();
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new ContractError("invalid category name", "name");
  }
  return name;
}

function normalizeNode(value) {
  if (typeof value === "string") {
    return {name: normalizeCategoryName(value), children: []};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError("invalid category", "categories");
  }
  if (!Array.isArray(value.children)) {
    throw new ContractError("invalid category children", "categories");
  }
  const children = value.children.map(child => {
    if (!child || typeof child !== "object" || Array.isArray(child) || "children" in child) {
      throw new ContractError("categories support only two levels", "categories");
    }
    return {name: normalizeCategoryName(child.name)};
  });
  return {name: normalizeCategoryName(value.name), children};
}

export function mergeCategoryTrees(...trees) {
  const categories = [];
  const parents = new Map();
  for (const tree of trees) {
    if (!Array.isArray(tree)) throw new ContractError("categories must be an array", "categories");
    for (const raw of tree) {
      const node = normalizeNode(raw);
      const parentKey = key(node.name);
      let parent = parents.get(parentKey);
      if (!parent) {
        parent = {name: node.name, children: []};
        parents.set(parentKey, parent);
        categories.push(parent);
      }
      const children = new Set(parent.children.map(child => key(child.name)));
      for (const child of node.children) {
        const childKey = key(child.name);
        if (children.has(childKey)) continue;
        children.add(childKey);
        parent.children.push({name: child.name});
      }
    }
  }
  return categories;
}

export function normalizeCategoryTree(values) {
  if (!Array.isArray(values)) throw new ContractError("categories must be an array", "categories");
  return mergeCategoryTrees(values);
}

function treeFromPosts(posts) {
  return (posts || []).flatMap(post => {
    if (typeof post?.category !== "string" || !post.category.trim()) return [];
    const children = typeof post.subcategory === "string" && post.subcategory.trim()
      ? [{name: post.subcategory}]
      : [];
    return [{name: post.category, children}];
  });
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
      categories: mergeCategoryTrees(normalizeCategoryTree(config.categories), treeFromPosts(posts)),
      sha: config.sha
    };
  }

  async function assertPostSelection(input) {
    const post = validatePostInput(input);
    if (!post.category && !post.subcategory) return;
    const {categories} = await list();
    const parent = categories.find(category => key(category.name) === key(post.category));
    if (!parent) throw new ContractError("category does not exist", "category");
    if (post.subcategory && !parent.children.some(child => key(child.name) === key(post.subcategory))) {
      throw new ContractError("subcategory does not belong to category", "subcategory");
    }
  }

  return {
    list,
    assertPostSelection,
    async create(input) {
      const name = normalizeCategoryName(input?.name);
      if (input?.parent !== undefined && input?.parent !== null && typeof input.parent !== "string") {
        throw new ContractError("parent must be a string", "parent");
      }
      const parentName = typeof input?.parent === "string" ? input.parent.trim() : "";
      const current = await list();
      let categories;

      if (!parentName) {
        if (current.categories.some(category => key(category.name) === key(name))) {
          throw new ContractError("category already exists", "name");
        }
        categories = [...current.categories, {name, children: []}];
      } else {
        const normalizedParent = normalizeCategoryName(parentName);
        const parentIndex = current.categories.findIndex(category => key(category.name) === key(normalizedParent));
        if (parentIndex === -1) throw new ContractError("parent category does not exist", "parent");
        const parent = current.categories[parentIndex];
        if (parent.children.some(child => key(child.name) === key(name))) {
          throw new ContractError("subcategory already exists", "name");
        }
        categories = current.categories.map((category, index) => index === parentIndex
          ? {...category, children: [...category.children, {name}]}
          : category);
      }

      if (current.sha && (typeof input?.sha !== "string" || !input.sha)) {
        throw new ContractError("category sha is required", "sha");
      }
      const result = await client.writeCategoryConfig(categories, input?.sha || "");
      return commitResult(result, categories);
    }
  };
}
