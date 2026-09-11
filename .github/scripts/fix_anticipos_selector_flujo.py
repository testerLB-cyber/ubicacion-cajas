from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Selector definitivo bloqueado v4 */'
if marker in s:
    print('selector definitivo v4 ya aplicado'); raise SystemExit(0)

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

# Dejar el refuerzo v2 si existe, pero agregar un bloqueo definitivo posterior.
js=r'''

/* Tráfico App Profesional · Selector definitivo bloqueado v4 */
(function(){
 if(window.__ccAntSelectorDefinitivoV4)return;window.__ccAntSelectorDefinitivoV4=true;
 let chooser=null;
 function resolve(){
   if(typeof window.ccAntChooseTypeFinal==='function')chooser=window.ccAntChooseTypeFinal;
   return chooser;
 }
 function lock(){
   const fn=resolve();
   if(typeof fn!=='function')return false;
   try{
     Object.defineProperty(window,'ccAntNuevoAnticipo',{
       configurable:true,
       enumerable:true,
       get(){return fn;},
       set(v){
         // La versión profesional tiene un único punto de entrada para Nuevo anticipo.
         // Ignorar overrides tardíos de overlays anteriores.
         if(v===fn)return;
       }
     });
     window.ccAntNuevoAnticipo=fn;
     return true;
   }catch(e){
     window.ccAntNuevoAnticipo=fn;
     return false;
   }
 }
 function mark(){
   document.querySelectorAll('#ccAntTipoPersonaSwitch,#ccAntPendTipoPersonaSwitch').forEach(el=>el.dataset.selectorFinal='v4');
 }
 function install(){
   if(!lock())return setTimeout(install,250);
   mark();
   setTimeout(lock,500);
   setTimeout(lock,1500);
   setTimeout(lock,4000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,3000));else setTimeout(install,3000);
})();
'''
s+=js
P.write_text(s,encoding='utf-8')
print('Selector Nuevo anticipo fijado como único punto de entrada profesional')
