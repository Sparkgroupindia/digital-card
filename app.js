
const C=window.APP_CONFIG;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const val=(o,k,d="")=>o&&o[k]!=null?String(o[k]):d;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function apiReady(){return C.API_URL && !C.API_URL.includes("PASTE_")}
async function api(action,data={}){
  if(!apiReady()) throw new Error("config.js me Apps Script /exec URL paste karein.");
  const body=new URLSearchParams({action,payload:JSON.stringify(data)});
  const r=await fetch(C.API_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body});
  const j=await r.json(); if(!j.ok) throw new Error(j.message||"API error"); return j.data;
}
async function compressImage(file,targetKB=C.TARGET_IMAGE_KB){
  if(!file) return "";
  if(file.size>C.MAX_SOURCE_MB*1024*1024) throw new Error(`Image ${C.MAX_SOURCE_MB}MB se kam honi chahiye.`);
  const bitmap=await createImageBitmap(file);
  let max=1200, scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  let w=Math.round(bitmap.width*scale),h=Math.round(bitmap.height*scale);
  const canvas=document.createElement("canvas"); canvas.width=w;canvas.height=h;
  canvas.getContext("2d").drawImage(bitmap,0,0,w,h);
  let q=.82, blob;
  for(let i=0;i<12;i++){
    blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",q));
    if(blob.size<=targetKB*1024 || q<=.32) break;
    q-=.06;
  }
  if(blob.size>targetKB*1024){
    const ratio=Math.sqrt((targetKB*1024)/blob.size)*.94;
    const c2=document.createElement("canvas"); c2.width=Math.max(420,Math.round(w*ratio));c2.height=Math.max(420,Math.round(h*ratio));
    c2.getContext("2d").drawImage(canvas,0,0,c2.width,c2.height);
    blob=await new Promise(r=>c2.toBlob(r,"image/jpeg",.68));
  }
  return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)});
}
function shell(content,sub="Create • Share • Edit Anytime"){
  $("#app").innerHTML=`<main class="shell"><header class="top"><div class="brand">SPARK <b>DIGITAL CARD</b></div><div class="sub">${sub}</div></header>${content}</main>`;
}
function route(){
  const p=new URLSearchParams(location.search);
  if(p.has("admin")) return adminLogin();
  if(p.get("edit")) return editLogin(p.get("edit"));
  if(p.get("id")) return publicCard(p.get("id"));
  return createForm();
}
function createForm(){
 shell(`<div class="wrap">
  <div class="panel"><div class="title">Create Digital Business Card</div><p class="hint">Customer ki details aur photo/logo upload karein. Image browser me compress hokar approx. 100–150 KB me Drive par save hogi.</p>
  <div class="steps"><i class="step on"></i><i class="step on"></i><i class="step on"></i></div>
  <form id="create" class="grid">
   <div class="upload"><img id="photoPrev" src="https://placehold.co/200x200?text=Photo"><b>Profile Photo *</b><div class="small">JPG/PNG/WebP • source max ${C.MAX_SOURCE_MB}MB</div><input id="photo" type="file" accept="image/*" required></div>
   <div class="upload"><img id="logoPrev" src="https://placehold.co/200x200?text=Logo"><b>Business Logo</b><div class="small">Optional</div><input id="logo" type="file" accept="image/*"></div>
   <div class="field"><label>Your Name *</label><input name="name" required></div>
   <div class="field"><label>Business Name *</label><input name="business" required></div>
   <div class="grid grid2"><div class="field"><label>Mobile *</label><input name="mobile" inputmode="numeric" required></div><div class="field"><label>WhatsApp</label><input name="whatsapp" inputmode="numeric"></div></div>
   <div class="grid grid2"><div class="field"><label>Designation</label><input name="designation" placeholder="Proprietor"></div><div class="field"><label>Category</label><input name="category" placeholder="Jewellery Shop"></div></div>
   <div class="field"><label>Tagline</label><input name="tagline" placeholder="Gold | Diamond | Silver"></div>
   <div class="field"><label>About Business</label><textarea name="about"></textarea></div>
   <div class="field"><label>Address</label><textarea name="address"></textarea></div>
   <div class="field"><label>Google Maps Link</label><input name="map"></div>
   <div class="field"><label>Website</label><input name="website"></div>
   <div class="grid grid2"><div class="field"><label>Instagram</label><input name="instagram"></div><div class="field"><label>Facebook</label><input name="facebook"></div></div>
   <button class="btn primary full" type="submit">Create Card →</button>
  </form></div></div>`);
 const bind=(id,pid)=>$("#"+id).onchange=e=>{if(e.target.files[0]) $("#"+pid).src=URL.createObjectURL(e.target.files[0])}; bind("photo","photoPrev");bind("logo","logoPrev");
 $("#create").onsubmit=async e=>{
   e.preventDefault(); const b=e.submitter;b.disabled=true;b.textContent="Compressing & Creating...";
   try{
     const f=new FormData(e.target), data=Object.fromEntries(f.entries()); delete data.photo;delete data.logo;
     data.photoData=await compressImage($("#photo").files[0]);
     if($("#logo").files[0]) data.logoData=await compressImage($("#logo").files[0],120);
     const out=await api("createCard",data); showReady(out);
   }catch(err){toast(err.message)}finally{b.disabled=false;b.textContent="Create Card →"}
 };
}
function showReady(o){
 shell(`<div class="wrap"><div class="panel" style="text-align:center;padding:28px 18px"><div style="font-size:70px">✅</div><div class="title">Your Digital Card is Ready!</div><p class="hint">Card ID: <b>${esc(o.id)}</b> • Free validity ${C.FREE_VALIDITY_DAYS} days</p>
 <div class="field"><input id="publicLink" readonly value="${esc(o.publicUrl)}"></div>
 <div class="actions"><button class="btn green" id="wa">WhatsApp</button><button class="btn blue" id="copy">Copy Link</button></div>
 <br><div class="field"><label>Customer Edit Link</label><input id="editLink" readonly value="${esc(o.editUrl)}"></div>
 <p class="small">Edit PIN customer ko private rakhein: <b>${esc(o.editPin)}</b></p>
 <button class="btn ghost full" onclick="location.href='${esc(o.publicUrl)}'">View Card</button></div></div>`);
 $("#copy").onclick=()=>navigator.clipboard.writeText(o.publicUrl).then(()=>toast("Link copied"));
 $("#wa").onclick=()=>open("https://wa.me/?text="+encodeURIComponent("My Digital Business Card: "+o.publicUrl),"_blank");
}
async function publicCard(id){
 shell(`<div class="loading">Loading digital card...</div>`,"Public Digital Business Card");
 try{const c=await api("getCard",{id}); renderCard(c)}catch(e){shell(`<div class="wrap"><div class="panel empty"><h2>Card unavailable</h2><p>${esc(e.message)}</p></div></div>`)}
}
function renderCard(c){
 const phone=val(c,"Mobile").replace(/\D/g,""), wa=(val(c,"WhatsApp")||phone).replace(/\D/g,"");
 shell(`<div class="wrap"><div class="preview-card">
 <section class="hero">${c.LogoURL?`<img class="logo-circle" src="${esc(c.LogoURL)}">`:`<div style="font-size:52px">♛</div>`}<div class="business">${esc(c.BusinessName)}</div><div class="tagline">${esc(c.Tagline)}</div></section>
 <section class="white-area"><div class="person"><img src="${esc(c.PhotoURL||"https://placehold.co/200x200?text=Photo")}"><h2>${esc(c.Name)}</h2><p>${esc(c.Designation||c.Category)}</p></div>
 <div class="contact-row">
 <a class="round call" href="tel:${phone}">☎</a><a class="round wa" href="https://wa.me/91${wa.replace(/^91/,"")}" target="_blank">◉</a>
 ${c.MapLink?`<a class="round map" href="${esc(c.MapLink)}" target="_blank">⌖</a>`:""}${c.Website?`<a class="round web" href="${esc(c.Website)}" target="_blank">◎</a>`:""}
 </div>
 ${c.About?`<div class="section-title">About Us</div><div class="hint">${esc(c.About)}</div>`:""}
 ${c.Address?`<div class="section-title">Our Location</div><div class="hint">${esc(c.Address)}</div>`:""}
 <div class="section-title">Share Card</div><div class="actions"><button class="btn green" onclick="open('https://wa.me/?text='+encodeURIComponent(location.href),'_blank')">WhatsApp</button><button class="btn blue" onclick="navigator.share?navigator.share({title:'${esc(c.BusinessName)}',url:location.href}):navigator.clipboard.writeText(location.href)">Share</button></div>
 </section></div></div>`,"Digital Business Card");
}
function editLogin(id){
 shell(`<div class="wrap"><div class="panel"><div class="title">Customer Edit Panel</div><p class="hint">Card ID: ${esc(id)}</p><form id="elog" class="grid"><div class="field"><label>Edit PIN</label><input name="pin" inputmode="numeric" required></div><button class="btn primary full">Login</button></form></div></div>`);
 $("#elog").onsubmit=async e=>{e.preventDefault();try{const pin=new FormData(e.target).get("pin");const c=await api("editLogin",{id,pin}); editPanel(c,pin)}catch(x){toast(x.message)}};
}
function editPanel(c,pin){
 shell(`<div class="wrap"><div class="panel"><div class="title">My Card Dashboard</div><p><span class="status ${esc(c.Status)}">${esc(c.Status)}</span> &nbsp; Valid Till: <b>${esc(c.ValidTill)}</b></p>
 <div class="actions"><button class="btn blue" onclick="location.href='?id=${encodeURIComponent(c.CardID)}'">View Card</button><button class="btn green" id="shareEdit">Share</button></div></div>
 <div class="panel"><form id="editForm" class="grid">
 <div class="upload"><img id="eprev" src="${esc(c.PhotoURL||"https://placehold.co/200x200?text=Photo")}"><b>Change Profile Photo</b><input id="ephoto" type="file" accept="image/*"></div>
 ${["Name","BusinessName","Mobile","WhatsApp","Designation","Category","Tagline","Website","MapLink","Instagram","Facebook"].map(k=>`<div class="field"><label>${k}</label><input name="${k}" value="${esc(c[k])}"></div>`).join("")}
 <div class="field"><label>About</label><textarea name="About">${esc(c.About)}</textarea></div><div class="field"><label>Address</label><textarea name="Address">${esc(c.Address)}</textarea></div>
 <button class="btn primary full">Save Changes</button></form></div></div>`,"Customer Edit Panel");
 $("#ephoto").onchange=e=>{if(e.target.files[0])$("#eprev").src=URL.createObjectURL(e.target.files[0])};
 $("#shareEdit").onclick=()=>navigator.share?.({url:C.PUBLIC_BASE+"?id="+c.CardID});
 $("#editForm").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{let data=Object.fromEntries(new FormData(e.target).entries());data.id=c.CardID;data.pin=pin;if($("#ephoto").files[0])data.photoData=await compressImage($("#ephoto").files[0]);await api("updateCard",data);toast("Card updated");setTimeout(()=>location.reload(),700)}catch(x){toast(x.message)}finally{b.disabled=false}};
}
function adminLogin(){
 shell(`<div class="wrap"><div class="panel"><div class="title">Spark Admin</div><p class="hint">All clients manage karein: view, edit, stop/active, delete.</p><form id="alog" class="grid"><div class="field"><label>Admin Password</label><input name="password" type="password" required></div><button class="btn dark full">Open Admin</button></form></div></div>`,"Master Admin Panel");
 $("#alog").onsubmit=async e=>{e.preventDefault();const password=new FormData(e.target).get("password");try{await loadAdmin(password)}catch(x){toast(x.message)}};
}
async function loadAdmin(password){
 const list=await api("adminList",{password});
 shell(`<div class="wrap"><div class="panel"><div class="title">All Clients</div><p class="hint">${list.length} cards found</p><div class="field"><input id="search" placeholder="Search name, business, mobile, ID"></div></div><div id="clients" class="list"></div></div>`,"Master Admin Panel");
 const draw=q=>{$("#clients").innerHTML=list.filter(c=>JSON.stringify(c).toLowerCase().includes((q||"").toLowerCase())).map(c=>`<div class="client">
 <div class="client-head"><div><h3>${esc(c.BusinessName||c.Name)}</h3><p>${esc(c.CardID)} • ${esc(c.Name)} • ${esc(c.Mobile)}</p><p>Valid: ${esc(c.ValidTill)}</p></div><span class="status ${esc(c.Status)}">${esc(c.Status)}</span></div>
 <div class="actions" style="margin-top:10px"><button class="btn blue" data-act="view" data-id="${esc(c.CardID)}">View</button><button class="btn ghost" data-act="edit" data-id="${esc(c.CardID)}">Edit</button><button class="btn dark" data-act="toggle" data-id="${esc(c.CardID)}">${c.Status==="ACTIVE"?"Stop":"Active"}</button><button class="btn red" data-act="delete" data-id="${esc(c.CardID)}">Delete</button></div></div>`).join("")||`<div class="empty">No clients</div>`};
 draw("");$("#search").oninput=e=>draw(e.target.value);
 $("#clients").onclick=async e=>{const b=e.target.closest("button");if(!b)return;const id=b.dataset.id,a=b.dataset.act;if(a==="view")return location.href="?id="+id;if(a==="edit"){const c=list.find(x=>x.CardID===id);return adminEdit(c,password)}if(a==="delete"&&!confirm("Permanently delete this card?"))return;try{await api("adminAction",{password,id,action:a});toast("Updated");setTimeout(()=>loadAdmin(password),500)}catch(x){toast(x.message)}};
}
function adminEdit(c,password){
 shell(`<div class="wrap"><div class="panel"><div class="title">Admin Edit • ${esc(c.CardID)}</div><form id="aedit" class="grid">
 ${["Name","BusinessName","Mobile","WhatsApp","Designation","Category","Tagline","Website","MapLink","Instagram","Facebook","ValidTill"].map(k=>`<div class="field"><label>${k}</label><input name="${k}" value="${esc(c[k])}"></div>`).join("")}
 <div class="field"><label>About</label><textarea name="About">${esc(c.About)}</textarea></div><div class="field"><label>Address</label><textarea name="Address">${esc(c.Address)}</textarea></div>
 <button class="btn primary full">Save</button><button type="button" class="btn ghost full" id="back">Back</button></form></div></div>`,"Master Admin Panel");
 $("#back").onclick=()=>loadAdmin(password);
 $("#aedit").onsubmit=async e=>{e.preventDefault();try{const fields=Object.fromEntries(new FormData(e.target).entries());await api("adminAction",{password,id:c.CardID,action:"edit",fields});toast("Saved");setTimeout(()=>loadAdmin(password),500)}catch(x){toast(x.message)}};
}
route();
