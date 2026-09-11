from pathlib import Path
P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
I=Path('profesional/index.html')
if not P.exists() or not I.exists(): raise SystemExit('Faltan archivos profesionales')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Nuevo anticipo apertura inmediata v7 */'
if marker not in s:
    s += r'''

/* Tráfico App Profesional · Nuevo anticipo apertura inmediata v7 */
(function(){
 if(window.__ccAntFastOpenV7)return; window.__ccAntFastOpenV7=true;
 function openNow(e){
   const b=e && e.target && e.target.closest ? e.target.closest('#ccAntNuevoBtn') : null;
   if(!b)return;
   e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
   if(typeof window.ccAntNuevoAnticipoV6==='function') return window.ccAntNuevoAnticipoV6();
   if(typeof window.ccAntChooseTypeFinal==='function') return window.ccAntChooseTypeFinal();
   if(typeof window.ccAntNuevoAnticipo==='function') return window.ccAntNuevoAnticipo();
 }
 // Captura el clic antes de handlers viejos/reintentos. No consulta Supabase para mostrar el selector.
 document.addEventListener('click',openNow,true);
 function bindDirect(){
   const b=document.getElementById('ccAntNuevoBtn'); if(!b)return;
   b.dataset.fastOpen='v7';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindDirect,{once:true});else bindDirect();
})();
'''
P.write_text(s,encoding='utf-8')
h=I.read_text(encoding='utf-8')
import re
h=re.sub(r'src="assets/js/modules/anticipos-profesional-flow\.js(?:\?v=[^"]*)?"','src="assets/js/modules/anticipos-profesional-flow.js?v=fast-open-v7"',h,count=1)
I.write_text(h,encoding='utf-8')
print('Apertura inmediata Nuevo anticipo v7 aplicada')