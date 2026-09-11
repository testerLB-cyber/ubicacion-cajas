    showStatus?.(
      data.alreadySent
        ?(esLiberacion?'EL CORREO DE LIBERACIÓN YA HABÍA SIDO ENVIADO':'EL AVISO DE MANTENIMIENTO YA HABÍA SIDO ENVIADO')
        :(esLiberacion?'CORREO DE LIBERACIÓN ENVIADO':'AVISO DE MANTENIMIENTO ENVIADO POR CORREO'),
      'success'
    );
    return data;
  }catch(err){
    console.error('EMAIL MANTENIMIENTO:',err);
    showStatus?.((esLiberacion?'LIBERACIÓN':'MANTENIMIENTO')+' GUARDADA · ERROR AL ENVIAR CORREO: '+(err.message||err),'error');
    return {ok:false,error:err.message||String(err)};
  }
};
window.ccImageUrlToDataUrl=async function(url){if(!url)return '';const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('No se pudo cargar la evidencia');const blob=await r.blob();return await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(blob);});};
window.ccGenerarPDFMantenimiento=async function(record,x){
  try{
    if(!window.jspdf||!window.jspdf.jsPDF){
      alert('No fue posible generar el PDF porque la librería PDF no está disponible.');
      return;
    }
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'letter'});
    const cliente=clientes.find(c=>c.id===record.clienteId)?.nombre||
                  clientes.find(c=>c.id===x?.clienteId)?.nombre||'Sin cliente';
    const f=v=>v?new Date(v).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}):'—';

    doc.setFont('helvetica','bold');doc.setFontSize(18);
    doc.text('CONTROL DE MANTENIMIENTO DE UNIDAD',18,20);
    doc.setFontSize(10);doc.setFont('helvetica','normal');
    doc.text(record.fechaLiberacion?'Reporte de mantenimiento cerrado':'Registro de salida de servicio y seguimiento',18,27);
    doc.setDrawColor(record.fechaLiberacion?22:220,record.fechaLiberacion?101:38,record.fechaLiberacion?52:38);
    doc.line(18,31,194,31);

    let y=42;
    const rows=[
      ['Unidad',record.numero||x?.numero||'—'],
      ['Descripción',record.descripcion||x?.descripcion||'—'],
      ['Tipo de unidad',x?.tipoUnidadNombre||x?.categoriaUnidad||'—'],
      ['Tipo / Configuración',record.tipo||x?.tipo||'—'],
      ['Tamaño',record.tamano||x?.tamano||'—'],
      ['Placas',record.placas||x?.placas||'—'],
      ['Marca',x?.marca||'—'],
      ['Modelo / Año',x?.modelo||'—'],
      ['Origen',record.origen||x?.origen||'—'],
      ['Capacidad',x?.capacidad||'—'],
      ['Cliente',cliente],
      ['Fecha y hora de salida',f(record.fechaSalida)],
      ['Motivo del mantenimiento',record.motivo||'—'],
      ['Qué se reparó',record.reparacion||'Pendiente de reparación'],
      ['Estatus actual',record.fechaLiberacion?'LIBERADA / DISPONIBLE':'EN MANTENIMIENTO'],
      ['Fecha y hora de liberación',f(record.fechaLiberacion)]
    ];

    rows.forEach(([a,b])=>{
      doc.setFont('helvetica','bold');doc.text(a+':',20,y);
      doc.setFont('helvetica','normal');
      const lines=doc.splitTextToSize(String(b),125);
      doc.text(lines,65,y);
      y+=Math.max(7,lines.length*5);
    });

    const evidencias=[
      {url:record.evidenciaUrl||record.evidencia_url||'',titulo:'Evidencia · Fuera de servicio'},
      {url:record.evidenciaLiberacionUrl||record.evidencia_liberacion_url||'',titulo:'Evidencia · Liberación'}
    ].filter(e=>e.url);

    for(const ev of evidencias){
      try{
        const img=await ccImageUrlToDataUrl(ev.url);
        if(y>185){doc.addPage();y=20;}
        doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(ev.titulo+':',20,y);y+=6;
        const props=doc.getImageProperties(img);
        const maxW=165,maxH=90,ratio=Math.min(maxW/props.width,maxH/props.height);
        const w=props.width*ratio,h=props.height*ratio;
        doc.addImage(img,props.fileType||'JPEG',20,y,w,h);
        y+=h+9;
      }catch(imgErr){
        console.warn('EVIDENCIA PDF:',imgErr);
        doc.setFontSize(8);doc.text('No fue posible cargar '+ev.titulo.toLowerCase()+'.',20,y);y+=7;
      }
    }

    if(y>250){doc.addPage();y=20;}
    doc.setFont('helvetica','italic');doc.setFontSize(9);
    doc.text('Documento generado automáticamente por el Sistema de Control de Cajas.',20,y);
    const safe=(record.numero||'UNIDAD').replace(/[^a-z0-9_-]/gi,'_');
    const sufijo=record.fechaLiberacion?'_LIBERACION':'_FUERA_SERVICIO';
    doc.save(`Mantenimiento_${safe}${sufijo}_${String(record.fechaLiberacion||record.fechaSalida||'').slice(0,10)||iso(new Date())}.pdf`);

    ccAudit({
      operacionId:ccAuditId('EXP'),
      accion:'GENERAR_PDF_MANTENIMIENTO',
      modulo:'MANTENIMIENTO',
      submodulo:'PDF',
      idRegistro:record.id,
      idUnidad:x?.id||record.cajaId||'',
      numeroUnidad:x?.numero||record.numero||'',
      detalle:`PDF de mantenimiento generado · ${evidencias.length} evidencia(s)`
    });
  }catch(e){
    console.error(e);
    alert('Ocurrió un error al generar el PDF de mantenimiento.');
  }
};
window.ccGenerarPDFMantenimientoById=function(id){const r=configuracion.mantenimientoHistorial.find(z=>z.id===id);if(!r)return;const x=cajas.find(z=>z.id===r.cajaId)||r;ccGenerarPDFMantenimiento(r,x);};

