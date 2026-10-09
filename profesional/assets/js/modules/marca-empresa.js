(()=>{'use strict';
const $=id=>document.getElementById(id),db=()=>window.gmSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
const fields=['professionalTitle','professionalSubtitle','mirrorHeader','mirrorSubtitle','mirrorAirportTitle'];
async function call(body){const {data,error}=await db().functions.invoke('cc-portal-brand',{body});if(error){let d=data;try{d=await error.context?.json?.()||data}catch(_){}throw Error(d?.error||error.message)}if(!data?.ok)throw Error(data?.error||'No autorizado');return data}
async function image(file){if(!file)return '';if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Utiliza PNG, JPG o WebP.');const img=new Image(),src=URL.createObjectURL(file);try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src});const scale=Math.min(1,420/img.width,220/img.height);const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);let out=c.toDataURL('image/webp',.78);if(out.length>170000)out=c.toDataURL('image/jpeg',.62);if(out.length>170000)throw Error('Imagen demasiado grande; utiliza un logotipo más sencillo.');return out}finally{URL.revokeObjectURL(src)}}
function apply(b){const h=$('ccBrandTitle'),p=$('ccBrandSubtitle');if(h)h.textContent=b.professionalTitle||'Control de Cajas';if(p)p.textContent=b.professionalSubtitle||'Inventario, clientes, responsables y control de cajas en renta.';const l=$('ccBrandLogo');if(l){l.src=b.logo||'';l.style.display=b.logo?'block':'none'} }
async function read(){try{const d=await call({action:'read'});apply(d.brand);return d}catch(e){console.warn('BRAND_READ',e.message);return null}}
async function init(){const section=$('ccConfigEmpresa');if(!section)return;const d=await read();if(!d)return;const b=d.brand;for(const key of fields){if($('brand_'+key))$('brand_'+key).value=b[key]||''}let logo=b.logo||'';const prev=$('brandLogoPreview');prev.src=logo;prev.style.display=logo?'block':'none';$('brandLogoFile').onchange=async e=>{try{logo=await image(e.target.files[0]);prev.src=logo;prev.style.display=logo?'block':'none'}catch(err){alert(err.message)}};$('brandLogoClear').onclick=()=>{logo='';prev.style.display='none'};
$('brandSave').onclick=async()=>{const btn=$('brandSave');btn.disabled=true;try{const brand={logo};for(const key of fields)brand[key]=$('brand_'+key).value.trim();await call({action:'save',brand});apply(brand);$('brandMsg').textContent='Configuración guardada correctamente.'}catch(e){$('brandMsg').textContent=e.message}finally{btn.disabled=false}};
const picker=$('brandClient');const {data:clients,error}=await db().from('cc_clientes').select('id,nombre').order('nombre').limit(500);if(error){$('brandClientMsg').textContent=error.message;return}picker.innerHTML='<option value="">Seleccionar cliente</option>'+clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre)+'</option>').join('');
let clientLogo='';picker.onchange=async()=>{clientLogo='';$('brandClientPreview').style.display='none';if(!picker.value)return;try{const info=await call({action:'read',cliente_id:picker.value});clientLogo=info.client?.logo||'';$('brandClientPreview').src=clientLogo;$('brandClientPreview').style.display=clientLogo?'block':'none'}catch(e){$('brandClientMsg').textContent=e.message}};
$('brandClientFile').onchange=async e=>{try{clientLogo=await image(e.target.files[0]);$('brandClientPreview').src=clientLogo;$('brandClientPreview').style.display='block'}catch(err){alert(err.message)}};
$('brandClientClear').onclick=()=>{clientLogo='';$('brandClientPreview').style.display='none'};
$('brandClientSave').onclick=async()=>{if(!picker.value)return alert('Selecciona un cliente.');const btn=$('brandClientSave');btn.disabled=true;try{await call({action:'save_client',cliente_id:picker.value,logo:clientLogo});$('brandClientMsg').textContent='Logo del cliente guardado.'}catch(e){$('brandClientMsg').textContent=e.message}finally{btn.disabled=false}};
}
const originalClientForm=window.ccNuevoCliente;
if(typeof originalClientForm==='function'){
 window.ccNuevoCliente=function(id){
   originalClientForm.apply(this,arguments);
   const form=document.querySelector('#ccFormModal #ccForm');if(!form)return;
   const section=document.createElement('div');
   section.style.cssText='margin-top:16px;padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px';
   section.innerHTML='<strong style="display:block;margin-bottom:9px">Logo del cliente para Cuenta Espejo</strong><p style="font-size:12px;color:#64748b">Guarda primero el cliente si es nuevo. Si ya existe, puedes subir o cambiar su logotipo aquí mismo.</p><input id="brandClientInlineFile" type="file" accept="image/png,image/jpeg,image/webp" '+(id?'':'disabled')+'><div id="brandClientInlineMsg" style="font-size:12px;color:#2563eb;margin-top:7px"></div>';
   form.insertBefore(section,form.lastElementChild);
   if(!id)return;
   const input=section.querySelector('input');
   input.onchange=async e=>{
    const msg=section.querySelector('#brandClientInlineMsg');msg.textContent='Guardando logo…';
    try{const logo=await image(e.target.files[0]);await call({action:'save_client',cliente_id:id,logo});msg.textContent='Logo guardado correctamente.'}
    catch(err){msg.textContent='Error: '+err.message}
   };
 };
}
let initialized=false;const original=window.ccConfigSection;window.ccConfigSection=function(section,btn){const out=original?.apply(this,arguments);if(section==='empresa'&&!initialized){initialized=true;init().catch(console.error)}return out};
document.addEventListener('DOMContentLoaded',()=>read());
})();