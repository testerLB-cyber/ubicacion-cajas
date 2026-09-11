  document.getElementById('ccMantenimientoBtn').onclick=()=>{
    const detalle=document.getElementById('ccSalidaDetalle');
    detalle.innerHTML=`
      <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:12px">
        <label style="display:block;font-size:10px;font-weight:900;color:#92400e;margin-bottom:5px">
          Motivo del mantenimiento *
        </label>
        <textarea id="ccMotivoSalidaMant" rows="3" required
          placeholder="Ej. reparación de piso, llantas, pintura, revisión estructural..."
          style="width:100%;border:1px solid #fcd34d;border-radius:8px;padding:8px;font-size:11px;box-sizing:border-box"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:7px;margin-top:9px">
          <button type="button" class="cc-btn cc-btn-light" id="ccMantCancelar">Cancelar</button>
          <button type="button" class="cc-btn cc-btn-maintenance" id="ccMantConfirmar">
            Confirmar mantenimiento
          </button>
        </div>
      </div>`;

    document.getElementById('ccMantCancelar').onclick=()=>{
      detalle.innerHTML='';
    };

    document.getElementById('ccMantConfirmar').onclick=()=>{
      const motivo=String(document.getElementById('ccMotivoSalidaMant')?.value||'').trim();
      if(!motivo){
        alert('Es obligatorio indicar el motivo del mantenimiento.');
        return;
      }

      // NO para el día seleccionado: ya no está físicamente disponible,
      // pero NO se elimina la renta. El contrato/registro continúa existiendo.
      matriz[k]=false;

      const ahora=new Date().toISOString();
      const record={
        id:uid(),
        cajaId:unidad.id,
        numero:unidad.numero||'',
        descripcion:unidad.descripcion||'',
        tamano:unidad.tamano||'',
        tipo:unidad.tipo||'',
        origen:unidad.origen||'',
        placas:unidad.placas||'',
        clienteId:r?.clienteId||unidad.clienteId||'',
        rentaId:r?.id||'',
        fechaSalida:ahora,
        fechaSalidaProgramada:date,
        motivo:motivo,
        fechaLiberacion:'',
        estatus:'MANTENIMIENTO',
        conservaRenta:true
      };

      configuracion.mantenimientoHistorial.unshift(record);

      unidad.estatus='MANTENIMIENTO';
      unidad.mantenimientoDesde=ahora;
      unidad.mantenimientoMotivo=motivo;
      unidad.mantenimientoRecordId=record.id;
      unidad.mantenimientoConservaRenta=true;

      // La renta NO se elimina ni se cancela.
      // Se conserva el registro y su cliente/responsable/tarifa.
      if(r){
        r.mantenimientoActivo=true;
        r.mantenimientoRecordId=record.id;
        r.mantenimientoDesde=date;
        r.observaciones=(r.observaciones?String(r.observaciones)+' | ':'')+
          `Mantenimiento desde ${date}: ${motivo}. La renta se conserva.`;
      }

      ccAudit({operacionId:ccAuditId('MANTRENTA'),accion:'RENTA_A_MANTENIMIENTO',modulo:'MANTENIMIENTO',submodulo:'DESDE_MATRIZ',idRegistro:record.id,idUnidad:unidad.id,numeroUnidad:unidad.numero||'',idCliente:r?.clienteId||unidad.clienteId||'',idRenta:r?.id||'',idMantenimiento:record.id,estatusAnterior:'RENTADA',estatusNuevo:'MANTENIMIENTO',datosAnteriores:{renta:r?JSON.parse(JSON.stringify(r)):null,unidad:{estatus:'RENTADA'}},datosNuevos:{record:record,renta:r?JSON.parse(JSON.stringify(r)):null,unidad:unidad},fechaNueva:date,detalle:motivo+' | La renta se conserva'});

      cerrar();
      save();
      ccRenderAll();

      // Conserva las funciones existentes de aviso/PDF de mantenimiento.
      try{
        if(typeof ccGenerarPDFMantenimiento==='function') ccGenerarPDFMantenimiento(record,unidad);
        if(typeof ccEnviarAvisoMantenimiento==='function') ccEnviarAvisoMantenimiento(unidad,record);
      }catch(e){console.warn('Aviso/PDF mantenimiento:',e);}
    };
  };
};
window.ccMostrarMedidasUnidad=function(id){const u=cajas.find(x=>x.id===id);if(!u)return;const Lm=Number(u.largo||0),Am=Number(u.ancho||0),Hm=Number(u.alto||0),Lft=Number(u.largoFt||0)||Lm/0.3048,Aft=Number(u.anchoFt||0)||Am/0.3048,Hft=Number(u.altoFt||0)||Hm/0.3048,esCarro=String(u.categoriaUnidad||u.tipoUnidadNombre||'').toUpperCase()==='CARRO',tipo=esc(u.tipoUnidadNombre||u.categoriaUnidad||'UNIDAD'),num=esc(u.numero||u.descripcion||'Sin unidad');const ov=document.createElement('div');ov.id='ccMedidasOverlay';ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';ov.innerHTML=`<div style="background:#fff;border-radius:18px;width:min(760px,96vw);max-height:94vh;overflow:auto;padding:24px;position:relative;box-shadow:0 25px 80px rgba(0,0,0,.35)"><button onclick="document.getElementById('ccMedidasOverlay')?.remove()" style="position:absolute;right:14px;top:10px;border:0;background:none;font-size:26px;cursor:pointer">&times;</button><div style="font-size:18px;font-weight:900">${num}</div><div style="font-size:12px;color:#64748b;margin-top:3px">${tipo} · Dimensiones</div><div style="height:330px;display:flex;align-items:center;justify-content:center;overflow:visible"><div style="position:relative;width:430px;height:230px;max-width:78vw;perspective:900px"><div style="position:absolute;left:55px;top:45px;width:300px;height:145px;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);border:3px solid #334155;border-radius:5px;transform:rotateX(58deg) rotateZ(-12deg);box-shadow:35px 28px 0 -18px #94a3b8, 0 22px 30px rgba(15,23,42,.18)"></div><div style="position:absolute;left:55px;top:20px;width:300px;height:145px;border:3px solid #334155;border-radius:5px;background:rgba(248,250,252,.72);transform:skewY(-18deg);box-shadow:inset 0 0 0 999px rgba(226,232,240,.18)"></div><span style="position:absolute;left:50%;top:-2px;transform:translateX(-50%);font-weight:900;white-space:nowrap;background:#fff;padding:4px 8px;border-radius:6px">Largo: ${esCarro?(Lft?Lft.toFixed(2)+' ft':'—'):(Lm?Lm.toFixed(2)+' m':'—')}</span><span style="position:absolute;right:0;top:108px;font-weight:900;white-space:nowrap;background:#fff;padding:4px 8px;border-radius:6px">Ancho: ${esCarro?(Aft?Aft.toFixed(2)+' ft':'—'):(Am?Am.toFixed(2)+' m':'—')}</span><span style="position:absolute;left:12px;top:108px;font-weight:900;white-space:nowrap;background:#fff;padding:4px 8px;border-radius:6px">Alto: ${esCarro?(Hft?Hft.toFixed(2)+' ft':'—'):(Hm?Hm.toFixed(2)+' m':'—')}</span><span style="position:absolute;left:50%;top:102px;transform:translate(-50%,-50%);font-size:26px;font-weight:900;color:#475569;text-shadow:0 1px #fff">${tipo}</span></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><small>Largo</small><strong style="display:block;font-size:18px">${esCarro?(Lft?Lft.toFixed(2)+' ft':'—'):(Lm?Lm.toFixed(2)+' m':'—')}</strong><small style="color:#64748b">${esCarro&&Lm?Lm.toFixed(2)+' m':''}</small></div><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><small>Ancho</small><strong style="display:block;font-size:18px">${esCarro?(Aft?Aft.toFixed(2)+' ft':'—'):(Am?Am.toFixed(2)+' m':'—')}</strong><small style="color:#64748b">${esCarro&&Am?Am.toFixed(2)+' m':''}</small></div><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><small>Alto</small><strong style="display:block;font-size:18px">${esCarro?(Hft?Hft.toFixed(2)+' ft':'—'):(Hm?Hm.toFixed(2)+' m':'—')}</strong><small style="color:#64748b">${esCarro&&Hm?Hm.toFixed(2)+' m':''}</small></div></div><div style="display:flex;justify-content:center;gap:8px;margin-top:16px"><button class="cc-btn cc-sim-btn" onclick="ccAbrirSimuladorPallet('${u.id}')"><i class="fa-solid fa-boxes-stacked mr-1"></i>Simular</button><button class="cc-btn cc-btn-light" onclick="document.getElementById('ccMedidasOverlay')?.remove()">Cerrar</button></div></div>`;document.body.appendChild(ov);};
window.ccAbrirSimuladorPallet=function(id){const u=cajas.find(x=>x.id===id);if(!u)return;const L=Number(u.largoFt||0)||Number(u.largo||0)/0.3048,A=Number(u.anchoFt||0)||Number(u.ancho||0)/0.3048,H=Number(u.altoFt||0)||Number(u.alto||0)/0.3048,num=esc(u.numero||u.descripcion||'Unidad');document.getElementById('ccMedidasOverlay')?.remove();const sim=document.createElement('div');sim.id='ccSimuladorOverlay';sim.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';sim.innerHTML=`<div style="background:#fff;border-radius:18px;width:min(980px,97vw);max-height:95vh;overflow:auto;padding:24px;position:relative;box-shadow:0 25px 80px rgba(0,0,0,.35)"><button onclick="document.getElementById('ccSimuladorOverlay')?.remove();ccMostrarMedidasUnidad('${u.id}')" style="position:absolute;right:14px;top:10px;border:0;background:none;font-size:26px;cursor:pointer">&times;</button><div style="font-size:18px;font-weight:900">Simulación 3D de pallets</div><div style="font-size:12px;color:#64748b;margin:3px 0 16px">${num} · Captura las dimensiones del pallet. Por defecto todo se captura en pulgadas (in).</div><div style="padding:11px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:11px"><b>Unidad:</b> ${L.toFixed(2)} ft × ${A.toFixed(2)} ft × ${H.toFixed(2)} ft &nbsp; | &nbsp; ${(L*0.3048).toFixed(2)} m × ${(A*0.3048).toFixed(2)} m × ${(H*0.3048).toFixed(2)} m</div><div style="margin-top:14px;font-weight:900;font-size:12px">Medidas del pallet <span style="font-size:10px;color:#64748b;font-weight:700">· pulgadas por defecto</span></div><div class="cc-sim-grid" style="margin-top:8px"><div class="cc-sim-field"><label>Largo</label><div style="display:flex;gap:5px"><input id="simPL" class="cc-sim-unit" type="number" min="0.01" step="0.01" value="48"><select id="simPLU" class="cc-sim-unit"><option value="in" selected>Pulgadas (in)</option><option value="ft">Pies (ft)</option><option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option></select></div></div><div class="cc-sim-field"><label>Ancho</label><div style="display:flex;gap:5px"><input id="simPA" class="cc-sim-unit" type="number" min="0.01" step="0.01" value="40"><select id="simPAU" class="cc-sim-unit"><option value="in" selected>Pulgadas (in)</option><option value="ft">Pies (ft)</option><option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option></select></div></div><div class="cc-sim-field"><label>Alto</label><div style="display:flex;gap:5px"><input id="simPH" class="cc-sim-unit" type="number" min="0.01" step="0.01" value="48"><select id="simPHU" class="cc-sim-unit"><option value="in" selected>Pulgadas (in)</option><option value="ft">Pies (ft)</option><option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option></select></div></div></div><label class="cc-sim-option" style="margin-top:10px"><input id="simDouble" type="checkbox" checked onchange="ccCalcularSimulacionPallet('${u.id}')"> Permitir doble stack (hasta 2 niveles)</label><div style="display:flex;justify-content:center;gap:8px;margin-top:14px"><button class="cc-btn cc-sim-btn" onclick="ccCalcularSimulacionPallet('${u.id}')"><i class="fa-solid fa-boxes-stacked mr-1"></i>Simular</button><button class="cc-btn cc-btn-light" onclick="document.getElementById('ccSimuladorOverlay')?.remove();ccMostrarMedidasUnidad('${u.id}')">Volver</button></div><div id="ccSimResultados"></div></div>`;document.body.appendChild(sim);ccCalcularSimulacionPallet(id);};
window.ccUnitToFt=function(v,u){v=Number(v)||0;return u==='in'?v/12:u==='m'?v/0.3048:u==='cm'?v/30.48:v;};
window.ccFmtUnit=function(ft,u){const v=u==='in'?ft*12:u==='m'?ft*0.3048:u==='cm'?ft*30.48:ft;return `${v.toFixed(2)} ${u==='in'?'in':u==='m'?'m':u==='cm'?'cm':'ft'}`;};
window.ccCalcularSimulacionPallet=function(id){const u=cajas.find(x=>x.id===id),el=document.getElementById('ccSimResultados');if(!u||!el)return;const L=Number(u.largoFt||0)||Number(u.largo||0)/0.3048,A=Number(u.anchoFt||0)||Number(u.ancho||0)/0.3048,H=Number(u.altoFt||0)||Number(u.alto||0)/0.3048,pl=ccUnitToFt(document.getElementById('simPL')?.value,document.getElementById('simPLU')?.value),pa=ccUnitToFt(document.getElementById('simPA')?.value,document.getElementById('simPAU')?.value),ph=ccUnitToFt(document.getElementById('simPH')?.value,document.getElementById('simPHU')?.value),dbl=!!document.getElementById('simDouble')?.checked;if(!(L>0&&A>0&&H>0&&pl>0&&pa>0&&ph>0)){el.innerHTML='<div class="cc-sim-explain">Captura medidas válidas para realizar la simulación.</div>';return;}const f1=Math.floor(L/pl)*Math.floor(A/pa),f2=Math.floor(L/pa)*Math.floor(A/pl),useRot=f2>f1,porPiso=Math.max(f1,f2),niveles=Math.min(dbl?2:1,Math.floor(H/ph)),geom=porPiso*niveles,volumenUnidad=L*A*H,volumenPallet=pl*pa*ph,volTeorico=Math.floor(volumenUnidad/volumenPallet),uso=geom?((geom*volumenPallet/volumenUnidad)*100):0;const nx=useRot?Math.floor(L/pa):Math.floor(L/pl),ny=useRot?Math.floor(A/pl):Math.floor(A/pa),sx=useRot?pa:pl,sy=useRot?pl:pa;const maxDraw=Math.min(geom,120),W=900,Hsvg=500,margin=80,usableW=740,usableH=320,scale=Math.min(usableW/L,usableH/A),baseW=Math.max(34,sx*scale*.72),baseD=Math.max(24,sy*scale*.72),boxH=Math.max(14,ph*scale*.16),isoX=(x,y)=>margin+(x*scale*.72)+(y*scale*.40),isoY=(x,y)=>115+(x*scale*.30)-(y*scale*.30);let svg=`<svg viewBox="0 0 ${W} ${Hsvg}" class="cc-3d-svg" role="img" aria-label="Acomodo 3D de pallets dentro de la unidad"><defs><linearGradient id="unitFloor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><linearGradient id="pTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#f59e0b"/></linearGradient><linearGradient id="pSide" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97706"/><stop offset="1" stop-color="#92400e"/></linearGradient></defs>`;const FLx=margin,FLy=115,FLw=Math.max(500,L*scale*.72),FLd=Math.max(210,A*scale*.40);svg+=`<polygon points="${FLx},${FLy} ${FLx+FLw},${FLy+FLw*.40} ${FLx+FLw},${FLy+FLd+FLw*.40} ${FLx},${FLy+FLd}" fill="url(#unitFloor)" stroke="#475569" stroke-width="4"/><polyline points="${FLx},${FLy} ${FLx},${FLy+FLd} ${FLx+FLw},${FLy+FLd+FLw*.40}" fill="none" stroke="#64748b" stroke-width="3"/>`;for(let z=0;z<niveles;z++){for(let y=0;y<ny;y++){for(let x=0;x<nx;x++){const idx=z*porPiso+y*nx+x;if(idx>=maxDraw)continue;const px=isoX(x*sx,y*sy),py=isoY(x*sx,y*sy)-z*boxH*1.15;const pw=Math.max(30,baseW),pd=Math.max(22,baseD),bh=Math.max(16,boxH);const top=`${px},${py} ${px+pw},${py+pw*.40} ${px+pw},${py+pw*.40+pd} ${px},${py+pd}`;const right=`${px+pw},${py+pw*.40} ${px+pw},${py+pw*.40+pd} ${px+pw},${py+pw*.40+pd+bh} ${px+pw},${py+pw*.40+bh}`;const front=`${px},${py+pd} ${px+pw},${py+pw*.40+pd} ${px+pw},${py+pw*.40+pd+bh} ${px},${py+pd+bh}`;svg+=`<polygon points="${front}" fill="#b45309" stroke="#78350f" stroke-width="1.2"/><polygon points="${right}" fill="url(#pSide)" stroke="#78350f" stroke-width="1.2"/><polygon points="${top}" fill="url(#pTop)" stroke="#92400e" stroke-width="1.2"/><text x="${px+pw/2}" y="${py+pd/2+5}" text-anchor="middle" font-size="12" font-weight="900" fill="#78350f">${z+1}</text>`;}}}svg+=`<text x="${W/2}" y="455" text-anchor="middle" font-size="14" font-weight="800" fill="#475569">Vista superior/isométrica · ${nx} pallets de largo × ${ny} de ancho por piso · ${niveles} nivel(es)</text></svg>`;el.innerHTML=`<div class="cc-sim-results"><div class="cc-sim-kpi"><small>Por piso</small><strong>${porPiso}</strong></div><div class="cc-sim-kpi"><small>Niveles</small><strong>${niveles}</strong></div><div class="cc-sim-kpi"><small>Pallets físicos</small><strong>${geom}</strong></div><div class="cc-sim-kpi"><small>Volumen teórico</small><strong>${volTeorico}</strong></div></div><div class="cc-sim-explain"><b>Resultado:</b> ${geom} pallets. Acomodo ${useRot?'girado':'normal'} · ${nx} × ${ny} por piso · ${niveles} nivel(es). Medidas convertidas: ${ccFmtUnit(pl,document.getElementById('simPLU')?.value)} × ${ccFmtUnit(pa,document.getElementById('simPAU')?.value)} × ${ccFmtUnit(ph,document.getElementById('simPHU')?.value)}. Aprovechamiento aproximado: ${uso.toFixed(1)}%.</div><div class="cc-sim-3d-wrap"><div class="cc-sim-3d-title"><strong>Vista 2D — acomodo de pallets dentro de la unidad</strong><span class="cc-3d-legend"><span><i class="cc-3d-dot"></i>Pallet</span><span>${dbl?'Doble stack activado':'1 nivel'}</span></span></div><div class="cc-sim-view-card"><div class="cc-sim-view-head"><strong>Acomodo superior</strong><span>${nx} × ${ny} por piso · ${niveles} nivel(es)</span></div><div class="cc-top-layout"><div class="cc-top-unit" style="--cols:${Math.max(1,ny)}">${Array.from({length:Math.min(porPiso,80)},(_,i)=>`<div class="cc-top-pallet" title="Pallet ${i+1}">${i+1}</div>`).join('')}</div><div class="cc-top-caption">Vista 2D para comprobar claramente el acomodo a lo largo y el aprovechamiento del <b>ancho</b> de la unidad.</div></div></div>${geom>maxDraw?`<div class="cc-3d-limit">La vista 3D muestra ${maxDraw} pallets para mantenerla fluida. El cálculo total sigue siendo ${geom} pallets.</div>`:''}</div>`;};

window.ccDotData=[];
window.ccDotUpload=async function(file,unidadId){
  if(!file)return '';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('La evidencia DOT debe ser JPG, PNG o WEBP.');
  if(file.size>5*1024*1024)throw new Error('La foto DOT no puede superar 5 MB.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=`dot/${unidadId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  const {error}=await gmSupabase.storage.from('cc-dot').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(error)throw error;
  return gmSupabase.storage.from('cc-dot').getPublicUrl(path).data?.publicUrl||'';
};

