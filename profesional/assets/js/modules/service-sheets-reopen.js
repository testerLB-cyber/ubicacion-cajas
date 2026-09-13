/* Tráfico App Profesional · Hojas de Servicio · reapertura autorizada */
(function(){
  'use strict';
  if(window.__HS_REOPEN_V1__) return;
  window.__HS_REOPEN_V1__=true;
  const sb=()=>window.gmSupabase;
  const text=v=>String(v??'').trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let DATA=null,loading=null;
  async function data(force=false){
    if(DATA&&!force)return DATA;
    if(loading)return loading;
    loading=(async()=>{try{const {data,error}=await sb().rpc('hs_list');if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo cargar historial.');DATA=data;return data;}finally{loading=null;}})();
    return loading;
  }
  function authModal(comp){
    document.getElementById('hs-reopen-auth-modal')?.remove();
    const ov=document.createElement('div');ov.id='hs-reopen-auth-modal';ov.style.cssText='position:fixed;inset:0;z-index:101100;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="width:min(520px,96vw);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px #0008"><div style="padding:14px 17px;background:#7c2d12;color:#fff;display:flex;justify-content:space-between;align-items:center"><div><strong>Abrir comprobación</strong><div style="font-size:10px;color:#fed7aa;margin-top:3px">Folio '+esc(comp.folio||'')+' · requiere autorización privilegiada</div></div><button type="button" data-x style="background:none;border:0;color:#fff;font-size:25px;cursor:pointer">×</button></div><form style="padding:18px"><div class="cc-field"><label>Correo o usuario autorizado *</label><input name="user" class="cc-input" autocomplete="username" required placeholder="admin@empresa.com"></div><div class="cc-field"><label>Contraseña *</label><input name="password" type="password" class="cc-input" autocomplete="current-password" required></div><div class="cc-field"><label>Motivo de reapertura *</label><textarea name="motivo" class="cc-input" required placeholder="Motivo del cambio"></textarea></div><div style="padding:10px;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:10px;font-size:11px;margin:10px 0">Al autorizar, la hoja volverá a <b>Pendiente de comprobar</b>. La comprobación anterior quedará marcada como reabierta para conservar el historial.</div><div data-msg style="font-size:11px;min-height:17px;color:#b91c1c"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-danger">Autorizar y abrir</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
    ov.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type=submit]'),m=f.querySelector('[data-msg]');b.disabled=true;m.textContent='Validando autorización…';
      let tmp=null;
      try{
        const raw=text(f.user.value),email=raw.includes('@')?raw:raw.toLowerCase()+'@usuarios.trafico-app.com';
        if(!window.supabase?.createClient)throw new Error('Cliente de seguridad no disponible.');
        tmp=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
        const login=await tmp.auth.signInWithPassword({email,password:f.password.value});if(login.error)throw new Error('Usuario o contraseña de autorización incorrectos.');
        const r=await tmp.rpc('hs_reopen_used',{p_comprobacion_id:comp.id,p_motivo:text(f.motivo.value)});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'El usuario no tiene privilegios para abrir esta comprobación.');
        await tmp.auth.signOut().catch(()=>{});DATA=null;close();alert('Hoja '+(r.data.folio||comp.folio)+' abierta correctamente. Volvió a Pendiente de comprobar.');document.getElementById('hs104Refresh')?.click();
      }catch(err){m.textContent=err?.message||String(err);if(tmp)await tmp.auth.signOut().catch(()=>{});b.disabled=false;}
    };
  }
  async function patch(force=false){
    const body=document.getElementById('hs104Hist');if(!body||!sb())return;
    try{
      const d=await data(force),table=body.closest('table'),head=table?.querySelector('thead tr');
      if(head&&!head.querySelector('[data-hs-open-head]')){const th=document.createElement('th');th.dataset.hsOpenHead='1';th.textContent='ABRIR';head.appendChild(th);}
      [...body.querySelectorAll('tr')].forEach(tr=>{
        const cells=tr.querySelectorAll('td');if(cells.length<6||tr.querySelector('[data-hs-open-cell]'))return;
        const folio=text(cells[0].textContent),comp=(d.comprobaciones||[]).find(x=>String(x.tipo||'').toUpperCase()==='UTILIZADA'&&text(x.folio)===folio);
        if(!comp)return;const td=document.createElement('td');td.dataset.hsOpenCell='1';td.innerHTML='<button type="button" class="cc-btn cc-btn-light" data-hs-reopen><i class="fa-solid fa-lock-open"></i> Abrir</button>';tr.appendChild(td);td.querySelector('[data-hs-reopen]').onclick=()=>authModal(comp);
      });
    }catch(e){console.warn('HS REOPEN',e);}
  }
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v="Comprobacion"]'))setTimeout(()=>patch(true),300)},true);
  window.hsPatchReopen=()=>patch(true);
  setInterval(()=>{if(document.getElementById('hs104Hist'))patch(false)},1400);
})();