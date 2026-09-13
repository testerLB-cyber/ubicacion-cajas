/* Tráfico App · Tipos de unidad · edición segura v4 · 2026-09-13 */
(function(){
  if(window.__CC_UNIT_TYPES_SAFE_EDIT_V4__) return;
  window.__CC_UNIT_TYPES_SAFE_EDIT_V4__ = true;
  window.__CC_UNIT_TYPES_EDIT_HOTFIX__ = true;

  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const sb=()=>window.gmSupabase;

  function dedupeSelects(){
    document.querySelectorAll('select[name="tipoUnidadId"]').forEach(sel=>{
      const seen=new Set();
      [...sel.options].reverse().forEach(o=>{
        const k=String(o.value||'');
        if(!k)return;
        if(seen.has(k))o.remove();else seen.add(k);
      });
    });
  }

  function cleanDuplicateRows(){
    const table=document.getElementById('ccTiposUnidadList');
    if(!table)return;
    const seen=new Set();
    [...table.querySelectorAll('tr')].reverse().forEach(tr=>{
      const b=tr.querySelector('button[onclick*="ccNuevoTipoUnidad"]');
      const m=(b?.getAttribute('onclick')||'').match(/ccNuevoTipoUnidad\('([^']+)'\)/);
      if(!m)return;
      if(seen.has(m[1]))tr.remove();else seen.add(m[1]);
    });
  }

  function impactText(i){
    i=i||{};
    const parts=[];
    if(Number(i.unidades||0))parts.push(Number(i.unidades)+' unidad(es) de Inventario');
    if(Number(i.anticipos||0))parts.push(Number(i.anticipos)+' anticipo(s)');
    if(Number(i.configuracionesDestino||0))parts.push(Number(i.configuracionesDestino)+' configuración(es) por destino');
    return parts.length?parts.join('\n• '):'No se detectaron registros relacionados.';
  }

  async function loadTipo(id){
    const s=sb();if(!s)throw new Error('Supabase no está disponible.');
    if(!id)return {id:'',nombre:'',categoria:'CAJA',estatus:'ACTIVO'};
    const r=await s.from('cc_tipos_unidad').select('id,nombre,categoria,estatus').eq('id',id).single();
    if(r.error)throw r.error;
    return r.data;
  }

  async function getImpact(id){
    const r=await sb().rpc('cc_tipo_unidad_impact',{p_id:id});
    if(r.error)throw r.error;
    return r.data||{};
  }

  function askAdminPassword(){
    return new Promise(resolve=>{
      document.getElementById('ccTipoUnidadAdminPwd')?.remove();
      const ov=document.createElement('div');
      ov.id='ccTipoUnidadAdminPwd';
      ov.style='position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:100700;display:flex;align-items:center;justify-content:center;padding:18px';
      ov.innerHTML='<div style="background:#fff;width:min(460px,94vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)"><div style="padding:15px 18px;background:#7f1d1d;color:#fff"><strong>🔒 Autorización de administrador</strong></div><form style="padding:18px"><div style="font-size:14px;line-height:1.45;margin-bottom:12px">Este cambio modifica o inactiva un tipo de unidad existente. Ingresa la contraseña del usuario administrador que tiene la sesión abierta.</div><div class="cc-field"><label>Contraseña de administrador</label><input type="password" name="password" autocomplete="current-password" required autofocus></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Autorizar cambio</button></div></form></div>';
      document.body.appendChild(ov);
      const finish=v=>{ov.remove();resolve(v)};
      ov.querySelector('[data-cancel]').onclick=()=>finish(null);
      ov.querySelector('form').onsubmit=e=>{e.preventDefault();finish(String(e.currentTarget.password.value||''));};
    });
  }

  function openModal(x){
    document.getElementById('ccTipoUnidadSafeModal')?.remove();
    const ov=document.createElement('div');
    ov.id='ccTipoUnidadSafeModal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:100500;display:flex;align-items:center;justify-content:center;padding:18px';
    ov.innerHTML='<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.32)"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>'+(x.id?'🔒 Editar tipo de unidad':'Nuevo tipo de unidad')+'</strong><button type="button" data-close style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Nombre del tipo</label><input name="nombre" required value="'+esc(x.nombre||'')+'" placeholder="Ej. CAJA SECA"></div><div class="cc-field"><label>Categoría</label><select name="categoria"><option value="CAJA" '+(x.categoria==='CAJA'?'selected':'')+'>CAJA</option><option value="CARRO" '+(x.categoria==='CARRO'?'selected':'')+'>CARRO</option><option value="OTRO" '+(x.categoria==='OTRO'?'selected':'')+'>OTRO</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option value="ACTIVO" '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option value="INACTIVO" '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div class="cc-note" style="margin-top:10px">🔒 Al editar o inactivar un tipo existente, primero se revisará si afecta unidades, anticipos o configuraciones. Si continúas, se solicitará contraseña de administrador.</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();ov.querySelector('[data-close]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{
      e.preventDefault();
      const form=e.currentTarget;
      const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Revisando impacto...';
      try{
        const item={id:x.id||'',nombre:String(form.nombre.value||'').trim().toUpperCase(),categoria:form.categoria.value,estatus:form.estatus.value};
        const changed=!x.id || item.nombre!==String(x.nombre||'').trim().toUpperCase() || item.categoria!==x.categoria || item.estatus!==x.estatus;
        if(!changed){close();return;}

        let r;
        if(!x.id){
          r=await sb().rpc('cc_tipo_unidad_create',{p_item:item});
          if(r.error)throw r.error;
        }else{
          const impact=await getImpact(x.id);
          if(Number(impact.total||0)>0){
            const action=item.estatus==='INACTIVO' && x.estatus!=='INACTIVO'?'INACTIVAR':'MODIFICAR';
            const ok=confirm('Este cambio puede afectar registros existentes.\n\nTipo: '+String(x.nombre||'')+'\nAcción: '+action+'\n\n• '+impactText(impact)+'\n\nSi continúas, los registros relacionados conservarán el mismo ID de tipo y se actualizarán para reflejar el nuevo nombre/categoría cuando corresponda.\n\n¿Deseas actualizar también los registros relacionados y continuar?\n\nSí = continuar\nNo = cancelar sin cambios');
            if(!ok){btn.disabled=false;btn.textContent='Guardar cambios';return;}
          }else{
            const ok=confirm('No se detectaron registros relacionados con este tipo.\n\n¿Deseas continuar con el cambio?');
            if(!ok){btn.disabled=false;btn.textContent='Guardar cambios';return;}
          }

          const password=await askAdminPassword();
          if(password===null){btn.disabled=false;btn.textContent='Guardar cambios';return;}
          btn.textContent='Autorizando...';
          r=await sb().rpc('cc_tipo_unidad_admin_save',{p_item:item,p_password:password,p_confirm_related:true});
          if(r.error)throw r.error;
        }

        if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo guardar el tipo de unidad.');
        close();
        alert(x.id?'Cambio autorizado y guardado correctamente en Supabase.':'Tipo de unidad creado correctamente en Supabase.');
        location.reload();
      }catch(err){
        console.error('TIPO UNIDAD SAFE SAVE',err);
        let msg=err.message||String(err);
        if(msg.includes('CONTRASENA_ADMIN_INCORRECTA'))msg='La contraseña de administrador es incorrecta.';
        else if(msg.includes('SOLO_ADMINISTRADOR'))msg='Este cambio requiere iniciar sesión con un usuario Administrador o Super Admin.';
        else if(msg.includes('CONTRASENA_ADMIN_REQUERIDA'))msg='Debes capturar la contraseña de administrador.';
        alert('No se guardó en Supabase.\n\n'+msg);
        btn.disabled=false;btn.textContent='Guardar cambios';
      }
    };
  }

  window.ccNuevoTipoUnidad=async function(id){
    try{openModal(await loadTipo(id||''));}
    catch(err){alert('No se pudo abrir el tipo de unidad.\n\n'+(err.message||err));}
  };

  document.addEventListener('click',()=>setTimeout(()=>{dedupeSelects();cleanDuplicateRows();},50),true);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{dedupeSelects();cleanDuplicateRows();},300));
  setTimeout(()=>{dedupeSelects();cleanDuplicateRows();},800);
})();
