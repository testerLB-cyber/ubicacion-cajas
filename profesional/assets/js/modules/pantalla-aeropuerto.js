(()=>{'use strict';
let TIMER=null,LAST=[],VIEW='actual',PAGE=1;
const PAGE_SIZE=10;
const POS_KEY='gm_airport_prev_positions_v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.gmSupabase||null;
const tz='America/Hermosillo';

function css(){
  if($('airportCss'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="airportCss">
  .air{--bg:#f5f7fa;--panel:#ffffff;--card:#ffffff;--line:#dfe7ef;--text:#1f2937;--muted:#64748b;--accent:#0f766e;--accent2:#2563eb;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-radius:18px;padding:14px;color:var(--text)}
  .airTop{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:4px 2px 12px}
  .airTitleWrap{display:flex;align-items:center;gap:10px}.airBeacon{width:38px;height:38px;border-radius:12px;background:#e6f4f1;color:#0f766e;border:1px solid #cbe8e1;display:flex;align-items:center;justify-content:center;font-size:18px}
  .airTop h2{margin:0;font-size:23px;color:#1e293b;letter-spacing:-.02em}.airViewSwitch{display:flex;gap:5px;padding:4px;background:#eef2f7;border:1px solid #dbe3ea;border-radius:10px}.airViewBtn{border:0;background:transparent;color:#64748b;border-radius:7px;padding:7px 10px;font-size:8px;font-weight:950;cursor:pointer}.airViewBtn.on{background:#fff;color:#0f766e;box-shadow:0 2px 7px rgba(15,23,42,.08)}.airTop p{margin:4px 0 0;font-size:10px;color:#64748b}.airUpdated{font-size:9px;color:#64748b;text-align:right;line-height:1.5}
  .airFilters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;margin-bottom:12px;border:1px solid var(--line);border-radius:13px;background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.04)}
  .airFilters label{font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.08em}.airSelect{min-width:240px;border:1px solid #d7e0e8;border-radius:9px;padding:8px 10px;background:#f8fafc;color:#1e293b;font-size:11px;outline:none}.airSelect:focus{border-color:#94a3b8;background:#fff}.airCheck{display:flex;gap:7px;align-items:center;font-size:10px;font-weight:800;color:#334155;text-transform:none!important;cursor:pointer}.airCheck input{accent-color:#0f766e}.airCount{margin-left:auto;font-size:9px;font-weight:900;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;padding:6px 10px;border-radius:999px}
  .airLegend{display:grid;grid-template-columns:95px 105px 150px 150px 135px 110px minmax(155px,1fr) minmax(155px,1fr) 115px;gap:8px;padding:0 12px 7px;color:#64748b;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
  .airList{display:flex;flex-direction:column;gap:8px;max-height:74vh;overflow:auto;padding:2px 3px 4px}
  .airTrip{position:relative;display:grid;grid-template-columns:95px 105px 150px 150px 135px 110px minmax(155px,1fr) minmax(155px,1fr) 115px;gap:8px;align-items:stretch;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;box-shadow:0 4px 14px rgba(15,23,42,.05);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
  .airTrip:before{content:'';position:absolute;left:0;top:11px;bottom:11px;width:3px;border-radius:0 8px 8px 0;background:#cbd5e1}.airTrip:hover{transform:translateY(-1px);border-color:#cbd5e1;box-shadow:0 7px 18px rgba(15,23,42,.08)}.airTrip.moved:before{background:#22c55e}.airTrip.moved{animation:airGlow 1.4s ease}
  @keyframes airGlow{0%{background:#f0fdf4}100%{background:#fff}}
  .airMotion{display:flex;align-items:center;gap:9px}.airCompass{width:38px;height:38px;min-width:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#eff6ff;border:1px solid #dbeafe;color:#2563eb;font-size:19px;font-weight:950}.airMotionText b{display:block;font-size:10px;color:#0f172a}.airMotionText span{display:block;margin-top:3px;font-size:8px;color:#94a3b8}
  .airLocation{min-width:0}.airLocationMain{font-size:10px;font-weight:850;color:#1e293b;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.airCoords{font-size:8px;color:#94a3b8;margin-top:4px}.airActions{display:flex;gap:5px;margin-top:7px}.airBtn{border:1px solid #dbe4ec;border-radius:8px;background:#f8fafc;color:#475569;padding:4px 7px;font-size:7px;font-weight:900;cursor:pointer}.airBtn:hover{border-color:#93c5fd;color:#1d4ed8;background:#eff6ff}.airBtn.geo{background:#f5f3ff;color:#6d28d9;border-color:#e9d5ff}
  .airVehicle{min-width:0}.airUnit{font-size:15px;font-weight:950;color:#0f172a;letter-spacing:-.03em}.airOperator{font-size:9px;font-weight:750;color:#475569;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.airTags{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.airTag{font-size:7px;font-weight:900;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;padding:3px 6px;border-radius:999px}
  .airRouteBox{position:relative;display:grid;grid-template-columns:1fr 24px 1fr;align-items:center;gap:6px;min-width:0}.airPoint{min-width:0}.airPointLabel{font-size:7px;font-weight:950;letter-spacing:.08em;color:#94a3b8;text-transform:uppercase}.airPointText{font-size:10px;font-weight:850;color:#1e293b;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.airRouteArrow{height:24px;border-radius:999px;background:#f1f5f9;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:13px}
  .airStatusWrap{display:flex;flex-direction:column;justify-content:center;align-items:flex-start}.airStatus{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;font-size:7px;font-weight:950;text-transform:uppercase;letter-spacing:.04em}.airStatus:before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}.airStatus.green{background:#ecfdf5;color:#047857;border:1px solid #d1fae5}.airStatus.yellow{background:#fffbeb;color:#b45309;border:1px solid #fef3c7}.airStatus.red{background:#fef2f2;color:#b91c1c;border:1px solid #fee2e2}.airStatus.gray{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}.airStatusSub{font-size:8px;color:#94a3b8;margin-top:5px}
  .airTime{display:flex;flex-direction:column;justify-content:center}.airTimeMain{font-size:10px;font-weight:900;color:#1e293b}.airTimeSub{font-size:8px;color:#94a3b8;margin-top:4px}.airTripNo{font-size:10px;font-weight:950;color:#2563eb;margin-bottom:4px}
  .airMapRow{margin:-3px 8px 2px;border:1px solid #dfe7ef;border-top:0;border-radius:0 0 14px 14px;background:#f8fafc;overflow:hidden}.airMiniMapWrap{display:flex;gap:12px;align-items:stretch;padding:12px}.airMiniMap{width:100%;height:200px;border:0;border-radius:10px;background:#e2e8f0}.airMapMeta{width:230px;min-width:230px;padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:10px}.airMapMeta b{display:block;font-size:15px;margin-bottom:7px;color:#0f172a}.airMapMeta span{display:block;font-size:9px;color:#64748b;line-height:1.5}.airMapClose{margin-top:10px;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:6px 9px;font-size:8px;font-weight:900;cursor:pointer}
  .airV2Kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.airV2Kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px}.airV2Kpi b{display:block;font-size:18px;color:#0f172a}.airV2Kpi span{font-size:7px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}.airV2Route{grid-column:1/-1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px}.airV2Progress{display:flex;align-items:center;gap:5px;margin-top:5px}.airV2Node{width:7px;height:7px;border-radius:50%;background:#cbd5e1}.airV2Node.done{background:#0f766e}.airV2Line{height:2px;flex:1;background:#dbe3ea}.airV2Ticker{margin-top:10px;padding:8px 12px;border-radius:10px;background:#0f172a;color:#e2e8f0;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.air.v2 .airTrip{grid-template-columns:100px 120px minmax(170px,1.1fr) minmax(145px,.8fr) 80px minmax(180px,1.1fr) 100px}.air.v2 .airTrip{border-radius:10px;box-shadow:none}.air.v2 .airUnit{font-size:14px}.air.v2 .airList{gap:6px}
  .airRentToggle{margin-left:auto;display:inline-flex;align-items:center;gap:7px;background:#f8fafc;color:#334155;border:1px solid #d7e0e8;border-radius:10px;padding:7px 11px;font-size:9px;font-weight:900;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.04)}.airRentToggle:hover{background:#f0fdfa;border-color:#99d8c9;color:#0f766e}.airRentToggle.on{background:#e7f5f1;border-color:#99d8c9;color:#0f766e}.airRentToggle i{font-size:10px}.airSplit{display:block}.airOperations{min-width:0}.airRentPanel{display:none;min-width:0;background:white;border:1px solid #dce7ed;border-radius:16px;padding:14px;box-shadow:0 8px 22px #0f172a0a}.air.rentOpen .airSplit{display:grid;grid-template-columns:minmax(0,3fr) minmax(320px,2fr);gap:12px}.air.rentOpen .airRentPanel{display:block}.air.rentOpen .airLegend{display:none}.air.rentOpen .airTrip{grid-template-columns:repeat(2,minmax(0,1fr))!important}.air.rentOpen .airTrip>*{min-width:0}.airRentStats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}.airRentStats span{background:#f3f8fa;border:1px solid #e0eaf0;border-radius:10px;padding:10px 5px;font-size:9px;color:#64748b;text-align:center}.airRentStats b{display:block;font-size:20px;color:#0f766e}.airRentMap{background:#f1f5f9;border-radius:12px;overflow:hidden}.airRentMap iframe{width:100%;height:250px;border:0}.airRentMap small{display:block;padding:8px;font-size:9px;color:#64748b}.airRentItems{max-height:340px;overflow:auto;margin-top:10px}.airRentItem{padding:10px;border-bottom:1px solid #edf2f7;display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:10px}.airRentItem strong{color:#0f172a}.airRentItem span{color:#64748b;flex:1}.airRentItem a{color:#0f766e;font-weight:800}.airRentEmpty{padding:24px 12px;color:#64748b;text-align:center;font-size:11px}@media(max-width:1050px){.air.rentOpen .airSplit{grid-template-columns:1fr}.air.rentOpen .airTrip{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
  .airEmpty{padding:45px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:14px;background:#fff}.airFoot{padding:9px 5px 0;font-size:8px;color:#94a3b8}
  .airModal{position:fixed;inset:0;z-index:140000;background:rgba(15,23,42,.42);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}.airModal.on{display:flex}.airModalCard{width:min(760px,96vw);max-height:82vh;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.2)}.airModalHead{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#f8fafc;color:#0f172a;border-bottom:1px solid #e2e8f0}.airModalHead h3{margin:0;font-size:16px}.airModalClose{border:1px solid #dbe3ea;background:#fff;color:#334155;border-radius:8px;padding:6px 10px;font-weight:900;cursor:pointer}
  .airGeoList{padding:16px 20px;overflow:auto;max-height:68vh}.airGeoTimeline{position:relative;padding-left:26px}.airGeoTimeline:before{content:'';position:absolute;left:9px;top:5px;bottom:5px;width:2px;background:#dbe3ea}.airGeoItem{position:relative;padding:0 0 18px 10px}.airGeoDot{position:absolute;left:-21px;top:3px;width:11px;height:11px;border-radius:50%;background:#0f766e;border:2px solid #fff;box-shadow:0 0 0 3px #ccfbf1}.airGeoEvent{font-size:10px;font-weight:950;color:#0f172a}.airGeoName{font-size:11px;font-weight:800;color:#334155;margin-top:2px}.airGeoTime{font-size:8px;color:#94a3b8;margin-top:3px}
  @media(max-width:1250px){.airLegend,.airTrip{grid-template-columns:100px 115px minmax(175px,1.2fr) minmax(145px,.9fr) 85px minmax(160px,1fr)}.airLegend>div:nth-child(7),.airTrip>div:nth-child(7){display:none}}
  @media(max-width:900px){.air{padding:10px}.airLegend{display:none}.airTrip{grid-template-columns:1fr 1fr;gap:12px}.airTrip>div{display:block!important}.airRouteBox{grid-column:1/-1}.airTop{align-items:flex-start}.airUpdated{white-space:normal}.airMiniMapWrap{flex-direction:column}.airMapMeta{width:auto;min-width:0}}

  .airTopActions{display:flex;align-items:center;gap:8px}.airFullBtn{display:inline-flex;align-items:center;gap:7px;border:1px solid #d7e0e8;background:#fff;color:#334155;border-radius:10px;padding:8px 11px;font-size:9px;font-weight:900;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.04)}.airFullBtn:hover{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
  .airPager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:9px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:12px}.airPagerInfo{font-size:10px;font-weight:800;color:#64748b}.airPagerBtns{display:flex;align-items:center;gap:7px}.airPageBtn{border:1px solid #d7e0e8;background:#f8fafc;color:#334155;border-radius:9px;padding:6px 10px;font-size:9px;font-weight:900;cursor:pointer}.airPageBtn:disabled{opacity:.4;cursor:default}.airPageNo{min-width:92px;text-align:center;font-size:10px;font-weight:950;color:#0f172a}
  .airTrip{min-height:60px}.airStatusSub{font-size:9px;color:#64748b}.airLocationMain{font-size:11px}.airOperator{font-size:10px}.airPointText{font-size:11px}.airTripNo{font-size:11px}.airMotionText b{font-size:11px}
  #ccPantallaAeropuertoMount:fullscreen{background:#eef2f7;padding:14px;overflow:auto}#ccPantallaAeropuertoMount:fullscreen .air{min-height:calc(100vh - 28px);border-radius:0}#ccPantallaAeropuertoMount:fullscreen .airTop h2{font-size:28px}#ccPantallaAeropuertoMount:fullscreen .airTrip{min-height:64px}#ccPantallaAeropuertoMount:fullscreen .airList{max-height:none}
  @media(min-width:1400px){.air{padding:16px}.airTrip{padding:9px 11px}.airUnit{font-size:17px}.airLocationMain,.airPointText{font-size:11px}.airStatus{font-size:8px}.airLegend{font-size:8px}}

  /* Ajuste visual TV v46 */
  .airLegend{background:#eef6f5;border:1px solid #dcebe8;border-radius:9px;padding:6px 10px;margin-bottom:6px;color:#64748b}
  .airTrip{background:linear-gradient(90deg,#ffffff 0%,#fbfdff 100%);border-color:#dde7ef}
  .airTrip:before{background:#93c5fd}
  .airClientName{font-size:12px;font-weight:950;color:#0f5f5a;line-height:1.15;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.airTrailer{font-size:17px;font-weight:950;color:#12324a;letter-spacing:-.02em}.airOrigin,.airDestination{font-size:12px;font-weight:900;color:#1e293b;line-height:1.18;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .airLocationMain{font-size:9px;font-weight:700;color:#64748b;line-height:1.15;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .airCoords{font-size:7px;color:#a0aec0;margin-top:2px}
  .airRouteArrow{background:#ecfdf5;border-color:#d1fae5;color:#0f766e}
  .airUnit{color:#12324a;font-size:17px}
  .airMapRow:empty{display:none}
  #ccPantallaAeropuertoMount:fullscreen{padding:8px;background:#eef3f7;overflow:hidden}
  #ccPantallaAeropuertoMount:fullscreen .air{height:calc(100vh - 16px);min-height:0;display:flex;flex-direction:column;padding:9px 11px;border-radius:12px;overflow:hidden}
  #ccPantallaAeropuertoMount:fullscreen .airTop{padding:0 0 6px;min-height:38px}
  #ccPantallaAeropuertoMount:fullscreen .airTop h2{font-size:22px}
  #ccPantallaAeropuertoMount:fullscreen .airTop p{font-size:8px;margin-top:1px}
  #ccPantallaAeropuertoMount:fullscreen .airBeacon{width:32px;height:32px;font-size:14px;border-radius:10px}
  #ccPantallaAeropuertoMount:fullscreen .airUpdated{font-size:7px;line-height:1.25}
  #ccPantallaAeropuertoMount:fullscreen .airFullBtn{padding:6px 9px;font-size:8px}
  #ccPantallaAeropuertoMount:fullscreen .airFilters{padding:5px 8px;margin-bottom:5px;min-height:34px;border-radius:9px;box-shadow:none}
  #ccPantallaAeropuertoMount:fullscreen .airSelect{padding:5px 8px;font-size:9px;min-width:200px}
  #ccPantallaAeropuertoMount:fullscreen .airCheck{font-size:8px}
  #ccPantallaAeropuertoMount:fullscreen .airCount,#ccPantallaAeropuertoMount:fullscreen .airRentToggle{padding:5px 8px;font-size:8px}
  #ccPantallaAeropuertoMount:fullscreen .airSplit{flex:1;min-height:0;display:block}
  #ccPantallaAeropuertoMount:fullscreen .airOperations{height:100%;display:flex;flex-direction:column;min-height:0}
  #ccPantallaAeropuertoMount:fullscreen .airLegend{flex:0 0 auto;padding:4px 10px;margin:0 0 4px;font-size:6.5px;border-radius:7px}
  #ccPantallaAeropuertoMount:fullscreen .airList{flex:1;min-height:0;max-height:none;overflow:hidden;gap:3px;padding:0 2px;display:flex;flex-direction:column}
  #ccPantallaAeropuertoMount:fullscreen .airTrip{flex:1 1 0;min-height:0;max-height:none;padding:3px 8px;gap:6px;border-radius:8px;box-shadow:0 1px 4px rgba(15,23,42,.05);align-items:center}
  #ccPantallaAeropuertoMount:fullscreen .airTrip:before{top:6px;bottom:6px;width:3px}
  #ccPantallaAeropuertoMount:fullscreen .airCompass{width:28px;height:28px;min-width:28px;border-radius:8px;font-size:15px}
  #ccPantallaAeropuertoMount:fullscreen .airMotion{gap:6px}
  #ccPantallaAeropuertoMount:fullscreen .airMotionText b{font-size:8.5px}
  #ccPantallaAeropuertoMount:fullscreen .airMotionText span{font-size:6.5px;margin-top:1px}
  #ccPantallaAeropuertoMount:fullscreen .airStatus{padding:3px 6px;font-size:6.5px}
  #ccPantallaAeropuertoMount:fullscreen .airStatusSub{font-size:9.5px;margin-top:2px;font-weight:950;color:#0b6b63}
  #ccPantallaAeropuertoMount:fullscreen .airLocationMain{font-size:8px;font-weight:750;line-height:1.05}
  #ccPantallaAeropuertoMount:fullscreen .airCoords{display:none}
  #ccPantallaAeropuertoMount:fullscreen .airActions{margin-top:2px;gap:3px}
  #ccPantallaAeropuertoMount:fullscreen .airBtn{padding:2px 5px;font-size:6px;border-radius:6px}
  #ccPantallaAeropuertoMount:fullscreen .airUnit{font-size:13px}
  #ccPantallaAeropuertoMount:fullscreen .airOperator{font-size:7.5px;margin-top:1px}
  #ccPantallaAeropuertoMount:fullscreen .airTags{margin-top:2px}
  #ccPantallaAeropuertoMount:fullscreen .airTag{font-size:6px;padding:2px 4px}
  #ccPantallaAeropuertoMount:fullscreen .airPointLabel{font-size:6px}
  #ccPantallaAeropuertoMount:fullscreen .airPointText{font-size:8px;margin-top:1px}
  #ccPantallaAeropuertoMount:fullscreen .airRouteArrow{height:18px;font-size:10px}
  #ccPantallaAeropuertoMount:fullscreen .airTripNo{font-size:8.5px;margin-bottom:1px}
  #ccPantallaAeropuertoMount:fullscreen .airTimeMain{font-size:7.5px}
  #ccPantallaAeropuertoMount:fullscreen .airTimeSub{font-size:6.5px;margin-top:1px}
  #ccPantallaAeropuertoMount:fullscreen .airPager{flex:0 0 auto;margin-top:4px;padding:4px 8px;border-radius:8px}
  #ccPantallaAeropuertoMount:fullscreen .airPagerInfo,#ccPantallaAeropuertoMount:fullscreen .airPageNo{font-size:8px}
  #ccPantallaAeropuertoMount:fullscreen .airPageBtn{padding:4px 7px;font-size:7px}
  #ccPantallaAeropuertoMount:fullscreen .airFoot{display:none}
  #ccPantallaAeropuertoMount:fullscreen .airV2Ticker{display:none!important}

  /* TV profesional v47 · 10 viajes */
  #ccPantallaAeropuertoMount:fullscreen .airLegend,
  #ccPantallaAeropuertoMount:fullscreen .airTrip{
    grid-template-columns:90px 95px 145px 125px 125px 105px minmax(145px,1fr) minmax(145px,1fr) 105px;
    gap:6px
  }
  #ccPantallaAeropuertoMount:fullscreen .airTop{min-height:46px;padding:0 0 7px}
  #ccPantallaAeropuertoMount:fullscreen .airTop h2{font-size:25px}
  #ccPantallaAeropuertoMount:fullscreen .airTop p{font-size:9px}
  #ccPantallaAeropuertoMount:fullscreen .airFilters{min-height:38px;padding:6px 9px;margin-bottom:6px}
  #ccPantallaAeropuertoMount:fullscreen .airLegend{font-size:7.5px;padding:5px 9px;margin-bottom:5px}
  #ccPantallaAeropuertoMount:fullscreen .airList{gap:5px}
  #ccPantallaAeropuertoMount:fullscreen .airTrip{padding:6px 8px;border-radius:9px}
  #ccPantallaAeropuertoMount:fullscreen .airCompass{width:34px;height:34px;min-width:34px;font-size:18px}
  #ccPantallaAeropuertoMount:fullscreen .airMotionText b{font-size:10px}
  #ccPantallaAeropuertoMount:fullscreen .airMotionText span{font-size:7px}
  #ccPantallaAeropuertoMount:fullscreen .airStatus{font-size:7.5px;padding:4px 7px}
  #ccPantallaAeropuertoMount:fullscreen .airClientName{font-size:11.5px;font-weight:950;color:#0b6b63}
  #ccPantallaAeropuertoMount:fullscreen .airLocationMain{font-size:7.8px;font-weight:700;color:#64748b}
  #ccPantallaAeropuertoMount:fullscreen .airActions{margin-top:3px}
  #ccPantallaAeropuertoMount:fullscreen .airBtn{font-size:6.5px;padding:3px 5px}
  #ccPantallaAeropuertoMount:fullscreen .airUnit{font-size:15.5px}
  #ccPantallaAeropuertoMount:fullscreen .airOperator{font-size:8.5px}
  #ccPantallaAeropuertoMount:fullscreen .airTrailer{font-size:15.5px}
  #ccPantallaAeropuertoMount:fullscreen .airOrigin,
  #ccPantallaAeropuertoMount:fullscreen .airDestination{font-size:10.5px;font-weight:900}
  #ccPantallaAeropuertoMount:fullscreen .airPointLabel{font-size:6.5px}
  #ccPantallaAeropuertoMount:fullscreen .airTripNo{font-size:10px}
  #ccPantallaAeropuertoMount:fullscreen .airTimeMain{font-size:8.5px}
  #ccPantallaAeropuertoMount:fullscreen .airTimeSub{font-size:7px}
  #ccPantallaAeropuertoMount:fullscreen .airPager{padding:5px 8px;margin-top:5px}

  /* Rediseño integral Pantalla Aeropuerto v48 */
  .air{background:#f3f7fa;border:1px solid #e2e8f0;box-shadow:0 10px 28px rgba(15,23,42,.05)}
  .airTop{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;margin-bottom:8px;box-shadow:0 3px 12px rgba(15,23,42,.04)}
  .airFilters{margin-bottom:8px;padding:8px 10px}
  .airLegend{grid-template-columns:86px 92px 140px 125px 125px 105px minmax(135px,1fr) minmax(135px,1fr) 108px;gap:6px;background:#eaf3f2;border-color:#d5e6e3;color:#526b69}
  .airTrip{grid-template-columns:86px 92px 140px 125px 125px 105px minmax(135px,1fr) minmax(135px,1fr) 108px;gap:6px;min-height:62px;padding:7px 9px;border-radius:10px;border-color:#dfe8ef;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.035)}
  .airTrip:nth-of-type(4n+1){background:#fcfefe}
  .airTrip:hover{border-color:#b9d5d0;box-shadow:0 5px 14px rgba(15,118,110,.08)}
  .airTrip:before{background:#7fb9b1}
  .airCompass{width:36px;height:36px;min-width:36px;background:#eef6ff;border-color:#d9e9fb;color:#1d6fb8}
  .airMotionText b{font-size:10px}.airMotionText span{font-size:7px}
  .airStatus{font-size:7.5px;padding:5px 7px}
  .airClientName{font-size:12.5px;color:#0d625c;align-self:center}
  .airLocationMain{font-size:8.5px;color:#66788a}
  .airUnit,.airTrailer{font-size:16px}
  .airOperator{font-size:8.5px}
  .airOrigin,.airDestination{font-size:11.5px}
  .airTripNo{font-size:10.5px}
  .airTimeMain{font-size:9px}
  .airPager{margin-top:7px;padding:7px 10px;background:#fdfefe}
  .airSplit{min-width:0}
  .airRentPanel{background:#fff;border:1px solid #dce7ed;border-radius:13px;padding:0;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,.05)}
  .airRentHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 14px;background:linear-gradient(90deg,#edf7f4,#f8fbfd);border-bottom:1px solid #dce9e6}
  .airRentTitle{font-size:14px;font-weight:950;color:#164e49}.airRentSub{font-size:9px;color:#64748b;margin-top:3px}
  .airRentStats{padding:10px 12px 0;margin-bottom:8px}.airRentStats span{background:#f7fafb;padding:8px 5px}.airRentStats b{font-size:18px}
  .airRentMap{margin:0 12px;background:#f5f8fa;border:1px solid #e4ebf0}.airRentMap iframe{height:220px}
  .airRentItems{margin:8px 12px 12px;max-height:330px;border:1px solid #e7edf2;border-radius:10px;background:#fff}
  .airRentItem{padding:9px 10px}.airRentItem strong{font-size:12px;color:#12324a}.airRentItem span{font-size:8.5px}.airRentItem a{font-size:8.5px}
  .air.rentOpen .airSplit{grid-template-columns:minmax(0,1.65fr) minmax(350px,.95fr);gap:10px}
  .air.rentOpen .airOperations{background:#f8fbfc;border:1px solid #e1eaf0;border-radius:13px;padding:8px}
  .air.rentOpen .airList{gap:6px}
  .air.rentOpen .airTrip{grid-template-columns:82px 90px minmax(130px,1fr) 110px 112px 92px;gap:5px}
  .air.rentOpen .airTrip>div:nth-child(7),.air.rentOpen .airTrip>div:nth-child(8),.air.rentOpen .airTrip>div:nth-child(9){display:none}
  .air.rentOpen .airClientName{font-size:11px}
  .air.rentOpen .airLocationMain{font-size:8px}
  .air.rentOpen .airUnit,.air.rentOpen .airTrailer{font-size:14px}
  #ccPantallaAeropuertoMount:fullscreen .airLegend,
  #ccPantallaAeropuertoMount:fullscreen .airTrip{grid-template-columns:86px 92px 140px 120px 124px 102px minmax(135px,1fr) minmax(135px,1fr) 105px}
  #ccPantallaAeropuertoMount:fullscreen .airTrip{padding:5px 8px}
  #ccPantallaAeropuertoMount:fullscreen .airClientName{font-size:12px}
  #ccPantallaAeropuertoMount:fullscreen .airUnit,
  #ccPantallaAeropuertoMount:fullscreen .airTrailer{font-size:15px}
  #ccPantallaAeropuertoMount:fullscreen .airOrigin,
  #ccPantallaAeropuertoMount:fullscreen .airDestination{font-size:11px}
  #ccPantallaAeropuertoMount:fullscreen .airLocationMain{font-size:7.8px}
  #ccPantallaAeropuertoMount:fullscreen .air.rentOpen .airSplit{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(360px,1fr);gap:8px}
  #ccPantallaAeropuertoMount:fullscreen .air.rentOpen .airOperations{height:100%;padding:6px}
  #ccPantallaAeropuertoMount:fullscreen .air.rentOpen .airRentPanel{display:flex;flex-direction:column;min-height:0}
  #ccPantallaAeropuertoMount:fullscreen .air.rentOpen .airRentItems{flex:1;min-height:0;max-height:none;overflow:auto}
  @media(max-width:1250px){.airLegend,.airTrip{grid-template-columns:80px 90px 120px 110px 115px 95px minmax(125px,1fr) minmax(125px,1fr) 100px}.airLegend>div,.airTrip>div{display:block!important}}
  </style>`);
}

function toRad(d){return d*Math.PI/180}
function distanceM(a,b){if(!a||!b)return null;const R=6371000,p1=toRad(a.lat),p2=toRad(b.lat),dp=toRad(b.lat-a.lat),dl=toRad(b.lng-a.lng),h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function bearing(a,b){if(!a||!b)return null;const p1=toRad(a.lat),p2=toRad(b.lat),dl=toRad(b.lng-a.lng),y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (Math.atan2(y,x)*180/Math.PI+360)%360}
function dirFromDeg(deg){if(deg===null||deg===undefined||!Number.isFinite(Number(deg)))return{arrow:'•',label:'Sin rumbo'};const n=((Number(deg)%360)+360)%360,arrows=['↑','↗','→','↘','↓','↙','←','↖'],names=['N','NE','E','SE','S','SO','O','NO'],i=Math.round(n/45)%8;return{arrow:arrows[i],label:names[i]+' '+Math.round(n)+'°'}}
function readPrev(){try{return JSON.parse(localStorage.getItem(POS_KEY)||'{}')||{}}catch{return{}}}
function savePrev(map){try{localStorage.setItem(POS_KEY,JSON.stringify(map))}catch{}}
function movementInfo(x,prev){const lat=Number(x.latitud),lng=Number(x.longitud),cur=Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null,old=prev?.[String(x.unidad||'')],d=cur&&old?distanceM({lat:Number(old.lat),lng:Number(old.lng)},cur):null,deg=cur&&old&&d!=null&&d>=25?bearing({lat:Number(old.lat),lng:Number(old.lng)},cur):null,evt=String(x.evento||'').trim(),driving=/conduc|driv/i.test(evt)||Number(x.velocidadKmh)>5,moving=d!=null&&d>=25;return{state:driving?'Conduciendo':(evt||(!moving?'Detenido':'En movimiento')),dir:dirFromDeg(deg),moved:moving}}
function fmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('es-MX',{timeZone:tz,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function statusClass(s){const v=String(s||'').toUpperCase();if(/TRANS|RUTA|ACTIVO|EN CURSO/.test(v))return'green';if(/SITIO|ORIGEN|ESPER|DEMOR/.test(v))return'yellow';if(/FUERA|CANCEL|ERROR|BLOQ/.test(v))return'red';return'gray'}
function selectedClient(){return $('airClient')?.value||''}
function onlyTrips(){return $('airOnlyTrips')?.checked!==false}
function filtered(){const c=selectedClient();return LAST.filter(x=>(!c||String(x.cliente||'')===c)&&(!onlyTrips()||String(x.numeroViaje||'').trim()))}
function updateClientFilter(){const sel=$('airClient');if(!sel)return;const current=sel.value,clients=[...new Set(LAST.map(x=>String(x.cliente||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));sel.innerHTML='<option value="">Todos los clientes</option>'+clients.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');if(clients.includes(current))sel.value=current}
function showGeos(index){const x=LAST[index];if(!x)return;$('airGeoTitle').textContent='Recorrido por geocercas · '+(x.unidad||'Unidad');const arr=(Array.isArray(x.geocercas)?x.geocercas:[]).slice().sort((a,b)=>(new Date(a["Fecha Hora"]||a.fechaHora||a.fecha||0).getTime()||0)-(new Date(b["Fecha Hora"]||b.fechaHora||b.fecha||0).getTime()||0));$('airGeoList').innerHTML=arr.length?'<div class="airGeoTimeline">'+arr.map(g=>`<div class="airGeoItem"><span class="airGeoDot"></span><div class="airGeoEvent">${esc(g.Evento||g.evento||'Evento')}</div><div class="airGeoName">${esc(g.Geocerca||g.geocerca||'—')}</div><div class="airGeoTime">${esc(fmt(g["Fecha Hora"]||g.fechaHora||g.fecha))}</div></div>`).join('')+'</div>':'<div class="airEmpty">La API no devolvió historial de geocercas para esta unidad.</div>';$('airGeoModal').classList.add('on')}
function mapEmbedUrl(lat,lng){const la=Number(lat),lo=Number(lng);if(!Number.isFinite(la)||!Number.isFinite(lo))return'';const dLat=.012,dLng=.018;return'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent((lo-dLng)+','+(la-dLat)+','+(lo+dLng)+','+(la+dLat))+'&layer=mapnik&marker='+encodeURIComponent(la+','+lo)}
function toggleMap(index){const row=$('airMap_'+index),x=LAST[index];if(!row||!x)return;if(row.dataset.open==='1'){row.innerHTML='';row.dataset.open='0';return}const src=mapEmbedUrl(x.latitud,x.longitud);row.dataset.open='1';row.innerHTML=src?`<div class="airMiniMapWrap"><div style="flex:1"><iframe class="airMiniMap" loading="lazy" src="${esc(src)}"></iframe></div><div class="airMapMeta"><b>${esc(x.unidad||'Unidad')}</b><span>${esc(x.ubicacion||x.ubicacionErp||'Ubicación GPS')}</span><span>${esc(x.latitud+', '+x.longitud)}</span><span>Actualización GPS: ${esc(fmt(x.gpsAt))}</span><button class="airMapClose" data-map-close="${index}">Cerrar mapa</button></div></div>`:'<div class="airEmpty">Esta unidad no trae coordenadas válidas.</div>';row.querySelector('[data-map-close]')?.addEventListener('click',()=>toggleMap(index))}

let RENT_OPEN=false, RENT_CACHE=null, RENT_LOADING=false;
const normClient=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
async function loadRentals(){
 if(!RENT_OPEN||RENT_LOADING)return;
 const client=selectedClient(),panel=$('airRentPanel');
 if(!panel)return;
 if(!client){panel.innerHTML='<div class="airRentHead"><div><div class="airRentTitle">Cajas de renta</div><div class="airRentSub">Vista dividida por cliente</div></div></div><div class="airRentEmpty">Selecciona un cliente para visualizar sus cajas en renta y su última ubicación.</div>';return}
 RENT_LOADING=true;panel.innerHTML='<div class="airRentHead"><div><div class="airRentTitle">Cajas de renta</div><div class="airRentSub">'+esc(client)+'</div></div></div><div class="airRentEmpty">Consultando rentas y últimos escaneos…</div>';
 try{
  const db=sb();if(!db)throw Error('Sin conexión con Supabase');
  const {data,error}=await db.rpc('cc_airport_rental_boxes',{p_cliente_nombre:client});
  if(error)throw error;
  if(!data?.ok)throw Error(data?.error||'No fue posible consultar las cajas de renta');
  if(data.match==='NONE'){panel.innerHTML='<div class="airRentEmpty">No se encontró una equivalencia exacta del cliente en el catálogo.</div>';return}
  if(data.match==='AMBIGUOUS'){panel.innerHTML='<div class="airRentEmpty">El nombre del cliente coincide con más de un registro. Revisa el catálogo de clientes.</div>';return}
  const units=Array.isArray(data.cajas)?data.cajas:[];
  if(!units.length){panel.innerHTML='<div class="airRentEmpty">Este cliente no tiene cajas con renta activa.</div>';return}
  const located=units.filter(x=>Number.isFinite(Number(x.latitud))&&Number.isFinite(Number(x.longitud)));
  panel.innerHTML='<div class="airRentHead"><div><div class="airRentTitle">Cajas de renta</div><div class="airRentSub">'+esc(client)+' · última ubicación por escaneo QR</div></div><span class="airCount">'+units.length+' activas</span></div><div class="airRentStats"><span><b>'+units.length+'</b>Cajas en renta</span><span><b>'+located.length+'</b>Ubicadas por QR</span><span><b>'+(units.length-located.length)+'</b>Sin ubicación</span></div><div class="airRentMap" id="airRentMap"></div><div class="airRentItems">'+units.map(x=>'<div class="airRentItem"><strong>'+esc(x.numero||'—')+'</strong><span>'+(x.fechaHora?'Último escaneo: '+esc(fmt(x.fechaHora)):'Sin escaneo registrado')+'</span>'+(Number.isFinite(Number(x.latitud))&&Number.isFinite(Number(x.longitud))?'<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+encodeURIComponent(x.latitud)+'&mlon='+encodeURIComponent(x.longitud)+'#map=15/'+encodeURIComponent(x.latitud)+'/'+encodeURIComponent(x.longitud)+'">Ver ubicación ↗</a>':'')+'</div>').join('')+'</div>';
  const map=$('airRentMap');
  if(located.length){
    const la=located.reduce((a,x)=>a+Number(x.latitud),0)/located.length;
    const lo=located.reduce((a,x)=>a+Number(x.longitud),0)/located.length;
    map.innerHTML='<iframe title="Últimos escaneos de cajas" loading="lazy" referrerpolicy="no-referrer" src="'+esc(mapEmbedUrl(la,lo))+'"></iframe><small>Ubicación basada en el último escaneo QR de cada caja. No es GPS en vivo.</small>';
  }else map.innerHTML='<div class="airRentEmpty">No hay ubicaciones QR registradas para estas cajas.</div>';
 }catch(e){panel.innerHTML='<div class="airRentEmpty">No fue posible consultar las rentas: '+esc(e.message||e)+'</div>'}finally{RENT_LOADING=false}
}
function toggleRentals(){RENT_OPEN=!RENT_OPEN;const root=document.querySelector('#ccPantallaAeropuertoMount .air');root?.classList.toggle('rentOpen',RENT_OPEN);const b=$('airRentToggle');if(b){b.classList.toggle('on',RENT_OPEN);b.innerHTML=RENT_OPEN?'<i class="fa-solid fa-table-columns"></i> Cerrar vista dividida':'<i class="fa-solid fa-table-columns"></i> Cajas de renta';b.setAttribute('aria-expanded',String(RENT_OPEN))}if(RENT_OPEN)loadRentals()}

function totalPages(){return Math.max(1,Math.ceil(filtered().length/PAGE_SIZE))}
function setPage(p){PAGE=Math.min(Math.max(1,p),totalPages());render()}
async function toggleFullscreen(){
  const target=$('ccPantallaAeropuertoMount');
  try{
    if(!document.fullscreenElement) await target?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }catch(e){console.warn('FULLSCREEN',e)}
}
function syncFullscreenButton(){
  const b=$('airFullBtn');if(!b)return;
  b.innerHTML=document.fullscreenElement?'<i class="fa-solid fa-compress"></i> Salir de pantalla completa':'<i class="fa-solid fa-expand"></i> Pantalla completa';
}
function render(){
  const box=$('airList');if(!box)return;
  const root=document.querySelector('#ccPantallaAeropuertoMount .air');root?.classList.toggle('v2',VIEW==='v2');
  $('airActualBtn')?.classList.toggle('on',VIEW==='actual');$('airV2Btn')?.classList.toggle('on',VIEW==='v2');
  const prev=readPrev(),all=filtered(),pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));if(PAGE>pages)PAGE=pages;const start=(PAGE-1)*PAGE_SIZE,arr=all.slice(start,start+PAGE_SIZE);$('airVisibleCount').textContent=all.length+' servicios';
  if($('airV2Kpis')){const active=arr.filter(x=>/TRANS|RUTA|ACTIVO|CURSO/i.test(String(x.estatusViaje||''))).length,delay=arr.filter(x=>/DEMOR|ESPER/i.test(String(x.estatusViaje||''))).length,withGps=arr.filter(x=>Number.isFinite(Number(x.latitud))&&Number.isFinite(Number(x.longitud))).length;$('airV2Kpis').style.display=VIEW==='v2'?'grid':'none';$('airV2Kpis').innerHTML='<div class="airV2Kpi"><b>'+arr.length+'</b><span>Operaciones visibles</span></div><div class="airV2Kpi"><b>'+active+'</b><span>En ruta / activas</span></div><div class="airV2Kpi"><b>'+withGps+'</b><span>Con GPS</span></div><div class="airV2Kpi"><b>'+delay+'</b><span>Alertas / demora</span></div>'}
  box.innerHTML=arr.length?arr.map(x=>{const idx=LAST.indexOf(x),mi=movementInfo(x,prev),d=mi.dir,geoCount=Array.isArray(x.geocercas)?x.geocercas.length:0;return `<div class="airTrip ${mi.moved?'moved':''}">
    <div class="airMotion"><div class="airCompass">${esc(d.arrow)}</div><div class="airMotionText"><b>${esc(mi.state)}</b><span>${esc(d.label)} · ${esc(fmt(x.gpsAt))}</span></div></div>
    <div class="airStatusWrap"><span class="airStatus ${statusClass(x.estatusViaje)}">${esc(x.estatusViaje||'Sin estatus')}</span></div>
    <div class="airClientName">${esc(x.cliente||'—')}</div>
    <div class="airLocation"><div class="airLocationMain">${esc(x.ubicacion||x.ubicacionErp||'Sin ubicación')}</div><div class="airActions"><button class="airBtn" data-map="${idx}">Mapa</button>${geoCount?'<button class="airBtn geo" data-geo="'+idx+'">Recorrido '+geoCount+'</button>':''}</div></div>
    <div class="airVehicle"><div class="airUnit">${esc(x.unidad||'—')}</div><div class="airOperator">${esc(x.operador||'Sin operador')}</div><div class="airTags"><span class="airTag">${esc(x.placa||'Sin placa')}</span></div></div>
    <div class="airVehicle"><div class="airPointLabel">Remolque</div><div class="airTrailer">${esc(x.remolque||'—')}</div>${x.remolque2?'<div class="airSub">'+esc(x.remolque2)+'</div>':''}</div>
    <div><div class="airPointLabel">Origen</div><div class="airOrigin">${esc(x.origen||'—')}</div></div>
    <div><div class="airPointLabel">Destino</div><div class="airDestination">${esc(x.destino||'—')}</div></div>
    <div class="airTime"><div class="airTripNo">${esc(x.numeroViaje||'—')}</div><div class="airTimeMain">${esc(fmt(x.salida))}</div><div class="airTimeSub">ETA ${esc(fmt(x.eta))}</div></div>
  </div><div id="airMap_${idx}" class="airMapRow" data-open="0"></div>`}).join(''):'<div class="airEmpty">No hay unidades que coincidan con los filtros.</div>';
  if(VIEW==='v2'&&arr.length){const ticker=$('airV2Ticker');if(ticker){ticker.style.display='block';ticker.textContent='CONTROL EN VIVO  ·  '+arr.slice(0,8).map(x=>(x.unidad||'Unidad')+' · '+(x.estatusViaje||'Sin estatus')+' · '+(x.ubicacion||x.ubicacionErp||'Sin ubicación')).join('     •     ')}}else if($('airV2Ticker'))$('airV2Ticker').style.display='none';
  const pager=$('airPager');
  if(pager){
    const total=all.length,from=total?start+1:0,to=Math.min(start+PAGE_SIZE,total);
    pager.innerHTML='<div class="airPagerInfo">Mostrando '+from+'–'+to+' de '+total+' servicios</div><div class="airPagerBtns"><button class="airPageBtn" id="airPrevPage" '+(PAGE<=1?'disabled':'')+'><i class="fa-solid fa-chevron-left"></i> Anterior</button><span class="airPageNo">Página '+PAGE+' de '+pages+'</span><button class="airPageBtn" id="airNextPage" '+(PAGE>=pages?'disabled':'')+'>Siguiente <i class="fa-solid fa-chevron-right"></i></button></div>';
    $('airPrevPage')?.addEventListener('click',()=>setPage(PAGE-1));
    $('airNextPage')?.addEventListener('click',()=>setPage(PAGE+1));
  }
  document.querySelectorAll('[data-geo]').forEach(b=>b.onclick=()=>showGeos(Number(b.dataset.geo)));
  document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>toggleMap(Number(b.dataset.map)));
}
async function load(){if(document.hidden||!$('ccPanelPantallaAeropuerto')?.classList.contains('active'))return;try{$('airUpdated').textContent='Actualizando…';const r=await sb().functions.invoke('gm-flota');if(r.error)throw r.error;const data=r.data||{};if(!data.ok)throw new Error(data.error||'No se pudo leer Software GM');LAST=Array.isArray(data.vehicles)?data.vehicles:[];updateClientFilter();render();const pos={};LAST.forEach(x=>{const lat=Number(x.latitud),lng=Number(x.longitud);if(Number.isFinite(lat)&&Number.isFinite(lng))pos[String(x.unidad||'')]={lat,lng,ts:Date.now()}});savePrev(pos);const d=data.generatedAt?new Date(data.generatedAt):new Date();$('airUpdated').textContent='Actualizado '+d.toLocaleTimeString('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'})+'\nSiguiente lectura en 60 s';schedule()}catch(e){LAST=[];updateClientFilter();render();$('airUpdated').textContent='Error API: '+e.message+'\nReintento en 60 s';schedule()}}
function schedule(){clearTimeout(TIMER);TIMER=setTimeout(load,60000)}
function shell(){css();$('ccPantallaAeropuertoMount').innerHTML=`<div class="air">
  <div class="airTop"><div class="airTitleWrap"><div class="airBeacon"><i class="fa-solid fa-tower-broadcast"></i></div><div><h2>Pantalla Aeropuerto</h2><p>Vista TV de operación · información actualizada cada minuto</p></div></div><div class="airTopActions"><div id="airUpdated" class="airUpdated">Sin actualizar</div><button id="airFullBtn" class="airFullBtn" type="button"><i class="fa-solid fa-expand"></i> Pantalla completa</button></div></div>
  <div class="airFilters"><label>Cliente</label><select id="airClient" class="airSelect"><option value="">Todos los clientes</option></select><label class="airCheck"><input id="airOnlyTrips" type="checkbox" checked> Solo unidades con número de viaje</label><span id="airVisibleCount" class="airCount">0 unidades</span><button id="airRentToggle" class="airRentToggle" type="button" aria-expanded="false"><i class="fa-solid fa-boxes-stacked"></i> Cajas de renta</button></div>
  <div id="airV2Kpis" class="airV2Kpis" style="display:none"></div>
  <div class="airSplit"><div class="airOperations"><div class="airLegend"><div>Movimiento</div><div>Estatus</div><div>Cliente</div><div>Ubicación</div><div>Unidad / Operador</div><div>Remolque</div><div>Origen</div><div>Destino</div><div>Viaje / ETA</div></div>
  <div id="airList" class="airList"></div><div id="airPager" class="airPager"></div>
  <div id="airV2Ticker" class="airV2Ticker" style="display:none"></div></div><aside id="airRentPanel" class="airRentPanel" aria-label="Cajas en renta"></aside></div>
  <div class="airFoot">Refresco cada 60 segundos · se pausa cuando esta pantalla no está visible · mapa y recorrido se cargan solo al abrirlos.</div>
  <div id="airGeoModal" class="airModal"><div class="airModalCard"><div class="airModalHead"><h3 id="airGeoTitle">Geocercas</h3><button id="airGeoClose" class="airModalClose">Cerrar</button></div><div id="airGeoList" class="airGeoList"></div></div></div>
</div>`; VIEW='actual';RENT_OPEN=false;PAGE=1;$('airRentToggle').onclick=toggleRentals;$('airFullBtn').onclick=toggleFullscreen;syncFullscreenButton();$('airClient').onchange=()=>{PAGE=1;render();if(RENT_OPEN)loadRentals()};$('airOnlyTrips').onchange=()=>{PAGE=1;render()};$('airGeoClose').onclick=()=>$('airGeoModal').classList.remove('on');$('airGeoModal').onclick=e=>{if(e.target===$('airGeoModal'))$('airGeoModal').classList.remove('on')};load()}
window.ccOpenPantallaAeropuerto=btn=>{document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>{x.classList.remove('active');x.style.removeProperty('display')});document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));$('ccPanelPantallaAeropuerto')?.classList.add('active');btn?.classList.add('active');clearTimeout(TIMER);shell()};
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(TIMER)}else if($('ccPanelPantallaAeropuerto')?.classList.contains('active'))load()});
document.addEventListener('fullscreenchange',syncFullscreenButton);
})();