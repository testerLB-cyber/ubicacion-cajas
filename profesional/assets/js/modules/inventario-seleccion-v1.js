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
 if(k==='assignment')chooseOperatorAndCopy(row2);
});
async function loadAssignmentOperators(){
 try{
  const s=window.gmSupabase;if(!s?.rpc)throw new Error('Supabase no disponible');
  const r=await s.rpc('cc_general_catalogs');if(r?.error)throw r.error;
  return (r?.data?.operadores||[]).filter(o=>String(o?.estatus||'ACTIVO').toUpperCase()!=='INACTIVO'&&String(o?.nombre||'').trim()).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),'es'));
 }catch(e){console.warn('No se pudo cargar catálogo de operadores para asignación',e);return []}
}
async function chooseOperatorAndCopy(row){
 const ops=await loadAssignmentOperators();
 document.getElementById('ccAssignmentOperatorModal')?.remove();
 const ov=document.createElement('div');ov.id='ccAssignmentOperatorModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100500;display:flex;align-items:center;justify-content:center;padding:16px';
 const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
 ov.innerHTML='<div style="background:#fff;width:min(560px,96vw);border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.35);overflow:hidden"><div style="background:#0f172a;color:#fff;padding:16px 18px;display:flex;align-items:center;justify-content:space-between"><strong style="font-size:17px">Asignar unidad</strong><button type="button" data-close style="border:0;background:none;color:#fff;font-size:24px;cursor:pointer">×</button></div><div style="padding:20px"><div style="font-weight:800;color:#0f172a;margin-bottom:12px">¿Deseas incluir operador en la asignación?</div><div style="display:flex;gap:18px;margin-bottom:16px"><label style="display:flex;gap:7px;align-items:center;font-weight:700"><input type="radio" name="ccAsgIncOp" value="SI"> Sí</label><label style="display:flex;gap:7px;align-items:center;font-weight:700"><input type="radio" name="ccAsgIncOp" value="NO" checked> No</label></div><div data-op-wrap style="display:none"><label style="display:block;font-size:12px;font-weight:900;color:#334155;margin-bottom:6px">Operador</label><input data-op-input list="ccAssignmentOperatorList" autocomplete="off" placeholder="Escribe para buscar operador..." style="width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:11px 12px;font-size:14px"><datalist id="ccAssignmentOperatorList">'+ops.map(o=>'<option value="'+esc(o.nombre)+'"></option>').join('')+'</datalist><div style="font-size:11px;color:#64748b;margin-top:6px">Selecciona un operador activo del catálogo.</div></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="button" class="cc-btn cc-btn-primary" data-go>Continuar</button></div></div></div>';
 document.body.appendChild(ov);
 const close=()=>ov.remove(),wrap=ov.querySelector('[data-op-wrap]'),inp=ov.querySelector('[data-op-input]');
 ov.querySelector('[data-close]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
 ov.querySelectorAll('input[name="ccAsgIncOp"]').forEach(r=>r.onchange=()=>{const yes=ov.querySelector('input[name="ccAsgIncOp"]:checked')?.value==='SI';wrap.style.display=yes?'block':'none';if(yes)setTimeout(()=>inp.focus(),0);});
 ov.querySelector('[data-go]').onclick=()=>{
  const yes=ov.querySelector('input[name="ccAsgIncOp"]:checked')?.value==='SI';let name='';
  if(yes){name=String(inp.value||'').trim();const match=ops.find(o=>String(o.nombre||'').trim().toLowerCase()===name.toLowerCase());if(!match){alert('Selecciona un operador del catálogo para continuar.');inp.focus();return}name=String(match.nombre||'').trim();}
  close();copyAssignment(row,name);
 };
}
async function copyAssignment(row,operatorName=''){
 const d=row.dataset,W=1200,hasOperator=!!String(operatorName||'').trim(),H=hasOperator?1080:980,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 const rawType=String(d.ccInvType||'').trim(),desc=String(d.ccInvDescription||'').trim();
 const candidate=(rawType&&rawType.toUpperCase()!=='CARRO')?rawType:desc;
 const type=(candidate&&candidate.toUpperCase()!=='CARRO'?candidate:'UNIDAD').toUpperCase(),num=(d.ccInvNumero||'UNIDAD').toUpperCase();
 const ft=v=>Number(v||0),m=v=>ft(v)?(ft(v)*0.3048).toFixed(2):'—';
 const mx=String(d.ccInvPlatesMx||'').trim(),usa=String(d.ccInvPlatesUsa||'').trim();
 x.fillStyle='#07182f';x.fillRect(0,0,W,H);x.fillStyle='#0d2748';x.fillRect(0,0,W,175);
 x.fillStyle='#fff';x.font='900 52px Arial';x.fillText('ASIGNACIÓN DE UNIDAD',58,72);x.fillStyle='#8fc7ff';x.font='bold 25px Arial';x.fillText('LOGÍSTICA BALDERRAMA',60,120);
 x.fillStyle='#fff';round(x,55,210,1090,hasOperator?790:690,30);x.fill();
 x.fillStyle='#eaf3ff';round(x,85,250,430,600,24);x.fill();
 x.fillStyle='#17365d';x.font='900 42px Arial';x.textAlign='center';x.fillText(type,300,315);drawVehicle(x,type,115,350,370,270);x.textAlign='left';
 x.fillStyle='#17365d';x.font='900 60px Arial';x.fillText(num,565,305);
 let y=360;const line=(lab,val,size=42)=>{x.fillStyle='#64748b';x.font='bold 19px Arial';x.fillText(lab,565,y);x.fillStyle='#0f172a';x.font='900 '+size+'px Arial';x.fillText(String(val||'—'),565,y+39);y+=92};
 line('PLACAS MX',mx||'—',40);if(usa&&usa!=='—')line('PLACAS USA',usa,40);line('CAPACIDAD',d.ccInvCapacity||'—',48);
 x.fillStyle='#64748b';x.font='bold 22px Arial';x.fillText('DIMENSIONES',565,y);y+=43;
 for(const [lab,v] of [['LARGO',d.ccInvLength],['ANCHO',d.ccInvWidth],['ALTO',d.ccInvHeight]]){x.fillStyle='#334155';x.font='900 24px Arial';x.fillText(lab,565,y);x.fillStyle='#0f172a';x.font='900 34px Arial';x.fillText((v||'—')+' ft  /  '+m(v)+' m',690,y);y+=52}
 if(hasOperator){x.fillStyle='#64748b';x.font='bold 19px Arial';x.fillText('OPERADOR',565,y+3);x.fillStyle='#0f172a';x.font='900 38px Arial';x.fillText(String(operatorName).toUpperCase(),565,y+43);}
 const footerY=hasOperator?975:875;
 x.fillStyle='#334155';x.font='bold 24px Arial';x.fillText('Buen día, compartimos datos de la unidad programada.',105,footerY);x.fillStyle='#64748b';x.font='bold 20px Arial';x.fillText('Logística Balderrama',105,footerY+35);
 x.fillStyle='#8fc7ff';x.fillRect(55,footerY+50,1090,3);x.fillStyle='#dbeafe';x.font='bold 20px Arial';x.fillText('LOGÍSTICA BALDERRAMA  •  ASIGNACIÓN',60,footerY+85);
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