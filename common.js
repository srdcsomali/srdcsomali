(function(){
const C=window.SRDC_CONFIG||{},sb=(C.url&&C.key&&window.supabase)?supabase.createClient(C.url,C.key):null;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const media=p=>p?`${C.url}/storage/v1/object/public/site-media/${encodeURI(p)}`:"";
const fd=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
const ic=n=>`<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const br=s=>esc(s).replace(/\n/g,"<br>");
const SVC=[
["humanitarian-development","Humanitarian and Development Consultancy","heart","Consultancy Services","Assessments, response planning and programme design for humanitarian actors.",["Humanitarian needs assessments","Emergency response planning","Community engagement","Humanitarian programme design","Protection mainstreaming","Accountability to affected populations","Coordination and response analysis"]],
["agriculture-food-security","Agriculture, Food Security and Livelihoods","sprout","Consultancy Services","Technical analysis and support for resilient agriculture and livelihoods.",["Agricultural assessments","Food security analysis","Livelihoods assessments","Agricultural extension support","Climate resilience and adaptation","Market assessments","Value chain analysis","Natural resource management"]],
["meal","Monitoring, Evaluation, Accountability and Learning (MEAL)","chart","Research and Assessments","Evidence on performance, accountability and learning.",["Baseline and endline studies","Midterm evaluations","Third-party monitoring","Project performance monitoring","Results frameworks","Indicator tracking","Data quality assessments","Accountability assessments","Learning and documentation"]],
["research-assessments","Research, Surveys and Assessments","search","Research and Assessments","Rigorous quantitative and qualitative research.",["Quantitative and qualitative research","Household surveys","Focus group discussions","Key informant interviews","Feasibility studies","Needs assessments","Market research","Community mapping"]],
["project-design-management","Project Design and Management","clipboard","Consultancy Services","From concept note to donor reporting.",["Concept note development","Project proposals","Logical frameworks","Theory of Change","Activity-based budgets","Workplans","Project implementation support","Donor reporting"]],
["digital-data-gis","Digital Data, GIS and Information Management","database","Consultancy Services","Digital collection, mapping and dashboards.",["KoboToolbox and ODK","XLSForm development","GPS data collection","GIS mapping","Data cleaning and analysis","Excel reporting systems","Power BI dashboards","Database development"]],
["training-capacity-building","Training and Capacity Building","book","Training","Practical training for organizations and teams.",["Project Cycle Management","Monitoring and Evaluation","Data collection methodologies","KoboToolbox and ODK","Research ethics","PSEA and safeguarding","Organizational capacity building"]],
["business-institutional","Business and Institutional Consultancy","briefcase","Consultancy Services","Planning and institutional strengthening.",["Business plan development","Strategic planning","Organizational capacity assessments","Institutional development","Feasibility studies","Operational assessments"]]
].map(a=>({slug:a[0],title:a[1],icon:a[2],cat:a[3],summary:a[4],scope:a[5],description:"",deliverables:[]}));
async function services(){
 if(sb){const{data}=await sb.from("services").select("*").order("sort_order");
  if(data&&data.length)return data.map(x=>({slug:x.slug,title:x.title,summary:x.summary,description:x.description,scope:x.scope||[],deliverables:x.deliverables||[],cat:x.inquiry_category,icon:(SVC.find(s=>s.slug==x.slug)||{}).icon||"briefcase"}))}
 return SVC}
const svcCard=s=>`<a class="card ac" href="/services/${esc(s.slug)}"><div class="ic">${ic(s.icon)}</div><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><span class="lnk">View service ${ic("arrow")}</span></a>`;
/* management profiles (is_management = true; a future staff directory uses show_in_directory) */
async function mgmt(){
 if(!sb)return[];
 const{data}=await sb.from("staff").select("*,departments(name,sort_order),sectors(name)").eq("is_management",true);
 return(data||[]).sort((a,b)=>((a.departments?.sort_order??99)-(b.departments?.sort_order??99))||(a.display_order-b.display_order))}
const photo=x=>x.photo_path?`<img src="${esc(media(x.photo_path))}" alt="${esc(x.full_name)}" loading="lazy">`:`<span class="ini" aria-hidden="true">${esc(x.full_name.split(/\s+/).map(w=>w[0]).slice(0,2).join(""))}</span>`;
const mCard=(x,i)=>`<button class="card" data-m="${i}" style="text-align:left;cursor:pointer;font:inherit;width:100%"><div class="ph-img">${photo(x)}</div><h3>${esc(x.full_name)}</h3><p><b>${esc(x.position)}</b></p><p class="tag">${esc([x.departments?.name,x.sectors?.name].filter(Boolean).join(" · "))}</p><span class="lnk">View profile ${ic("arrow")}</span></button>`;
const ghost=()=>[1,2,3].map(()=>`<div class="card ghost"><div class="ph-img"><span class="ini">?</span></div><h3>Management profile coming soon</h3><p>Position to be announced</p><p class="tag">Placeholder</p></div>`).join("");
function mDialog(x){
 let d=$("#md");if(!d){document.body.insertAdjacentHTML("beforeend",'<dialog id="md" aria-label="Profile"></dialog>');d=$("#md")}
 d.innerHTML=`<div style="display:flex;gap:18px;align-items:center;margin-bottom:14px"><div class="ph-img" style="width:110px;margin:0;flex:none">${photo(x)}</div><div><h3 style="margin:0">${esc(x.full_name)}</h3><p style="margin:4px 0;color:var(--muted)"><b>${esc(x.position)}</b></p><p class="tag" style="margin:0">${esc([x.departments?.name,x.sectors?.name].filter(Boolean).join(" · "))}</p></div></div>
 ${x.bio||x.short_bio?`<p>${br(x.bio||x.short_bio)}</p>`:""}${(x.responsibilities||[]).length?`<h3>Areas of responsibility</h3><ul class="ck">${x.responsibilities.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>`:""}<p><button class="btn nv" id="mx">Close</button></p>`;
 $("#mx").onclick=()=>d.close();d.addEventListener("click",e=>{if(e.target===d)d.close()});d.showModal()}
/* offices map (schematic, approximate positions) */
function drawMap(el,list){
 const L=[["Baidoa",3.11,43.65,"Headquarters",1],["Mogadishu",2.05,45.34,"Sub-office"],["Buurhakaba",2.80,44.08,"Sub-office"],["Hudur",4.12,43.89,"Sub-office"],["Qansaxdheere",2.85,43.25,"Sub-office"],["Berdale",3.25,43.35,"Sub-office"],["Jowhar",2.78,45.50,"Sub-office"]];
 const P=l=>[(l[2]-42.8)/3*500+50,(4.4-l[1])/2.6*250+40];
 el.innerHTML=L.map((l,i)=>{const[x,y]=P(l),left=l[0]=="Qansaxdheere"||l[0]=="Berdale";return`<g class="loc${l[4]?" hq":""}" data-i="${i}" tabindex="0" role="button" aria-label="${l[0]}, ${l[3]}"><circle cx="${x}" cy="${y}" r="${l[4]?10:7}"/><text x="${left?x-14:x+14}" y="${y+4}" text-anchor="${left?"end":"start"}">${l[0]}${l[4]?" (HQ)":""}</text></g>`}).join("");
 list.innerHTML=L.map((l,i)=>`<button data-i="${i}"><strong>${l[0]}</strong><br><small>${l[3]}</small></button>`).join("");
 const sel=i=>$$(".loc,.locs button").forEach(n=>n.classList.toggle("on",n.dataset.i==i));
 [el,list].forEach(c=>{c.addEventListener("click",e=>{const n=e.target.closest("[data-i]");if(n)sel(n.dataset.i)});c.addEventListener("keydown",e=>{if(e.key=="Enter"){const n=e.target.closest("[data-i]");if(n)sel(n.dataset.i)}})});sel(0)}
/* shared behaviour */
$("#yr").textContent=new Date().getFullYear();
$("#mb").onclick=()=>{const o=$("#nav").classList.toggle("open");$("#mb").setAttribute("aria-expanded",o)};
$("#nav").addEventListener("click",e=>{if(e.target.closest("a"))$("#nav").classList.remove("open")});
async function wa(){if(!sb)return;const{data}=await sb.from("site_settings").select("key,value");if(!data)return;
 const g=k=>(data.find(r=>r.key==k)||{}).value,n=g("whatsapp_number"),m=g("whatsapp_message");
 if(n&&/^[0-9]{8,15}$/.test(n))$$(".wa-link").forEach(a=>a.href=`https://wa.me/${n}?text=${encodeURIComponent(m||"Hello SRDC, I would like to enquire about your consultancy services.")}`)}
wa().catch(()=>{});
$("#nl").addEventListener("submit",async e=>{e.preventDefault();const m=$("#nm"),em=$("#ne").value.trim();
 if(!/^\S+@\S+\.\S+$/.test(em)||!$("#nc").checked){m.textContent="Enter a valid email and tick consent.";return}
 if(!sb){m.textContent="Newsletter is not available yet.";return}
 const{error}=await sb.from("subscribers").insert({email:em,consent:true});
 m.textContent=(!error||error.code=="23505")?"Thank you for subscribing.":"Sorry, please try again later.";if(!error)e.target.reset()});
window.SRDC={sb,$,$$,esc,br,media,fd,ic,SVC,services,svcCard,mgmt,mCard,ghost,mDialog,drawMap};
})();
