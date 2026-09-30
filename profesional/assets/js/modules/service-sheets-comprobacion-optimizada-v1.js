(function(){
'use strict';
const ID='hsCompOptimizadaV1';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
function styles(){if(document.getElementById(ID+'Style'))return;const s=document.createElement('style');s.id=ID+'Style';s.textContent=`
#hs104CompList.hs-opt-ready>.hs104-row{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(330px,1fr))!important;gap:10px!important}
#hs104CompList .hs-opt-toolbar{grid-column:1/-1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#hs104CompList .hs-opt-search{flex:1;min-width:210px;border:1px solid #cbd5e1;border-radius:9px;padding:8px 10px;font-size:12px}
#hs104CompList .hs-opt-chip{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;cursor:pointer}
#hs104CompList .hs-opt-chip.active{background:#0f172a;color:#fff;border-color:#0f172a}
#hs104CompList .hs-list-row{margin:0!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)}
#hs104CompList .hs-list-head{align-items:flex-start!important}
#hs104CompList .hs-list-info strong{font-size:15px}
#hs104CompList .hs-opt-detail{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px;font-size:10px;color:#475569}
#hs104CompList .hs-opt-main{background:#16a34a!important;color:#fff!important;border-color:#16a34a!important}
#hs104CompList .hs-opt-empty{grid-column:1/-1;text-align:center;padding:28px;color:#64748b}
#hs104CompList.hs-opt-table>.hs104-row{display:block!important}
#hs104CompList.hs-opt-table .hs-list-row{margin-bottom:8px!important}
#hs104CompList .hs-opt-view{margin-left:auto}
@media(max-width:700px){#hs104CompList.hs-opt-ready>.hs104-row{grid-template-columns:1fr!important}#hs104CompList .hs-list-head{display:block!important}#hs104CompList .hs-list-head-actions{margin-top:8px;display:flex!important;overflow-x:auto!important;flex-wrap:nowrap!important}#hs104CompList .hs-opt-detail{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function enhance(list){
 if(!list||list.dataset.optimized==='1')return;
 const wrap=list.querySelector(':scope > .hs104-row');if(!wrap)return;
 const cards=[...wrap.querySelectorAll(':scope > .hs-list-row')];if(!cards.length)return;
 list.dataset.optimized='1';list.classList.add('hs-opt-ready');
 const bar=document.createElement('div');bar.className='hs-opt-toolbar';
 bar.innerHTML='<div><b style="font-size:12px;color:#0f172a">Bandeja de comprobación</b><div style="font-size:9px;color:#64748b">Encuentra y procesa primero las hojas listas.</div></div><input class="hs-opt-search" type="search" placeholder="Buscar folio, cliente, unidad, remolque…"><button class="hs-opt-chip active" data-f="TODAS">Todas <span></span></button><button class="hs-opt-chip" data-f="PRECARGADA">Precargadas <span></span></button><button class="hs-opt-chip" data-f="PENDIENTE">Pendientes <span></span></button><button class="hs-opt-chip hs-opt-view" data-view="RAPIDA"><i class="fa-solid fa-table-cells-large"></i> Vista rápida</button>';
 wrap.prepend(bar);
 let filter='TODAS',q='';
 cards.forEach(card=>{
   const pre=!!card.querySelector('.hs104-ok');
   card.dataset.optStatus=pre?'PRECARGADA':'PENDIENTE';
   const note=card.querySelector('.hs104-note')?.textContent||'';
   card.dataset.optText=norm((card.dataset.hsFolio||'')+' '+(card.dataset.hsPerson||'')+' '+note+' '+card.textContent);
   const info=card.querySelector('.hs-list-info');
   if(info&&!info.querySelector('.hs-opt-detail')){const d=document.createElement('div');d.className='hs-opt-detail';d.innerHTML='<span><i class="fa-solid fa-user"></i> '+esc(card.dataset.hsPerson||'—')+'</span><span><i class="fa-solid fa-circle-info"></i> '+(pre?'Lista con datos precargados':'Requiere completar datos')+'</span>';info.appendChild(d)}
   const edit=card.querySelector('[data-hs-edit]');
   if(pre&&edit){edit.classList.add('hs-opt-main');edit.innerHTML='<i class="fa-solid fa-check"></i> Comprobar'}
 });
 const counts=()=>{bar.querySelector('[data-f="TODAS"] span').textContent='('+cards.length+')';bar.querySelector('[data-f="PRECARGADA"] span').textContent='('+cards.filter(c=>c.dataset.optStatus==='PRECARGADA').length+')';bar.querySelector('[data-f="PENDIENTE"] span').textContent='('+cards.filter(c=>c.dataset.optStatus==='PENDIENTE').length+')'};
 const draw=()=>{let visible=0;cards.forEach(c=>{const ok=(filter==='TODAS'||c.dataset.optStatus===filter)&&(!q||c.dataset.optText.includes(q));c.style.display=ok?'':'none';if(ok)visible++});let e=wrap.querySelector('.hs-opt-empty');if(!visible){if(!e){e=document.createElement('div');e.className='hs-opt-empty';e.textContent='No hay hojas con este filtro.';wrap.appendChild(e)}}else e?.remove()};
 bar.querySelector('.hs-opt-search').oninput=e=>{q=norm(e.target.value);draw()};
 bar.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;bar.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('active',x===b));draw()});
 bar.querySelector('[data-view]').onclick=e=>{const b=e.currentTarget,table=list.classList.toggle('hs-opt-table');b.dataset.view=table?'TABLA':'RAPIDA';b.innerHTML=table?'<i class="fa-solid fa-list"></i> Vista tabla':'<i class="fa-solid fa-table-cells-large"></i> Vista rápida'};
 counts();draw();
}
function watch(){styles();const run=()=>{const l=document.getElementById('hs104CompList');if(l){if(!l.querySelector('.hs-list-modal-open'))enhance(l)}};new MutationObserver(()=>setTimeout(run,30)).observe(document.body,{subtree:true,childList:true});setInterval(run,1200);run()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();