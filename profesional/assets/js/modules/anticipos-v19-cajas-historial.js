/* Tráfico App Profesional · Anticipos v19 · Cajas historial primero */
(function(){
  if(window.__ccAntCajasV19)return;
  window.__ccAntCajasV19=true;

  function text(el){return (el?.textContent||'').trim().toLowerCase();}

  function apply(){
    const view=document.getElementById('ccAntViewCajas');
    if(!view||view.style.display==='none')return;

    const toolbar=view.querySelector(':scope > .cc-toolbar');
    if(toolbar){
      const note=toolbar.querySelector('.cc-note');
      if(note)note.textContent='Saldos e historial completo de movimientos por cuenta y rango de fechas.';
      if(!toolbar.querySelector('#ccV19MovimientosBtn')){
        const actions=document.createElement('div');
        actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap;align-items:center';
        const refresh=toolbar.querySelector('#ccV16Refresh');
        const btn=document.createElement('button');
        btn.type='button';
        btn.id='ccV19MovimientosBtn';
        btn.className='cc-btn cc-btn-primary';
        btn.innerHTML='<i class="fa-solid fa-right-left"></i> Movimientos de cajas';
        btn.setAttribute('aria-expanded','false');
        btn.onclick=()=>{
          const open=btn.getAttribute('aria-expanded')==='true';
          toggleOperational(!open);
        };
        if(refresh){
          const parent=refresh.parentElement;
          if(parent===toolbar){toolbar.removeChild(refresh);actions.appendChild(btn);actions.appendChild(refresh);toolbar.appendChild(actions)}
          else{actions.appendChild(btn);toolbar.appendChild(actions)}
        }else{actions.appendChild(btn);toolbar.appendChild(actions)}
      }
    }

    const grid=view.querySelector('.cc-v16-grid');
    if(grid){
      [...grid.querySelectorAll('.cc-v16-card')].forEach(card=>{
        const h=text(card.querySelector('h4'));
        if(h.includes('saldos por cuenta')){
          card.dataset.v19Role='summary';
          card.style.display='';
          card.style.gridColumn='1 / -1';
        }else if(h.includes('traspaso entre cuentas')||h.includes('entrada / salida manual')||h.includes('control recomendado')){
          card.dataset.v19Role='operational';
          if(card.dataset.v19Open!=='1')card.style.display='none';
        }
      });
      grid.style.gridTemplateColumns='1fr';
    }

    const hist=[...view.querySelectorAll('.cc-v16-card')].find(card=>text(card).includes('historial de movimientos de cajas'));
    if(hist){hist.style.display='';hist.style.marginTop='12px'}
  }

  function toggleOperational(open){
    const view=document.getElementById('ccAntViewCajas');
    if(!view)return;
    view.querySelectorAll('[data-v19-role="operational"]').forEach(card=>{
      card.dataset.v19Open=open?'1':'0';
      card.style.display=open?'':'none';
    });
    const btn=view.querySelector('#ccV19MovimientosBtn');
    if(btn){
      btn.setAttribute('aria-expanded',open?'true':'false');
      btn.innerHTML=open?'<i class="fa-solid fa-xmark"></i> Cerrar movimientos de cajas':'<i class="fa-solid fa-right-left"></i> Movimientos de cajas';
    }
    if(open){
      const first=view.querySelector('[data-v19-role="operational"]');
      first?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }

  function watch(){
    const root=document.getElementById('ccPanelAnticipos')||document.body;
    let queued=false;
    const schedule=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;apply()});
    };
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('.cc-ant-nav [data-antv="cajas"]'))setTimeout(apply,60);
    },true);
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(watch,1200));
  else setTimeout(watch,1200);
})();
