function del(arr,id){
 if(!confirm('Este registro se conservará en el historial y se marcará como INACTIVO/CANCELADO. ¿Continuar?'))return;
 const x=arr.find(a=>a.id===id); if(!x)return;
 const antes=JSON.parse(JSON.stringify(x));
 const op=ccAuditId('DEL');
 let accion='BAJA_LOGICA',sub='REGISTRO';
 if(arr===rentas){x.estatus='CANCELADA';x.canceladaEn=new Date().toISOString();x.observaciones=(x.observaciones?String(x.observaciones)+' | ':'')+'Renta cancelada sin borrar el registro.';accion='CANCELAR_RENTA';sub='RENTA';}
 else {x.estatus='INACTIVO';x.inactivadoEn=new Date().toISOString();if(arr===cajas)sub='INVENTARIO';else if(arr===clientes)sub='CLIENTES';else if(arr===responsables)sub='RESPONSABLES';}
 ccAudit({operacionId:op,accion:accion,modulo:'CONTROL_CAJA',submodulo:sub,idRegistro:x.id,idUnidad:arr===cajas?x.id:(x.cajaId||''),numeroUnidad:arr===cajas?x.numero:'',idCliente:arr===clientes?x.id:(x.clienteId||''),cliente:arr===clientes?x.nombre:'',idRenta:arr===rentas?x.id:'',estatusAnterior:antes.estatus,estatusNuevo:x.estatus,datosAnteriores:antes,datosNuevos:x,detalle:'Baja lógica / cancelación'});
 save();ccRenderAll();
}
window.ccDeleteCaja=id=>alert('Las unidades no se pueden eliminar. Puedes editarlas o enviarlas a mantenimiento.');window.ccDeleteCliente=id=>del(clientes,id);window.ccDeleteResponsable=id=>del(responsables,id);window.ccDeleteRenta=id=>del(rentas,id);
function days(){const a=[],d=new Date();d.setHours(12,0,0,0);for(let i=-3;i<12;i++){const x=new Date(d);x.setDate(d.getDate()+i);a.push(iso(x));}return a;}function rentFor(rid,date){const k=rid+'_'+date;const r=rentas.find(x=>x.id===rid);if(!r||r.estatus==='FINALIZADA'||r.estatus==='CANCELADA')return false;if(Object.prototype.hasOwnProperty.call(matriz,k))return !!matriz[k];/* La fecha fin es vencimiento programado, no salida automática. */return date>=r.fechaInicio;}window.ccToggleDay=function(rid,date){
  const k=rid+'_'+date;
  const actualmenteRentada=rentFor(rid,date);
  const r=rentas.find(x=>x.id===rid);
  const unidad=r?cajas.find(x=>x.id===r.cajaId):null;

  // Si el usuario está activando el día, se conserva el comportamiento normal.
  if(!actualmenteRentada){
    matriz[k]=true;
    ccAudit({operacionId:ccAuditId('DAY'),accion:'CAMBIO_DIA_RENTA',modulo:'RENTA',submodulo:'MATRIZ',idRegistro:rid,idRenta:rid,fechaNueva:date,estatusAnterior:'NO',estatusNuevo:'SI',detalle:'Día marcado como rentado'});
    save();
    ccRenderRenta();
    return;
  }

  // Al pasar de SI -> NO se debe definir el motivo de la salida.
  if(!unidad){
    matriz[k]=false;
    ccAudit({operacionId:ccAuditId('DAY'),accion:'CAMBIO_DIA_RENTA',modulo:'RENTA',submodulo:'MATRIZ',idRegistro:rid,idRenta:rid,fechaNueva:date,estatusAnterior:'SI',estatusNuevo:'NO',detalle:'Día desmarcado sin unidad relacionada'});
    save();
    ccRenderRenta();
    return;
  }

  const cliente=r?clientes.find(c=>c.id===r.clienteId):null;
  const clienteNombre=cliente?.nombre||'Sin cliente';
  const numero=unidad.numero||unidad.descripcion||'Sin número';

  document.getElementById('ccSalidaRentaModal')?.remove();

  const ov=document.createElement('div');
  ov.id='ccSalidaRentaModal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:10050;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`
    <div style="background:#fff;width:min(560px,96vw);border-radius:18px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.35)">
      <div style="padding:16px 20px;background:#0f172a;color:#fff">
        <div style="font-size:15px;font-weight:950">Cambiar SI → NO</div>
        <div style="font-size:10px;color:#cbd5e1;margin-top:4px">
          ${esc(numero)} · ${esc(clienteNombre)} · ${fmtDate(date)}
        </div>
      </div>

      <div style="padding:20px">
        <div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:6px">
          ¿Qué quieres hacer con esta caja?
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:16px">
          Selecciona si la caja termina su renta o si sale temporalmente de servicio para mantenimiento.
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button type="button" id="ccSalirRentaBtn"
            style="border:1px solid #fecaca;background:#fff1f2;color:#b91c1c;border-radius:12px;padding:15px;cursor:pointer;text-align:left">
            <div style="font-weight:950;font-size:12px">⛔ Salir de renta</div>
            <div style="font-size:9px;margin-top:5px;color:#7f1d1d">
              Termina la renta de esta caja desde este día.
            </div>
          </button>

          <button type="button" id="ccMantenimientoBtn"
            style="border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:12px;padding:15px;cursor:pointer;text-align:left">
            <div style="font-weight:950;font-size:12px">🔧 Ir a mantenimiento</div>
            <div style="font-size:9px;margin-top:5px;color:#78350f">
              La caja sale de servicio, pero la renta se conserva.
            </div>
          </button>
        </div>

        <div id="ccSalidaDetalle" style="margin-top:14px"></div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button type="button" class="cc-btn cc-btn-light" id="ccCancelarSalida">Cancelar</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(ov);

  const cerrar=()=>ov.remove();
  document.getElementById('ccCancelarSalida').onclick=cerrar;

  document.getElementById('ccSalirRentaBtn').onclick=()=>{
    // Se conserva el registro histórico de renta, pero se corta la vigencia a partir de este día.
    matriz[k]=false;
    const rentaAntes=JSON.parse(JSON.stringify(r||{}));
    if(r){
      r.fechaFin=date;
      r.indeterminada='NO';
      r.observaciones=(r.observaciones?String(r.observaciones)+' | ':'')+
        `Renta finalizada el ${date}.`;
    }
    cerrar();
    ccAudit({operacionId:ccAuditId('RENTA'),accion:'SALIDA_RENTA',modulo:'RENTA',submodulo:'SALIDA',idRegistro:r?.id||rid,idUnidad:unidad?.id||'',numeroUnidad:unidad?.numero||'',idCliente:r?.clienteId||'',idRenta:r?.id||rid,estatusAnterior:'SI',estatusNuevo:'NO',datosAnteriores:rentaAntes,datosNuevos:r||{},fechaNueva:date,detalle:'Caja salió de renta desde el día seleccionado'});
    save();
    ccRenderAll();
  };

