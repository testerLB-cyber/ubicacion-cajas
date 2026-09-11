    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    doc.text(`Rango: ${rangoDesde} al ${rangoHasta}`,14,19);
    doc.text(`Unidad: ${unidadNombre}`,14,24);
    doc.text(`Cliente: ${clienteNombre} · Registros: ${rows.length}`,14,28);

    let y=41;

    for(let i=0;i<rows.length;i++){
      const r=rows[i];

      // nueva página si no hay espacio suficiente
      if(y>230){
        doc.addPage();
        y=18;
      }

      doc.setDrawColor(203,213,225);
      doc.setFillColor(248,250,252);
      doc.roundedRect(12,y-5,192,8,2,2,'FD');

      doc.setFont('helvetica','bold');
      doc.setFontSize(10);
      doc.setTextColor(15,23,42);
      doc.text(`Registro DOT #${i+1} · ${r.fecha||'—'} · ${r.unidad||'—'}`,16,y);

      y+=9;

      const detalles=[
        ['Unidad',r.unidad||'—'],
        ['Descripción unidad',r.descripcionUnidad||'—'],
        ['Cliente',r.cliente||'Sin cliente'],
        ['Fecha DOT',r.fecha||'—'],
        ['Descripción / detalle DOT',r.descripcion||'—'],
        ['Evidencia',r.evidenciaUrl?'Sí':'No']
      ];

      doc.autoTable({
        startY:y,
        theme:'grid',
        head:[['CAMPO','DETALLE']],
        body:detalles,
        styles:{fontSize:8,cellPadding:2.4,overflow:'linebreak',valign:'top'},
        headStyles:{fillColor:[76,29,149],textColor:255,fontStyle:'bold'},
        columnStyles:{0:{cellWidth:45,fontStyle:'bold'},1:{cellWidth:137}},
        margin:{left:16,right:16},
        tableWidth:182
      });

      y=doc.lastAutoTable.finalY+5;

      if(r.evidenciaUrl){
        try{
          showStatus?.(`Cargando evidencia ${i+1} de ${rows.length}...`,'info');
          const img=await imageToDataUrl(r.evidenciaUrl);

          if(y>180){
            doc.addPage();
            y=18;
          }

          doc.setFont('helvetica','bold');
          doc.setFontSize(9);
          doc.setTextColor(51,65,85);
          doc.text('Evidencia fotográfica',16,y);
          y+=5;

          const props=doc.getImageProperties(img);
          const maxW=170;
          const maxH=105;
          const scale=Math.min(maxW/props.width,maxH/props.height);
          const w=props.width*scale;
          const h=props.height*scale;

          doc.setDrawColor(203,213,225);
          doc.rect(16,y,w,h);
          doc.addImage(img,props.fileType||'JPEG',16,y,w,h);
          y+=h+8;
        }catch(imgErr){
          console.warn('EVIDENCIA DOT PDF:',imgErr);
          doc.setFont('helvetica','italic');
          doc.setFontSize(8);
          doc.setTextColor(185,28,28);
          doc.text('No fue posible cargar la evidencia fotográfica de este registro.',16,y);
          y+=8;
        }
      }else{
        doc.setFont('helvetica','italic');
        doc.setFontSize(8);
        doc.setTextColor(100,116,139);
        doc.text('Sin evidencia fotográfica adjunta.',16,y);
        y+=8;
      }

      if(i<rows.length-1){
        doc.setDrawColor(226,232,240);
        doc.line(14,y,202,y);
        y+=7;
      }
    }

    // Footer page numbers
    const totalPages=doc.getNumberOfPages();
    for(let pageno=1;pageno<=totalPages;pageno++){
      doc.setPage(pageno);
      const ph=doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(100,116,139);
      doc.text(`Control DOT · ${rangoDesde} a ${rangoHasta}`,12,ph-6);
      doc.text(`Página ${pageno} de ${totalPages}`,174,ph-6);
    }

