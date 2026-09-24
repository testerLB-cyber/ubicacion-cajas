(function(){'use strict';if(window.__CC_INV_SELECT_V1__)return;window.__CC_INV_SELECT_V1__=true;let selected='';
function bar(){return document.getElementById('ccInvSelectedActions')}
function unitId(row){return String(row?.dataset?.ccInvId||row?.querySelector('[onclick*="ccEditarUnidadDirecto"]')?.getAttribute('onclick')?.match(/ccEditarUnidadDirecto\(['"]([^'"]+)/)?.[1]||'')}
function decorate(){document.querySelectorAll('#ccInventarioBody tr').forEach(r=>{const id=unitId(r);if(!id)return;r.dataset.ccInvId=id;const btn=r.querySelector('[onclick*="ccEditarUnidadDirecto"]');const call=btn?.getAttribute('onclick')||'';r.dataset.ccInvNumero=(r.cells?.[2]?.innerText||'').trim();r.dataset.ccInvType=(r.cells?.[1]?.innerText||'').trim();r.dataset.ccInvDescription=(r.cells?.[3]?.innerText||'').trim();r.dataset.ccInvCategory=(r.cells?.[1]?.innerText||'').trim();r.dataset.ccInvStatus=(r.cells?.[10]?.innerText||'').trim();const pt=r.cells?.[8]?.innerText||'';r.dataset.ccInvPlatesMx=(pt.match(/MX:\s*([^\n]+)/i)?.[1]||'').trim();r.dataset.ccInvPlatesUsa=(pt.match(/USA:\s*([^\n]+)/i)?.[1]||'').trim();r.dataset.ccInvCapacity=(r.cells?.[11]?.innerText||'').trim();const dm=r.cells?.[6]?.innerText||'';const dv=dm.match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*[×x]\s*([\d.]+)\s*ft/i);if(dv){r.dataset.ccInvLength=dv[1];r.dataset.ccInvWidth=dv[2];r.dataset.ccInvHeight=dv[3];}})}
function sync(){
 const b=bar();if(!b)return;decorate();const row=selected?document.querySelector('#ccInventarioBody tr[data-cc-inv-id="'+CSS.escape(selected)+'"]'):null;
 document.querySelectorAll('#ccInventarioBody tr[data-cc-inv-id]').forEach(r=>{const on=r===row;r.style.cursor='pointer';r.style.outline=on?'2px solid #2563eb':'';r.style.outlineOffset=on?'-2px':'';r.style.background=on?'#eff6ff':'';r.setAttribute('aria-selected',on?'true':'false')});
 const label=document.getElementById('ccInvSelectedLabel');if(label)label.textContent=row?'Seleccionada: '+(row.dataset.ccInvNumero||'Unidad'):'Selecciona una unidad';
 b.querySelectorAll('[data-cc-inv-action]').forEach(x=>x.disabled=!row);
 const m=b.querySelector('[data-cc-inv-action="maintenance"] span');if(m)m.textContent=row?.dataset.ccInvStatus==='MANTENIMIENTO'?'Liberar':'Fuera de servicio';
 const asg=b.querySelector('[data-cc-inv-action="assignment"]');if(asg){const cat=String(row?.dataset.ccInvCategory||'').toUpperCase();const nonBox=!!row&&cat!=='CAJA'&&!cat.includes('CAJA');asg.style.display=nonBox?'inline-flex':'none';asg.disabled=!nonBox;}
}
document.addEventListener('click',e=>{
 const row=e.target.closest?.('#ccInventarioBody tr');
 if(row&&!e.target.closest('button,a,input,select')){decorate();const id=unitId(row);if(id){selected=id;sync();}return}
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
 const d=row.dataset,W=1200,H=980,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 const rawType=String(d.ccInvType||'').trim(),desc=String(d.ccInvDescription||'').trim();
 const candidate=(rawType&&rawType.toUpperCase()!=='CARRO')?rawType:desc;
 const type=(candidate&&candidate.toUpperCase()!=='CARRO'?candidate:'UNIDAD').toUpperCase(),num=(d.ccInvNumero||'UNIDAD').toUpperCase();
 const ft=v=>Number(v||0),m=v=>ft(v)?(ft(v)*0.3048).toFixed(2):'—';
 const mx=String(d.ccInvPlatesMx||'').trim(),usa=String(d.ccInvPlatesUsa||'').trim();
 x.fillStyle='#07182f';x.fillRect(0,0,W,H);x.fillStyle='#0d2748';x.fillRect(0,0,W,175);
 x.fillStyle='#fff';x.font='900 52px Arial';x.fillText('ASIGNACIÓN DE UNIDAD',58,72);x.fillStyle='#8fc7ff';x.font='bold 25px Arial';x.fillText('LOGÍSTICA BALDERRAMA',60,120);
 x.fillStyle='#fff';round(x,55,210,1090,690,30);x.fill();
 x.fillStyle='#eaf3ff';round(x,85,250,430,600,24);x.fill();
 x.fillStyle='#17365d';x.font='900 42px Arial';x.textAlign='center';x.fillText(type,300,315);drawVehicle(x,type,115,350,370,270);x.textAlign='left';
 x.fillStyle='#17365d';x.font='900 60px Arial';x.fillText(num,565,305);
 let y=360;const line=(lab,val,size=42)=>{x.fillStyle='#64748b';x.font='bold 19px Arial';x.fillText(lab,565,y);x.fillStyle='#0f172a';x.font='900 '+size+'px Arial';x.fillText(String(val||'—'),565,y+39);y+=92};
 line('PLACAS MX',mx||'—',40);if(usa&&usa!=='—')line('PLACAS USA',usa,40);line('CAPACIDAD',d.ccInvCapacity||'—',48);
 x.fillStyle='#64748b';x.font='bold 22px Arial';x.fillText('DIMENSIONES',565,y);y+=43;
 for(const [lab,v] of [['LARGO',d.ccInvLength],['ANCHO',d.ccInvWidth],['ALTO',d.ccInvHeight]]){x.fillStyle='#334155';x.font='900 24px Arial';x.fillText(lab,565,y);x.fillStyle='#0f172a';x.font='900 34px Arial';x.fillText((v||'—')+' ft  /  '+m(v)+' m',690,y);y+=52}
 x.fillStyle='#334155';x.font='bold 24px Arial';x.fillText('Buen día, compartimos datos de la unidad programada.',105,875);x.fillStyle='#64748b';x.font='bold 20px Arial';x.fillText('Logística Balderrama',105,910);
 x.fillStyle='#8fc7ff';x.fillRect(55,925,1090,3);x.fillStyle='#dbeafe';x.font='bold 20px Arial';x.fillText('LOGÍSTICA BALDERRAMA  •  ASIGNACIÓN',60,960);
 cv.toBlob(async blob=>{try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);alert('Imagen de asignación copiada al portapapeles.');}else throw new Error()}catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='asignacion_'+num+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);alert('No fue posible copiar la imagen; se descargó como PNG.');}},'image/png');
}
function drawVehicle(x,type,px,py,w,h){
 x.save();x.translate(px,py);x.fillStyle='#17365d';x.strokeStyle='#17365d';x.lineWidth=8;
 /* Camión de carga: la ficha usa el tipo real del catálogo como texto; el gráfico representa una unidad de carga. */
 x.fillRect(10,85,210,115);x.beginPath();x.moveTo(220,85);x.lineTo(270,30);x.lineTo(335,30);x.lineTo(355,200);x.lineTo(220,200);x.closePath();x.fill();
 x.fillStyle='#eaf3ff';x.fillRect(270,52,48,48);x.fillStyle='#8fc7ff';x.fillRect(28,105,170,70);
 x.fillStyle='#0f172a';for(const cx of [85,285]){x.beginPath();x.arc(cx,205,38,0,Math.PI*2);x.fill();x.fillStyle='#cbd5e1';x.beginPath();x.arc(cx,205,15,0,Math.PI*2);x.fill();x.fillStyle='#0f172a';}
 x.restore();
}
function round(x,a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r);return x}
function wrap(ctx,t,x,y,max,lh){const w=t.split(' ');let l='';for(const z of w){const q=l?l+' '+z:z;if(ctx.measureText(q).width>max&&l){ctx.fillText(l,x,y);l=z;y+=lh}else l=q}ctx.fillText(l,x,y)}
const obs=new MutationObserver(()=>{if(selected&&!document.querySelector('#ccInventarioBody tr[data-cc-inv-id="'+CSS.escape(selected)+'"]'))selected='';sync()});
document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('ccInventarioBody');if(b)obs.observe(b,{childList:true});sync()});
setTimeout(()=>{const b=document.getElementById('ccInventarioBody');if(b)obs.observe(b,{childList:true});sync()},1000);
})();