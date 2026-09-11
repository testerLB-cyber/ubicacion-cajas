from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
I=Path('profesional/index.html')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
if not I.exists(): raise SystemExit('No existe profesional/index.html')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Selector definitivo directo v5 */'
if marker in s:
    print('selector definitivo v5 ya aplicado'); raise SystemExit(0)

# Exponer el selector definitivo del flujo Operador / Beneficiario.
old="function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntNuevoAnticipo=chooseType;}"
new="function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntChooseTypeFinal=chooseType;window.ccAntNuevoAnticipo=chooseType;}"
if old in s:
    s=s.replace(old,new,1)
elif "window.ccAntChooseTypeFinal=chooseType" not in s:
    raise SystemExit('No se encontró install() del selector Operador/Beneficiario')

# Beneficiarios y Operadores usan el mismo PDF/acciones base; no instalar PDF alterno.
s=s.replace("installRenderWrap();installLinksWrap();installPdfWrap();applyAll();",
            "installRenderWrap();installLinksWrap();applyAll();",1)

js=r'''

/* Tráfico App Profesional · Selector definitivo directo v5 */
(function(){
 if(window.__ccAntSelectorDefinitivoV5)return;window.__ccAntSelectorDefinitivoV5=true;
 let chooser=null;
 function resolve(){
   if(typeof window.ccAntChooseTypeFinal==='function')chooser=window.ccAntChooseTypeFinal;
   return chooser;
 }
 function bindButton(){
   const fn=resolve();
   const btn=document.getElementById('ccAntNuevoBtn');
   if(typeof fn!=='function'||!btn)return false;
   btn.removeAttribute('onclick');
   btn.onclick=function(ev){
     ev?.preventDefault?.();
     ev?.stopPropagation?.();
     return fn();
   };
   btn.dataset.selectorAnticipo='operador-beneficiario-v5';
   return true;
 }
 function lockGlobal(){
   const fn=resolve();
   if(typeof fn!=='function')return false;
   try{
     Object.defineProperty(window,'ccAntNuevoAnticipo',{
       configurable:true,
       enumerable:true,
       get(){return fn;},
       set(v){ if(v===fn)return; }
     });
   }catch(e){ window.ccAntNuevoAnticipo=fn; }
   return true;
 }
 function install(){
   if(!lockGlobal()||!bindButton())return setTimeout(install,200);
   [400,1200,3000,6000].forEach(ms=>setTimeout(()=>{lockGlobal();bindButton();},ms));
   const root=document.getElementById('ccPanelAnticipos')||document.body;
   new MutationObserver(()=>bindButton()).observe(root,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1800));else setTimeout(install,1800);
})();
'''
s+=js
P.write_text(s,encoding='utf-8')

# Cache-buster obligatorio para que GitHub Pages/navegadores no reutilicen el JS anterior.
h=I.read_text(encoding='utf-8')
old_src='src="assets/js/modules/anticipos-profesional-flow.js"'
new_src='src="assets/js/modules/anticipos-profesional-flow.js?v=selector-v5"'
if old_src in h:
    h=h.replace(old_src,new_src,1)
elif 'anticipos-profesional-flow.js?v=selector-v5' not in h:
    raise SystemExit('No se encontró script anticipos-profesional-flow.js en index profesional')
I.write_text(h,encoding='utf-8')
print('Selector Nuevo anticipo v5 fijado directamente al botón y cache-buster aplicado')
