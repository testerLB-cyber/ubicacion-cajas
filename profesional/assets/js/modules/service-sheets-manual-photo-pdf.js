/* Tráfico App Profesional · Hojas de Servicio · foto manual + PDF */
(function(){
  'use strict';
  if(window.__HS_MANUAL_PHOTO_PDF__) return;
  window.__HS_MANUAL_PHOTO_PDF__=true;

  const sb=()=>window.gmSupabase;
  const text=v=>String(v??'').trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let DATA=null,loading=null;

  async function getData(force=false){
    if(DATA&&!force) return DATA;
    if(loading) return loading;
    loading=(async()=>{
      try{
        const {data,error}=await sb().rpc('hs_list');
        if(error||!data?.ok) throw new Error(error?.message||data?.error||'No se pudo cargar Hojas de Servicio.');
        DATA=data;
        return DATA;
      }finally{loading=null;}
    })();
    return loading;
  }

  function ensureStyles(){
    if(document.getElementById('hs-manual-photo-pdf-style')) return;
    const st=document.createElement('style');
    st.id='hs-manual-photo-pdf-style';
    st.textContent=`
      .hs-manual-photo-box{margin-top:10px;padding:10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}
      .hs-manual-photo-box label{display:block;font-size:10px;font-weight:900;color:#334155;margin-bottom:6px}
      .hs-manual-photo-box .hs-manual-photo-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      .hs-manual-photo-status{font-size:10px;color:#64748b}
      #hs104Hist th[data-hs-pdf-head],#hs104Hist td[data-hs-pdf-cell]{text-align:right;white-space:nowrap}
      @media(max-width:640px){.hs-manual-photo-box .hs-manual-photo-actions{align-items:stretch}.hs-manual-photo-box .cc-btn{width:100%}}
    `;
    document.head.appendChild(st);
  }

  async function compressImage(file){
    if(!file?.type?.startsWith('image/')) throw new Error('Selecciona una imagen válida.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();
      await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('No se pudo leer la foto.'));img.src=url;});
      let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
      const max=1800;
      if(Math.max(w,h)>max){const r=max/Math.max(w,h);w=Math.round(w*r);h=Math.round(h*r);}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d',{alpha:false}).drawImage(img,0,0,w,h);
      const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',.78));
      if(!blob) throw new Error('No se pudo preparar la foto.');
      return blob;
    }finally{URL.revokeObjectURL(url);}
  }

  function openPhotoModal(url,title='Evidencia de comprobación'){
    document.getElementById('hs-manual-photo-modal')?.remove();
    const ov=document.createElement('div');
    ov.id='hs-manual-photo-modal';
    ov.style.cssText='position:fixed;inset:0;z-index:100800;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="width:min(920px,97vw);max-height:94vh;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px #0008">'+
      '<div style="background:#0f172a;color:#fff;padding:12px 15px;display:flex;align-items:center;justify-content:space-between;gap:10px"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:26px;cursor:pointer">×</button></div>'+
      '<div style="padding:12px;background:#f8fafc;display:flex;align-items:center;justify-content:center;max-height:82vh;overflow:auto"><img src="'+esc(url)+'" alt="Evidencia" style="display:block;max-width:100%;max-height:78vh;object-fit:contain;border-radius:10px"></div></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();
    ov.querySelector('[data-x]').onclick=close;
    ov.onclick=e=>{if(e.target===ov)close();};
    const escKey=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',escKey);}};
    document.addEventListener('keydown',escKey);
  }

  async function showStoredPhoto(path,title){
    if(!path) return;
    const {data,error}=await sb().storage.from('app-hojas-servicio').createSignedUrl(path,900);
    if(error||!data?.signedUrl) throw new Error(error?.message||'No se pudo abrir la foto.');
    openPhotoModal(data.signedUrl,title);
  }

  async function uploadManualPhoto(row,file,status){
    const folioId=row.dataset.row;
    if(!folioId) throw new Error('No se identificó el folio.');
    status.textContent='Preparando foto…';
    const blob=await compressImage(file);
    const {data:userData,error:userError}=await sb().auth.getUser();
    if(userError||!userData?.user?.id) throw new Error('Sesión no disponible.');
    const uid=userData.user.id;
    const path=uid+'/web-manual/'+folioId+'/'+Date.now()+'.jpg';
    status.textContent='Subiendo foto…';
    const {error:upErr}=await sb().storage.from('app-hojas-servicio').upload(path,blob,{contentType:'image/jpeg',upsert:false});
    if(upErr) throw upErr;
    const {data,error}=await sb().rpc('hs_set_manual_photo',{p_folio_id:folioId,p_foto_path:path});
    if(error||!data?.ok) throw new Error(error?.message||data?.error||'No se pudo ligar la foto al folio.');
    row.dataset.hsManualPhotoPath=path;
    status.textContent='Foto lista para guardar con la comprobación.';
    const viewBtn=row.querySelector('[data-hs-manual-view]');
    if(viewBtn) viewBtn.style.display='inline-flex';
    DATA=null;
  }

  function patchPendingRow(row,folio){
    if(!row||!folio) return;
    const editArea=row.querySelector('.hs-list-edit-area')||row;
    let box=row.querySelector('[data-hs-manual-photo-box]');
    if(!box){
      box=document.createElement('div');
      box.className='hs-manual-photo-box';
      box.dataset.hsManualPhotoBox='1';
      box.innerHTML='<label>Foto de comprobación manual</label><div class="hs-manual-photo-actions"><input type="file" accept="image/*" capture="environment" data-hs-manual-file style="max-width:260px"><button type="button" class="cc-btn cc-btn-light" data-hs-manual-view style="display:none"><i class="fa-solid fa-camera"></i> Ver foto</button><span class="hs-manual-photo-status">Opcional. Se guardará con la comprobación.</span></div>';
      editArea.appendChild(box);
      const input=box.querySelector('[data-hs-manual-file]');
      const status=box.querySelector('.hs-manual-photo-status');
      input.addEventListener('change',async()=>{
        const file=input.files?.[0]; if(!file) return;
        input.disabled=true;
        try{await uploadManualPhoto(row,file,status);}catch(e){status.textContent='Error: '+(e?.message||e);alert(e?.message||e);}finally{input.disabled=false;}
      });
      box.querySelector('[data-hs-manual-view]').onclick=async()=>{
        const p=row.dataset.hsManualPhotoPath; if(!p)return;
        try{await showStoredPhoto(p,'Foto manual · '+(row.dataset.hsFolio||folio.folio||''));}catch(e){alert(e?.message||e);}
      };
    }
    const path=folio.fotoManualPath||'';
    if(path){
      row.dataset.hsManualPhotoPath=path;
      box.querySelector('[data-hs-manual-view]').style.display='inline-flex';
      box.querySelector('.hs-manual-photo-status').textContent='Foto manual cargada y lista para la comprobación.';
    }
  }

  async function ensureJsPdf(){
    if(window.jspdf?.jsPDF) return window.jspdf.jsPDF;
    let s=document.querySelector('script[data-hs-jspdf]');
    if(!s){
      s=document.createElement('script');s.dataset.hsJspdf='1';s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';document.head.appendChild(s);
    }
    await new Promise((res,rej)=>{if(window.jspdf?.jsPDF)return res();s.addEventListener('load',res,{once:true});s.addEventListener('error',()=>rej(new Error('No se pudo cargar el generador PDF.')),{once:true});});
    if(!window.jspdf?.jsPDF) throw new Error('Generador PDF no disponible.');
    return window.jspdf.jsPDF;
  }

  async function photoDataUrl(path){
    if(!path) return null;
    const {data,error}=await sb().storage.from('app-hojas-servicio').createSignedUrl(path,300);
    if(error||!data?.signedUrl) return null;
    const r=await fetch(data.signedUrl); if(!r.ok)return null;
    const b=await r.blob();
    return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(b);});
  }

  function pdfLine(doc,label,value,y){
    doc.setFont('helvetica','bold');doc.text(label+':',16,y);
    doc.setFont('helvetica','normal');
    const parts=doc.splitTextToSize(text(value)||'—',145);
    doc.text(parts,52,y);
    return y+Math.max(7,parts.length*5.2);
  }

  async function exportPdf(c){
    const JsPDF=await ensureJsPdf();
    const doc=new JsPDF({unit:'mm',format:'a4'});
    doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('Comprobación de Hoja de Servicio',16,18);
    doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text('Tráfico App',16,25);
    doc.setDrawColor(203,213,225);doc.line(16,29,194,29);
    doc.setFontSize(10);
    let y=38;
    y=pdfLine(doc,'Folio',c.folio,y);
    y=pdfLine(doc,'Estatus','COMPROBADA',y);
    y=pdfLine(doc,'Fecha de uso',c.fechaUso||c.fecha,y);
    y=pdfLine(doc,'Fecha comprobación',c.fechaComprobacion?new Date(c.fechaComprobacion).toLocaleString('es-MX'):'—',y);
    y=pdfLine(doc,'Cliente',c.cliente,y);
    y=pdfLine(doc,'Persona',c.beneficiario||c.operador,y);
    y=pdfLine(doc,'Tipo de servicio',c.tipoViaje||c.servicio,y);
    y=pdfLine(doc,'Clasificación',c.clasificacion,y);
    y=pdfLine(doc,'Responsable',c.responsable,y);
    y=pdfLine(doc,'Observaciones',c.observaciones||'—',y);
    if(c.fotoPath){
      const img=await photoDataUrl(c.fotoPath);
      if(img){
        if(y>190){doc.addPage();y=20;}
        doc.setFont('helvetica','bold');doc.text('Evidencia fotográfica',16,y);y+=6;
        try{
          const props=doc.getImageProperties(img);const maxW=178,maxH=95;let w=maxW,h=w*(props.height/props.width);if(h>maxH){h=maxH;w=h*(props.width/props.height);}doc.addImage(img,props.fileType||'JPEG',16,y,w,h);y+=h+5;
        }catch(_){doc.setFont('helvetica','normal');doc.text('La evidencia está disponible en el sistema.',16,y);}
      }
    }
    doc.setFontSize(8);doc.setTextColor(100);doc.text('Generado desde Tráfico App',16,287);
    doc.save('Comprobacion_'+text(c.folio).replace(/[^a-z0-9_-]+/gi,'_')+'.pdf');
  }

  function patchHistory(d){
    const body=document.getElementById('hs104Hist'); if(!body)return;
    const table=body.closest('table'); if(!table)return;
    const head=table.querySelector('thead tr');
    if(head&&!head.querySelector('[data-hs-pdf-head]')){const th=document.createElement('th');th.dataset.hsPdfHead='1';th.textContent='PDF';head.appendChild(th);}
    [...body.querySelectorAll('tr')].forEach(tr=>{
      if(tr.querySelector('[data-hs-pdf-cell]'))return;
      const cells=tr.querySelectorAll('td');if(!cells.length||cells.length<6)return;
      const folio=text(cells[0].textContent);
      const c=(d.comprobaciones||[]).find(x=>String(x.tipo||'').toUpperCase()==='UTILIZADA'&&text(x.folio)===folio);
      if(!c)return;
      const td=document.createElement('td');td.dataset.hsPdfCell='1';
      td.innerHTML='<button type="button" class="cc-btn cc-btn-light" data-hs-pdf><i class="fa-solid fa-file-pdf"></i> PDF</button>'+(c.fotoPath?' <button type="button" class="cc-btn cc-btn-light" data-hs-hist-photo title="Ver evidencia"><i class="fa-solid fa-camera"></i></button>':'');
      tr.appendChild(td);
      td.querySelector('[data-hs-pdf]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await exportPdf(c);}catch(err){alert(err?.message||err);}finally{b.disabled=false;}};
      td.querySelector('[data-hs-hist-photo]')?.addEventListener('click',async()=>{try{await showStoredPhoto(c.fotoPath,'Evidencia · '+c.folio);}catch(e){alert(e?.message||e);}});
    });
  }

  async function patch(force=false){
    ensureStyles();
    if(!sb())return;
    const list=document.getElementById('hs104CompList'),hist=document.getElementById('hs104Hist');
    if(!list&&!hist)return;
    try{
      const d=await getData(force);
      if(list){
        [...list.querySelectorAll('[data-row]')].forEach(row=>{
          const f=(d.foliosAsignadosOperador||[]).find(x=>String(x.id)===String(row.dataset.row));
          if(f) patchPendingRow(row,f);
        });
      }
      if(hist) patchHistory(d);
    }catch(e){console.warn('HS FOTO/PDF',e);}
  }

  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v="Comprobacion"]')||e.target.closest?.('#hs104CompShowAll'))setTimeout(()=>patch(true),260);},true);
  document.addEventListener('change',e=>{if(['hs104CompPerson','hs104CompType','hs104CompShowAll'].includes(e.target?.id))setTimeout(()=>patch(true),240);},true);
  window.hsPatchManualPhotoPdf=()=>patch(true);
  setInterval(()=>{if(document.getElementById('hs104CompList')||document.getElementById('hs104Hist'))patch(false);},1200);
})();
