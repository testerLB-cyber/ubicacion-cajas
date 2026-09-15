/* Tráfico App · Observaciones en anticipos a beneficiarios v1 */
(function(){
'use strict';
if(window.__CC_ANT_BEN_OBS_V1__) return;
window.__CC_ANT_BEN_OBS_V1__=true;

function addField(){
  const modal=document.getElementById('ccAntBenNew');
  if(!modal || modal.querySelector('[data-obs-beneficiario]')) return;
  const grid=modal.querySelector('.cc-grid');
  if(!grid) return;
  const label=document.createElement('label');
  label.className='cc-field';
  label.style.gridColumn='1 / -1';
  label.innerHTML='<span>Observaciones</span><textarea data-obs-beneficiario rows="3" maxlength="1000" placeholder="Captura observaciones del anticipo al beneficiario…" style="width:100%;resize:vertical"></textarea>';
  grid.appendChild(label);
}

function patchRpc(){
  const client=window.gmSupabase;
  if(!client || client.__ccAntBenObsRpcPatched || typeof client.rpc!=='function') return false;
  const original=client.rpc.bind(client);
  client.rpc=function(fn,args,options){
    if(fn==='cc_ant_create' && args && args.p_item && args.p_item.esCajaChica===true){
      const field=document.querySelector('#ccAntBenNew [data-obs-beneficiario]');
      if(field){
        args=Object.assign({},args,{p_item:Object.assign({},args.p_item,{observaciones:String(field.value||'').trim()||null})});
      }
    }
    return original(fn,args,options);
  };
  client.__ccAntBenObsRpcPatched=true;
  return true;
}

function install(){
  patchRpc();
  addField();
  const observer=new MutationObserver(function(){ addField(); patchRpc(); });
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
else install();
})();