(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.AdminUI = api; api.bootstrap(root.document); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createApiRequest(url, options) {
    const init = {method: options.method || "GET", credentials: "same-origin", headers: {}};
    if (options.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.headers["X-CSRF-Token"] = options.csrfToken;
      init.body = JSON.stringify(options.body);
    }
    return {url, init};
  }
  function createEditorModel(input) {
    return Object.assign({slug:"",title:"",description:"",date:"",order:null,category:"",subcategory:"",tags:[],image:"",featured:false,draft:true,aiGenerated:false,body:"",sha:"",error:null}, input || {});
  }
  function parseOptionalOrder(value) { return value === "" ? null : Number(value); }
  const postTitleCollator = new Intl.Collator("ko", {numeric:true,sensitivity:"base"});
  function compareAdminPostOrder(left,right) {
    const leftOrder=Number.isInteger(left.order)?left.order:null;const rightOrder=Number.isInteger(right.order)?right.order:null;
    if(leftOrder===null)return rightOrder===null?0:1;if(rightOrder===null)return -1;return rightOrder-leftOrder;
  }
  function sortAdminPosts(posts) {
    return (posts||[]).slice().sort((left,right)=>
      String(right.date||"").localeCompare(String(left.date||"")) ||
      compareAdminPostOrder(left,right) ||
      postTitleCollator.compare(left.title||left.slug,right.title||right.slug) ||
      String(left.slug||"").localeCompare(String(right.slug||""))
    );
  }
  function groupAdminPosts(posts, filter="all") {
    const visible=(posts||[]).filter(post=>filter==="all"||(filter==="draft")===Boolean(post.draft));
    const published=visible.filter(post=>!post.draft);const drafts=visible.filter(post=>post.draft);
    const groups=[];const byCategory=new Map();const uncategorized=[];
    sortAdminPosts(published).forEach(post=>{
      const label=String(post.category||"").trim();
      if(!label){uncategorized.push(post);return;}
      const key=categoryKey(label);let group=byCategory.get(key);
      if(!group){group={label,posts:[]};byCategory.set(key,group);groups.push(group);}
      group.posts.push(post);
    });
    if(uncategorized.length)groups.push({label:"미분류",posts:uncategorized});
    if(drafts.length)groups.push({label:"초안",posts:sortAdminPosts(drafts)});
    return groups;
  }
  function withRequestError(model, error) { return Object.assign({}, model, {error}); }
  function canEditSlug(model) { return !model.sha; }
  function canDelete(slug, confirmation) { return Boolean(slug) && slug === confirmation; }
  function categoryKey(value) { return String(value || "").trim().toLocaleLowerCase("ko"); }
  function mergeCategoryTrees(categories, currentPath) {
    const result=[];const parents=new Map();
    const paths=[...(categories||[])];
    if(currentPath?.category)paths.push({name:currentPath.category,children:currentPath.subcategory?[{name:currentPath.subcategory}]:[]});
    paths.forEach(item=>{
      if(!item||typeof item.name!=="string"||!item.name.trim())return;
      const parentKey=categoryKey(item.name);let parent=parents.get(parentKey);
      if(!parent){parent={name:item.name.trim(),children:[]};parents.set(parentKey,parent);result.push(parent);}
      const children=new Set(parent.children.map(child=>categoryKey(child.name)));
      (Array.isArray(item.children)?item.children:[]).forEach(child=>{
        const name=typeof child?.name==="string"?child.name.trim():"";const childKey=categoryKey(name);
        if(!name||children.has(childKey))return;children.add(childKey);parent.children.push({name});
      });
    });
    return result;
  }
  function childNamesFor(categories, parent) {
    const parentKey=categoryKey(parent);
    return (categories||[]).find(item=>categoryKey(item.name)===parentKey)?.children.map(child=>child.name)||[];
  }
  function nextCategorySelection(categories, category, subcategory) {
    const normalizedCategory=String(category||"").trim();const normalizedSubcategory=String(subcategory||"").trim();
    const parent=(categories||[]).find(item=>categoryKey(item.name)===categoryKey(normalizedCategory));
    const child=parent?.children.find(item=>categoryKey(item.name)===categoryKey(normalizedSubcategory));
    return {category:parent?.name||normalizedCategory,subcategory:child?.name||""};
  }

  function renderAnalytics(document, data) {
    const count = value => Number(value).toLocaleString("ko-KR");
    document.getElementById("analytics-total").textContent = count(data.total);
    document.getElementById("analytics-today").textContent = count(data.today);
    function rows(id, values, label) {
      const body = document.getElementById(id);
      body.textContent = "";
      values.forEach(value => {
        const row = document.createElement("tr");
        const name = document.createElement("th");
        name.scope = "row";
        name.textContent = label(value);
        const views = document.createElement("td");
        views.textContent = count(value.views);
        row.append(name, views);
        body.appendChild(row);
      });
    }
    rows("analytics-days", data.days, row => row.day);
    rows("analytics-pages", data.pages, row => row.page === "/" ? "홈" : row.page);
  }

  function countNewComments(comments, seen) {
    const cutoff = Date.parse(seen) || 0;
    return comments.filter(item => Date.parse(item.createdAt) > cutoff).length;
  }

  function bootstrap(document) {
    if (!document) return;
    let csrfToken = "";
    let model = createEditorModel();
    let categoryTree = [];
    let categorySha = "";
    let previewTimer;
    let previewController;
    const get = id => document.getElementById(id);
    const form = get("post-form");
    const commentsKey = "jh-admin-comments-seen";
    let comments = [];
    let seen = "";
    try { seen = localStorage.getItem(commentsKey) || ""; } catch {}

    function renderComments() {
      const list = get("comment-list"); list.textContent = "";
      const count = countNewComments(comments, seen);
      get("comments-count").textContent = count ? `새 댓글 ${count}` : "";
      get("read-comments").disabled = !count;
      comments.forEach(item => {
        const row = document.createElement("li");
        const meta = document.createElement("p");
        const body = document.createElement("p");
        const link = document.createElement("a");
        const fresh = countNewComments([item], seen) > 0;
        meta.textContent = `${fresh ? "[새 댓글] " : ""}${item.author}${item.reply ? " · 답글" : ""} · ${new Date(item.createdAt).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}`;
        body.textContent = item.body;
        link.textContent = `${item.slug} · 답글 / 관리`;
        try { const url = new URL(item.url); if (url.origin === "https://github.com") link.href = url.href; } catch {}
        link.target = "_blank"; link.rel = "noopener noreferrer";
        row.append(meta, body, link);
        if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
          const post = document.createElement("a"); post.textContent = "글 보기";
          post.href = `https://2jeonghoon.github.io/?post=${encodeURIComponent(item.slug)}`;
          post.target = "_blank"; post.rel = "noopener noreferrer"; row.append(post);
        }
        list.append(row);
      });
    }
    async function loadComments() {
      get("refresh-comments").disabled = true;
      get("comments-status").textContent = "댓글을 불러오는 중…";
      try {
        const data = await api("/api/comments"); comments = data.comments;
        renderComments();
        get("comments-status").textContent = !comments.length ? "아직 댓글이 없습니다." : data.limited ? "최근 댓글 일부를 표시합니다. 전체 댓글은 GitHub에서 확인하세요." : `${comments.length}개의 댓글·답글을 표시합니다.`;
      } catch {
        get("comments-status").textContent = "댓글을 불러오지 못했습니다. 새로고침하거나 GitHub에서 확인하세요. GitHub App의 Discussions 읽기 권한도 확인해 주세요.";
      } finally { get("refresh-comments").disabled = false; }
    }

    async function api(url, options) {
      const request = createApiRequest(url, Object.assign({csrfToken}, options || {}));
      const response = await fetch(request.url, request.init);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = {status: response.status, message: payload.error?.message || "요청에 실패했습니다.", requestId: payload.requestId};
        throw error;
      }
      return payload;
    }
    async function loadAnalytics() {
      const button = get("refresh-analytics");
      button.disabled = true;
      get("analytics-status").textContent = "통계를 불러오는 중…";
      try {
        const data = await api("/api/analytics");
        renderAnalytics(document, data);
        get("analytics-status").textContent = "통계가 갱신되었습니다.";
      } catch {
        get("analytics-total").textContent = "—";
        get("analytics-today").textContent = "—";
        get("analytics-days").textContent = "";
        get("analytics-pages").textContent = "";
        get("analytics-status").textContent = "통계를 불러오지 못했습니다. 잠시 후 새로고침해 주세요. 글쓰기는 계속 이용할 수 있습니다.";
      } finally { button.disabled = false; }
    }
    function readForm(draft) {
      return createEditorModel({
        slug:get("post-slug").value.trim(),title:get("post-title").value.trim(),description:get("post-description").value.trim(),
        date:get("post-date").value,order:parseOptionalOrder(get("post-order").value),category:get("post-category").value.trim(),subcategory:get("post-subcategory").value.trim(),tags:get("post-tags").value.split(",").map(v=>v.trim()).filter(Boolean),
        image:get("post-image").value.trim(),featured:get("post-featured").checked,draft,aiGenerated:get("post-ai").checked,
        body:get("post-body").value,sha:model.sha
      });
    }
    function appendOption(select,value,label) { const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option); }
    function writeChildOptions(category,selected) {
      const select=get("post-subcategory");const names=childNamesFor(categoryTree,category);select.textContent="";appendOption(select,"","소분류 없음");
      names.forEach(name=>appendOption(select,name,name));select.disabled=!category;select.value=names.find(name=>categoryKey(name)===categoryKey(selected))||"";
    }
    function writeManagerParentOptions(selected) {
      const select=get("child-parent");select.textContent="";appendOption(select,"","대분류 선택");
      categoryTree.forEach(category=>appendOption(select,category.name,category.name));select.value=selected||"";
    }
    function writeCategoryOptions(category,subcategory) {
      const current={category:category||"",subcategory:subcategory||""};categoryTree=mergeCategoryTrees(categoryTree,current);
      const selection=nextCategorySelection(categoryTree,current.category,current.subcategory);
      const select=get("post-category");select.textContent="";appendOption(select,"","대분류 선택");
      categoryTree.forEach(item=>appendOption(select,item.name,item.name));select.value=selection.category;
      writeChildOptions(selection.category,selection.subcategory);writeManagerParentOptions(get("child-parent").value||selection.category);
    }
    function writeForm(next) {
      model=createEditorModel(next); get("post-slug").value=model.slug; get("post-slug").disabled=!canEditSlug(model);
      get("post-title").value=model.title;get("post-description").value=model.description;get("post-date").value=model.date;get("post-order").value=model.order??"";
      writeCategoryOptions(model.category,model.subcategory);get("post-tags").value=model.tags.join(", ");get("post-image").value=model.image;
      get("post-featured").checked=model.featured;get("post-ai").checked=model.aiGenerated;get("post-body").value=model.body;
      get("delete-post").hidden=!model.sha;get("editor-title").textContent=model.sha?"글 수정":"새 글";get("validation").textContent="";
    }
    async function loadList() {
      const data=await api("/api/posts"); const filter=get("post-filter").value; const list=get("post-list"); list.textContent="";
      groupAdminPosts(data.posts,filter).forEach(group=>{const section=document.createElement("li");const heading=document.createElement("h3");const items=document.createElement("ul");section.className="post-group";heading.textContent=group.label;items.className="post-group-items";section.append(heading,items);
        group.posts.forEach(p=>{const li=document.createElement("li");const b=document.createElement("button");const meta=document.createElement("span");b.type="button";meta.className="post-list-meta";meta.textContent=[p.subcategory,p.date,Number.isInteger(p.order)?`순서 ${p.order}`:""].filter(Boolean).join(" · ");b.append(document.createTextNode(p.title||p.slug),meta);b.addEventListener("click",()=>loadPost(p.slug));li.append(b);items.append(li);});list.append(section);});
    }
    async function loadCategories(selection) {
      const current=selection||{category:model.category,subcategory:model.subcategory};const data=await api("/api/categories");categorySha=data.sha||"";
      categoryTree=mergeCategoryTrees(data.categories,current);writeCategoryOptions(current.category,current.subcategory);
    }
    async function addParentCategory() {
      const input=get("new-parent-name");const name=input.value.trim();get("category-status").textContent="";
      if(!name){get("category-status").textContent="대분류 이름을 입력하세요.";return;}
      try{const result=await api("/api/categories",{method:"POST",body:{name,sha:categorySha}});categorySha=result.sha||"";categoryTree=mergeCategoryTrees(result.categories);writeCategoryOptions(name,"");input.value="";get("category-status").textContent=`대분류 추가됨 ${name}`;}
      catch(error){get("category-status").textContent=`${error.message}${error.requestId?` (${error.requestId})`:""}`;}
    }
    async function addChildCategory() {
      const parent=get("child-parent").value.trim();const input=get("new-child-name");const name=input.value.trim();get("category-status").textContent="";
      if(!parent){get("category-status").textContent="대분류를 선택하세요.";return;}
      if(!name){get("category-status").textContent="소분류 이름을 입력하세요.";return;}
      try{const result=await api("/api/categories",{method:"POST",body:{parent,name,sha:categorySha}});categorySha=result.sha||"";categoryTree=mergeCategoryTrees(result.categories);writeCategoryOptions(parent,name);input.value="";get("category-status").textContent=`소분류 추가됨 ${parent} / ${name}`;}
      catch(error){get("category-status").textContent=`${error.message}${error.requestId?` (${error.requestId})`:""}`;}
    }
    async function loadPost(slug) { writeForm(await api(`/api/posts/${encodeURIComponent(slug)}`)); schedulePreview(); }
    function showError(error) { model=withRequestError(model,error);get("validation").textContent=`${error.message}${error.requestId?` (${error.requestId})`:""}`; }
    async function save(draft) {
      model=readForm(draft); const existing=Boolean(model.sha); const path=existing?`/api/posts/${encodeURIComponent(model.slug)}`:"/api/posts";
      try { const result=await api(path,{method:existing?"PUT":"POST",body:model});get("save-status").textContent=`저장됨 ${result.commitSha||""}`;await loadPost(model.slug);await loadList(); }
      catch(error){showError(error);}
    }
    function schedulePreview() {
      clearTimeout(previewTimer); previewTimer=setTimeout(async()=>{if(previewController)previewController.abort();previewController=new AbortController();
        try{const draft=readForm(true);const req=createApiRequest("/api/preview",{method:"POST",csrfToken,body:draft});req.init.signal=previewController.signal;const response=await fetch(req.url,req.init);const data=await response.json();if(!response.ok)throw {status:response.status,message:data.error?.message};get("preview").innerHTML=data.html;}
        catch(error){if(error.name!=="AbortError")showError(error);}},300);
    }
    async function start() {
      try {const session=await api("/api/session");if(!session.authenticated){get("signed-out").hidden=false;return;}csrfToken=session.csrfToken;get("workspace").hidden=false;get("logout").hidden=false;writeForm(model);void loadAnalytics();void loadComments();await loadCategories().catch(()=>{get("category-status").textContent="카테고리를 불러오지 못했습니다. 페이지를 새로고침해 주세요.";});await loadList();
        const edit=new URL(location.href).searchParams.get("edit");if(edit)await loadPost(edit);}catch(error){if(error.status===401)get("signed-out").hidden=false;showError(error);}
    }
    get("new-post").addEventListener("click",()=>writeForm(createEditorModel()));get("post-filter").addEventListener("change",loadList);
    get("refresh-analytics").addEventListener("click",loadAnalytics);
    get("refresh-comments").addEventListener("click",loadComments);
    get("read-comments").addEventListener("click",()=>{
      seen = comments.reduce((latest, item) => item.createdAt > latest ? item.createdAt : latest, seen);
      try { localStorage.setItem(commentsKey, seen); } catch {}
      renderComments();
      get("comments-status").textContent = "현재 표시된 댓글을 확인했습니다.";
    });
    get("post-category").addEventListener("change",()=>{const selection=nextCategorySelection(categoryTree,get("post-category").value,get("post-subcategory").value);writeChildOptions(selection.category,selection.subcategory);});
    get("add-parent-category").addEventListener("click",addParentCategory);get("add-child-category").addEventListener("click",addChildCategory);
    get("save-draft").addEventListener("click",()=>save(true));get("publish").addEventListener("click",()=>save(false));get("post-body").addEventListener("input",schedulePreview);
    get("logout").addEventListener("click",async()=>{await api("/auth/logout",{method:"POST",body:{}});location.reload();});
    get("delete-post").addEventListener("click",()=>{get("delete-slug").textContent=model.slug;get("delete-confirmation").value="";get("delete-dialog").showModal();});
    get("confirm-delete").addEventListener("click",async event=>{event.preventDefault();const confirmation=get("delete-confirmation").value;if(!canDelete(model.slug,confirmation))return;try{await api(`/api/posts/${encodeURIComponent(model.slug)}`,{method:"DELETE",body:{sha:model.sha,confirmation}});get("delete-dialog").close();writeForm(createEditorModel());await loadList();}catch(error){showError(error);}});
    form.addEventListener("submit",event=>event.preventDefault()); return start();
  }
  return {createApiRequest,createEditorModel,parseOptionalOrder,groupAdminPosts,withRequestError,canEditSlug,canDelete,mergeCategoryTrees,childNamesFor,nextCategorySelection,renderAnalytics,countNewComments,bootstrap};
});
