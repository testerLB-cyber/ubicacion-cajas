      status.textContent='Actualizando registro DOT en Supabase...';
      const {data,error}=await gmSupabase.rpc('cc_dot_update',{
        p_id:r.id,
        p_fecha:String(fd.get('fecha')||''),
        p_cliente_id:String(fd.get('clienteId')||'')||null,
        p_descripcion:String(fd.get('descripcion')||'').trim(),
        p_evidencia_url:evidenciaUrl||null
      });
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||'No se pudo actualizar DOT');

      ccRevision=Number(data.revision||ccRevision);
      await ccAudit({
        operacionId:ccAuditId('DOT'),
        accion:'EDITAR_DOT',
        modulo:'DOT',
        submodulo:'EDICION',
        idRegistro:r.id,
        idUnidad:r.unidadId||'',
        numeroUnidad:r.unidad||'',
        idCliente:String(fd.get('clienteId')||''),
        fechaNueva:String(fd.get('fecha')||''),
        datosAnteriores:r,
        datosNuevos:data.registro||{},
        detalle:'Registro DOT actualizado directamente en Supabase'
      });

      close();
      await ccCargarDot();
      showStatus?.('REGISTRO DOT ACTUALIZADO EN SUPABASE','success');
    }catch(err){
      console.error('EDITAR DOT:',err);
      status.textContent='ERROR: '+(err.message||err);
      status.style.color='#b91c1c';
      btn.disabled=false;
      btn.innerHTML='<i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios';
      alert('No se pudo actualizar el registro DOT.\n\n'+(err.message||err));
    }
  };
};

window.ccExportarDotExcel=function(){
  const rows=window.ccDotData||[];if(!rows.length){alert('No hay registros DOT para exportar.');return;}
  if(!window.XLSX){alert('La librería Excel no está disponible.');return;}
  const data=rows.map((r,i)=>({'#':i+1,'Fecha':r.fecha,'Carro':r.unidad,'Descripción unidad':r.descripcionUnidad,'Cliente':r.cliente||'','Descripción DOT':r.descripcion,'Evidencia':r.evidenciaUrl||''}));
  const ws=XLSX.utils.json_to_sheet(data);ws['!cols']=[{wch:6},{wch:14},{wch:16},{wch:28},{wch:24},{wch:45},{wch:55}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Control DOT');XLSX.writeFile(wb,`Control_DOT_${iso(new Date())}.xlsx`);
};
window.ccGenerarDotPDF=async function(){
  const desde=document.getElementById('ccDotDesde')?.value||null;
  const hasta=document.getElementById('ccDotHasta')?.value||null;
  const unidad=document.getElementById('ccDotUnidad')?.value||null;
  const cliente=document.getElementById('ccDotCliente')?.value||null;

  if(desde&&hasta&&desde>hasta){
    alert('La fecha DESDE no puede ser mayor que la fecha HASTA.');
    return;
  }

  const imageToDataUrl=async(url)=>{
    if(!url)return '';
    const resp=await fetch(url,{cache:'no-store'});
    if(!resp.ok)throw new Error('No se pudo cargar una evidencia DOT.');
    const blob=await resp.blob();
    return await new Promise((resolve,reject)=>{
      const fr=new FileReader();
      fr.onload=()=>resolve(fr.result);
      fr.onerror=()=>reject(new Error('No se pudo convertir la evidencia.'));
      fr.readAsDataURL(blob);
    });
  };

  try{
    showStatus?.('Consultando registros DOT del rango seleccionado...','info');

    const {data,error}=await gmSupabase.rpc('cc_dot_list',{
      p_desde:desde,
      p_hasta:hasta,
      p_unidad_id:unidad,
      p_cliente_id:cliente
    });
    if(error)throw error;
    if(data?.ok===false)throw new Error(data.error||'No se pudo consultar DOT');

    const rows=Array.isArray(data?.registros)?data.registros:[];
    if(!rows.length){
      alert('No hay registros DOT dentro del rango y filtros seleccionados.');
      return;
    }

    if(!window.jspdf?.jsPDF){
      throw new Error('La librería PDF no está disponible.');
    }

    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});

    const unidadNombre=unidad?(cajas.find(x=>x.id===unidad)?.numero||'Unidad seleccionada'):'Todas las unidades';
    const clienteNombre=cliente?(clientes.find(x=>x.id===cliente)?.nombre||'Cliente seleccionado'):'Todos los clientes';
    const rangoDesde=desde||'Inicio';
    const rangoHasta=hasta||'Actual';

    // Portada / resumen
    doc.setFillColor(15,23,42);
    doc.rect(0,0,216,32,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(16);
    doc.text('REPORTE DETALLADO DE CONTROL DOT',14,12);

