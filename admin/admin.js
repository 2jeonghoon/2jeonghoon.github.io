(function () {
  "use strict";
  const status = document.getElementById("admin-status");
  const base = window.BLOG_CONFIG && window.BLOG_CONFIG.adminUrl;
  try {
    const target = new URL(base);
    if (target.protocol !== "https:" || !target.hostname.endsWith(".workers.dev")) throw new Error("unavailable");
    const edit = new URL(location.href).searchParams.get("edit") || "";
    if (edit && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(edit)) throw new Error("invalid edit slug");
    target.pathname = "/"; target.search = ""; target.hash = "";
    if (edit) target.searchParams.set("edit", edit);
    location.replace(target.href);
  } catch {
    status.textContent = "관리자 서비스가 아직 설정되지 않았습니다. GitHub에서 Markdown 파일을 직접 편집할 수 있습니다.";
  }
})();
