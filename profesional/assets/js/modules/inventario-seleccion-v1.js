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
 const d=row.dataset,W=1200,H=900,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 const type=(d.ccInvType||'UNIDAD').toUpperCase(),num=(d.ccInvNumero||'UNIDAD').toUpperCase();
 x.fillStyle='#07182f';x.fillRect(0,0,W,H);x.fillStyle='#0d2748';x.fillRect(0,0,W,175);
 x.fillStyle='#fff';x.font='900 52px Arial';x.fillText('ASIGNACIÓN DE UNIDAD',58,72);x.fillStyle='#8fc7ff';x.font='bold 25px Arial';x.fillText('LOGÍSTICA BALDERRAMA',60,120);
 x.fillStyle='#fff';round(x,55,210,1090,610,30);x.fill();
 x.fillStyle='#eaf3ff';round(x,85,250,430,520,24);x.fill();
 x.fillStyle='#17365d';x.font='900 32px Arial';x.textAlign='center';x.fillText(type,300,315);
 drawVehicle(x,type,120,360,360,250);
 x.fillStyle='#64748b';x.font='bold 20px Arial';x.fillText('TIPO DE UNIDAD',300,725);x.textAlign='left';
 x.fillStyle='#17365d';x.font='900 58px Arial';x.fillText(num,565,305);
 const items=[['PLACAS',d.ccInvPlates||'—'],['CAPACIDAD',d.ccInvCapacity||'—'],['DIMENSIONES',[(d.ccInvLength||'—'),(d.ccInvWidth||'—'),(d.ccInvHeight||'—')].join(' × ')+' FT'],['DESCRIPCIÓN',d.ccInvDescription||'—']];
 let y=365;for(const [lab,val] of items){x.fillStyle='#64748b';x.font='bold 20px Arial';x.fillText(lab,565,y);x.fillStyle='#0f172a';x.font='900 35px Arial';wrap(x,String(val),565,y+39,525,38);y+=105}
 x.fillStyle='#8fc7ff';x.fillRect(55,845,1090,3);x.fillStyle='#dbeafe';x.font='bold 20px Arial';x.fillText('LOGÍSTICA BALDERRAMA  •  ASIGNACIÓN',60,880);
 cv.toBlob(async blob=>{try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);alert('Imagen de asignación copiada al portapapeles.');}else throw new Error()}catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='asignacion_'+num+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);alert('No fue posible copiar la imagen; se descargó como PNG.');}},'image/png');
}
function drawVehicle(x,type,px,py,w,h){
 x.save();x.translate(px,py);x.fillStyle='#17365d';x.strokeStyle='#17365d';x.lineWidth=10;
 const t=type.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(t.includes('PICK')||t.includes('CAMIONETA')){x.fillRect(45,95,180,80);x.beginPath();x.moveTo(225,95);x.lineTo(275,45);x.lineTo(330,45);x.lineTo(350,175);x.lineTo(225,175);x.closePath();x.fill();x.fillStyle='#eaf3ff';x.fillRect(275,60,45,40);}
 else if(t.includes('TRACTO')||t.includes('TRAILER')||t.includes('CAMION')){x.fillRect(10,75,210,100);x.beginPath();x.moveTo(220,75);x.lineTo(270,25);x.lineTo(330,25);x.lineTo(350,175);x.lineTo(220,175);x.closePath();x.fill();x.fillStyle='#eaf3ff';x.fillRect(270,45,48,45);}
 else if(t.includes('VAN')){round(x,35,55,300,120,25);x.fill();x.fillStyle='#eaf3ff';x.fillRect(220,75,80,50);}
 else{x.beginPath();x.moveTo(45,125);x.lineTo(90,65);x.lineTo(255,65);x.lineTo(310,125);x.lineTo(345,135);x.lineTo(345,175);x.lineTo(25,175);x.lineTo(25,140);x.closePath();x.fill();x.fillStyle='#eaf3ff';x.beginPath();x.moveTo(105,78);x.lineTo(240,78);x.lineTo(275,120);x.lineTo(75,120);x.closePath();x.fill();}
 x.fillStyle='#0f172a';for(const cx of [95,285]){x.beginPath();x.arc(cx,180,35,0,Math.PI*2);x.fill();x.fillStyle='#cbd5e1';x.beginPath();x.arc(cx,180,14,0,Math.PI*2);x.fill();x.fillStyle='#0f172a';}x.restore();
}
function round(x,a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r);return x}
function wrap(ctx,t,x,y,max,lh){const w=t.split(' ');let l='';for(const z of w){const q=l?l+' '+z:z;if(ctx.measureText(q).width>max&&l){ctx.fillText(l,x,y);l=z;y+=lh}else l=q}ctx.fillText(l,x,y)}
const obs=new MutationObserver(()=>{if(selected&&!document.querySelector('#ccInventarioBody tr[data-cc-inv-id="'+CSS.escape(selected)+'"]'))selected='';sync()});
document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('ccInventarioBody');if(b)obs.observe(b,{childList:true});sync()});
setTimeout(()=>{const b=document.getElementById('ccInventarioBody');if(b)obs.observe(b,{childList:true});sync()},1000);
})();