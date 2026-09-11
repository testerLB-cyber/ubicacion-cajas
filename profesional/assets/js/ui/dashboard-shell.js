(function(){
  function setupV4(){
    const header=document.querySelector('header');
    const main=document.querySelector('main');
    if(!header||!main)return;
    if(!document.getElementById('gmV4SidebarNav')){
      const nav=document.createElement('nav');nav.id='gmV4SidebarNav';nav.innerHTML=`
        <div class="v4-nav-label">Navegación</div>
        <a href="#vistaOperativa"><i class="fa-solid fa-house"></i>Resumen operativo</a>
        <a href="#transitoSection"><i class="fa-solid fa-truck-fast"></i>Tránsito</a>
        <a href="#pendientesSection"><i class="fa-solid fa-list-check"></i>Pendientes</a>
        <a href="#vigencia30Section"><i class="fa-solid fa-hourglass-half"></i>Vigencia 30 días</a>
        <a href="#operadorSection"><i class="fa-solid fa-users"></i>Operadores</a>
        <a href="#vistaGerencial"><i class="fa-solid fa-chart-line"></i>Radiografía gerencial</a>`;
      header.appendChild(nav);
      const foot=document.createElement('div');foot.id='gmV4SidebarFooter';foot.innerHTML='Tráfico App<br><span style="color:#94a3b8">Centro de control operativo</span>';header.appendChild(foot);
    }
    if(!document.getElementById('gmV4Hero')){
      const hero=document.createElement('section');hero.id='gmV4Hero';hero.innerHTML=`
        <div id="gmV4Welcome">
          <div style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#bfdbfe;margin-bottom:12px">CENTRO DE CONTROL</div>
          <h2>Tu operación, en un solo lugar.</h2>
          <p>Carga un archivo y el sistema identifica automáticamente si corresponde al reporte de viajes o al control de vigencia de 30 días.</p>
          <div class="v4-pills"><span class="v4-pill">Viajes</span><span class="v4-pill">Vigencia 30D</span><span class="v4-pill">PDF gerencial</span><span class="v4-pill">Análisis por operador</span></div>
        </div>
        <div id="gmV4Upload">
          <div class="v4-upload-box">
            <div class="v4-upload-icon"><i class="fa-solid fa-file-arrow-up"></i></div>
            <h3>Cargar archivo operativo</h3>
            <div class="v4-hint">Un solo botón. Sube tu Excel de <b>Viajes</b> o de <b>Vigencia 30D</b>; el sistema detectará el tipo automáticamente.</div>
            <label class="v4-file-btn"><i class="fa-solid fa-folder-open"></i> Seleccionar Excel
              <input type="file" id="gmUnifiedExcelInput" accept=".xlsx,.xls,.csv" style="display:none">
            </label>
            <div id="gmV4FileName">Ningún archivo seleccionado</div>
            <div id="gmV4Mode"><span id="gmModeAuto">● Detección automática</span><span id="gmModeResult">Esperando archivo</span></div>
          </div>
        </div>`;
      main.insertBefore(hero,main.firstElementChild.nextElementSibling || main.firstElementChild);
    }
    if(!document.getElementById('gmV4Actions')){
      const actions=document.createElement('section');actions.id='gmV4Actions';actions.innerHTML=`
        <button class="v4-action primary" onclick="exportReporteGerencialPDF()"><span class="icon"><i class="fa-solid fa-file-pdf"></i></span><span><strong>Reporte de operación</strong><small>PDF completo del periodo</small></span></button>
        <button class="v4-action green" onclick="exportReporteGerencialSemanalPDF()"><span class="icon"><i class="fa-solid fa-chart-column"></i></span><span><strong>Reporte semanal</strong><small>Resumen ejecutivo en PDF</small></span></button>
        <button class="v4-action purple" onclick="toggleVistaGerencial()"><span class="icon"><i class="fa-solid fa-chart-pie"></i></span><span><strong>Radiografía gerencial</strong><small>Análisis y métricas avanzadas</small></span></button>`;
      const hero=document.getElementById('gmV4Hero');hero.insertAdjacentElement('afterend',actions);
    }
    const oldInput=document.getElementById('excelInput');
    const unified=document.getElementById('gmUnifiedExcelInput');
    if(oldInput) oldInput.closest('label')?.classList.add('hidden');
    const vig=document.getElementById('vigenciaExcelInput'); if(vig) vig.closest('label')?.classList.add('hidden');
    if(unified && !unified.dataset.bound){
      unified.dataset.bound='1';
      unified.addEventListener('change', async function(e){ await detectarYProcesarArchivo(e.target.files[0]); e.target.value=''; });
    }
  }
  async function detectarYProcesarArchivo(file){
    if(!file)return;
    const name=document.getElementById('gmV4FileName'), mode=document.getElementById('gmModeResult');
    name.textContent=file.name; mode.textContent='Analizando estructura…'; mode.classList.remove('active');
    showStatus('Analizando <strong>'+file.name+'</strong> para identificar el tipo de reporte...');
    try{
      const buffer=await file.arrayBuffer();
      const wb=XLSX.read(new Uint8Array(buffer),{type:'array',cellDates:true,raw:false});
      let rows=[];
      wb.SheetNames.forEach(sn=>{const d=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:'',raw:false});if(d.length)rows.push(...d);});
      if(!rows.length)throw new Error('No se encontraron registros');
      const keys=Object.keys(rows[0]).map(k=>String(k).trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,''));
      const tieneVigencia=(keys.some(k=>['shipper','accepted','aceptado','aceptacion','arrived','arribo'].includes(k)) && keys.some(k=>['trip number','tripnumber','trip','no viaje','viaje'].includes(k))) || keys.some(k=>k.includes('shipper'));
      if(tieneVigencia){
        mode.textContent='VIGENCIA 30D detectado';mode.classList.add('active');
        // Reutilizamos el procesador existente sin pedir un segundo botón.
        const fake={target:{files:[file]}};
        await handleVigencia30File(fake);
      }else{
        mode.textContent='VIAJES detectado';mode.classList.add('active');
        const fake={target:{files:[file]}};
        await handleFile(fake);
      }
    }catch(err){console.error(err);mode.textContent='No se pudo identificar';showStatus('No fue posible identificar o leer el archivo. Verifica el Excel.','error');}
  }
  window.addEventListener('DOMContentLoaded',setupV4);
})();
