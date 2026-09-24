(function(){'use strict';if(window.__CC_INV_SELECT_V1__)return;window.__CC_INV_SELECT_V1__=true;let selected='';
function bar(){return document.getElementById('ccInvSelectedActions')}
function sync(){
 const b=bar();if(!b)return;const row=selected?document.querySelector('#ccInventarioBody tr[data-cc-inv-id="'+CSS.escape(selected)+'"]'):null;
 document.querySelectorAll('#ccInventarioBody tr[data-cc-inv-id]').forEach(r=>{const on=r===row;r.style.cursor='pointer';r.style.outline=on?'2px solid #2563eb':'';r.style.outlineOffset=on?'-2px':'';r.style.background=on?'#eff6ff':'';r.setAttribute('aria-selected',on?'true':'false')});
 const label=document.getElementById('ccInvSelectedLabel');if(label)label.textContent=row?'Seleccionada: '+(row.dataset.ccInvNumero||'Unidad'):'Selecciona una unidad';
 b.querySelectorAll('[data-cc-inv-action]').forEach(x=>x.disabled=!row);
 const m=b.querySelector('[data-cc-inv-action="maintenance"] span');if(m)m.textContent=row?.dataset.ccInvStatus==='MANTENIMIENTO'?'Liberar':'Fuera de servicio';
 const asg=b.querySelector('[data-cc-inv-action="assignment"]');if(asg){const cat=String(row?.dataset.ccInvCategory||'').toUpperCase();const nonBox=!!row&&cat!=='CAJA'&&!cat.includes('CAJA');asg.style.display=nonBox?'inline-flex':'none';asg.disabled=!nonBox;}
}
document.addEventListener('click',e=>{
 const row=e.target.closest?.('#ccInventarioBody tr[data-cc-inv-id]');
 if(row&&!e.target.closest('button,a,input,select')){selected=row.dataset.ccInvId;sync();return}
 const a=e.target.closest?.('[data-cc-inv-action]');if(!a||a.disabled||!selected)return;
 const row2=document.querySelector('#ccInventarioBody tr[data-cc-inv-id="'+CSS.escape(selected)+'"]');if(!row2)return sync();
 const k=a.dataset.ccInvAction;
 if(k==='edit')window.ccEditarUnidadDirecto?.(selected);
 if(k==='maintenance'){if(row2.dataset.ccInvStatus==='MANTENIMIENTO')window.ccLiberarMantenimiento?.(selected);else window.ccPonerMantenimiento?.(selected)}
 if(k==='dot')window.ccAbrirDotRegistro?.(selected);
 if(k==='qr')window.ccMostrarQrUnidad?.(selected);
 if(k==='assignment')copyAssignment(row2);
});
async function copyAssignment(row){
 const d=row.dataset, W=1080,H=1080,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 x.fillStyle='#f8fafc';x.fillRect(0,0,W,H);x.fillStyle='#17365d';x.fillRect(0,0,W,190);
 x.fillStyle='#fff';x.font='bold 48px Arial';x.fillText('ASIGNACIÓN DE UNIDAD',60,82);x.font='bold 34px Arial';x.fillText(d.ccInvNumero||'UNIDAD',60,142);
 x.fillStyle='#e2e8f0';x.fillRect(60,240,360,360);x.fillStyle='#64748b';x.font='bold 26px Arial';x.textAlign='center';x.fillText('TIPO DE UNIDAD',240,380);x.font='bold 44px Arial';x.fillStyle='#17365d';x.fillText((d.ccInvType||d.ccInvCategory||'UNIDAD').toUpperCase(),240,445);x.font='80px Arial';x.fillText('🚛',240,550);x.textAlign='left';
 const lines=[['Identificador',d.ccInvNumero],['Placas',d.ccInvPlates||'—'],['Capacidad',d.ccInvCapacity||'—'],['Dimensiones',[(d.ccInvLength||'—'),(d.ccInvWidth||'—'),(d.ccInvHeight||'—')].join(' × ')+' ft'],['Descripción',d.ccInvDescription||'—']];
 let y=285;for(const [a,v] of lines){x.fillStyle='#64748b';x.font='bold 22px Arial';x.fillText(a.toUpperCase(),475,y);x.fillStyle='#0f172a';x.font='bold 32px Arial';wrap(x,String(v),475,y+42,530,38);y+=125}
 x.fillStyle='#17365d';x.fillRect(0,H-80,W,80);x.fillStyle='#fff';x.font='bold 22px Arial';x.fillText('TRÁFICO APP · ASIGNACIÓN',60,H-31);
 cv.toBlob(async blob=>{try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);alert('Imagen de asignación copiada al portapapeles.');}else{throw new Error('clipboard image unsupported')}}catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='asignacion_'+(d.ccInvNumero||'unidad')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);alert('Este navegador no permitió copiar la imagen; se descargó como PNG.');}},'image/png');
}
function wrap(ctx,t,x,y,max,lh){const w=t.split(' ');let l='';for(const z of w){const q=l?l+' '+z:z;if(ctx.measureText(q).width>max&&l){ctx.fillText(l,x,y);l=z;y+=lh}else l=q}ctx.fillText(l,x,y)}
const obs=new MutationObserver(()=>{if(selected&&!document.querySelector('#ccInventarioBody tr[data-cc-inv-id="'+CSS.escape(selected)+'"]'))selected='';sync()});
document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('ccInventarioBody');if(b)obs.observe(b,{childList:true});sync()});
setTimeout(()=>{const b=document.getElementById('ccInventarioBody');if(b)obs.observe(b,{childList:true});sync()},1000);
})();