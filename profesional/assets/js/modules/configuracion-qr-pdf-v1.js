/* Tráfico App · Configuración / Impresión · Exportar QR a PDF · 9 por página */
(function(){
  'use strict';
  if(window.__CC_CONFIG_QR_PDF_V1__) return;
  window.__CC_CONFIG_QR_PDF_V1__=true;

  const PDF_SRC='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  function loadJsPdf(){
    if(window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-cc-jspdf]');
      if(old){
        const wait=setInterval(()=>{if(window.jspdf?.jsPDF){clearInterval(wait);resolve(window.jspdf.jsPDF)}},100);
        setTimeout(()=>{clearInterval(wait);if(!window.jspdf?.jsPDF)reject(new Error('No se pudo cargar el generador PDF.'));},12000);
        return;
      }
      const s=document.createElement('script');
      s.src=PDF_SRC;
      s.async=true;
      s.dataset.ccJspdf='1';
      s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('No se pudo iniciar el generador PDF.'));
      s.onerror=()=>reject(new Error('No se pudo descargar el generador PDF.'));
      document.head.appendChild(s);
    });
  }

  function qrItems(preview){
    const imgs=[...preview.querySelectorAll('img')].filter(img=>String(img.src||'').startsWith('data:image/'));
    return imgs.map(img=>{
      const card=img.closest('div[style*="text-align:center"]')||img.parentElement;
      const numero=card?.querySelector('strong')?.textContent?.trim()||'UNIDAD';
      const small=[...card?.querySelectorAll('div')||[]].map(x=>x.textContent?.trim()).find(t=>t&&t!=='Escanear para actualizar ubicación'&&t!==numero)||'';
      return {numero,detalle:small,qr:img.src};
    });
  }

  async function exportPdf(preview,button){
    const items=qrItems(preview);
    if(!items.length){alert('No hay códigos QR disponibles para exportar.');return;}
    const old=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Generando PDF…';
    try{
      const jsPDF=await loadJsPdf();
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      const pageW=210,pageH=297,marginX=10,marginY=10,gapX=4,gapY=4;
      const cellW=(pageW-(marginX*2)-(gapX*2))/3;
      const cellH=(pageH-(marginY*2)-(gapY*2))/3;
      const qrSize=Math.min(50,cellW-8,cellH-28);

      items.forEach((it,i)=>{
        if(i>0 && i%9===0) doc.addPage();
        const p=i%9,row=Math.floor(p/3),col=p%3;
        const x=marginX+col*(cellW+gapX),y=marginY+row*(cellH+gapY);

        doc.setDrawColor(210,218,228);
        doc.roundedRect(x,y,cellW,cellH,2,2,'S');
        doc.setFont('helvetica','bold');
        doc.setFontSize(11);
        doc.text(String(it.numero||'UNIDAD'),x+cellW/2,y+7,{align:'center',maxWidth:cellW-6});

        if(it.detalle){
          doc.setFont('helvetica','normal');
          doc.setTextColor(90,100,115);
          doc.setFontSize(7);
          const lines=doc.splitTextToSize(String(it.detalle),cellW-8).slice(0,2);
          doc.text(lines,x+cellW/2,y+11,{align:'center'});
          doc.setTextColor(0,0,0);
        }

        const qx=x+(cellW-qrSize)/2;
        const qy=y+17;
        doc.addImage(it.qr,'PNG',qx,qy,qrSize,qrSize,undefined,'FAST');
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.setTextColor(95,105,120);
        doc.text('Escanear para actualizar ubicación',x+cellW/2,qy+qrSize+6,{align:'center',maxWidth:cellW-6});
        doc.setTextColor(0,0,0);
      });

      const stamp=new Date().toISOString().slice(0,10);
      doc.save('QR_Unidades_'+stamp+'.pdf');
    }catch(err){
      console.error('Exportar QR PDF:',err);
      alert('No se pudo generar el PDF.\n\n'+(err?.message||err));
    }finally{
      button.disabled=false;
      button.innerHTML=old;
    }
  }

  function enhance(){
    const preview=document.getElementById('ccPrintQrPreview');
    if(!preview || preview.dataset.ccPdfReady==='1') return false;
    const footer=[...preview.querySelectorAll('div')].find(d=>String(d.getAttribute('style')||'').includes('border-top')&&d.querySelector('button'));
    if(!footer) return false;
    preview.dataset.ccPdfReady='1';

    const btn=document.createElement('button');
    btn.type='button';
    btn.id='ccExportQrPdfBtn';
    btn.className='cc-btn cc-btn-primary';
    btn.innerHTML='<i class="fa-solid fa-file-pdf"></i> Exportar PDF';
    btn.style.marginRight='8px';
    btn.onclick=()=>exportPdf(preview,btn);
    footer.insertBefore(btn,footer.firstChild);

    const note=preview.querySelector('div[style*="font-size:10px"]');
    if(note && !note.dataset.ccPdfNote){
      note.dataset.ccPdfNote='1';
      note.textContent=(note.textContent||'')+' · PDF: 9 QR por página';
    }
    return true;
  }

  const observer=new MutationObserver(muts=>{
    for(const m of muts){
      if([...m.addedNodes].some(n=>n?.nodeType===1 && (n.id==='ccPrintQrPreview'||n.querySelector?.('#ccPrintQrPreview')))){
        setTimeout(enhance,0);
        break;
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  enhance();
})();
