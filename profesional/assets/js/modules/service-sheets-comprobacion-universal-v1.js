/* Comprobación universal · Control de Hojas · 2026-09-29 */
(function(){
'use strict';
if(window.__HS_COMP_UNIVERSAL_V1__)return;window.__HS_COMP_UNIVERSAL_V1__=true;
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let active=false,allRows=[],host=null,legacy=null;
function css(){if(document.getElementById('hsCompUniversalCss'))return;let s=document.createElement('style');s.id='hsCompUniversalCss';s.textContent=`
#hsCompUniversal{margin-top:12px}.hscu-top{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:10px}.hscu-title{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.hscu-title strong{font-size:15px}.hscu-search{display:flex;gap:8px;flex-wrap:wrap}.hscu-search input{flex:1;min-width:240px;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px}.hscu-filters{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.hscu-filter{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:800;cursor:pointer}.hscu-filter.active{background:#0f172a;color:#fff;border-color:#0f172a}.hscu-table{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:auto}.hscu-head,.hscu-item{display:grid;grid-template-columns:minmax(145px,.8fr) minmax(180px,1.2fr) minmax(190px,1.5fr) 105px minmax(120px,.8fr);gap:10px;align-items:center;padding:10px 12px}.hscu-head{background:#f8fafc;color:#64748b;font-size:9px;font-weight:900;text-transform:uppercase}.hscu-item{border-top:1px solid #f1f5f9;font-size:11px}.hscu-folio{font-weight:900;color:#0f172a;font-size:12px}.hscu-person small{display:block;color:#64748b;margin-top:2px}.hscu-state{display:inline-block;border-radius:999px;padding:5px 7px;font-size:9px;font-weight:900}.hscu-ready{background:#dcfce7;color:#166534}.hscu-pending{background:#fef3c7;color:#92400e}.hscu-action{justify-self:end}.hscu-action button{white-space:nowrap}.hscu-empty{padding:30px;text-align:center;color:#64748b}.hscu-legacy{display:none!important}
@media(max-width:760px){.hscu-head{display:none}.hscu-item{grid-template-columns:1fr auto;gap:5px 10px}.hscu-item>div:nth-child(2),.hscu-item>div:nth-child(3){grid-column:1/-1}.hscu-item>div:nth-child(4){grid-column:1}.hscu-action{grid-column:2;grid-row:1}.hscu-search input{min-width:100%}}
`;document.head.appendChild(s)}
function selectedRows(){
 const type=document.getElementById('hs104CompType'),person=document.getElementById('hs104CompPerson'),list=document.getElementById('hs104CompList');
 if(!type||!person||!list)return[];
 const out=[];
 [...type.options].filter(o=>o.value).forEach(()=>{});
 return out;
}
function harvest(){
 const list=document.getElementById('hs104CompList');if(!list)return;
 list.querySelectorAll('[data-row]').forEach(r=>{const folio=r.dataset.hsFolio||'';if(!folio)return;if(!allRows.some(x=>x.folio===folio)){allRows.push({folio,person:r.dataset.hsPerson||'',ptype:r.dataset.hsPersonType||'',personId:document.getElementById('hs104CompPerson')?.value||'',status:r.querySelector('.hs104-ok')?'PRECARGADA':'PENDIENTE',note:r.querySelector('.hs104-note')?.textContent||'',row:r.cloneNode(true),source:r})}});
}
async function collect(){
 const type=document.getElementById('hs104CompType'),person=document.getElementById('hs104CompPerson');if(!type||!person)return;
 const originalType=type.value,originalPerson=person.value;allRows=[];
 for(const t of ['OPERADOR','BENEFICIARIO']){
   type.value=t;type.dispatchEvent(new Event('change',{bubbles:true}));
   await new Promise(r=>setTimeout(r,40));
   const people=[...person.options].filter(o=>o.value).map(o=>o.value);
   for(const id of people){
     person.value=id;person.dispatchEvent(new Event('change',{bubbles:true}));
     await new Promise(r=>setTimeout(r,18));harvest();
   }
 }
 type.value=originalType||'OPERADOR';type.dispatchEvent(new Event('change',{bubbles:true}));
 await new Promise(r=>setTimeout(r,40));if(originalPerson){person.value=originalPerson;person.dispatchEvent(new Event('change',{bubbles:true}))}
 draw();
}
function openOriginal(item){
 const type=document.getElementById('hs104CompType'),person=document.getElementById('hs104CompPerson'),search=document.getElementById('hs104CompPersonSearch');
 if(!type||!person)return;
 type.value=item.ptype||'OPERADOR';type.dispatchEvent(new Event('change',{bubbles:true}));
 setTimeout(()=>{
   const opt=[...person.options].find(o=>String(o.value)===String(item.personId))||[...person.options].find(o=>norm(o.textContent).includes(norm(item.person)));
   if(opt){person.value=opt.value;if(search)search.value=opt.textContent;person.dispatchEvent(new Event('change',{bubbles:true}));
     setTimeout(()=>{const row=[...document.querySelectorAll('#hs104CompList [data-row]')].find(r=>r.dataset.hsFolio===item.folio);row?.querySelector('[data-hs-edit]')?.click()},50)}
 },50);
}
function draw(){
 if(!host)return;const q=norm(host.querySelector('[data-q]')?.value),f=host.querySelector('.hscu-filter.active')?.dataset.f||'TODAS';
 let rows=allRows.filter(x=>(f==='TODAS'||f===x.ptype||f===x.status)&&(!q||norm(x.folio+' '+x.person+' '+x.ptype+' '+x.note).includes(q)));
 const body=host.querySelector('[data-body]');body.innerHTML=rows.length?rows.map((x,i)=>`<div class="hscu-item"><div class="hscu-folio">${esc(x.folio)}</div><div class="hscu-person"><b>${esc(x.person||'—')}</b><small>${x.ptype==='BENEFICIARIO'?'Beneficiario':'Operador'}</small></div><div>${esc(x.note||'Sin datos precargados')}</div><div><span class="hscu-state ${x.status==='PRECARGADA'?'hscu-ready':'hscu-pending'}">${x.status==='PRECARGADA'?'LISTA / PRECARGADA':'POR COMPLETAR'}</span></div><div class="hscu-action"><button class="cc-btn ${x.status==='PRECARGADA'?'cc-btn-primary':'cc-btn-light'}" data-open="${i}">${x.status==='PRECARGADA'?'Comprobar':'Completar'}</button></div></div>`).join(''):'<div class="hscu-empty">No hay hojas pendientes con estos filtros.</div>';
 body.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openOriginal(rows[Number(b.dataset.open)]));
 const n=host.querySelector('[data-count]');if(n)n.textContent=rows.length+' hoja(s)';
}
function install(){
 if(active)return;legacy=document.querySelector('#hs104CompList')?.closest('.hs104-card');if(!legacy)return;
 css();active=true;legacy.classList.add('hscu-legacy');host=document.createElement('div');host.id='hsCompUniversal';host.innerHTML=`<div class="hscu-top"><div class="hscu-title"><div><strong>Comprobación de hojas</strong><div class="hs104-note">Busca cualquier hoja sin importar qué operador o beneficiario la tenga.</div></div><b data-count>0 hoja(s)</b></div><div class="hscu-search"><input data-q type="search" placeholder="Buscar folio, operador, beneficiario, cliente, unidad o remolque…"><button class="cc-btn cc-btn-light" data-refresh><i class="fa-solid fa-rotate"></i> Actualizar</button></div><div class="hscu-filters"><button class="hscu-filter active" data-f="TODAS">Todas</button><button class="hscu-filter" data-f="OPERADOR">Operadores</button><button class="hscu-filter" data-f="BENEFICIARIO">Beneficiarios</button><button class="hscu-filter" data-f="PRECARGADA">Precargadas</button><button class="hscu-filter" data-f="PENDIENTE">Por completar</button></div></div><div class="hscu-table"><div class="hscu-head"><div>Folio</div><div>Persona</div><div>Información</div><div>Estado</div><div>Acción</div></div><div data-body><div class="hscu-empty">Cargando hojas pendientes…</div></div></div>`;legacy.parentNode.insertBefore(host,legacy);host.querySelector('[data-q]').oninput=draw;host.querySelector('[data-refresh]').onclick=collect;host.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{host.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('active',x===b));draw()});collect();
}
function reset(){if(host)host.remove();host=null;active=false;legacy?.classList.remove('hscu-legacy');legacy=null}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-v]');if(b){setTimeout(()=>{if(b.dataset.v==='Comprobacion'){reset();install()}else reset()},120)}},true);
new MutationObserver(()=>{if(document.querySelector('#hs104CompList')&&!active)setTimeout(install,80)}).observe(document.body,{childList:true,subtree:true});
})();
