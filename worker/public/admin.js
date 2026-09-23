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
    return Object.assign({slug:"",title:"",description:"",date:"",category:"",tags:[],image:"",featured:false,draft:true,aiGenerated:false,body:"",sha:"",error:null}, input || {});
  }
  function withRequestError(model, error) { return Object.assign({}, model, {error}); }
  function canEditSlug(model) { return !model.sha; }
  function canDelete(slug, confirmation) { return Boolean(slug) && slug === confirmation; }

  function bootstrap(document) {
    if (!document) return;
    let csrfToken = "";
    let model = createEditorModel();
    let previewTimer;
    let previewController;
    const get = id => document.getElementById(id);
    const form = get("post-form");

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
    function readForm(draft) {
      return createEditorModel({
        slug:get("post-slug").value.trim(),title:get("post-title").value.trim(),description:get("post-description").value.trim(),
        date:get("post-date").value,category:get("post-category").value.trim(),tags:get("post-tags").value.split(",").map(v=>v.trim()).filter(Boolean),
        image:get("post-image").value.trim(),featured:get("post-featured").checked,draft,aiGenerated:get("post-ai").checked,
        body:get("post-body").value,sha:model.sha
      });
    }
    function writeForm(next) {
      model=createEditorModel(next); get("post-slug").value=model.slug; get("post-slug").disabled=!canEditSlug(model);
      get("post-title").value=model.title;get("post-description").value=model.description;get("post-date").value=model.date;
      get("post-category").value=model.category;get("post-tags").value=model.tags.join(", ");get("post-image").value=model.image;
      get("post-featured").checked=model.featured;get("post-ai").checked=model.aiGenerated;get("post-body").value=model.body;
      get("delete-post").hidden=!model.sha;get("editor-title").textContent=model.sha?"글 수정":"새 글";get("validation").textContent="";
    }
    async function loadList() {
      const data=await api("/api/posts"); const filter=get("post-filter").value; const list=get("post-list"); list.textContent="";
      data.posts.filter(p=>filter==="all"||(filter==="draft")===p.draft).forEach(p=>{const li=document.createElement("li");const b=document.createElement("button");b.type="button";b.innerHTML=`${p.title||p.slug} <span class="badge">${p.draft?"초안":"발행"}</span>`;b.addEventListener("click",()=>loadPost(p.slug));li.append(b);list.append(li);});
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
      try {const session=await api("/api/session");if(!session.authenticated){get("signed-out").hidden=false;return;}csrfToken=session.csrfToken;get("workspace").hidden=false;get("logout").hidden=false;writeForm(model);await loadList();
        const edit=new URL(location.href).searchParams.get("edit");if(edit)await loadPost(edit);}catch(error){get("signed-out").hidden=false;showError(error);}
    }
    get("new-post").addEventListener("click",()=>writeForm(createEditorModel()));get("post-filter").addEventListener("change",loadList);
    get("save-draft").addEventListener("click",()=>save(true));get("publish").addEventListener("click",()=>save(false));get("post-body").addEventListener("input",schedulePreview);
    get("logout").addEventListener("click",async()=>{await api("/auth/logout",{method:"POST",body:{}});location.reload();});
    get("delete-post").addEventListener("click",()=>{get("delete-slug").textContent=model.slug;get("delete-confirmation").value="";get("delete-dialog").showModal();});
    get("confirm-delete").addEventListener("click",async event=>{event.preventDefault();const confirmation=get("delete-confirmation").value;if(!canDelete(model.slug,confirmation))return;try{await api(`/api/posts/${encodeURIComponent(model.slug)}`,{method:"DELETE",body:{sha:model.sha,confirmation}});get("delete-dialog").close();writeForm(createEditorModel());await loadList();}catch(error){showError(error);}});
    form.addEventListener("submit",event=>event.preventDefault()); start();
  }
  return {createApiRequest,createEditorModel,withRequestError,canEditSlug,canDelete,bootstrap};
});
