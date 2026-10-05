/* Tráfico App · Supabase RPC traffic guard · 2026-10-05
   Deduplica lecturas repetidas y aplica caché muy corta solo a RPC de lectura de alto tráfico.
   Las escrituras nunca se cachean. */
(function(){
  'use strict';
  if(window.__GM_RPC_TRAFFIC_GUARD__)return;
  window.__GM_RPC_TRAFFIC_GUARD__=true;

  const TTL={
    cc_ant_list:8000,
    cc_ant_mobile_pending_summary:15000,
    hs_list:5000,
    cc_hojas_beneficiarios_web:10000,
    hs_assignment_selected_folios:10000,
    hs_unit_catalog:10000,
    hs_mobile_evidence_units:10000
  };
  const cache=new Map(), inflight=new Map();

  function key(name,args){
    let a='';
    try{a=JSON.stringify(args||{});}catch(_){a='';}
    return name+'|'+a;
  }
  function cloneResponse(r){
    return r;
  }
  function install(){
    const sb=window.gmSupabase;
    if(!sb||typeof sb.rpc!=='function'||sb.rpc.__trafficGuard)return false;
    const original=sb.rpc.bind(sb);
    const wrapped=function(name,args,options){
      const ttl=TTL[name]||0;
      if(!ttl){cache.clear();return original(name,args,options);}
      const k=key(name,args),now=Date.now(),hit=cache.get(k);
      if(hit&&now-hit.at<ttl)return Promise.resolve(cloneResponse(hit.response));
      if(inflight.has(k))return inflight.get(k);
      const p=Promise.resolve(original(name,args,options)).then(r=>{
        if(!r?.error)cache.set(k,{at:Date.now(),response:r});
        return r;
      }).finally(()=>inflight.delete(k));
      inflight.set(k,p);
      return p;
    };
    wrapped.__trafficGuard=true;
    wrapped.__original=original;
    sb.rpc=wrapped;
    window.gmInvalidateRpcCache=function(names){
      if(!names){cache.clear();return;}
      const set=new Set(Array.isArray(names)?names:[names]);
      for(const k of cache.keys())if(set.has(k.split('|')[0]))cache.delete(k);
    };
    return true;
  }
  if(!install()){
    let tries=0;
    const t=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(t)},100);
  }
})();