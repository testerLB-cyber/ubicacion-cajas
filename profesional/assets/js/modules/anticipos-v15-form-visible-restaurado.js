/* Tráfico App · Ajuste mínimo para Catálogos integrados v15 */
(function(){
  if(window.__ccAntV15FormVisibleRestaurado)return; window.__ccAntV15FormVisibleRestaurado=true;
  function lift(){
    const main=document.getElementById('ccV15Main');
    const form=document.getElementById('ccV15FormHost');
    if(!main||!form||!form.innerHTML.trim())return;
    const table=main.querySelector('.cc-inv-wrap');
    if(table && form.nextElementSibling!==table){
      main.insertBefore(form,table);
    }
    form.style.display='block';
    form.style.margin='10px 0 14px';
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('#ccV15New,[data-edit]')) setTimeout(lift,0);
  },true);
  const mo=new MutationObserver(lift);
  mo.observe(document.documentElement,{childList:true,subtree:true});
})();
