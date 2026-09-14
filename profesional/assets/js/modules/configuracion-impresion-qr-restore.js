/* Tráfico App · Configuración · estilo estable del QR en Impresión v3
   No crea, mueve ni reinyecta botones. El flujo original de configuracion.js
   es el único responsable de crear y ejecutar el botón QR. */
(function(){
  'use strict';
  if(window.__CC_CONFIG_PRINT_QR_STYLE_V3__)return;
  window.__CC_CONFIG_PRINT_QR_STYLE_V3__=true;

  const style=document.createElement('style');
  style.id='ccConfigPrintQrStyleV3';
  style.textContent=`
    #ccPrintUnitsModal #ccPrintQrBtn{
      display:inline-flex !important;
      visibility:visible !important;
      opacity:1 !important;
      min-width:220px !important;
      min-height:54px !important;
      padding:13px 24px !important;
      font-size:16px !important;
      font-weight:900 !important;
      align-items:center !important;
      justify-content:center !important;
      gap:9px !important;
      border-radius:12px !important;
    }
    #ccPrintUnitsModal #ccPrintQrBtn .fa-qrcode{
      font-size:20px !important;
    }
  `;
  document.head.appendChild(style);
})();
