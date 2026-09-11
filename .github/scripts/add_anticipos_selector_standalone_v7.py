from pathlib import Path
import re

I=Path('profesional/index.html')
S=Path('profesional/assets/js/modules/anticipos-selector-standalone.js')
if not I.exists(): raise SystemExit('No existe profesional/index.html')

js=r'''/* Tráfico App Profesional · Selector inmediato Operador/Beneficiario v9 */
(function(){
 if(window.__ccAntSelectorStandaloneV9)return;window.__ccAntSelectorStandaloneV9=true;
 const closeAll=()=>{['ccAntSelectorStandaloneV9','ccAntSelectorStandaloneV8','ccAntSelectorStandaloneV7','ccAntFastOpening'].forEach(id=>document.getElementById(id)?.remove())};
 function opening(tipo){
   document.getElementById('ccAntFastOpening')?.remove();
   const o=document.createElement('div');o.id='ccAntFastOpening';
   o.style='position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:16px';
   o.innerHTML='<div style="background:#fff;width:min(560px,94vw);border-radius:18px;overflow:hidden;box-shadow:0 30px 90px rgba(15,23,42,.5)"><div style="background:#0f172a;color:#fff;padding:17px 20px"><strong style="font-size:18px">Nuevo anticipo · '+tipo+'</strong></div><div style="padding:22px"><div style="font-weight:900;color:#0f172a">Abriendo formulario…</div><div style="font-size:11px;color:#64748b;margin-top:6px">La ventana ya está activa. Cargando catálogos necesarios.</div><div id="ccAntFastOpeningMsg" style="margin-top:12px;padding:10px;border-radius:10px;background:#f8fafc;color:#475569;font-size:11px">Consultando configuración…</div></div></div>';
   document.body.appendChild(o);
   setTimeout(()=>{const m=document.getElementById('ccAntFastOpeningMsg');if(m)m.innerHTML='<strong>La carga está tardando más de lo normal.</strong><br>Puede faltar un catálogo o Supabase puede estar respondiendo lento. Si no abre, revisaremos el mensaje exacto en lugar de dejar la pantalla congelada.'},1800);
   return o;
 }
 async function launch(tipo){
   document.getElementById('ccAntSelectorStandaloneV9')?.remove();
   const fnName=tipo==='Beneficiario'?'ccAntOpenBeneficiaryForm':'ccAntOpenOperatorForm';
   const fn=window[fnName];
   if(typeof fn!=='function'){
     closeAll();
     return alert('El formulario de '+tipo+' no está disponible. El módulo de Anticipos no terminó de inicializar correctamente.');
   }
   const wait=opening(tipo);
   try{
     const r=fn();
     if(r&&typeof r.then==='function') await r;
   }catch(e){
     console.error('Nuevo anticipo '+tipo,e);
     alert('No se pudo abrir el formulario de '+tipo+': '+(e?.message||e));
   }finally{
     wait?.remove();
   }
 }
 function openSelector(){
   closeAll();
   const ov=document.createElement('div');ov.id='ccAntSelectorStandaloneV9';
   ov.style='position:fixed;inset:0;background:rgba(15,23,42,.84);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px';
   ov.innerHTML=`<div style="background:#fff;width:min(640px,96vw);border-radius:18px;overflow:hidden;box-shadow:0 30px 90px rgba(15,23,42,.5)"><div style="background:#0f172a;color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:19px;font-weight:900">Nuevo anticipo</div><div style="font-size:12px;color:#cbd5e1;margin-top:4px">¿Para quién es el anticipo?</div></div><button type="button" data-close style="border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer">×</button></div><div style="padding:20px"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px"><button type="button" data-op style="padding:24px 18px;border:2px solid #93c5fd;border-radius:14px;background:#eff6ff;text-align:left;cursor:pointer"><div style="font-size:18px;font-weight:900;color:#1e3a8a">Operador</div><div style="font-size:11px;color:#475569;margin-top:7px">Unidad, destino, tipo de anticipo y conceptos operativos.</div></button><button type="button" data-ben style="padding:24px 18px;border:2px solid #c4b5fd;border-radius:14px;background:#f5f3ff;text-align:left;cursor:pointer"><div style="font-size:18px;font-weight:900;color:#5b21b6">Beneficiario</div><div style="font-size:11px;color:#475569;margin-top:7px">Anticipo por conceptos. Sin unidad ni destino.</div></button></div><div style="text-align:right;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button></div></div></div>`;
   document.body.appendChild(ov);
   ov.querySelector('[data-close]').onclick=()=>ov.remove();ov.querySelector('[data-cancel]').onclick=()=>ov.remove();
   ov.querySelector('[data-op]').onclick=()=>launch('Operador');ov.querySelector('[data-ben]').onclick=()=>launch('Beneficiario');
 }
 window.ccAntSelectorStandaloneV9=openSelector;window.ccAntSelectorStandaloneV8=openSelector;window.ccAntSelectorStandaloneV7=openSelector;
 function capture(e){const b=e.target?.closest?.('#ccAntNuevoBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openSelector();}
 function bind(){const b=document.getElementById('ccAntNuevoBtn');if(!b)return false;b.removeAttribute('onclick');b.onclick=e=>{e.preventDefault();e.stopPropagation();openSelector();return false};b.dataset.selectorAnticipo='standalone-v9';return true}
 function install(){bind();document.addEventListener('click',capture,true);setTimeout(bind,250);setTimeout(bind,900)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
'''
S.write_text(js,encoding='utf-8')
h=I.read_text(encoding='utf-8')
h=re.sub(r' onclick="return ccAntSelectorStandaloneV[789]\(event\)"','',h)
h=re.sub(r'(<button[^>]*id="ccAntNuevoBtn"[^>]*)(>)',r'\1 onclick="return ccAntSelectorStandaloneV9(event)"\2',h,count=1)
h=re.sub(r'<script src="assets/js/modules/anticipos-selector-standalone\.js\?v=selector-v\d+(?:-fast)?"></script>','<script src="assets/js/modules/anticipos-selector-standalone.js?v=selector-v9-fast"></script>',h,count=1)
if 'anticipos-selector-standalone.js?v=selector-v9-fast' not in h:
 anchor='<script src="assets/js/modules/anticipos-profesional-flow.js?v=selector-v6"></script>'
 if anchor not in h: anchor='<script src="assets/js/modules/anticipos-profesional-flow.js"></script>'
 if anchor not in h: raise SystemExit('No se encontró anticipos-profesional-flow.js')
 h=h.replace(anchor,anchor+'\n<script src="assets/js/modules/anticipos-selector-standalone.js?v=selector-v9-fast"></script>',1)
I.write_text(h,encoding='utf-8')
print('Selector v9 inmediato: sin esperas de 3-5 segundos, captura directa y feedback de catálogos/Supabase')
