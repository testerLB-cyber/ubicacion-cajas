(function(){
  'use strict';

  let channel=null;
  let currentUserId=null;
  let started=false;
  let loadingPending=false;
  const shown=new Set();

  function sb(){ return window.gmSupabase; }

  function ensureStyles(){
    if(document.getElementById('ccRealtimeNotifStyles')) return;
    const style=document.createElement('style');
    style.id='ccRealtimeNotifStyles';
    style.textContent=`
      #ccRealtimeNotifModalRoot{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
      .cc-rt-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.48);backdrop-filter:blur(2px);display:grid;place-items:center;padding:18px;pointer-events:auto;animation:ccRtFade .16s ease-out}
      .cc-rt-modal{width:min(520px,94vw);background:#fff;border-radius:20px;box-shadow:0 28px 80px rgba(15,23,42,.34);overflow:hidden;border:1px solid rgba(255,255,255,.7);animation:ccRtPop .2s ease-out}
      .cc-rt-modal-head{display:flex;align-items:center;gap:12px;padding:18px 20px 12px}
      .cc-rt-modal-icon{width:46px;height:46px;border-radius:14px;background:#eff6ff;display:grid;place-items:center;font-size:22px;flex:0 0 auto}
      .cc-rt-modal-title{font-weight:900;color:#0f172a;font-size:18px;line-height:1.25}
      .cc-rt-modal-body{padding:2px 20px 18px;color:#334155;font-size:15px;line-height:1.5;white-space:pre-wrap}
      .cc-rt-modal-actions{display:flex;justify-content:flex-end;gap:9px;padding:14px 20px 18px;border-top:1px solid #e2e8f0;background:#f8fafc}
      .cc-rt-btn{border:0;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:850;cursor:pointer}
      .cc-rt-btn-secondary{background:#e2e8f0;color:#0f172a}
      .cc-rt-btn-primary{background:#0f172a;color:#fff}
      #ccNotifEnableBtn{position:fixed;right:18px;bottom:18px;z-index:2147482000;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:800;box-shadow:0 10px 30px rgba(15,23,42,.14);cursor:pointer;display:none}
      @keyframes ccRtFade{from{opacity:0}to{opacity:1}}
      @keyframes ccRtPop{from{transform:scale(.96) translateY(8px);opacity:.2}to{transform:none;opacity:1}}
      @media(max-width:640px){.cc-rt-modal{width:min(94vw,520px)}.cc-rt-modal-actions{padding-bottom:max(18px,env(safe-area-inset-bottom))}#ccNotifEnableBtn{right:12px;bottom:12px}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    ensureStyles();
    if(!document.getElementById('ccRealtimeNotifModalRoot')){
      const root=document.createElement('div');
      root.id='ccRealtimeNotifModalRoot';
      root.setAttribute('aria-live','assertive');
      document.body.appendChild(root);
    }
    if(!document.getElementById('ccNotifEnableBtn')){
      const btn=document.createElement('button');
      btn.id='ccNotifEnableBtn';
      btn.type='button';
      btn.textContent='🔔 Activar notificaciones';
      btn.onclick=async()=>{
        if(!('Notification' in window)) return;
        try{
          const p=await Notification.requestPermission();
          refreshPermissionButton();
          if(p==='granted') showModal({title:'Notificaciones activadas',body:'Este navegador ya puede mostrar avisos de Tráfico App.'},false);
        }catch(e){ console.warn('NOTIFICACIONES PERMISO',e); }
      };
      document.body.appendChild(btn);
    }
    refreshPermissionButton();
  }

  function refreshPermissionButton(){
    const btn=document.getElementById('ccNotifEnableBtn');
    if(!btn) return;
    const logged=!!window.CC_AUTH_READY;
    const canAsk=('Notification' in window)&&Notification.permission==='default';
    btn.style.display=(logged&&canAsk)?'block':'none';
  }

  function safeOpen(raw){
    if(!raw) return;
    try{
      const u=new URL(raw,location.href);
      if(u.origin!==location.origin) return;
      location.href=u.href;
    }catch(_){}
  }

  async function markRead(id){
    if(!id||!sb()||!currentUserId) return;
    try{
      await sb().from('cc_push_notifications')
        .update({read_at:new Date().toISOString()})
        .eq('id',id)
        .eq('user_id',currentUserId);
    }catch(e){ console.warn('NOTIFICACION LEIDA',e); }
  }

  function closeCurrent(id){
    const root=document.getElementById('ccRealtimeNotifModalRoot');
    if(root) root.innerHTML='';
    if(id) markRead(id);
  }

  function showModal(n,markable=true){
    ensureUi();
    if(n.id&&shown.has(n.id)) return;
    if(n.id) shown.add(n.id);

    const root=document.getElementById('ccRealtimeNotifModalRoot');
    const backdrop=document.createElement('div');
    backdrop.className='cc-rt-modal-backdrop';

    const modal=document.createElement('div');
    modal.className='cc-rt-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');

    const head=document.createElement('div');
    head.className='cc-rt-modal-head';
    const icon=document.createElement('div');
    icon.className='cc-rt-modal-icon';
    icon.textContent='🔔';
    const title=document.createElement('div');
    title.className='cc-rt-modal-title';
    title.textContent=n.title||'Tráfico App';
    head.append(icon,title);

    const body=document.createElement('div');
    body.className='cc-rt-modal-body';
    body.textContent=n.body||'';

    const actions=document.createElement('div');
    actions.className='cc-rt-modal-actions';

    const ok=document.createElement('button');
    ok.type='button';
    ok.className='cc-rt-btn cc-rt-btn-secondary';
    ok.textContent='Entendido';
    ok.onclick=(ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      closeCurrent(markable?n.id:null);
      return false;
    };
    actions.appendChild(ok);

    if(n.url){
      const open=document.createElement('button');
      open.type='button';
      open.className='cc-rt-btn cc-rt-btn-primary';
      open.textContent='Abrir';
      open.onclick=async()=>{
        if(markable) await markRead(n.id);
        safeOpen(n.url);
      };
      actions.appendChild(open);
    }

    modal.append(head,body,actions);
    backdrop.appendChild(modal);
    root.innerHTML='';
    root.appendChild(backdrop);
  }

  function showSystem(n){
    if(!('Notification' in window)||Notification.permission!=='granted') return;
    try{
      const note=new Notification(n.title||'Tráfico App',{
        body:n.body||'',
        tag:'trafico-'+(n.id||Date.now()),
        renotify:false
      });
      note.onclick=()=>{
        try{ window.focus(); }catch(_){}
        safeOpen(n.url);
        note.close();
        markRead(n.id);
      };
    }catch(e){ console.warn('NOTIFICACION SISTEMA',e); }
  }

  function showNotification(n,system=true){
    showModal(n,true);
    if(system) showSystem(n);
  }

  async function loadPending(userId){
    if(!userId||!sb()||loadingPending) return;
    loadingPending=true;
    try{
      const {data,error}=await sb().from('cc_push_notifications')
        .select('id,user_id,title,body,url,source,created_at,read_at')
        .eq('user_id',userId)
        .is('read_at',null)
        .order('created_at',{ascending:false})
        .limit(10);
      if(error) throw error;
      const pending=(data||[]).filter(n=>n.user_id===userId);
      if(pending.length) showNotification(pending[0],false);
    }catch(e){ console.warn('NOTIFICACIONES PENDIENTES',e); }
    finally{ loadingPending=false; }
  }

  async function unsubscribe(){
    if(channel&&sb()){
      try{ await sb().removeChannel(channel); }catch(_){}
    }
    channel=null;
    currentUserId=null;
  }

  async function subscribeForUser(userId){
    if(!userId||!sb()) return;
    if(currentUserId===userId&&channel){
      await loadPending(userId);
      return;
    }
    await unsubscribe();
    currentUserId=userId;
    channel=sb()
      .channel('cc-user-notifications-'+userId)
      .on('postgres_changes',{
        event:'INSERT',
        schema:'public',
        table:'cc_push_notifications',
        filter:'user_id=eq.'+userId
      },payload=>{
        const n=payload&&payload.new;
        if(!n||n.user_id!==currentUserId) return;
        showNotification(n,true);
      })
      .subscribe(status=>{
        if(status==='SUBSCRIBED'){
          loadPending(userId);
          window.dispatchEvent(new CustomEvent('cc-notifications-ready',{detail:{userId}}));
        }
      });
  }

  async function syncSession(){
    if(!sb()) return;
    try{
      const {data}=await sb().auth.getSession();
      const userId=data&&data.session&&data.session.user&&data.session.user.id;
      if(userId) await subscribeForUser(userId);
      else await unsubscribe();
      ensureUi();
      refreshPermissionButton();
    }catch(e){ console.warn('NOTIFICACIONES SESION',e); }
  }

  function start(){
    if(started) return;
    if(!sb()){ setTimeout(start,300); return; }
    started=true;
    ensureUi();
    syncSession();
    sb().auth.onAuthStateChange((_event,session)=>{
      const userId=session&&session.user&&session.user.id;
      setTimeout(()=>{
        if(userId) subscribeForUser(userId);
        else unsubscribe();
        ensureUi();
        refreshPermissionButton();
      },0);
    });
  }

  window.ccShowLocalNotification=function(title,body,url){
    showModal({title:title||'Tráfico App',body:body||'',url:url||null},false);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();