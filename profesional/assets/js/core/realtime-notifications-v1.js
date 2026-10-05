(function(){
  'use strict';

  let channel=null;
  let currentUserId=null;
  let started=false;

  function sb(){ return window.gmSupabase; }

  function ensureStyles(){
    if(document.getElementById('ccRealtimeNotifStyles')) return;
    const style=document.createElement('style');
    style.id='ccRealtimeNotifStyles';
    style.textContent=`
      #ccRealtimeNotifStack{position:fixed;right:18px;top:18px;z-index:2147483000;display:flex;flex-direction:column;gap:10px;width:min(390px,calc(100vw - 24px));pointer-events:none}
      .cc-rt-notif{pointer-events:auto;background:#fff;border:1px solid #dbeafe;border-radius:14px;box-shadow:0 18px 48px rgba(15,23,42,.22);padding:13px 14px;display:grid;grid-template-columns:38px 1fr auto;gap:10px;align-items:start;animation:ccRtIn .18s ease-out}
      .cc-rt-notif-icon{width:38px;height:38px;border-radius:11px;background:#eff6ff;display:grid;place-items:center;font-size:18px}
      .cc-rt-notif-title{font-weight:900;color:#0f172a;font-size:14px;line-height:1.25;margin:1px 0 3px}
      .cc-rt-notif-body{color:#475569;font-size:13px;line-height:1.35}
      .cc-rt-notif-close{border:0;background:transparent;color:#64748b;font-size:18px;line-height:1;cursor:pointer;padding:2px 4px}
      .cc-rt-notif-open{margin-top:8px;border:0;border-radius:9px;background:#0f172a;color:#fff;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer}
      #ccNotifEnableBtn{position:fixed;right:18px;bottom:18px;z-index:2147482000;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:800;box-shadow:0 10px 30px rgba(15,23,42,.14);cursor:pointer;display:none}
      @keyframes ccRtIn{from{transform:translateY(-8px);opacity:0}to{transform:none;opacity:1}}
      @media(max-width:640px){#ccRealtimeNotifStack{right:12px;top:12px}.cc-rt-notif{grid-template-columns:34px 1fr auto}#ccNotifEnableBtn{right:12px;bottom:12px}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    ensureStyles();
    if(!document.getElementById('ccRealtimeNotifStack')){
      const stack=document.createElement('div');
      stack.id='ccRealtimeNotifStack';
      stack.setAttribute('aria-live','polite');
      document.body.appendChild(stack);
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
          if(p==='granted') showLocal({title:'Notificaciones activadas',body:'Este navegador ya puede mostrar avisos de Tráfico App.'},false);
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
    if(!id||!sb()) return;
    try{ await sb().from('cc_push_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',currentUserId); }
    catch(e){ console.warn('NOTIFICACION LEIDA',e); }
  }

  function showToast(n){
    ensureUi();
    const stack=document.getElementById('ccRealtimeNotifStack');
    const card=document.createElement('div');
    card.className='cc-rt-notif';

    const icon=document.createElement('div');
    icon.className='cc-rt-notif-icon';
    icon.textContent='🔔';

    const main=document.createElement('div');
    const title=document.createElement('div');
    title.className='cc-rt-notif-title';
    title.textContent=n.title||'Tráfico App';
    const body=document.createElement('div');
    body.className='cc-rt-notif-body';
    body.textContent=n.body||'';
    main.append(title,body);

    if(n.url){
      const open=document.createElement('button');
      open.type='button';
      open.className='cc-rt-notif-open';
      open.textContent='Abrir';
      open.onclick=async()=>{ await markRead(n.id); safeOpen(n.url); };
      main.appendChild(open);
    }

    const close=document.createElement('button');
    close.type='button';
    close.className='cc-rt-notif-close';
    close.setAttribute('aria-label','Cerrar');
    close.textContent='×';
    close.onclick=async()=>{ await markRead(n.id); card.remove(); };

    card.append(icon,main,close);
    stack.prepend(card);
    setTimeout(()=>{ if(card.isConnected) card.remove(); },12000);
  }

  function showSystem(n){
    if(!('Notification' in window)||Notification.permission!=='granted') return;
    try{
      const note=new Notification(n.title||'Tráfico App',{body:n.body||'',tag:'trafico-'+(n.id||Date.now()),renotify:false});
      note.onclick=()=>{ try{ window.focus(); }catch(_){} safeOpen(n.url); note.close(); markRead(n.id); };
    }catch(e){ console.warn('NOTIFICACION SISTEMA',e); }
  }

  function showLocal(n,system=true){
    showToast(n);
    if(system) showSystem(n);
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
    if(currentUserId===userId&&channel) return;
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
        showLocal(n,true);
      })
      .subscribe(status=>{
        if(status==='SUBSCRIBED') window.dispatchEvent(new CustomEvent('cc-notifications-ready',{detail:{userId}}));
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
      setTimeout(()=>{ if(userId) subscribeForUser(userId); else unsubscribe(); ensureUi(); refreshPermissionButton(); },0);
    });
  }

  window.ccShowLocalNotification=function(title,body,url){
    showLocal({title:title||'Tráfico App',body:body||'',url:url||null},false);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();