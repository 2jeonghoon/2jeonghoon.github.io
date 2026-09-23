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

  function renderAiDisclosure(post) {
    if (!post.aiGenerated) return "";
    return `<aside class="ai-disclosure" aria-label="AI 작성 안내">
      <span aria-hidden="true">AI</span>
      <p>${AI_DISCLOSURE}</p>
    </aside>`;
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
    const posts = (browser.BLOG_POSTS || [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    const postUrl = slug => `?post=${encodeURIComponent(slug)}`;
    const meta = post =>
      `<div class="meta"><span class="category">${escapeHtml(post.category)}</span><span>·</span><time>${escapeHtml(post.date)}</time><span>·</span><span>${escapeHtml(post.readingTime)}</span></div>`;

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
      const categories = ["All", ...new Set(posts.map(post => post.category))];
      updateMeta(
        "JH.LOG — 이정훈의 개발 기록",
        "게임 클라이언트, 서버 아키텍처, Linux I/O에 관한 이정훈의 개발 기록"
      );
      app.innerHTML = `
        <section class="hero">
          <div class="hero-topline"><span class="live-dot"></span>DEVELOPER NOTES FROM SEOUL</div>
          <h1>게임을 만들고,<br />시스템을 <em>탐구합니다.</em></h1>
          <div class="hero-bottom"><p class="hero-note">GAME CLIENT · SERVER · LINUX</p><p class="hero-intro">게임 경험을 더 안정적이고 매끄럽게 만드는 과정에서 배운 것들을 기록합니다. 구현의 결과보다 그 사이의 판단과 실패를 오래 남깁니다.</p></div>
        </section>
        ${featured ? `<a class="featured" href="${postUrl(featured.slug)}" aria-label="대표 글 읽기: ${escapeHtml(featured.title)}">
          <div class="featured-visual"><img src="${escapeHtml(featured.image)}" alt="" /><span class="featured-label">FEATURED NOTE</span></div>
          <div class="featured-copy">${meta(featured)}<h2>${escapeHtml(featured.title)}</h2><p>${escapeHtml(featured.description)}</p><span class="read-link">READ ARTICLE <span>→</span></span></div>
        </a>` : ""}
        <section class="writing" id="writing">
          <div class="section-head"><div><p class="section-kicker">01 / WRITING</p><h2>Latest notes</h2></div><span class="post-count">${String(posts.length).padStart(2, "0")} POSTS</span></div>
          <div class="filters"><div class="filter-list" role="group" aria-label="글 카테고리">${categories.map((category, index) => `<button class="filter${index === 0 ? " active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}</div><input class="search" type="search" aria-label="글 검색" placeholder="Search notes…" /></div>
          <div class="post-list" aria-live="polite"></div>
        </section>
        <section class="about" id="about"><div class="about-inner">
          <div><p class="section-kicker">02 / ABOUT</p><h2>안녕하세요,<br />이정훈입니다.</h2></div>
          <div class="about-copy"><p>Unity와 Unreal Engine으로 게임 플레이를 만들고, MMORPG 서버의 동시성 제어와 Linux <code>io_uring</code>의 I/O 성능을 연구합니다.</p>
            <div class="about-table"><div class="about-row"><span>FOCUS</span><strong>Game systems & performance</strong></div><div class="about-row"><span>STACK</span><strong>C/C++ · C# · Python · Linux</strong></div><div class="about-row"><span>BASED IN</span><strong>Seoul, Republic of Korea</strong></div><div class="about-row"><span>CONTACT</span><strong><a href="mailto:lee.jonghoon26@gmail.com">lee.jonghoon26@gmail.com ↗</a></strong></div></div>
          </div></div></section>`;

      let activeCategory = "All";
      let query = "";
      const list = app.querySelector(".post-list");
      function renderList() {
        const normalized = query.trim().toLocaleLowerCase("ko");
        const filtered = posts.filter(post => {
          const haystack = [
            post.title,
            post.description,
            post.category,
            ...post.tags
          ]
            .join(" ")
            .toLocaleLowerCase("ko");
          return (
            (activeCategory === "All" || post.category === activeCategory) &&
            (!normalized || haystack.includes(normalized))
          );
        });
        list.innerHTML = filtered.length
          ? filtered
              .map(
                post =>
                  `<a class="post-card" href="${postUrl(post.slug)}">${meta(post)}<h3>${escapeHtml(post.title)}</h3><p class="post-description">${escapeHtml(post.description)}</p><span class="post-arrow" aria-hidden="true">↗</span></a>`
              )
              .join("")
          : '<p class="empty">조건에 맞는 기록이 없습니다.</p>';
      }
      app.querySelectorAll(".filter").forEach(button =>
        button.addEventListener("click", () => {
          activeCategory = button.dataset.category;
          app
            .querySelectorAll(".filter")
            .forEach(item => item.classList.toggle("active", item === button));
          renderList();
        })
      );
      app.querySelector(".search").addEventListener("input", event => {
        query = event.target.value;
        renderList();
      });
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
      app.innerHTML = `<article class="article"><a class="back-link" href="./#writing">← ALL NOTES</a>${manageUrl ? `<a class="manage-link" href="${escapeHtml(manageUrl)}" rel="nofollow">Manage post ↗</a>` : ""}<header class="article-header">${meta(post)}<h1>${escapeHtml(post.title)}</h1><p class="lead">${escapeHtml(post.description)}</p></header>${renderAiDisclosure(post)}${post.image ? `<img class="article-cover" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />` : ""}<div class="article-body">${post.content}</div><div class="article-tags">${post.tags.map(tag => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>${posts.length > 1 ? `<a class="article-nav" href="${postUrl(next.slug)}"><p>NEXT NOTE →</p><strong>${escapeHtml(next.title)}</strong></a>` : ""}${renderCommentsShell()}</article>`;
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
    createAdminUrl,
    escapeHtml,
    mountGiscus,
    renderAiDisclosure,
    renderCommentsShell
  };
});
