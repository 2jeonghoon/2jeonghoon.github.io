(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BLOG_APP = api;
  if (root && typeof document !== "undefined") api.bootstrap(root, document);
})(typeof window !== "undefined" ? window : undefined, function () {
  "use strict";

  const AI_DISCLOSURE =
    "이 글은 Agent가 제공된 정보를 기반으로 작성했습니다.";

  const titleCollator = new Intl.Collator("ko", {
    numeric: true,
    sensitivity: "base"
  });

  function comparePostOrder(left, right) {
    const leftOrder = Number.isInteger(left.order) ? left.order : null;
    const rightOrder = Number.isInteger(right.order) ? right.order : null;
    if (leftOrder === null) return rightOrder === null ? 0 : 1;
    if (rightOrder === null) return -1;
    return leftOrder - rightOrder;
  }

  function sortPosts(posts) {
    return (posts || []).slice().sort((left, right) =>
      right.date.localeCompare(left.date) ||
      comparePostOrder(left, right) ||
      titleCollator.compare(left.title, right.title) ||
      left.slug.localeCompare(right.slug)
    );
  }

  function createAdminUrl(base, slug = "") {
    if (typeof base !== "string" || !base) return "";
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "";
    try {
      const url = new URL(base);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".workers.dev")) return "";
      url.pathname = "/";
      url.search = "";
      url.hash = "";
      if (slug) url.searchParams.set("edit", slug);
      return url.href;
    } catch { return ""; }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function categoryKey(value) {
    return String(value || "").trim().toLocaleLowerCase("ko");
  }

  function formatCategoryPath(post) {
    const category = String(post.category || "");
    const subcategory = String(post.subcategory || "");
    return subcategory ? `${category} / ${subcategory}` : category;
  }

  function deriveCategoryTree(posts) {
    const categories = [];
    const parents = new Map();
    (posts || []).forEach(post => {
      const name = String(post.category || "").trim();
      if (!name) return;
      const parentKey = categoryKey(name);
      let parent = parents.get(parentKey);
      if (!parent) {
        parent = {name, children: []};
        parents.set(parentKey, parent);
        categories.push(parent);
      }
      const childName = String(post.subcategory || "").trim();
      if (!childName) return;
      const childKey = categoryKey(childName);
      if (!parent.children.some(child => categoryKey(child.name) === childKey)) {
        parent.children.push({name: childName});
      }
    });
    return categories;
  }

  function deriveCategoryNavigation(posts) {
    const categories = [];
    const parents = new Map();
    (posts || []).forEach(post => {
      const name = String(post.category || "").trim();
      if (!name) return;
      const parentKey = categoryKey(name);
      let parent = parents.get(parentKey);
      if (!parent) {
        parent = {name, count: 0, children: []};
        parents.set(parentKey, parent);
        categories.push(parent);
      }
      parent.count += 1;
      const childName = String(post.subcategory || "").trim();
      if (!childName) return;
      const childKey = categoryKey(childName);
      let child = parent.children.find(item => categoryKey(item.name) === childKey);
      if (!child) {
        child = {name: childName, count: 0};
        parent.children.push(child);
      }
      child.count += 1;
    });
    return categories;
  }

  function categorySelectionFromSearch(search, categories) {
    const params = new URLSearchParams(search || "");
    const categoryName = params.get("category") || "";
    const subcategoryName = params.get("subcategory") || "";
    const category = (categories || []).find(item => categoryKey(item.name) === categoryKey(categoryName));
    if (!category) return {category: "", subcategory: ""};
    const subcategory = category.children.find(item => categoryKey(item.name) === categoryKey(subcategoryName));
    return {category: category.name, subcategory: subcategory?.name || ""};
  }

  function categoryHref(category = "", subcategory = "") {
    if (!category) return "./#writing";
    const child = subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : "";
    return `?category=${encodeURIComponent(category)}${child}#writing`;
  }

  function renderCategorySidebar(categories, active = {}, total = 0) {
    const activeCategory = active.category || "";
    const activeSubcategory = active.subcategory || "";
    const current = (category, subcategory = "") =>
      categoryKey(activeCategory) === categoryKey(category) &&
      categoryKey(activeSubcategory) === categoryKey(subcategory)
        ? ' aria-current="page"'
        : "";
    const groups = (categories || []).map(category => `
      <div class="category-group">
        <a class="category-link category-parent" href="${escapeHtml(categoryHref(category.name))}" data-category="${escapeHtml(category.name)}" data-subcategory=""${current(category.name)}>${escapeHtml(category.name)}<span>${category.count}</span></a>
        ${category.children.length ? `<div class="category-children">${category.children.map(child => `<a class="category-link" href="${escapeHtml(categoryHref(category.name, child.name))}" data-category="${escapeHtml(category.name)}" data-subcategory="${escapeHtml(child.name)}"${current(category.name, child.name)}>${escapeHtml(child.name)}<span>${child.count}</span></a>`).join("")}</div>` : ""}
      </div>`).join("");
    return `<aside class="category-sidebar" aria-label="카테고리"><details open><summary>Categories</summary><nav class="category-nav"><a class="category-link category-all" href="${categoryHref()}" data-category="" data-subcategory=""${current("")}>전체<span>${total}</span></a>${groups}</nav></details></aside>`;
  }

  function updateCategorySidebarState(root, active = {}) {
    if (!root) return;
    root.querySelectorAll(".category-link").forEach(link => {
      const current =
        categoryKey(link.dataset.category) === categoryKey(active.category) &&
        categoryKey(link.dataset.subcategory) === categoryKey(active.subcategory);
      if (current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function filterPosts(posts, {category = "", subcategory = "", query = ""} = {}) {
    const needle = query.trim().toLocaleLowerCase("ko");
    return (posts || []).filter(post => {
      const categoryMatch = !category || categoryKey(post.category) === categoryKey(category);
      const childMatch = !subcategory || categoryKey(post.subcategory) === categoryKey(subcategory);
      const searchable = [
        post.title,
        post.description,
        post.content,
        post.category,
        post.subcategory,
        ...(post.tags || [])
      ].join(" ").toLocaleLowerCase("ko");
      return categoryMatch && childMatch && (!needle || searchable.includes(needle));
    });
  }

  function renderPostMeta(post) {
    return `<div class="meta"><span class="category">${escapeHtml(formatCategoryPath(post))}</span><span>·</span><time>${escapeHtml(post.date)}</time><span>·</span><span>${escapeHtml(post.readingTime)}</span></div>`;
  }

  function renderAiDisclosure(post) {
    if (!post.aiGenerated) return "";
    return `<aside class="ai-disclosure" aria-label="AI 작성 안내">
      <span aria-hidden="true">AI</span>
      <p>${AI_DISCLOSURE}</p>
    </aside>`;
  }

  function validAdSenseConfig(config) {
    return Boolean(
      config &&
      /^ca-pub-\d{16}$/.test(config.client || "") &&
      /^\d{6,20}$/.test(config.articleTopSlot || "")
    );
  }

  function renderArticleAd(config) {
    if (!validAdSenseConfig(config)) return "";
    return `<aside class="article-ad" aria-label="광고">
      <span class="ad-label">ADVERTISEMENT</span>
      <ins class="adsbygoogle" style="display:block" data-ad-client="${config.client}" data-ad-slot="${config.articleTopSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    </aside>`;
  }

  function mountAdSense(browser, page, config) {
    if (!validAdSenseConfig(config) || !page.querySelector(".adsbygoogle")) return;
    if (!page.querySelector("script[data-adsense-loader]")) {
      const script = page.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.adsenseLoader = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.client}`;
      page.head.appendChild(script);
    }
    browser.adsbygoogle = browser.adsbygoogle || [];
    browser.adsbygoogle.push({});
  }

  function renderCommentsShell() {
    return `<section class="comments" aria-labelledby="comments-title">
      <div class="comments-heading">
        <p class="section-kicker">COMMENTS</p>
        <h2 id="comments-title">댓글</h2>
      </div>
      <div data-comments><p class="comments-status">댓글을 불러오는 중입니다…</p></div>
    </section>`;
  }

  function mountGiscus(container, post, config) {
    if (!container) return;
    container.replaceChildren();
    if (
      !config ||
      !config.repo ||
      !config.repoId ||
      !config.category ||
      !config.categoryId
    ) {
      container.innerHTML =
        '<p class="comments-status">댓글 설정이 아직 완료되지 않았습니다.</p>';
      return;
    }

    container.innerHTML =
      '<p class="comments-status">GitHub Discussions 댓글을 불러오는 중입니다…</p>';
    const status = container.querySelector(".comments-status");
    const script = container.ownerDocument.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.dataset.repo = config.repo;
    script.dataset.repoId = config.repoId;
    script.dataset.category = config.category;
    script.dataset.categoryId = config.categoryId;
    script.dataset.mapping = "specific";
    script.dataset.term = post.slug;
    script.dataset.reactionsEnabled = "1";
    script.dataset.emitMetadata = "0";
    script.dataset.inputPosition = "top";
    script.dataset.theme = "light";
    script.dataset.lang = "ko";
    script.dataset.loading = "lazy";
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = function () {
      if (status) status.remove();
    };
    script.onerror = function () {
      if (status) {
        status.textContent =
          "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      }
    };
    container.appendChild(script);
  }

  function bootstrap(browser, page) {
    const app = page.getElementById("app");
    if (!app) return;
    const posts = sortPosts(browser.BLOG_POSTS);
    const postUrl = slug => `?post=${encodeURIComponent(slug)}`;
    const meta = renderPostMeta;

    function updateMeta(title, description) {
      page.title = title;
      const descriptionNode = page.querySelector('meta[name="description"]');
      const openGraphTitle = page.querySelector('meta[property="og:title"]');
      const openGraphDescription = page.querySelector(
        'meta[property="og:description"]'
      );
      if (descriptionNode) descriptionNode.setAttribute("content", description);
      if (openGraphTitle) openGraphTitle.setAttribute("content", title);
      if (openGraphDescription) {
        openGraphDescription.setAttribute("content", description);
      }
    }

    function renderHome() {
      const featured = posts.find(post => post.featured) || posts[0];
      const categories = deriveCategoryNavigation(posts);
      updateMeta(
        "JH.LOG — 2jeonghoon의 개발 기록",
        "게임 클라이언트, 서버 아키텍처, Linux I/O에 관한 2jeonghoon의 기록"
      );
      app.innerHTML = `
        <section class="hero">
          <div class="hero-topline"><span class="live-dot"></span>DEVELOPER NOTES FROM SEOUL</div>
          <h1>언제나 펼쳐볼 수 있는 노트 같은 공간</h1>
          <div class="hero-bottom"><p class="hero-note">GAME CLIENT · SERVER · LINUX</p><p class="hero-intro">배우고 공부한 것들을 기록합니다.</p></div>
        </section>
        ${featured ? `<a class="featured" href="${postUrl(featured.slug)}" aria-label="대표 글 읽기: ${escapeHtml(featured.title)}">
          <div class="featured-visual"><img src="${escapeHtml(featured.image)}" alt="" /><span class="featured-label">FEATURED NOTE</span></div>
          <div class="featured-copy">${meta(featured)}<h2>${escapeHtml(featured.title)}</h2><p>${escapeHtml(featured.description)}</p><span class="read-link">READ ARTICLE <span>→</span></span></div>
        </a>` : ""}
        <section class="writing" id="writing">
          <div class="section-head"><div><p class="section-kicker">01 / WRITING</p><h2>Latest notes</h2></div><span class="post-count">${String(posts.length).padStart(2, "0")} POSTS</span></div>
          <div class="writing-layout"><div class="writing-main"><div class="filters"><input class="search" type="search" aria-label="글 검색" placeholder="Search notes…" /></div><div class="post-list" aria-live="polite"></div></div><div class="category-sidebar-shell"></div></div>
        </section>
        <section class="about" id="about"><div class="about-inner">
          <div><p class="section-kicker">02 / ABOUT</p><h2>안녕하세요</h2></div>
          <div class="about-copy"><p>Unity와 Unreal Engine으로 게임 클라이언트를 만들고, 효율적인 게임 서버를 개발하며 배운 것을 기록합니다.</p>
            <div class="about-table"><div class="about-row"><span>FOCUS</span><strong>Game systems & performance</strong></div><div class="about-row"><span>STACK</span><strong>C/C++ · C# · Python · Linux</strong></div><div class="about-row"><span>BASED IN</span><strong>Seoul, Republic of Korea</strong></div><div class="about-row"><span>CONTACT</span><strong><a href="mailto:lee.jonghoon26@gmail.com">lee.jonghoon26@gmail.com ↗</a></strong></div></div>
          </div></div></section>`;

      let {category: activeCategory, subcategory: activeSubcategory} = categorySelectionFromSearch(browser.location.search, categories);
      let query = "";
      const list = app.querySelector(".post-list");
      const sidebarShell = app.querySelector(".category-sidebar-shell");
      function renderList() {
        const filtered = filterPosts(posts, {category: activeCategory, subcategory: activeSubcategory, query});
        list.innerHTML = filtered.length
          ? filtered
              .map(
                post =>
                  `<a class="post-card" href="${postUrl(post.slug)}">${meta(post)}<h3>${escapeHtml(post.title)}</h3><p class="post-description">${escapeHtml(post.description)}</p><span class="post-arrow" aria-hidden="true">↗</span></a>`
              )
              .join("")
          : '<p class="empty">조건에 맞는 기록이 없습니다.</p>';
      }
      function renderSidebar() {
        sidebarShell.innerHTML = renderCategorySidebar(categories, {
          category: activeCategory,
          subcategory: activeSubcategory
        }, posts.length);
        sidebarShell.querySelectorAll(".category-link").forEach(link =>
          link.addEventListener("click", event => {
            event.preventDefault();
            activeCategory = link.dataset.category || "";
            activeSubcategory = link.dataset.subcategory || "";
            if (browser.history?.pushState) {
              browser.history.pushState(null, "", categoryHref(activeCategory, activeSubcategory));
            }
            renderList();
            updateCategorySidebarState(sidebarShell, {
              category: activeCategory,
              subcategory: activeSubcategory
            });
          })
        );
      }
      app.querySelector(".search").addEventListener("input", event => {
        query = event.target.value;
        renderList();
      });
      if (typeof browser.addEventListener === "function") {
        browser.addEventListener("popstate", () => {
          const selection = categorySelectionFromSearch(browser.location.search, categories);
          activeCategory = selection.category;
          activeSubcategory = selection.subcategory;
          renderList();
          updateCategorySidebarState(sidebarShell, selection);
        });
      }
      renderSidebar();
      renderList();
    }

    function renderArticle(post) {
      if (!post) {
        updateMeta(
          "글을 찾을 수 없습니다 — JH.LOG",
          "요청한 글을 찾을 수 없습니다."
        );
        app.innerHTML =
          '<section class="article not-found"><a class="back-link" href="./">← ALL NOTES</a><h1>404</h1><p>요청한 기록을 찾을 수 없습니다.</p></section>';
        return;
      }
      const next = posts[(posts.indexOf(post) + 1) % posts.length];
      const manageUrl = createAdminUrl(browser.BLOG_CONFIG && browser.BLOG_CONFIG.adminUrl, post.slug);
      updateMeta(`${post.title} — JH.LOG`, post.description);
      const adsense = browser.BLOG_CONFIG && browser.BLOG_CONFIG.adsense;
      app.innerHTML = `<article class="article"><a class="back-link" href="./#writing">← ALL NOTES</a>${manageUrl ? `<a class="manage-link" href="${escapeHtml(manageUrl)}" rel="nofollow">Manage post ↗</a>` : ""}<header class="article-header">${meta(post)}<h1>${escapeHtml(post.title)}</h1><p class="lead">${escapeHtml(post.description)}</p></header>${renderArticleAd(adsense)}${renderAiDisclosure(post)}${post.image ? `<img class="article-cover" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />` : ""}<div class="article-body">${post.content}</div><div class="article-tags">${post.tags.map(tag => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>${posts.length > 1 ? `<a class="article-nav" href="${postUrl(next.slug)}"><p>NEXT NOTE →</p><strong>${escapeHtml(next.title)}</strong></a>` : ""}${renderCommentsShell()}</article>`;
      mountAdSense(browser, page, adsense);
      mountGiscus(
        app.querySelector("[data-comments]"),
        post,
        browser.BLOG_CONFIG && browser.BLOG_CONFIG.giscus
      );
    }

    const slug = new URLSearchParams(browser.location.search).get("post");
    slug ? renderArticle(posts.find(post => post.slug === slug)) : renderHome();
  }

  return {
    bootstrap,
    categoryHref,
    categorySelectionFromSearch,
    createAdminUrl,
    deriveCategoryNavigation,
    deriveCategoryTree,
    escapeHtml,
    filterPosts,
    formatCategoryPath,
    mountGiscus,
    mountAdSense,
    renderArticleAd,
    renderAiDisclosure,
    renderCategorySidebar,
    renderCommentsShell,
    renderPostMeta,
    sortPosts,
    updateCategorySidebarState
  };
});
