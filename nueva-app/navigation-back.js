(()=>{
  const style=document.createElement('style');
  style.textContent='.mobile-top-back{position:fixed;top:calc(8px + env(safe-area-inset-top));left:12px;z-index:9999;width:42px;height:42px;border:0;border-radius:50%;background:#ffffffee;color:#0f172a;font-size:28px;line-height:42px;font-weight:700;box-shadow:0 4px 18px #0f172a2b;display:none;align-items:center;justify-content:center;padding:0}.mobile-top-back.show{display:flex}';
  document.head.appendChild(style);
  const btn=document.createElement('button');btn.type='button';btn.className='mobile-top-back';btn.setAttribute('aria-label','Regresar');btn.textContent='‹';document.body.appendChild(btn);
  let current='login';
  const oldShow=show;
  show=function(id){current=id;oldShow(id);btn.classList.toggle('show',!['login','menu'].includes(id));};
  btn.onclick=()=>{
    if(current==='hsCapture') return renderHs();
    if(current==='antCapture') return renderAnt();
    if(['hsList','antList','history'].includes(current)) return renderMenu();
    renderMenu();
  };
})();