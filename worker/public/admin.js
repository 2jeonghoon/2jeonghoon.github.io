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
    return Object.assign({slug:"",title:"",description:"",date:"",category:"",subcategory:"",tags:[],image:"",featured:false,draft:true,aiGenerated:false,body:"",sha:"",error:null}, input || {});
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
    const children=childNamesFor(categories,normalizedCategory);
    return {category:normalizedCategory,subcategory:children.some(name=>categoryKey(name)===categoryKey(normalizedSubcategory))?normalizedSubcategory:""};
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
        date:get("post-date").value,category:get("post-category").value.trim(),subcategory:get("post-subcategory").value.trim(),tags:get("post-tags").value.split(",").map(v=>v.trim()).filter(Boolean),
        image:get("post-image").value.trim(),featured:get("post-featured").checked,draft,aiGenerated:get("post-ai").checked,
        body:get("post-body").value,sha:model.sha
      });
    }
    function appendOption(select,value,label) { const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option); }
    function writeChildOptions(category,selected) {
      const select=get("post-subcategory");const names=childNamesFor(categoryTree,category);select.textContent="";appendOption(select,"","소분류 없음");
      names.forEach(name=>appendOption(select,name,name));select.disabled=!category;select.value=names.some(name=>categoryKey(name)===categoryKey(selected))?selected:"";
    }
    function writeManagerParentOptions(selected) {
      const select=get("child-parent");select.textContent="";appendOption(select,"","대분류 선택");
      categoryTree.forEach(category=>appendOption(select,category.name,category.name));select.value=selected||"";
    }
    function writeCategoryOptions(category,subcategory) {
      const current={category:category||"",subcategory:subcategory||""};categoryTree=mergeCategoryTrees(categoryTree,current);
      const select=get("post-category");select.textContent="";appendOption(select,"","대분류 선택");
      categoryTree.forEach(item=>appendOption(select,item.name,item.name));select.value=current.category;
      writeChildOptions(current.category,current.subcategory);writeManagerParentOptions(get("child-parent").value||current.category);
    }
    function writeForm(next) {
      model=createEditorModel(next); get("post-slug").value=model.slug; get("post-slug").disabled=!canEditSlug(model);
      get("post-title").value=model.title;get("post-description").value=model.description;get("post-date").value=model.date;
      writeCategoryOptions(model.category,model.subcategory);get("post-tags").value=model.tags.join(", ");get("post-image").value=model.image;
      get("post-featured").checked=model.featured;get("post-ai").checked=model.aiGenerated;get("post-body").value=model.body;
      get("delete-post").hidden=!model.sha;get("editor-title").textContent=model.sha?"글 수정":"새 글";get("validation").textContent="";
    }
    async function loadList() {
      const data=await api("/api/posts"); const filter=get("post-filter").value; const list=get("post-list"); list.textContent="";
      data.posts.filter(p=>filter==="all"||(filter==="draft")===p.draft).forEach(p=>{const li=document.createElement("li");const b=document.createElement("button");const badge=document.createElement("span");b.type="button";badge.className="badge";badge.textContent=p.draft?"초안":"발행";b.append(document.createTextNode(`${p.title||p.slug} `),badge);b.addEventListener("click",()=>loadPost(p.slug));li.append(b);list.append(li);});
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
      try {const session=await api("/api/session");if(!session.authenticated){get("signed-out").hidden=false;return;}csrfToken=session.csrfToken;get("workspace").hidden=false;get("logout").hidden=false;writeForm(model);await loadCategories();await loadList();
        const edit=new URL(location.href).searchParams.get("edit");if(edit)await loadPost(edit);}catch(error){get("signed-out").hidden=false;showError(error);}
    }
    get("new-post").addEventListener("click",()=>writeForm(createEditorModel()));get("post-filter").addEventListener("change",loadList);
    get("post-category").addEventListener("change",()=>{const selection=nextCategorySelection(categoryTree,get("post-category").value,get("post-subcategory").value);writeChildOptions(selection.category,selection.subcategory);});
    get("add-parent-category").addEventListener("click",addParentCategory);get("add-child-category").addEventListener("click",addChildCategory);
    get("save-draft").addEventListener("click",()=>save(true));get("publish").addEventListener("click",()=>save(false));get("post-body").addEventListener("input",schedulePreview);
    get("logout").addEventListener("click",async()=>{await api("/auth/logout",{method:"POST",body:{}});location.reload();});
    get("delete-post").addEventListener("click",()=>{get("delete-slug").textContent=model.slug;get("delete-confirmation").value="";get("delete-dialog").showModal();});
    get("confirm-delete").addEventListener("click",async event=>{event.preventDefault();const confirmation=get("delete-confirmation").value;if(!canDelete(model.slug,confirmation))return;try{await api(`/api/posts/${encodeURIComponent(model.slug)}`,{method:"DELETE",body:{sha:model.sha,confirmation}});get("delete-dialog").close();writeForm(createEditorModel());await loadList();}catch(error){showError(error);}});
    form.addEventListener("submit",event=>event.preventDefault()); start();
  }
  return {createApiRequest,createEditorModel,withRequestError,canEditSlug,canDelete,mergeCategoryTrees,childNamesFor,nextCategorySelection,bootstrap};
});
