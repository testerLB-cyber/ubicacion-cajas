(()=>{'use strict';
const sb=()=>window.gmSupabase,storeKey='cc_mirror_session_key_v1';
let clientKey=sessionStorage.getItem(storeKey);
if(!clientKey){clientKey=crypto.randomUUID();sessionStorage.setItem(storeKey,clientKey)}
let busy=false,revoked=false;
async function tick(){if(busy||revoked||!sb())return;busy=true;try{const {data:{session}}=await sb().auth.getSession();if(!session?.user)return;const {data,error}=await sb().rpc('cc_mirror_session_control',{p_action:'heartbeat',p_client_key:clientKey});if(error)throw error;if(data?.revoked){revoked=true;sessionStorage.removeItem(storeKey);await sb().auth.signOut();alert('Tu sesión de Cuenta Espejo fue cerrada por el administrador. Inicia sesión nuevamente.');location.replace(location.pathname)}}catch(e){console.warn('MIRROR_SESSION_HEARTBEAT',e.message||e)}finally{busy=false}}
if(sb()?.auth?.onAuthStateChange)sb().auth.onAuthStateChange((event,session)=>{if(session?.user)setTimeout(tick,0)});
setInterval(tick,20000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});setTimeout(tick,1200);
})();
