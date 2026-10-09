(()=>{'use strict';
let TIMER=null,LAST=[],VIEW='actual',PAGE=1,AUTO_TIMER=null,AUTO_SECONDS=6,LOADING=false;
const PAGE_SIZE=10;
const AIR_EXTERNAL=window.CC_MIRROR_EXTERNAL===true;
let AIR_EXTERNAL_CLIENT='';
let AIR_MANUAL=[],AIR_CLIENTS=[],AIR_GPS_VEHICLES=[];

const POS_KEY='gm_airport_prev_positions_v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.gmSupabase||null;
const tz='America/Hermosillo';

function css(){
  if($('airportCss'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="airportCss">
  .air{--bg:#f5f7fa;--panel:#ffffff;--card:#ffffff;--line:#dfe7ef;--text:#1f2937;--muted:#64748b;--accent:#2563eb;--accent2:#1d4ed8;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-radius:18px;padding:14px;color:var(--text)}
  .airTop{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:4px 2px 12px}
  .airTitleWrap{display:flex;align-items:center;gap:10px}.airBeacon{width:38px;height:38px;border-radius:12px;background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;font-size:18px}
  .airTop h2{margin:0;font-size:23px;color:#1e293b;letter-spacing:-.02em}.airViewSwitch{display:flex;gap:5px;padding:4px;background:#eef2f7;border:1px solid #dbe3ea;border-radius:10px}.airViewBtn{border:0;background:transparent;color:#64748b;border-radius:7px;padding:7px 10px;font-size:8px;font-weight:950;cursor:pointer}.airViewBtn.on{background:#fff;color:#2563eb;box-shadow:0 2px 7px rgba(15,23,42,.08)}.airTop p{margin:4px 0 0;font-size:10px;color:#64748b}.airUpdated{font-size:9px;color:#64748b;text-align:right;line-height:1.5}
  .airFilters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;margin-bottom:12px;border:1px solid var(--line);border-radius:13px;background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.04)}
  .airFilters label{font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.08em}.airSelect{min-width:240px;border:1px solid #d7e0e8;border-radius:9px;padding:8px 10px;background:#f8fafc;color:#1e293b;font-size:11px;outline:none}.airSelect:focus{border-color:#94a3b8;background:#fff}.airCheck{display:flex;gap:7px;align-items:center;font-size:10px;font-weight:800;color:#334155;text-transform:none!important;cursor:pointer}.airCheck input{accent-color:#2563eb}.airCount{margin-left:auto;font-size:9px;font-weight:900;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;padding:6px 10px;border-radius:999px}
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
  .airV2Kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.airV2Kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px}.airV2Kpi b{display:block;font-size:18px;color:#0f172a}.airV2Kpi span{font-size:7px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}.airV2Route{grid-column:1/-1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px}.airV2Progress{display:flex;align-items:center;gap:5px;margin-top:5px}.airV2Node{width:7px;height:7px;border-radius:50%;background:#cbd5e1}.airV2Node.done{background:#2563eb}.airV2Line{height:2px;flex:1;background:#dbe3ea}.airV2Ticker{margin-top:10px;padding:8px 12px;border-radius:10px;background:#0f172a;color:#e2e8f0;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.air.v2 .airTrip{grid-template-columns:100px 120px minmax(170px,1.1fr) minmax(145px,.8fr) 80px minmax(180px,1.1fr) 100px}.air.v2 .airTrip{border-radius:10px;box-shadow:none}.air.v2 .airUnit{font-size:14px}.air.v2 .airList{gap:6px}
  .airRentToggle{margin-left:auto;display:inline-flex;align-items:center;gap:7px;background:#f8fafc;color:#334155;border:1px solid #d7e0e8;border-radius:10px;padding:7px 11px;font-size:9px;font-weight:900;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.04)}.airRentToggle:hover{background:#eff6ff;border-color:#bfdbfe;color:#2563eb}.airRentToggle.on{background:#eff6ff;border-color:#bfdbfe;color:#2563eb}.airRentToggle i{font-size:10px}.airSplit{display:block}.airOperations{min-width:0}.airRentPanel{display:none;min-width:0;background:white;border:1px solid #dce7ed;border-radius:16px;padding:14px;box-shadow:0 8px 22px #0f172a0a}.air.rentOpen .airSplit{display:grid;grid-template-columns:minmax(0,3fr) minmax(320px,2fr);gap:12px}.air.rentOpen .airRentPanel{display:block}.air.rentOpen .airLegend{display:none}.air.rentOpen .airTrip{grid-template-columns:repeat(2,minmax(0,1fr))!important}.air.rentOpen .airTrip>*{min-width:0}.airRentStats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}.airRentStats span{background:#f3f8fa;border:1px solid #e0eaf0;border-radius:10px;padding:10px 5px;font-size:9px;color:#64748b;text-align:center}.airRentStats b{display:block;font-size:20px;color:#2563eb}.airRentMap{background:#f1f5f9;border-radius:12px;overflow:hidden}.airRentMap iframe{width:100%;height:250px;border:0}.airRentMap small{display:block;padding:8px;font-size:9px;color:#64748b}.airRentItems{max-height:340px;overflow:auto;margin-top:10px}.airRentItem{padding:10px;border-bottom:1px solid #edf2f7;display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:10px}.airRentItem strong{color:#0f172a}.airRentItem span{color:#64748b;flex:1}.airRentItem a{color:#2563eb;font-weight:800}.airRentEmpty{padding:24px 12px;color:#64748b;text-align:center;font-size:11px}@media(max-width:1050px){.air.rentOpen .airSplit{grid-template-columns:1fr}.air.rentOpen .airTrip{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
  .airEmpty{padding:45px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:14px;background:#fff}.airFoot{padding:9px 5px 0;font-size:8px;color:#94a3b8}
  .airModal{position:fixed;inset:0;z-index:140000;background:rgba(15,23,42,.42);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}.airModal.on{display:flex}.airModalCard{width:min(760px,96vw);max-height:82vh;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.2)}.airModalHead{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#f8fafc;color:#0f172a;border-bottom:1px solid #e2e8f0}.airModalHead h3{margin:0;font-size:16px}.airModalClose{border:1px solid #dbe3ea;background:#fff;color:#334155;border-radius:8px;padding:6px 10px;font-weight:900;cursor:pointer}
  .airGeoList{padding:16px 20px;overflow:auto;max-height:68vh}.airGeoTimeline{position:relative;padding-left:26px}.airGeoTimeline:before{content:'';position:absolute;left:9px;top:5px;bottom:5px;width:2px;background:#dbe3ea}.airGeoItem{position:relative;padding:0 0 18px 10px}.airGeoDot{position:absolute;left:-21px;top:3px;width:11px;height:11px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 3px #ccfbf1}.airGeoEvent{font-size:10px;font-weight:950;color:#0f172a}.airGeoName{font-size:11px;font-weight:800;color:#334155;margin-top:2px}.airGeoTime{font-size:8px;color:#94a3b8;margin-top:3px}
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
  .airRouteArrow{background:#ecfdf5;border-color:#d1fae5;color:#2563eb}
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
  #ccPantallaAeropuertoMount:fullscreen .airStatusSub{font-size:9.5px;margin-top:2px;font-weight:950;color:#1d4ed8}
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
  #ccPantallaAeropuertoMount:fullscreen .airClientName{font-size:11.5px;font-weight:950;color:#1d4ed8}
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
  .airLegend{grid-template-columns:86px 92px 140px 125px 125px 105px minmax(135px,1fr) minmax(135px,1fr) 108px;gap:6px;background:#edf5fd;border-color:#dbe8f5;color:#4b6380}
  .airTrip{grid-template-columns:86px 92px 140px 125px 125px 105px minmax(135px,1fr) minmax(135px,1fr) 108px;gap:6px;min-height:62px;padding:7px 9px;border-radius:10px;border-color:#dfe8ef;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.035)}
  .airTrip:nth-of-type(4n+1){background:#fcfefe}
  .airTrip:hover{border-color:#bfd7f2;box-shadow:0 5px 14px rgba(37,99,235,.08)}
  .airTrip:before{background:#7fb3e8}
  .airCompass{width:36px;height:36px;min-width:36px;background:#eef6ff;border-color:#d9e9fb;color:#1d6fb8}
  .airMotionText b{font-size:10px}.airMotionText span{font-size:7px}
  .airStatus{font-size:7.5px;padding:5px 7px}
  .airClientName{font-size:12.5px;color:#1d4ed8;align-self:center}
  .airLocationMain{font-size:8.5px;color:#66788a}
  .airUnit,.airTrailer{font-size:16px}
  .airOperator{font-size:8.5px}
  .airOrigin,.airDestination{font-size:11.5px}
  .airTripNo{font-size:10.5px}
  .airTimeMain{font-size:9px}
  .airPager{margin-top:7px;padding:7px 10px;background:#fdfefe}
  .airSplit{min-width:0}
  .airRentPanel{background:#fff;border:1px solid #dce7ed;border-radius:13px;padding:0;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,.05)}
  .airRentHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 14px;background:linear-gradient(90deg,#edf5fd,#f8fbfd);border-bottom:1px solid #dbe8f5}
  .airRentTitle{font-size:14px;font-weight:950;color:#1e3a8a}.airRentSub{font-size:9px;color:#64748b;margin-top:3px}
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

  /* Afinado distribución v49 */
  .airLegend,.airTrip{
    grid-template-columns:104px 112px 150px 118px 136px 124px 140px 140px 110px;
    column-gap:8px
  }
  .airMotion{padding-right:7px;border-right:1px solid #e3edf7}
  .airStatusWrap{padding-left:4px;justify-content:center}
  .airClientName{color:#1d4ed8}
  .airRouteCell{min-width:0;background:#f5f9fe;border:1px solid #e1ecf8;padding:6px 8px}
  .airOriginCell{border-radius:9px 3px 3px 9px}
  .airDestinationCell{border-radius:3px 9px 9px 3px;position:relative;border-left-color:#cfe0f3}
  .airDestinationCell:before{content:'→';position:absolute;left:-13px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e8f2fd;border:1px solid #c9def5;color:#2563eb;font-size:10px;font-weight:950}
  .airOrigin,.airDestination{margin-top:2px}
  .airTrailerPlate{margin-top:3px;display:inline-flex;align-items:center;padding:2px 5px;border-radius:999px;background:#eef5fc;border:1px solid #d9e8f7;color:#506987;font-size:7px;font-weight:900}
  .airStatus.green{background:#eff6ff;color:#1d4ed8;border-color:#dbeafe}
  .airBtn.geo{background:#eff6ff;color:#1d4ed8;border-color:#dbeafe}
  .airTrip:before{background:#60a5fa}
  .airTrip.moved:before{background:#2563eb}
  @keyframes airGlow{0%{background:#eff6ff}100%{background:#fff}}
  .airRentStats b,.airRentItem a{color:#2563eb}
  #ccPantallaAeropuertoMount:fullscreen .airLegend,
  #ccPantallaAeropuertoMount:fullscreen .airTrip{
    grid-template-columns:100px 108px 145px 112px 130px 120px 138px 138px 106px;
    column-gap:7px
  }
  #ccPantallaAeropuertoMount:fullscreen .airRouteCell{padding:5px 7px}

  /* Redistribución final v50 */
  .airLegend,.airTrip{
    width:100%;
    box-sizing:border-box;
    grid-template-columns:104px 112px minmax(150px,.95fr) 128px 148px 132px minmax(300px,1.65fr) 128px;
    column-gap:9px
  }
  .airMotion{padding-right:10px;border-right:1px solid #dfeaf6}
  .airStatusWrap{padding-left:2px}
  .airClientName{font-size:12px;font-weight:950;color:#1d4ed8}
  .airLocation{max-width:128px}
  .airLocationMain{font-size:8.5px}
  .airUnit,.airTrailer{font-size:16px}
  .airTrailerPlate{font-size:7.5px}
  .airRouteUnified{
    min-width:0;
    display:grid;
    grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr);
    align-items:center;
    gap:7px;
    padding:6px 9px;
    border:1px solid #dbe8f5;
    border-radius:9px;
    background:linear-gradient(90deg,#f7fbff,#f1f7fd)
  }
  .airRouteUnified .airPoint{min-width:0}
  .airRouteUnified .airPointLabel{font-size:6.5px;color:#7890aa}
  .airRouteUnified .airOrigin,.airRouteUnified .airDestination{
    font-size:11px;
    font-weight:900;
    color:#17375e;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    margin-top:2px
  }
  .airRouteConnector{
    width:28px;height:28px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    background:#e7f1fc;border:1px solid #cbdff5;color:#2563eb;
    font-weight:950;font-size:12px
  }
  .airTime{padding-left:3px}
  #ccPantallaAeropuertoMount:fullscreen .airLegend,
  #ccPantallaAeropuertoMount:fullscreen .airTrip{
    grid-template-columns:100px 106px minmax(145px,.95fr) 120px 140px 126px minmax(290px,1.7fr) 120px;
    column-gap:8px
  }
  #ccPantallaAeropuertoMount:fullscreen .airRouteUnified{padding:5px 8px}
  #ccPantallaAeropuertoMount:fullscreen .airRouteUnified .airOrigin,
  #ccPantallaAeropuertoMount:fullscreen .airRouteUnified .airDestination{font-size:10.5px}
  .air.rentOpen .airTrip{
    grid-template-columns:82px 90px minmax(130px,1fr) 108px 116px 100px!important
  }
  .air.rentOpen .airTrip>div:nth-child(7),
  .air.rentOpen .airTrip>div:nth-child(8){display:none}

  /* Legibilidad TV y estatus v51 */
  .airLegend,.airTrip{
    grid-template-columns:106px 120px minmax(180px,1.05fr) 150px 158px 138px minmax(340px,1.9fr) 134px;
    column-gap:10px
  }
  .airList{gap:6px}
  .airTrip{
    min-height:68px;
    padding:8px 10px;
    border:1px solid #d7e5f5;
    box-shadow:0 1px 4px rgba(37,99,235,.04)
  }
  .airTrip:nth-child(4n+3){background:#f7fbff}
  .airTrip:hover{border-color:#bcd4f3;box-shadow:0 3px 10px rgba(37,99,235,.08)}
  .airStatus{font-size:8px;padding:5px 8px;border-width:1px}
  .airStatus.green{background:#dcfce7;color:#166534;border-color:#86efac}
  .airStatus.yellow{background:#ffedd5;color:#c2410c;border-color:#fdba74}
  .airStatus.red{background:#fee2e2;color:#b91c1c;border-color:#fca5a5}
  .airStatus.gray{background:#e2e8f0;color:#475569;border-color:#cbd5e1}
  .airStatus.blue{background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd}
  .airLocation{max-width:none}
  .airLocationMain{
    font-size:9.5px;
    line-height:1.2;
    font-weight:750;
    color:#475569;
    white-space:normal;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden
  }
  .airActions{margin-top:4px}
  .airClientName{font-size:12.5px;line-height:1.15}
  .airUnit,.airTrailer{font-size:16.5px}
  .airRouteUnified{padding:7px 10px}
  .airRouteUnified .airOrigin,.airRouteUnified .airDestination{font-size:11.5px}
  .airTripNo{font-size:11px}
  #ccPantallaAeropuertoMount:fullscreen .airLegend,
  #ccPantallaAeropuertoMount:fullscreen .airTrip{
    grid-template-columns:102px 116px minmax(170px,1.05fr) 145px 150px 132px minmax(325px,1.9fr) 128px;
    column-gap:9px
  }
  #ccPantallaAeropuertoMount:fullscreen .airList{gap:5px}
  #ccPantallaAeropuertoMount:fullscreen .airTrip{padding:6px 9px}
  #ccPantallaAeropuertoMount:fullscreen .airStatus{font-size:7.5px;padding:4px 7px}
  #ccPantallaAeropuertoMount:fullscreen .airLocationMain{
    font-size:9px;
    line-height:1.15;
    -webkit-line-clamp:2
  }
  #ccPantallaAeropuertoMount:fullscreen .airClientName{font-size:12px}
  #ccPantallaAeropuertoMount:fullscreen .airUnit,
  #ccPantallaAeropuertoMount:fullscreen .airTrailer{font-size:15.5px}
  #ccPantallaAeropuertoMount:fullscreen .airRouteUnified .airOrigin,
  #ccPantallaAeropuertoMount:fullscreen .airRouteUnified .airDestination{font-size:11px}

  /* Mapa general + nueva distribución v52 */
  .airLegend,.airTrip{
    grid-template-columns:106px 120px 178px minmax(145px,.82fr) 158px 138px minmax(330px,1.85fr) 134px;
    column-gap:10px
  }
  .airLocation{max-width:none}
  .airLocationMain{font-size:10px;line-height:1.22;font-weight:800;color:#41566f}
  .airClientName{font-size:11.5px;line-height:1.15}
  .airMapToggle{display:inline-flex;align-items:center;gap:7px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:10px;padding:7px 11px;font-size:9px;font-weight:900;cursor:pointer}
  .airMapToggle:hover,.airMapToggle.on{background:#dbeafe;border-color:#93c5fd}
  .airFleetMapPanel{display:none;margin:0 0 9px;background:#fff;border:1px solid #d7e5f5;border-radius:13px;overflow:hidden;box-shadow:0 4px 14px rgba(37,99,235,.06)}
  .airFleetMapPanel.on{display:block}
  .airFleetMapHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;background:#edf5fd;border-bottom:1px solid #dbe8f5}
  .airFleetMapHead strong{font-size:11px;color:#17375e}.airFleetMapHead span{font-size:8px;color:#64748b}
  .airFleetMapCanvas{height:360px;width:100%;background:#eaf1f8}
  .airFleetMapLegend{display:flex;gap:12px;align-items:center;padding:7px 12px;font-size:8px;color:#64748b;background:#fafcff;border-top:1px solid #e5edf6}
  .airUnitMarker{background:#2563eb;color:#fff;border:2px solid #fff;border-radius:8px;padding:3px 6px;font-size:10px;font-weight:950;box-shadow:0 2px 8px rgba(15,23,42,.28);white-space:nowrap}
  .airUnitMarker.trip{background:#166534}.airUnitMarker.noTrip{background:#64748b}
  #ccPantallaAeropuertoMount:fullscreen .airLegend,
  #ccPantallaAeropuertoMount:fullscreen .airTrip{
    grid-template-columns:102px 116px 172px minmax(138px,.82fr) 150px 132px minmax(315px,1.85fr) 128px;
    column-gap:9px
  }
  #ccPantallaAeropuertoMount:fullscreen .airLocationMain{font-size:9.5px}
  #ccPantallaAeropuertoMount:fullscreen .airFleetMapCanvas{height:300px}

  /* Mapa grande de unidades v53 */
  .airFleetMapPanel{
    display:none;
    position:fixed;
    inset:10px;
    z-index:150000;
    margin:0;
    background:#fff;
    border:1px solid #cfddeb;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 24px 80px rgba(15,23,42,.26)
  }
  .airFleetMapPanel.on{display:flex;flex-direction:column}
  .airFleetMapHead{
    flex:0 0 auto;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding:11px 14px;
    background:linear-gradient(90deg,#edf5fd,#f8fbff);
    border-bottom:1px solid #dbe8f5
  }
  .airFleetMapHeadLeft{min-width:0}
  .airFleetMapHead strong{display:block;font-size:15px;color:#17375e}
  .airFleetMapHead span{display:block;font-size:9px;color:#64748b;margin-top:2px}
  .airFleetMapActions{display:flex;align-items:center;gap:7px}
  .airFleetMapAction{
    display:inline-flex;align-items:center;gap:6px;
    border:1px solid #cbdcf0;background:#fff;color:#334155;
    border-radius:9px;padding:7px 10px;font-size:9px;font-weight:900;cursor:pointer
  }
  .airFleetMapAction:hover{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
  .airFleetMapCanvas{flex:1 1 auto;min-height:0;height:auto;width:100%;background:#eaf1f8}
  .airFleetMapLegend{flex:0 0 auto;display:flex;gap:16px;align-items:center;padding:8px 12px;font-size:8px;color:#64748b;background:#fafcff;border-top:1px solid #e5edf6}
  .airUnitMarker{
    display:inline-flex;align-items:center;gap:4px;
    background:#2563eb;color:#fff;border:2px solid #fff;border-radius:9px;
    padding:4px 7px;font-size:10px;font-weight:950;
    box-shadow:0 2px 8px rgba(15,23,42,.28);white-space:nowrap
  }
  .airUnitMarker i{font-size:10px}
  .airUnitMarker.trip{background:#166534}
  .airUnitMarker.noTrip{background:#64748b}
  .airFleetMapPanel:fullscreen{inset:0;border:0;border-radius:0;width:100vw;height:100vh}
  .airFleetMapPanel:fullscreen .airFleetMapCanvas{height:auto}

  /* Mapa profesional v55 */
  .airFleetMapControls{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  #airFleetMapPanel.airHideTripBubbles .airVehicleInfoBubble{display:none!important}
  .airMapSegment{display:inline-flex;align-items:center;gap:3px;padding:3px;background:#e8f1fb;border:1px solid #cbdcf0;border-radius:10px}
  .airMapSegBtn,.airMapLockBtn{
    display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#526987;
    border-radius:7px;padding:6px 9px;font-size:8px;font-weight:900;cursor:pointer
  }
  .airMapSegBtn.on{background:#2563eb;color:#fff;box-shadow:0 2px 7px rgba(37,99,235,.2)}
  .airMapLockBtn{border:1px solid #cbdcf0;background:#fff;color:#334155}
  .airMapLockBtn.on{background:#eef6ff;color:#1d4ed8;border-color:#93c5fd}
  .airMapLockBtn i{width:10px;text-align:center}
  .airVehicleMarker{
    display:flex;align-items:center;gap:5px;background:#fff;border:2px solid #2563eb;
    border-radius:10px;padding:3px 6px;box-shadow:0 3px 10px rgba(15,23,42,.25);
    white-space:nowrap;color:#17375e;font-weight:950;font-size:9px
  }
  .airVehicleMarker.trip{border-color:#16a34a}
  .airVehicleMarker.noTrip{border-color:#64748b}
  .airVehicleMarker .tractor{display:inline-flex;align-items:center;gap:3px;color:#1d4ed8}
  .airVehicleMarker.trip .tractor{color:#166534}
  .airVehicleMarker.noTrip .tractor{color:#475569}
  .airVehicleMarker .truckIcon{font-size:12px}
  .airVehicleMarker .trailerPart{
    display:inline-flex;align-items:center;gap:3px;padding-left:5px;margin-left:1px;
    border-left:1px solid #cbd5e1;color:#475569
  }
  .airVehicleMarker .trailerIcon{font-size:10px}
  .airFleetMapLegend .legendLock{margin-left:auto;color:#526987;font-weight:800}
  @media(max-width:900px){.airFleetMapHead{align-items:flex-start}.airFleetMapControls{justify-content:flex-end}}

  /* Cajas de renta full-view + clientes por color v56 */
  .airRentPanel{
    display:none;
    position:fixed;
    inset:10px;
    z-index:149500;
    min-width:0;
    background:#f6f9fc;
    border:1px solid #cfddeb;
    border-radius:16px;
    padding:0;
    overflow:hidden;
    box-shadow:0 24px 80px rgba(15,23,42,.26)
  }
  .airRentPanel.on{display:flex;flex-direction:column}
  .airRentFullHead{
    flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:12px 14px;background:linear-gradient(90deg,#edf5fd,#ffffff);border-bottom:1px solid #dbe8f5
  }
  .airRentFullHead strong{display:block;font-size:16px;color:#17375e}
  .airRentFullHead span{display:block;font-size:9px;color:#64748b;margin-top:2px}
  .airRentFullActions{display:flex;gap:7px;align-items:center}
  .airRentFullBtn{display:inline-flex;align-items:center;gap:6px;border:1px solid #cbdcf0;background:#fff;color:#334155;border-radius:9px;padding:7px 10px;font-size:9px;font-weight:900;cursor:pointer}
  .airRentFullBtn:hover{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
  .airRentBody{flex:1;min-height:0;overflow:auto;padding:14px}
  .airRentStats{grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
  .airRentStats span{background:#fff;border:1px solid #dbe8f5;padding:12px 8px}
  .airRentStats b{font-size:22px}
  .airRentContentGrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(360px,.75fr);gap:12px;align-items:start}
  .airRentMap{background:#fff;border:1px solid #dbe8f5;border-radius:13px;overflow:hidden;box-shadow:0 3px 10px rgba(15,23,42,.04)}
  .airRentMap iframe{height:620px}

  @media(max-width:1050px){#airRentLeaflet{height:490px!important}}
  @media(max-width:600px){#airRentLeaflet{height:410px!important}}
  .airRentTrailerMarker{background:transparent;border:0}
  .airRentTrailerGlyph{display:flex;flex-direction:column;align-items:center;gap:1px;filter:drop-shadow(0 1px 1px rgba(15,23,42,.24));pointer-events:auto}
  .airRentTrailerGlyph svg{width:50px;height:26px;display:block;overflow:visible;background:transparent;border:0;padding:0}
  .airRentTrailerGlyph span{font:700 10px/1.1 system-ui,sans-serif;letter-spacing:0;color:#17375e;background:rgba(255,255,255,.95);border:1px solid #d5dee8;border-radius:3px;padding:1px 2px;white-space:nowrap;box-shadow:none}

  .airRentItems{max-height:none;margin-top:0;display:grid;gap:8px}
  .airRentItem{
    padding:11px 12px;border:1px solid #dbe8f5;border-radius:11px;background:#fff;
    display:grid;grid-template-columns:minmax(90px,.8fr) minmax(170px,1.5fr) minmax(120px,1fr) auto;
    gap:8px;align-items:center;font-size:10px
  }
  .airRentItem strong{font-size:14px;color:#17375e}
  .airRentItemMeta{font-size:9px;color:#64748b;line-height:1.4}
  .airRentPlate{display:inline-flex;padding:3px 6px;border-radius:999px;background:#eef4fb;border:1px solid #d6e4f3;color:#526987;font-size:8px;font-weight:900}
  .airRentPanel:fullscreen{inset:0;border:0;border-radius:0;width:100vw;height:100vh}
  .air.rentOpen .airSplit{display:block!important}
  .air.rentOpen .airOperations{display:block!important}
  .air.rentOpen .airLegend{display:grid!important}
  .air.rentOpen .airTrip{grid-template-columns:106px 120px 178px minmax(145px,.82fr) 158px 138px minmax(330px,1.85fr) 134px!important}
  .air.rentOpen .airTrip>div{display:block!important}
  .airClientLegend{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:7px 12px;background:#fff;border-top:1px solid #dbe8f5}
  .airClientLegendItem{display:inline-flex;align-items:center;gap:5px;font-size:8px;font-weight:800;color:#526987}
  .airClientLegendDot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 1px rgba(15,23,42,.08)}
  .airVehicleMarker{
    border-color:var(--client-color,#2563eb)!important;
    background:rgba(255,255,255,.96);
    padding:4px 7px;
  }
  .airVehicleMarker .tractor{color:var(--client-color,#2563eb)!important}
  .airVehicleMarker .truckIcon{font-size:13px}
  .airVehicleMarker .trailerPart{color:var(--client-color,#2563eb);border-left-color:color-mix(in srgb,var(--client-color,#2563eb) 35%,#cbd5e1)}
  .airVehicleMarker .trailerIcon{font-size:11px}
  .airVehicleMarker .tripBadge{width:6px;height:6px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 1px #fff}
  .airVehicleMarker .noTripBadge{width:6px;height:6px;border-radius:50%;background:#94a3b8;box-shadow:0 0 0 1px #fff}
  @media(max-width:1050px){
    .airRentContentGrid{grid-template-columns:1fr}
    .airRentItem{grid-template-columns:1fr 1fr}
  }

  /* Globo operativo sobre unidades v57 */
  .airVehicleMarker{position:relative}
  .airVehicleInfoBubble{
    position:absolute;
    left:50%;
    bottom:calc(100% + 10px);
    transform:translateX(-50%);
    width:190px;
    padding:7px 9px;
    border-radius:10px;
    background:rgba(255,255,255,.97);
    border:1px solid color-mix(in srgb,var(--client-color,#2563eb) 42%,#dbe5ef);
    box-shadow:0 5px 16px rgba(15,23,42,.22);
    color:#23384f;
    font-size:8px;
    line-height:1.28;
    font-weight:700;
    pointer-events:none;
    white-space:normal;
    z-index:5
  }
  .airVehicleInfoBubble:after{
    content:'';
    position:absolute;
    left:50%;
    top:100%;
    transform:translateX(-50%);
    border:7px solid transparent;
    border-top-color:#fff
  }
  .airVehicleInfoBubble .airBubbleRow{
    display:grid;
    grid-template-columns:46px minmax(0,1fr);
    gap:5px;
    align-items:start
  }
  .airVehicleInfoBubble .airBubbleRow+.airBubbleRow{margin-top:3px}
  .airVehicleInfoBubble .airBubbleLabel{
    color:#7b8da1;
    font-size:7px;
    font-weight:950;
    text-transform:uppercase;
    letter-spacing:.04em
  }
  .airVehicleInfoBubble .airBubbleValue{
    min-width:0;
    color:#1e344d;
    font-size:8.5px;
    font-weight:900;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap
  }
  .airVehicleInfoBubble .airBubbleClient{color:var(--client-color,#2563eb)}
  @media(max-width:900px){
    .airVehicleInfoBubble{width:165px;padding:6px 8px}
  }

  /* Marcador camión realista + globo compacto v58 */
  .airVehicleMarker{
    display:inline-flex!important;
    align-items:flex-end;
    gap:0!important;
    padding:3px 5px 4px!important;
    border-radius:11px!important;
    min-height:28px
  }
  .airVehicleMarker .tractor,
  .airVehicleMarker .trailerPart{
    position:relative;
    display:inline-flex!important;
    align-items:flex-end!important;
    gap:3px!important;
    border:0!important;
    padding:0!important;
    margin:0!important;
  }
  .airRig{
    display:inline-flex;
    align-items:flex-end;
    gap:1px;
    height:22px;
  }
  .airCab{
    position:relative;
    width:22px;
    height:16px;
    background:var(--client-color,#2563eb);
    border-radius:5px 4px 3px 3px;
    box-shadow:inset 0 -3px 0 rgba(0,0,0,.12);
  }
  .airCab:before{
    content:'';
    position:absolute;
    right:2px;
    top:2px;
    width:7px;
    height:6px;
    background:rgba(255,255,255,.78);
    border-radius:2px 2px 1px 1px;
  }
  .airCab:after{
    content:'';
    position:absolute;
    left:4px;
    bottom:-4px;
    width:5px;
    height:5px;
    background:#111827;
    border:1px solid #fff;
    border-radius:50%;
    box-shadow:10px 0 0 #111827,10px 0 0 1px #fff;
  }
  .airHitch{
    width:4px;
    height:3px;
    margin-bottom:5px;
    background:#475569;
    border-radius:2px;
  }
  .airTrailerVisual{
    position:relative;
    min-width:30px;
    height:14px;
    padding:0 4px;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#f8fafc;
    border:2px solid var(--client-color,#2563eb);
    border-radius:3px 4px 3px 3px;
    color:#334155;
    font-size:7px;
    font-weight:950;
    line-height:1;
  }
  .airTrailerVisual:after{
    content:'';
    position:absolute;
    left:5px;
    bottom:-5px;
    width:5px;
    height:5px;
    background:#111827;
    border:1px solid #fff;
    border-radius:50%;
    box-shadow:14px 0 0 #111827,14px 0 0 1px #fff;
  }
  .airRigUnit{
    margin-left:4px;
    font-size:8px;
    font-weight:950;
    color:#17375e;
    align-self:center;
  }
  .airVehicleInfoBubble{
    width:152px!important;
    padding:5px 7px!important;
    border-radius:8px!important;
    bottom:calc(100% + 7px)!important;
    box-shadow:0 4px 12px rgba(15,23,42,.18)!important;
    font-size:7px!important;
    line-height:1.18!important;
  }
  .airVehicleInfoBubble .airBubbleRow{
    display:flex!important;
    gap:4px!important;
    align-items:center!important;
  }
  .airVehicleInfoBubble .airBubbleRow+.airBubbleRow{margin-top:2px!important}
  .airVehicleInfoBubble .airBubbleLabel{
    flex:0 0 39px;
    font-size:6px!important;
    letter-spacing:.03em!important;
  }
  .airVehicleInfoBubble .airBubbleValue{
    font-size:7.5px!important;
    line-height:1.15!important;
  }
  .airVehicleInfoBubble:after{border-width:5px!important}

  /* Marcadores logísticos profesionales v59 */
  .airVehicleMarker{
    display:inline-flex!important;
    align-items:center!important;
    gap:5px!important;
    min-height:30px!important;
    padding:4px 7px!important;
    border-radius:10px!important;
    background:rgba(255,255,255,.97)!important;
    border:1.5px solid color-mix(in srgb,var(--client-color,#2563eb) 70%,#fff)!important;
    box-shadow:0 4px 12px rgba(15,23,42,.24)!important;
  }
  .airVehicleMarker .airRig{
    display:inline-flex!important;
    align-items:center!important;
    gap:3px!important;
    height:24px!important;
  }
  .airRigSvg{
    width:58px;
    height:24px;
    display:block;
    overflow:visible;
  }
  .airRigSvg .cabBody,
  .airRigSvg .trailerBody,
  .airRigSvg .frameLine{
    stroke:var(--client-color,#2563eb);
  }
  .airRigSvg .cabBody{fill:var(--client-color,#2563eb)}
  .airRigSvg .trailerBody{fill:#f8fafc;stroke-width:2}
  .airRigSvg .frameLine{stroke-width:2;stroke-linecap:round}
  .airRigSvg .window{fill:#dbeafe}
  .airRigSvg .wheel{fill:#111827;stroke:#fff;stroke-width:1}
  .airRigLabel{
    display:flex;
    flex-direction:column;
    gap:1px;
    line-height:1;
  }
  .airRigLabel .unitNo{font-size:8px;font-weight:950;color:#17375e}
  .airRigLabel .trailerNo{font-size:6.5px;font-weight:850;color:#64748b}
  .airVehicleInfoBubble{
    width:145px!important;
    padding:5px 7px!important;
    border-radius:8px!important;
    bottom:calc(100% + 8px)!important;
    background:rgba(255,255,255,.98)!important;
    border:1px solid color-mix(in srgb,var(--client-color,#2563eb) 38%,#dbe5ef)!important;
    box-shadow:0 4px 12px rgba(15,23,42,.16)!important;
  }
  .airVehicleInfoBubble .airBubbleLabel{flex:0 0 36px!important;font-size:5.8px!important}
  .airVehicleInfoBubble .airBubbleValue{font-size:7.2px!important}
  .airNoService{color:#b45309!important;font-weight:950!important}
  .airRentBack{background:#17375e!important;color:#fff!important;border-color:#17375e!important}
  .airRentBack:hover{background:#0f2941!important;color:#fff!important}

  /* Marcador sobrio tipo primeros iconos v60 */
  .airVehicleMarker{
    display:inline-flex!important;
    align-items:center!important;
    gap:5px!important;
    min-height:28px!important;
    padding:4px 6px!important;
    border-radius:9px!important;
    background:rgba(255,255,255,.97)!important;
    border:1.5px solid color-mix(in srgb,var(--client-color,#2563eb) 72%,#ffffff)!important;
    box-shadow:0 3px 10px rgba(15,23,42,.22)!important;
  }
  .airRigSimple{display:inline-flex;align-items:center;gap:4px}
  .airTractorIcon{
    display:inline-flex;align-items:center;justify-content:center;
    width:25px;height:20px;border-radius:6px;
    background:var(--client-color,#2563eb);
    color:#fff;font-size:12px;
  }
  .airTrailerIconWrap{
    display:inline-flex;align-items:center;gap:3px;
    height:20px;padding:0 6px;
    border:1.5px solid var(--client-color,#2563eb);
    border-radius:5px;background:#fff;color:var(--client-color,#2563eb);
    font-size:10px;font-weight:950
  }
  .airUnitNo{
    font-size:8px;font-weight:950;color:#17375e;white-space:nowrap
  }
  .airTrailerNo{
    font-size:7px;font-weight:950;color:#334155;white-space:nowrap
  }

  /* Sidebar profesional mapa v61 */
  .airFleetMapWorkspace{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:310px minmax(0,1fr);background:#e9f0f7}
  .airFleetMapSidebar{min-width:0;background:#f8fafc;border-right:1px solid #dbe5ef;display:flex;flex-direction:column;overflow:hidden}
  .airFleetSidebarHead{padding:10px;border-bottom:1px solid #e2e8f0;background:#fff}
  .airFleetSidebarTitle{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
  .airFleetSidebarTitle strong{font-size:12px;color:#17375e}
  .airFleetSidebarTitle span{font-size:8px;font-weight:900;color:#64748b;background:#eef4fb;border:1px solid #d9e6f4;padding:4px 7px;border-radius:999px}
  .airFleetSearch{width:100%;box-sizing:border-box;border:1px solid #d6e1ec;border-radius:9px;background:#f8fafc;padding:8px 10px;font-size:9px;outline:none}
  .airFleetSearch:focus{border-color:#93c5fd;background:#fff}
  .airFleetSideList{flex:1;min-height:0;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
  .airFleetSideItem{border:1px solid #dde7f0;background:#fff;border-radius:10px;padding:8px 9px;cursor:pointer;transition:.15s ease;box-shadow:0 2px 6px rgba(15,23,42,.03)}
  .airFleetSideItem:hover{border-color:#b8cce0;background:#fbfdff}
  .airFleetSideItem.on{border-color:var(--client-color,#2563eb);box-shadow:0 0 0 1px var(--client-color,#2563eb),0 4px 10px rgba(15,23,42,.07)}
  .airFleetSideTop{display:flex;align-items:center;gap:7px;min-width:0}
  .airFleetClientDot{width:8px;height:8px;border-radius:50%;background:var(--client-color,#2563eb);flex:0 0 auto}
  .airFleetUnitNo{font-size:11px;font-weight:950;color:#17375e}
  .airFleetTripFlag{margin-left:auto;font-size:6.5px;font-weight:950;border-radius:999px;padding:3px 5px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0}
  .airFleetTripFlag.off{background:#f1f5f9;color:#64748b;border-color:#e2e8f0}
  .airFleetSideMeta{margin-top:5px;font-size:8px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .airFleetDetail{border-top:1px solid #dbe5ef;background:#fff;padding:10px;max-height:48%;overflow:auto}
  .airFleetDetailEmpty{font-size:9px;color:#94a3b8;padding:8px;text-align:center}
  .airFleetDetailHead{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:9px}
  .airFleetDetailUnit{font-size:16px;font-weight:950;color:#17375e}
  .airFleetDetailClient{font-size:8px;font-weight:900;margin-top:2px;color:var(--client-color,#2563eb)}
  .airFleetDetailClose{border:1px solid #dbe5ef;background:#f8fafc;color:#475569;border-radius:7px;padding:4px 6px;font-size:8px;font-weight:900;cursor:pointer}
  .airFleetDetailGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .airFleetDetailCard{border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;padding:7px;min-width:0}
  .airFleetDetailCard.wide{grid-column:1/-1}
  .airFleetDetailLabel{font-size:6px;font-weight:950;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}
  .airFleetDetailValue{margin-top:2px;font-size:8.5px;font-weight:850;color:#334155;line-height:1.25;word-break:break-word}
  .airFleetMapCanvas{height:auto!important;min-height:0!important}
  @media(max-width:900px){.airFleetMapWorkspace{grid-template-columns:230px minmax(0,1fr)}.airFleetDetailGrid{grid-template-columns:1fr}}
  /* v50: compacto movimiento, prioridad a llegada y duración */
  .airTrip,.airLegend{grid-template-columns:70px 112px 172px minmax(138px,.82fr) 150px 132px minmax(315px,1.85fr) minmax(172px,1fr)!important}
  .airMotion{gap:4px!important;padding-right:3px!important;min-width:0}
  .airCompass{width:25px!important;min-width:25px!important;height:29px!important;font-size:14px!important}
  .airMotionText{min-width:0;overflow:hidden}.airMotionText b{font-size:8px!important}.airMotionText span{font-size:7px!important;overflow-wrap:anywhere}
  .airTime{min-width:0;overflow:visible;padding:3px 5px!important}
  .airTimeMain{font-size:12px!important;font-weight:900!important;white-space:normal!important;overflow:visible!important;line-height:1.4!important;color:#0f172a!important}
  .airTimeSub{font-size:11px!important;font-weight:850!important;white-space:normal!important;overflow:visible!important;line-height:1.4!important;color:#2563eb!important;margin-top:5px!important}
  .airTripNo{font-size:11px!important;overflow-wrap:anywhere}
  #ccPantallaAeropuertoMount:fullscreen .airTrip,#ccPantallaAeropuertoMount:fullscreen .airLegend{grid-template-columns:68px 110px 172px minmax(138px,.82fr) 150px 132px minmax(315px,1.85fr) minmax(172px,1fr)!important}
  .air.rentOpen .airTrip{grid-template-columns:65px 88px minmax(140px,1fr) 108px 116px minmax(175px,1fr)!important}
  @media(max-width:900px){.airTrip{grid-template-columns:1fr 1fr!important}.airLegend{display:none!important}.airTrip>div{display:block!important}}
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
function statusClass(s){const v=String(s||'').toUpperCase();if(/TRANS|RUTA|ACTIVO|EN CURSO/.test(v))return'green';if(/ADUANA|CUSTOM/.test(v))return'blue';if(/SITIO|ORIGEN|ESPER/.test(v))return'yellow';if(/DEMOR|FUERA|CANCEL|ERROR|BLOQ/.test(v))return'red';if(/FINAL|CERRAD|TERMIN/.test(v))return'gray';return'gray'}
function selectedClient(){return AIR_EXTERNAL?AIR_EXTERNAL_CLIENT:($('airClient')?.value||'')}
function onlyTrips(){return $('airOnlyTrips')?.checked!==false}

function airClientKey(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ')}
function airCatalogName(x){const c=AIR_CLIENTS.find(a=>airClientKey(a.nombre)===airClientKey(x));return c?c.nombre:null}
function airUnitKey(x){return String(x||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'')}
function airManualActive(a){const n=Date.now();return a.estado==='ACTIVA'&&Date.parse(a.inicio)<=n&&(a.modo==='HASTA_VIAJE'||!a.fin||n<Date.parse(a.fin))}
function airApplyManual(vehicles){
 const base=vehicles.map(v=>{const cliente=airCatalogName(v.cliente);return cliente?{...v,cliente}:null}).filter(Boolean);
 const active=AIR_MANUAL.filter(airManualActive),mirrors=[];
 for(const a of active){
  const v=vehicles.find(v=>airUnitKey(v.unidad)===airUnitKey(a.unidad));if(!v)continue;
  const client=AIR_CLIENTS.find(c=>c.id===a.cliente_id);if(!client)continue;
  if(base.some(x=>airUnitKey(x.unidad)===airUnitKey(a.unidad)&&airClientKey(x.cliente)===airClientKey(client.nombre)&&String(x.numeroViaje||'').trim()))continue;
  if(mirrors.some(x=>airUnitKey(x.unidad)===airUnitKey(a.unidad)&&airClientKey(x.cliente)===airClientKey(client.nombre)))continue;
  mirrors.push({...v,numeroViaje:'',identificadorViaje:'',cliente:client.nombre,airManual:true,airMirrorId:a.id,estatusViaje:'Cuenta espejo',origen:'',destino:'',salida:null,eta:null});
 }
 return [...base,...mirrors];
}
async function airReadManual(){
 const {data,error}=await sb().from('gm_airport_manual_assignments').select('id,unidad,cliente_id,cliente_nombre,inicio,fin,modo,estado,created_at').order('created_at',{ascending:false}).limit(500);
 if(error)throw error;
 AIR_MANUAL=Array.isArray(data)?data:[];
}
async function airReadClients(){
 const {data,error}=await sb().from('cc_clientes').select('id,nombre,estatus').eq('estatus','ACTIVO').order('nombre').limit(300);
 if(error)throw error;AIR_CLIENTS=Array.isArray(data)?data:[];updateClientFilter();airManageRender();if(LAST.length)render();
}

function airMirrorList(){
 const cid=$('airManualClient')?.value,selected=AIR_CLIENTS.find(x=>x.id===cid),right=$('airMirrorExisting'),left=$('airMirrorAvailable');
 if(!right||!left)return;
 if(!selected){right.innerHTML='<p style="color:#64748b">Selecciona un cliente para ver sus unidades.</p>';left.innerHTML='<p style="color:#64748b">Selecciona un cliente. La lista incluye todas las unidades GPS.</p>';return}
 const now=Date.now(),mine=AIR_MANUAL.filter(a=>a.cliente_id===cid&&airManualActive(a));
 const linked=LAST.filter(x=>airClientKey(x.cliente)===airClientKey(selected.nombre)&&(String(x.numeroViaje||'').trim()||x.airManual));
 const linkedKeys=new Set([...linked.map(x=>airUnitKey(x.unidad)),...mine.map(a=>airUnitKey(a.unidad))]);
 const units=[...new Map(AIR_GPS_VEHICLES.filter(x=>String(x.unidad||'').trim()).map(x=>[airUnitKey(x.unidad),x])).values()].sort((a,b)=>String(a.unidad).localeCompare(String(b.unidad),'es'));
 const available=units.filter(x=>!linkedKeys.has(airUnitKey(x.unidad)));
 right.innerHTML=linked.length?linked.map(x=>{
 const manual=mine.find(a=>airUnitKey(a.unidad)===airUnitKey(x.unidad));
 const realTrip=!!String(x.numeroViaje||'').trim()&&!x.airManual;
 return '<div style="padding:10px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px"><b>'+esc(x.unidad)+'</b><span style="display:flex;align-items:center;gap:8px"><small style="color:#64748b">'+(realTrip?'Viaje activo':'Cuenta espejo')+'</small>'+(manual&&!realTrip?'<button type="button" class="airBtn" data-mirror-remove="'+esc(manual.id)+'" style="color:#b91c1c;border-color:#fecaca">Quitar</button>':'')+'</span></div>';
 }).join(''):'<p style="color:#64748b">Este cliente no tiene unidades activas.</p>';
 right.querySelectorAll('[data-mirror-remove]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.mirrorRemove,a=AIR_MANUAL.find(v=>v.id===id&&v.cliente_id===cid&&airManualActive(v));
  if(!a||!confirm('¿Quitar la unidad '+a.unidad+' de la cuenta espejo de '+selected.nombre+'?'))return;
  b.disabled=true;
  try{
   const {data,error}=await sb().from('gm_airport_manual_assignments').update({estado:'FINALIZADA',updated_at:new Date().toISOString()}).eq('id',id).eq('cliente_id',cid).eq('estado','ACTIVA').select('id');
   if(error)throw error;if(!data?.length)throw Error('La asignación ya no está activa.');
   await airReadManual();
   const vehicle=AIR_GPS_VEHICLES.find(v=>airUnitKey(v.unidad)===airUnitKey(a.unidad));
   if(vehicle){LAST=airApplyManual(AIR_GPS_VEHICLES);render();if(AIR_MAP_OPEN)renderAirportMap({refresh:true})}
   airManageRender();
  }catch(e){alert('No se pudo quitar la unidad: '+e.message);b.disabled=false}
 });
 left.innerHTML=available.length?available.map(x=>'<label style="display:flex;align-items:center;gap:8px;padding:9px;border-bottom:1px solid #e2e8f0;cursor:pointer"><input type="radio" name="airMirrorUnit" value="'+esc(x.unidad)+'"><b>'+esc(x.unidad)+'</b><small style="color:#64748b">'+(String(x.numeroViaje||'').trim()?'Viaje de otro cliente':'Sin viaje')+'</small></label>').join(''):'<p style="color:#64748b">No hay más unidades disponibles.</p>';
 left.querySelectorAll('[name="airMirrorUnit"]').forEach(e=>e.onchange=()=>{$('airManualUnit').value=e.value});
}
function airManageRender(){
 const panel=$('airManualPanel');if(!panel)return;
 panel.style.display=airIsSuperAdmin()?'block':'none';if(!airIsSuperAdmin())return;
 const client=$('airManualClient'),unit=$('airManualUnit');
 if(client&&AIR_CLIENTS.length){const old=client.value;client.innerHTML='<option value="">Seleccionar cliente del catálogo</option>'+AIR_CLIENTS.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');if(AIR_CLIENTS.some(x=>x.id===old))client.value=old}
 if(unit){const old=unit.value;const arr=[...new Set(AIR_GPS_VEHICLES.map(x=>String(x.unidad||'').trim()).filter(Boolean))].sort();unit.innerHTML='<option value="">Seleccionar unidad</option>'+arr.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if(arr.includes(old))unit.value=old}
 airMirrorList();
 const c=$('airManualClient')?.value,body=$('airManualHistory');
 if(body)body.innerHTML=AIR_MANUAL.filter(a=>!c||a.cliente_id===c).slice(0,50).map(a=>'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-top:1px solid #e2e8f0;padding:8px 0;font-size:11px"><b>'+esc(a.unidad)+'</b><span>'+esc(a.cliente_nombre)+'</span><span>'+esc(a.modo==='HASTA_VIAJE'?'Hasta detectar viaje':new Date(a.inicio).toLocaleString('es-MX',{timeZone:tz})+' → '+(a.fin?new Date(a.fin).toLocaleString('es-MX',{timeZone:tz}):'Sin fin'))+'</span><span>'+esc(a.estado)+'</span>'+(a.estado==='ACTIVA'?'<button class="airBtn" data-manual-end="'+esc(a.id)+'">Finalizar</button>':'')+'</div>').join('')||'<span style="font-size:11px;color:#64748b">Sin asignaciones.</span>';
 body?.querySelectorAll('[data-manual-end]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Finalizar esta cuenta espejo?'))return;try{const {error}=await sb().from('gm_airport_manual_assignments').update({estado:'FINALIZADA',updated_at:new Date().toISOString()}).eq('id',b.dataset.manualEnd);if(error)throw error;await airReadManual();airManageRender();await load()}catch(e){alert(e.message)}});
}
async function airManualSave(){
 const unidad=$('airManualUnit')?.value,clienteId=$('airManualClient')?.value,ini=$('airManualStart')?.value,fin=$('airManualEnd')?.value,modo=$('airManualMode')?.value||'HORARIO';
 const cliente=AIR_CLIENTS.find(x=>x.id===clienteId);
 if(!unidad||!cliente||!ini||(modo==='HORARIO'&&!fin))return alert('Selecciona cliente, unidad, inicio y, para horario fijo, una fecha final.');
 const start=new Date(ini),end=fin?new Date(fin):null;
 if(!Number.isFinite(start.getTime())||(modo==='HORARIO'&&(!end||!(end>start))))return alert('Revisa las fechas de vigencia.');

 if(AIR_MANUAL.some(a=>a.estado==='ACTIVA'&&a.cliente_id===clienteId&&airUnitKey(a.unidad)===airUnitKey(unidad)&&(!a.fin||Date.parse(a.fin)>start.getTime())&&(modo!=='HORARIO'||Date.parse(a.inicio)<end.getTime())))return alert('La unidad ya tiene una cuenta espejo activa en ese periodo.');
 const btn=$('airManualSave');btn.disabled=true;
 try{
 const {error}=await sb().from('gm_airport_manual_assignments').insert({unidad,cliente_id:cliente.id,cliente_nombre:cliente.nombre,inicio:start.toISOString(),fin:modo==='HORARIO'?end.toISOString():null,modo});if(error)throw error;
 await airReadManual();airManageRender();await load();alert('Cuenta espejo guardada.');
 }catch(e){alert('Error al guardar: '+e.message)}finally{btn.disabled=false}
}

function filtered(){const c=selectedClient();return LAST.filter(x=>(!c||String(x.cliente||'')===c)&&(!onlyTrips()||String(x.numeroViaje||'').trim()||x.airManual))}
function updateClientFilter(){const sel=$('airClient');if(!sel)return;if(AIR_EXTERNAL){sel.innerHTML='<option value="'+esc(AIR_EXTERNAL_CLIENT)+'">'+esc(AIR_EXTERNAL_CLIENT)+'</option>';sel.value=AIR_EXTERNAL_CLIENT;sel.disabled=true;return}const current=sel.value,clients=AIR_CLIENTS.map(x=>x.nombre);sel.innerHTML='<option value="">Todos los clientes del catálogo</option>'+clients.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');if(clients.includes(current))sel.value=current}
function showGeos(index){const x=LAST[index];if(!x)return;$('airGeoTitle').textContent='Recorrido por geocercas · '+(x.unidad||'Unidad');const arr=(Array.isArray(x.geocercas)?x.geocercas:[]).slice().sort((a,b)=>(new Date(a["Fecha Hora"]||a.fechaHora||a.fecha||0).getTime()||0)-(new Date(b["Fecha Hora"]||b.fechaHora||b.fecha||0).getTime()||0));$('airGeoList').innerHTML=arr.length?'<div class="airGeoTimeline">'+arr.map(g=>`<div class="airGeoItem"><span class="airGeoDot"></span><div class="airGeoEvent">${esc(g.Evento||g.evento||'Evento')}</div><div class="airGeoName">${esc(g.Geocerca||g.geocerca||'—')}</div><div class="airGeoTime">${esc(fmt(g["Fecha Hora"]||g.fechaHora||g.fecha))}</div></div>`).join('')+'</div>':'<div class="airEmpty">La API no devolvió historial de geocercas para esta unidad.</div>';$('airGeoModal').classList.add('on')}
function mapEmbedUrl(lat,lng){const la=Number(lat),lo=Number(lng);if(!Number.isFinite(la)||!Number.isFinite(lo))return'';const dLat=.012,dLng=.018;return'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent((lo-dLng)+','+(la-dLat)+','+(lo+dLng)+','+(la+dLat))+'&layer=mapnik&marker='+encodeURIComponent(la+','+lo)}
function toggleMap(index){const row=$('airMap_'+index),x=LAST[index];if(!row||!x)return;if(row.dataset.open==='1'){row.innerHTML='';row.dataset.open='0';return}const src=mapEmbedUrl(x.latitud,x.longitud);row.dataset.open='1';row.innerHTML=src?`<div class="airMiniMapWrap"><div style="flex:1"><iframe class="airMiniMap" loading="lazy" src="${esc(src)}"></iframe></div><div class="airMapMeta"><b>${esc(x.unidad||'Unidad')}</b><span>${esc(x.ubicacion||x.ubicacionErp||'Ubicación GPS')}</span><span>${esc(x.latitud+', '+x.longitud)}</span><span>Actualización GPS: ${esc(fmt(x.gpsAt))}</span><button class="airMapClose" data-map-close="${index}">Cerrar mapa</button></div></div>`:'<div class="airEmpty">Esta unidad no trae coordenadas válidas.</div>';row.querySelector('[data-map-close]')?.addEventListener('click',()=>toggleMap(index))}

let RENT_MAP_INSTANCE=null;
let AIR_GEO_VISIBLE=false,AIR_GEO_GROUP=null;
function airGeoRefresh(){
  if(AIR_EXTERNAL||!AIR_MAP_INSTANCE||!window.L)return;
  if(AIR_GEO_GROUP){AIR_MAP_INSTANCE.removeLayer(AIR_GEO_GROUP);AIR_GEO_GROUP=null;}
  if(!AIR_GEO_VISIBLE)return;
  const areas=window.ccGeoListForProfesional?.()||[];
  AIR_GEO_GROUP=L.layerGroup().addTo(AIR_MAP_INSTANCE);
  areas.forEach((g,i)=>{if(g.activa===false)return;try{
    const color=g.color||['#2563eb','#16a34a','#9333ea','#ea580c'][i%4];
    let layer;
    if(g.tipo==='circle'&&Array.isArray(g.centro))layer=L.circle(g.centro,{radius:Number(g.radio)||0,color,weight:2,fillOpacity:.13});
    else if(Array.isArray(g.coordenadas))layer=L.polygon(g.coordenadas,{color,weight:2,fillOpacity:.13});
    if(layer){const n=document.createElement('span');n.textContent=String(g.nombre||'Geocerca');layer.bindTooltip(n.textContent);layer.addTo(AIR_GEO_GROUP);}
  }catch(e){console.warn('AIR_GEO_POLYGON',e)}});
}
function airGeoPanel(){
  if(AIR_EXTERNAL)return;
  let panel=document.getElementById('airGeoManagePanel');
  if(panel){panel.remove();return;}
  panel=document.createElement('div');panel.id='airGeoManagePanel';
  panel.style.cssText='position:fixed;z-index:260000;right:18px;top:80px;width:min(390px,calc(100vw - 36px));max-height:80vh;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:13px;box-shadow:0 18px 55px #0003;padding:17px;color:#0f172a;font:13px Arial';
  panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">Administrar geocercas</b><button id="airGeoClosePanel">Cerrar</button></div><p id="airGeoManageCount"></p><label style="display:flex;align-items:center;gap:9px"><input type="checkbox" id="airGeoVisibleToggle"> Mostrar polígonos en el mapa</label><hr><input id="airGeoSearch" type="search" placeholder="Buscar geocerca" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"><div id="airGeoManageList" style="max-height:38vh;overflow:auto;margin-top:9px"></div><hr><button id="airGeoOpenAdmin" style="width:100%;padding:11px;background:#1d4ed8;color:white;border:0;border-radius:8px">Crear, importar o editar en Mapa de Cajas</button>';
  document.body.appendChild(panel);
  const areas=window.ccGeoListForProfesional?.()||[];
  panel.querySelector('#airGeoManageCount').textContent=areas.length+' geocercas registradas';
  panel.querySelector('#airGeoVisibleToggle').checked=AIR_GEO_VISIBLE;
  panel.querySelector('#airGeoVisibleToggle').onchange=e=>{AIR_GEO_VISIBLE=e.target.checked;airGeoRefresh()};
  panel.querySelector('#airGeoClosePanel').onclick=()=>panel.remove();
  const list=panel.querySelector('#airGeoManageList');
  const draw=()=>{const q=(panel.querySelector('#airGeoSearch').value||'').toLocaleLowerCase();list.replaceChildren();areas.filter(g=>String(g.nombre||'').toLocaleLowerCase().includes(q)).slice(0,150).forEach(g=>{const d=document.createElement('div');d.style.cssText='padding:8px;border-bottom:1px solid #e2e8f0';d.textContent=g.nombre||'Geocerca';list.appendChild(d)});};
  panel.querySelector('#airGeoSearch').oninput=draw;draw();
  panel.querySelector('#airGeoOpenAdmin').onclick=()=>{panel.remove();const tab=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(b=>(b.getAttribute('onclick')||'').includes("ccTab('mapa'"));if(tab&&typeof window.ccTab==='function')window.ccTab('mapa',tab);else alert('Abre Control de Cajas → Mapa de Cajas → Geocercas para crear o importar zonas.');};
}
let RENT_OPEN=false, RENT_CACHE=null, RENT_LOADING=false, AIR_MAP_OPEN=false, AIR_MAP_INSTANCE=null, AIR_MAP_LAYER=null, AIR_MAP_BASE=null, AIR_MAP_MODE='MAPA', AIR_MAP_LOCKED=true, AIR_MAP_SELECTED_KEY=null, AIR_MAP_SEARCH='';
const AIR_MAP_MARKERS=new Map();
const normClient=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
async function ensureAirportLeaflet(){
  if(window.ccEnsureLeaflet){await window.ccEnsureLeaflet();return}
  if(window.L)return;
  await new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-air-leaflet]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.airLeaflet='1';document.head.appendChild(l);
    }
    const existing=[...document.scripts].find(s=>s.src.includes('leaflet@1.9.4'));
    if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
}
function airportMapRows(){
  const all=!selectedClient()&&$('airMapShowAll')?.checked&&(window.ccPerm?.('pantalla_aeropuerto.ver_todas_unidades')===true);
  return (all?LAST:filtered()).filter(x=>Number.isFinite(Number(x.latitud))&&Number.isFinite(Number(x.longitud)));
}
function syncAirportAllControl(){const wrap=$('airMapShowAllWrap');if(!wrap)return;const allowed=!selectedClient()&&window.ccPerm?.('pantalla_aeropuerto.ver_todas_unidades')===true;wrap.style.display=allowed?'inline-flex':'none';if(!allowed&&$('airMapShowAll'))$('airMapShowAll').checked=false}
function airportBaseLayer(mode){
  const satUrl='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const streetUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  return L.tileLayer(mode==='SATELITE'?satUrl:streetUrl,{
    maxZoom:19,
    maxNativeZoom:19,
    attribution:mode==='SATELITE'?'Tiles &copy; Esri':'&copy; OpenStreetMap contributors'
  });
}
function syncAirportMapControls(){
  $('airMapSatellite')?.classList.toggle('on',AIR_MAP_MODE==='SATELITE');
  $('airMapStreet')?.classList.toggle('on',AIR_MAP_MODE==='MAPA');
  const lock=$('airMapLock');
  if(lock){
    lock.classList.toggle('on',AIR_MAP_LOCKED);
    lock.innerHTML=AIR_MAP_LOCKED
      ?'<i class="fa-solid fa-lock"></i> Vista fija'
      :'<i class="fa-solid fa-lock-open"></i> Autoencuadre';
  }
}
function switchAirportMapMode(mode){
  AIR_MAP_MODE=mode==='MAPA'?'MAPA':'SATELITE';
  syncAirportMapControls();
  if(!AIR_MAP_INSTANCE||!window.L)return;
  try{
    if(AIR_MAP_BASE&&AIR_MAP_INSTANCE.hasLayer(AIR_MAP_BASE))AIR_MAP_INSTANCE.removeLayer(AIR_MAP_BASE);
    AIR_MAP_BASE=airportBaseLayer(AIR_MAP_MODE).addTo(AIR_MAP_INSTANCE);
    AIR_MAP_BASE.bringToBack?.();
  }catch(e){console.warn('AIR_MAP_LAYER_SWITCH',e)}
}
function toggleAirportMapLock(){
  AIR_MAP_LOCKED=!AIR_MAP_LOCKED;
  syncAirportMapControls();
  if(!AIR_MAP_LOCKED&&AIR_MAP_OPEN)renderAirportMap({refit:true});
}
const AIR_CLIENT_COLORS=['#2563eb','#dc2626','#7c3aed','#ea580c','#0891b2','#16a34a','#c026d3','#0f766e','#ca8a04','#475569'];
function airportClientColorMap(rows){
  const clients=[...new Set(rows.map(x=>String(x.cliente||'Sin cliente').trim()||'Sin cliente'))].sort((a,b)=>a.localeCompare(b,'es'));
  const map=new Map();
  if(clients.length<=1){if(clients[0])map.set(clients[0],'#2563eb');return map}
  clients.forEach((c,i)=>map.set(c,AIR_CLIENT_COLORS[i%AIR_CLIENT_COLORS.length]));
  return map;
}
function renderAirportClientLegend(rows,colorMap){
  const el=$('airClientLegend');if(!el)return;
  const clients=[...colorMap.keys()];
  if(!clients.length){el.innerHTML='';el.style.display='none';return}
  el.style.display='flex';
  el.innerHTML=clients.map(c=>'<span class="airClientLegendItem"><span class="airClientLegendDot" style="background:'+esc(colorMap.get(c))+'"></span>'+esc(c)+'</span>').join('');
}
function airportMarkerHtml(x,clientColor){
  const hasTrip=!!String(x.numeroViaje||'').trim();
  const trailer=String(x.remolque||'').trim();
  const operator=String(x.operador||'').trim();
  const noClientSelected=!selectedClient();
  const operatorText=operator||(noClientSelected?'Sin servicio activo':'Sin operador');
  const operatorClass=!operator&&noClientSelected?' airNoService':'';
  const bubble='<div class="airVehicleInfoBubble">'
      +'<div class="airBubbleRow"><span class="airBubbleLabel">Operador</span><span class="airBubbleValue'+operatorClass+'">'+esc(operatorText)+'</span></div>'
      +'<div class="airBubbleRow"><span class="airBubbleLabel">Cliente</span><span class="airBubbleValue airBubbleClient">'+esc(x.cliente||'Sin cliente')+'</span></div>'
      +'<div class="airBubbleRow"><span class="airBubbleLabel">Destino</span><span class="airBubbleValue">'+esc(x.destino||'Sin destino')+'</span></div>'
      +'</div>';
  const tractor='<span class="airRigSimple"><span class="airTractorIcon"><i class="fa-solid fa-truck-front"></i></span><span class="airUnitNo">'+esc(x.unidad||'—')+'</span></span>';
  const trailerHtml=trailer
      ?'<span class="airTrailerIconWrap"><i class="fa-solid fa-trailer"></i><span class="airTrailerNo">'+esc(trailer)+'</span></span>'
      :'';
  const tripDot='<span class="'+(hasTrip?'tripBadge':'noTripBadge')+'"></span>';
  return '<div class="airVehicleMarker" style="--client-color:'+esc(clientColor||'#2563eb')+'">'+bubble+tripDot+tractor+trailerHtml+'</div>';
}
function airportPopupHtml(x){
  const hasTrip=!!String(x.numeroViaje||'').trim();
  return '<div style="min-width:180px"><b>'+esc(x.unidad||'—')+'</b>'
    +(x.remolque?'<br>Remolque: <b>'+esc(x.remolque)+'</b>':'')
    +'<br>'+esc(x.cliente||'Sin cliente')
    +'<br>'+esc(x.ubicacion||x.ubicacionErp||'Sin ubicación')
    +(hasTrip?'<br>Viaje: '+esc(x.numeroViaje):'<br>Sin número de viaje')
    +'<br><span style="font-size:10px;color:#64748b">GPS: '+esc(fmt(x.gpsAt))+'</span></div>';
}
function airportMapKey(x){
  const lat=Number(x.latitud),lng=Number(x.longitud);
  return String(x.id||x.unidad||x.placa||lat+','+lng);
}
function renderAirportSidebar(rows,colorMap){
  const list=$('airFleetSideList'),count=$('airFleetSideCount'),detail=$('airFleetDetail');
  if(!list)return;
  const q=String(AIR_MAP_SEARCH||'').trim().toLowerCase();
  const shown=rows.filter(x=>{
    if(!q)return true;
    return [x.unidad,x.operador,x.cliente,x.destino,x.numeroViaje,x.remolque].some(v=>String(v||'').toLowerCase().includes(q));
  });
  if(count)count.textContent=shown.length;
  list.innerHTML=shown.length?shown.map(x=>{
    const key=airportMapKey(x),hasTrip=!!String(x.numeroViaje||'').trim(),color=colorMap.get(String(x.cliente||'Sin cliente').trim()||'Sin cliente')||'#2563eb';
    return '<button type="button" class="airFleetSideItem '+(AIR_MAP_SELECTED_KEY===key?'on':'')+'" data-air-unit-key="'+esc(key)+'" style="--client-color:'+esc(color)+'">'
      +'<div class="airFleetSideTop"><span class="airFleetClientDot"></span><span class="airFleetUnitNo">'+esc(x.unidad||'—')+(String(x.remolque||'').trim()?' <span style="font-weight:800;color:#64748b">· Rem. '+esc(x.remolque)+'</span>':'')+'</span><span class="airFleetTripFlag '+(hasTrip?'':'off')+'">'+(hasTrip?'VIAJE':'SIN VIAJE')+'</span></div>'
      +'<div class="airFleetSideMeta">'+esc(x.operador||'Sin servicio activo')+'</div>'
      +'<div class="airFleetSideMeta">'+esc(x.cliente||'Sin cliente')+' · '+esc(x.destino||'Sin destino')+'</div>'
      +'</button>';
  }).join(''):'<div class="airFleetDetailEmpty">No hay unidades que coincidan con la búsqueda.</div>';
  list.querySelectorAll('[data-air-unit-key]').forEach(b=>b.onclick=()=>selectAirportUnit(b.dataset.airUnitKey,true));
  const selected=rows.find(x=>airportMapKey(x)===AIR_MAP_SELECTED_KEY);
  if(!selected){
    if(AIR_MAP_SELECTED_KEY)AIR_MAP_SELECTED_KEY=null;
    if(detail)detail.innerHTML='<div class="airFleetDetailEmpty">Selecciona una unidad para ver el detalle operativo.</div>';
    return;
  }
  renderAirportUnitDetail(selected,colorMap);
}
function renderAirportUnitDetail(x,colorMap){
  const detail=$('airFleetDetail');if(!detail)return;
  const color=colorMap.get(String(x.cliente||'Sin cliente').trim()||'Sin cliente')||'#2563eb';
  const hasTrip=!!String(x.numeroViaje||'').trim();
  detail.innerHTML='<div style="--client-color:'+esc(color)+'">'
    +'<div class="airFleetDetailHead"><div><div class="airFleetDetailUnit">'+esc(x.unidad||'—')+'</div><div class="airFleetDetailClient">'+esc(x.cliente||'Sin cliente')+'</div></div><button type="button" id="airFleetDetailClose" class="airFleetDetailClose"><i class="fa-solid fa-xmark"></i></button></div>'
    +'<div class="airFleetDetailGrid">'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">Operador</div><div class="airFleetDetailValue">'+esc(x.operador||'Sin servicio activo')+'</div></div>'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">Estatus</div><div class="airFleetDetailValue">'+esc(x.estatusViaje||'Sin estatus')+'</div></div>'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">Viaje</div><div class="airFleetDetailValue">'+esc(hasTrip?x.numeroViaje:'Sin viaje activo')+'</div></div>'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">Velocidad</div><div class="airFleetDetailValue">'+esc(Number.isFinite(Number(x.velocidadKmh))?Number(x.velocidadKmh)+' km/h':'—')+'</div></div>'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">Remolque</div><div class="airFleetDetailValue">'+esc(x.remolque||'Sin remolque')+'</div></div>'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">Placa unidad</div><div class="airFleetDetailValue">'+esc(x.placa||'—')+'</div></div>'
    +'<div class="airFleetDetailCard wide"><div class="airFleetDetailLabel">Origen</div><div class="airFleetDetailValue">'+esc(x.origen||'—')+'</div></div>'
    +'<div class="airFleetDetailCard wide"><div class="airFleetDetailLabel">Destino</div><div class="airFleetDetailValue">'+esc(x.destino||'—')+'</div></div>'
    +'<div class="airFleetDetailCard wide"><div class="airFleetDetailLabel">Ubicación actual</div><div class="airFleetDetailValue">'+esc(x.ubicacion||x.ubicacionErp||'Sin ubicación')+'</div></div>'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">GPS</div><div class="airFleetDetailValue">'+esc(fmt(x.gpsAt))+'</div></div>'
    +'<div class="airFleetDetailCard"><div class="airFleetDetailLabel">ETA</div><div class="airFleetDetailValue">'+esc(fmt(x.eta))+'</div></div>'
    +'</div></div>';
  $('airFleetDetailClose')?.addEventListener('click',()=>{AIR_MAP_SELECTED_KEY=null;renderAirportMap({refit:false})});
}
function selectAirportUnit(key,moveMap){
  AIR_MAP_SELECTED_KEY=key;
  const rows=airportMapRows(),x=rows.find(v=>airportMapKey(v)===key);
  if(moveMap&&x&&AIR_MAP_INSTANCE){
    const lat=Number(x.latitud),lng=Number(x.longitud);
    if(Number.isFinite(lat)&&Number.isFinite(lng)){
      AIR_MAP_INSTANCE.setView([lat,lng],Math.max(AIR_MAP_INSTANCE.getZoom(),14),{animate:true});
      const mk=AIR_MAP_MARKERS.get(key);mk?.openPopup?.();
    }
  }
  renderAirportMap({refit:false});
}
async function renderAirportMap(opts={}){
  if(!AIR_MAP_OPEN)return;
  const el=$('airFleetMapCanvas'),meta=$('airFleetMapMeta');if(!el)return;
  try{
    await ensureAirportLeaflet();
    const rows=airportMapRows();
    const clientColors=airportClientColorMap(rows);
    renderAirportClientLegend(rows,clientColors);
    renderAirportSidebar(rows,clientColors);
    if(meta)meta.textContent=rows.length+' unidades con ubicación · '+clientColors.size+' cliente'+(clientColors.size===1?'':'s');

    const isNew=!AIR_MAP_INSTANCE;
    let savedCenter=null,savedZoom=null;
    if(AIR_MAP_INSTANCE){
      try{savedCenter=AIR_MAP_INSTANCE.getCenter();savedZoom=AIR_MAP_INSTANCE.getZoom()}catch(_){}
    }else{
      el.innerHTML='';
      AIR_MAP_INSTANCE=L.map(el,{preferCanvas:true,zoomControl:true}).setView([29.0729,-110.9559],6);
      AIR_MAP_BASE=airportBaseLayer(AIR_MAP_MODE).addTo(AIR_MAP_INSTANCE);
      AIR_MAP_LAYER=L.layerGroup().addTo(AIR_MAP_INSTANCE);
      airGeoRefresh();
    }

    const activeKeys=new Set();
    const bounds=[];
    rows.forEach(x=>{
      const lat=Number(x.latitud),lng=Number(x.longitud);
      const key=airportMapKey(x);
      activeKeys.add(key);
      bounds.push([lat,lng]);
      const hasTrip=!!String(x.numeroViaje||'').trim();
      const icon=L.divIcon({
        className:'',
        html:airportMarkerHtml(x,clientColors.get(String(x.cliente||'Sin cliente').trim()||'Sin cliente')),
        iconSize:null,
        iconAnchor:[28,15]
      });
      let mk=AIR_MAP_MARKERS.get(key);
      if(mk){
        mk.setLatLng([lat,lng]);
        mk.setIcon(icon);
        mk.setPopupContent(airportPopupHtml(x));
      }else{
        mk=L.marker([lat,lng],{icon}).addTo(AIR_MAP_LAYER);
        mk.bindPopup(airportPopupHtml(x));
        mk.on('click',()=>selectAirportUnit(key,false));
        AIR_MAP_MARKERS.set(key,mk);
      }
    });

    for(const [key,mk] of [...AIR_MAP_MARKERS.entries()]){
      if(!activeKeys.has(key)){
        try{AIR_MAP_LAYER.removeLayer(mk)}catch(_){}
        AIR_MAP_MARKERS.delete(key);
      }
    }

    const shouldFit=isNew||opts.refit===true||(!AIR_MAP_LOCKED&&opts.refresh===true);
    if(shouldFit&&bounds.length){
      AIR_MAP_INSTANCE.fitBounds(bounds,{padding:[45,45],maxZoom:15});
    }else if(AIR_MAP_LOCKED&&savedCenter&&Number.isFinite(savedZoom)){
      AIR_MAP_INSTANCE.setView(savedCenter,savedZoom,{animate:false});
    }

    syncAirportMapControls();
    setTimeout(()=>AIR_MAP_INSTANCE?.invalidateSize(),80);
  }catch(e){
    el.innerHTML='<div class="airRentEmpty">No fue posible cargar el mapa: '+esc(e.message||e)+'</div>';
  }
}
async function toggleAirportMapFullscreen(){
  const panel=$('airFleetMapPanel');if(!panel)return;
  try{
    if(document.fullscreenElement===panel) await document.exitFullscreen();
    else await panel.requestFullscreen?.();
  }catch(e){console.warn('AIR_MAP_FULLSCREEN',e)}
}
function syncAirportMapFullscreenButton(){
  const b=$('airFleetMapFullscreen');if(!b)return;
  b.innerHTML=document.fullscreenElement===$('airFleetMapPanel')
    ?'<i class="fa-solid fa-compress"></i> Salir de pantalla completa'
    :'<i class="fa-solid fa-expand"></i> Pantalla completa';
  setTimeout(()=>AIR_MAP_INSTANCE?.invalidateSize(),80);
}
function toggleAirportMap(){
  if(AIR_EXTERNAL&&!window.CC_MIRROR_PERMISSIONS?.mapa_unidades)return;
  AIR_MAP_OPEN=!AIR_MAP_OPEN;
  const panel=$('airFleetMapPanel'),btn=$('airMapToggle');
  panel?.classList.toggle('on',AIR_MAP_OPEN);btn?.classList.toggle('on',AIR_MAP_OPEN);
  if(btn)btn.innerHTML=AIR_MAP_OPEN?'<i class="fa-solid fa-map"></i> Ocultar mapa':'<i class="fa-solid fa-map-location-dot"></i> Mapa de unidades';
  if(AIR_MAP_OPEN){syncAirportAllControl();renderAirportMap({refit:true});}
  else if(AIR_MAP_INSTANCE){try{AIR_MAP_INSTANCE.remove()}catch(_){} AIR_MAP_INSTANCE=null;AIR_MAP_LAYER=null;AIR_MAP_BASE=null;AIR_MAP_MARKERS.clear();AIR_MAP_SELECTED_KEY=null;AIR_MAP_SEARCH=''}
}
async function loadRentals(){
 if(!RENT_OPEN||RENT_LOADING)return;

 if(RENT_MAP_INSTANCE){try{RENT_MAP_INSTANCE.remove()}catch(_){}RENT_MAP_INSTANCE=null}
 const client=selectedClient(),panel=$('airRentPanel');
 if(!panel)return;
 if(!client){panel.innerHTML='<div class="airRentFullHead"><div><strong>Cajas de renta</strong><span>Vista completa por cliente</span></div><div class="airRentFullActions"><button class="airRentFullBtn airRentBack" id="airRentBack"><i class="fa-solid fa-arrow-left"></i> Regresar</button><button class="airRentFullBtn" id="airRentClose"><i class="fa-solid fa-xmark"></i> Cerrar</button></div></div><div class="airRentBody"><div class="airRentEmpty">Selecciona un cliente en Pantalla Aeropuerto para visualizar sus cajas en renta.</div></div>';$('airRentBack')?.addEventListener('click',async()=>{const p=$('airRentPanel');if(document.fullscreenElement===p){try{await document.exitFullscreen()}catch(_){}}if(RENT_OPEN)toggleRentals()});$('airRentClose')?.addEventListener('click',async()=>{const p=$('airRentPanel');if(document.fullscreenElement===p){try{await document.exitFullscreen()}catch(_){}}if(RENT_OPEN)toggleRentals()});return}
 RENT_LOADING=true;panel.innerHTML='<div class="airRentFullHead"><div><strong>Cajas de renta</strong><span>'+esc(client)+' · rentas activas y última ubicación QR</span></div><div class="airRentFullActions"><button class="airRentFullBtn airRentBack" id="airRentBack"><i class="fa-solid fa-arrow-left"></i> Regresar</button><button class="airRentFullBtn" id="airRentFullscreen"><i class="fa-solid fa-expand"></i> Pantalla completa</button><button class="airRentFullBtn" id="airRentClose"><i class="fa-solid fa-xmark"></i> Cerrar</button></div></div><div class="airRentBody"><div class="airRentEmpty">Consultando rentas y últimos escaneos…</div></div>';$('airRentBack')?.addEventListener('click',async()=>{const p=$('airRentPanel');if(document.fullscreenElement===p){try{await document.exitFullscreen()}catch(_){}}if(RENT_OPEN)toggleRentals()});$('airRentClose')?.addEventListener('click',async()=>{const p=$('airRentPanel');if(document.fullscreenElement===p){try{await document.exitFullscreen()}catch(_){}}if(RENT_OPEN)toggleRentals()});$('airRentFullscreen')?.addEventListener('click',async()=>{try{if(document.fullscreenElement===panel)await document.exitFullscreen();else await panel.requestFullscreen?.()}catch(_){}});
 try{
  const db=sb();if(!db)throw Error('Sin conexión con Supabase');
  let data,error;
  if(AIR_EXTERNAL){
   const r=await db.functions.invoke('cc-mirror-airport',{body:{}});
   error=r.error;
   if(!error&&r.data?.ok){
    if(!r.data.permissions?.cajas_renta)throw Error('Esta cuenta no tiene habilitado el permiso Cajas en renta.');
    data={ok:true,match:'EXACT',cajas:(Array.isArray(r.data.rentals)?r.data.rentals:[]).map(x=>({
      numero:x.caja,descripcion:x.descripcion,fechaHora:x.ubicacionAt,placasMx:x.placas,placasUsa:'',
      latitud:x.latitud,longitud:x.longitud
    }))};
   }else if(!error)throw Error(r.data?.error||'Cuenta no autorizada');
  }else{const r=await db.rpc('cc_airport_rental_boxes',{p_cliente_nombre:client});data=r.data;error=r.error;}
  if(error)throw error;
  if(!data?.ok)throw Error(data?.error||'No fue posible consultar las cajas de renta');
  if(data.match==='NONE'){panel.innerHTML='<div class="airRentEmpty">No se encontró una equivalencia exacta del cliente en el catálogo.</div>';return}
  if(data.match==='AMBIGUOUS'){panel.innerHTML='<div class="airRentEmpty">El nombre del cliente coincide con más de un registro. Revisa el catálogo de clientes.</div>';return}
  const units=Array.isArray(data.cajas)?data.cajas:[];
  if(!units.length){panel.innerHTML='<div class="airRentBody"><div class="airRentEmpty">Este cliente no tiene cajas con renta activa.</div></div>';return}
  const located=units.filter(x=>Number.isFinite(Number(x.latitud))&&Number.isFinite(Number(x.longitud)));
  panel.innerHTML='<div class="airRentFullHead"><div><strong>Cajas de renta · '+esc(client)+'</strong><span>Rentas activas y última ubicación registrada por QR</span></div><div class="airRentFullActions"><button class="airRentFullBtn airRentBack" id="airRentBack"><i class="fa-solid fa-arrow-left"></i> Regresar</button><button class="airRentFullBtn" id="airRentFullscreen"><i class="fa-solid fa-expand"></i> Pantalla completa</button><button class="airRentFullBtn" id="airRentClose"><i class="fa-solid fa-xmark"></i> Cerrar</button></div></div><div class="airRentBody"><div class="airRentStats"><span><b>'+units.length+'</b>Cajas activas</span><span><b>'+located.length+'</b>Con ubicación QR</span><span><b>'+(units.length-located.length)+'</b>Sin ubicación</span><span><b>'+Math.round((located.length/Math.max(1,units.length))*100)+'%</b>Cobertura de ubicación</span></div><div class="airRentContentGrid"><div class="airRentMap" id="airRentMap"></div><div class="airRentItems">'+units.map(x=>'<div class="airRentItem"><strong>'+esc(x.numero||'—')+'</strong><div class="airRentItemMeta">'+esc(x.descripcion||'Caja')+'<br>'+(x.fechaHora?'Último escaneo: '+esc(fmt(x.fechaHora)):'Sin escaneo registrado')+'</div><div><span class="airRentPlate">MX '+esc(x.placasMx||'—')+'</span> <span class="airRentPlate">USA '+esc(x.placasUsa||'—')+'</span></div>'+(Number.isFinite(Number(x.latitud))&&Number.isFinite(Number(x.longitud))?'<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+encodeURIComponent(x.latitud)+'&mlon='+encodeURIComponent(x.longitud)+'#map=15/'+encodeURIComponent(x.latitud)+'/'+encodeURIComponent(x.longitud)+'">Ver ubicación ↗</a>':'<span class="airRentItemMeta">Sin ubicación</span>')+'</div>').join('')+'</div></div></div>';$('airRentBack')?.addEventListener('click',async()=>{const p=$('airRentPanel');if(document.fullscreenElement===p){try{await document.exitFullscreen()}catch(_){}}if(RENT_OPEN)toggleRentals()});$('airRentClose')?.addEventListener('click',async()=>{const p=$('airRentPanel');if(document.fullscreenElement===p){try{await document.exitFullscreen()}catch(_){}}if(RENT_OPEN)toggleRentals()});$('airRentFullscreen')?.addEventListener('click',async()=>{try{if(document.fullscreenElement===panel)await document.exitFullscreen();else await panel.requestFullscreen?.()}catch(_){}});
  const map=$('airRentMap');
  if(located.length){
    const la=located.reduce((a,x)=>a+Number(x.latitud),0)/located.length;
    const lo=located.reduce((a,x)=>a+Number(x.longitud),0)/located.length;
    map.innerHTML='<div id="airRentLeaflet" style="height:620px;width:100%;position:relative" role="application" aria-label="Mapa satelital de cajas en renta"></div><small>Vista satelital · cada semirremolque muestra el último escaneo QR. No es GPS en vivo.</small>';
    try{
      await ensureAirportLeaflet();
      if(!RENT_OPEN||!$('airRentLeaflet'))return;
      if(RENT_MAP_INSTANCE){RENT_MAP_INSTANCE.remove();RENT_MAP_INSTANCE=null}
      RENT_MAP_INSTANCE=L.map('airRentLeaflet',{zoomControl:true,scrollWheelZoom:false}).setView([la,lo],12);
      airportBaseLayer('MAPA').addTo(RENT_MAP_INSTANCE);
      const bounds=[];
      located.forEach(x=>{
        const lat=Number(x.latitud),lng=Number(x.longitud);
        if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
        bounds.push([lat,lng]);
        const icon=L.divIcon({
          className:'airRentTrailerMarker',
          html:'<div class="airRentTrailerGlyph"><svg viewBox="0 0 32 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="1.5" y="3" width="27" height="10" rx="1" fill="#f8fafc" stroke="#263c51" stroke-width="1.5"/><path d="M5 6h20" stroke="#94a3b8" stroke-width=".8"/><path d="M4 13v2h3m16-2v2h3" fill="none" stroke="#475569" stroke-width="1.5"/><circle cx="7" cy="16" r="1.7" fill="#263c51"/><circle cx="24" cy="16" r="1.7" fill="#263c51"/></svg><span>'+esc(x.numero||'Caja')+'</span></div>',
          iconSize:[78,52],iconAnchor:[39,46],popupAnchor:[0,-38]
        });
        L.marker([lat,lng],{icon,title:String(x.numero||'Semirremolque')}).addTo(RENT_MAP_INSTANCE).bindPopup('<strong>Semirremolque '+esc(x.numero||'—')+'</strong><br>'+esc(x.descripcion||'Caja en renta')+'<br>Último escaneo QR: '+esc(x.fechaHora?fmt(x.fechaHora):'Sin fecha'));
      });
      if(bounds.length>1)RENT_MAP_INSTANCE.fitBounds(bounds,{padding:[45,45],maxZoom:16});
      requestAnimationFrame(()=>RENT_MAP_INSTANCE?.invalidateSize());
    }catch(e){map.innerHTML='<div class="airRentEmpty">No se pudo cargar el mapa satelital. '+esc(e.message||e)+'</div>'}
  }else map.innerHTML='<div class="airRentEmpty">No hay ubicaciones QR registradas para estas cajas.</div>';
 }catch(e){const body=panel.querySelector('.airRentBody');if(body)body.innerHTML='<div class="airRentEmpty">No fue posible consultar las rentas: '+esc(e.message||e)+'</div>';else panel.innerHTML='<div class="airRentEmpty">No fue posible consultar las rentas: '+esc(e.message||e)+'</div>'}finally{RENT_LOADING=false}
}
function toggleRentals(){if(AIR_EXTERNAL&&!window.CC_MIRROR_PERMISSIONS?.cajas_renta)return;if(RENT_MAP_INSTANCE){try{RENT_MAP_INSTANCE.remove()}catch(_){}RENT_MAP_INSTANCE=null}RENT_OPEN=!RENT_OPEN;const panel=$('airRentPanel'),b=$('airRentToggle');panel?.classList.toggle('on',RENT_OPEN);if(b){b.classList.toggle('on',RENT_OPEN);b.innerHTML='<i class="fa-solid fa-boxes-stacked"></i> Cajas de renta';b.setAttribute('aria-expanded',String(RENT_OPEN))}if(RENT_OPEN)loadRentals();else if(document.fullscreenElement===panel)document.exitFullscreen?.()}

async function showAirportDemoras(){
 if(!airIsSuperAdmin())return;
 const modal=$('airDemorasModal'),body=$('airDemorasBody');
 if(!modal||!body)return;
 modal.style.display='flex';
 body.innerHTML='<p>Consultando demoras en Supabase…</p>';
 try{
  const desde=$('airDemorasFrom').value||null,hasta=$('airDemorasTo').value||null;
  if(desde&&hasta&&desde>hasta)throw Error('El rango de fechas es incorrecto');
  const {data,error}=await sb().rpc('gm_superadmin_demoras',{p_desde:desde,p_hasta:hasta});
  if(error)throw error;
  const search=String($('airDemorasViaje')?.value||'').trim().toLocaleLowerCase('es-MX');
  const rows=(Array.isArray(data)?data:[]).filter(x=>!search||String(x.viaje||'').toLocaleLowerCase('es-MX').includes(search));
  const pretty=d=>d?new Date(d).toLocaleString('es-MX',{timeZone:'America/Hermosillo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
  const duration=s=>{const m=Math.max(0,Math.floor(Number(s||0)/60));return Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min'};
  body.innerHTML='<p style="margin:0 0 12px;color:#64748b;font-size:12px">Llegada: primera detección de EN SITIO ORIGEN. Salida: evento confirmado en la geocerca de origen. Los tiempos en curso son provisionales.</p>'+
   (rows.length?'<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;background:white;font-size:12px"><thead><tr>'+['Viaje','Unidad','Operador','Remolque','Cliente','Llegada','Salida origen','Tiempo en origen','Estado'].map(x=>'<th style="padding:10px;text-align:left;border-bottom:2px solid #dbe3ea;white-space:nowrap">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(x=>'<tr>'+[x.viaje,x.unidad,x.operador||'—',x.remolque||'—',x.cliente||'—',pretty(x.llegada),pretty(x.salida||x.finalizada),duration(x.segundos),x.finalizada?'Finalizado'+(x.salida?'':' · Sin salida confirmada'):x.salida?'Salida confirmada':'En seguimiento'].map(v=>'<td style="padding:10px;border-bottom:1px solid #edf2f7;white-space:nowrap">'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<p>No se encontraron demoras con los filtros indicados.</p>');
 }catch(e){body.innerHTML='<p style="color:#b91c1c">'+esc(e.message||e)+'</p>'}
}
function airIsSuperAdmin(){return window.CC_ACCESS?.superAdmin===true}
async function showAirportHistory(){
 if(!airIsSuperAdmin())return;
 const modal=$('airHistoryModal'),body=$('airHistoryBody');if(!modal||!body)return;
 modal.style.display='flex';body.innerHTML='<p style="padding:16px">Cargando historial guardado en Supabase…</p>';
 try{
  const desde=$('airHistoryFrom')?.value||null,hasta=$('airHistoryTo')?.value||null;if(desde&&hasta&&desde>hasta)throw Error('La fecha inicial no puede ser posterior a la final');
  const {data,error}=await sb().rpc('gm_superadmin_history',{p_limit:500,p_desde:desde,p_hasta:hasta});
  if(error)throw error;
  const trips=Array.isArray(data)?data:[];
  body.innerHTML='<p style="color:#64748b;font-size:12px">Historial permanente guardado automáticamente en Supabase. Se registran los eventos de geocercas cuando GM los devuelve.</p>'+(trips.length?trips.map(x=>{
    const geos=Array.isArray(x.geocercas)?x.geocercas:[];
    const changes=Array.isArray(x.cambios)?x.cambios:[];
    return '<details style="background:white;border:1px solid #dbe3ea;border-radius:12px;padding:12px;margin:8px 0"><summary style="cursor:pointer;font-weight:900">'+esc(x.unidad||'Unidad')+' · Viaje '+esc(x.numero_viaje)+' · '+esc(x.cliente||'Sin cliente')+(x.ended_at?' · Finalizado':' · En seguimiento')+'</summary><div style="padding:10px 0;font-size:12px;line-height:1.8"><b>Operador:</b> '+esc(x.operador||'—')+' · <b>Estado:</b> '+esc(x.estatus||'—')+'<br><b>Ruta:</b> '+esc(x.origen||'—')+' → '+esc(x.destino||'—')+'<br><b>Salida:</b> '+esc(fmt(x.salida))+' · <b>ETA:</b> '+esc(fmt(x.eta))+' · <b>Remolque:</b> '+esc(x.remolque||'—')+'<br><b>Llegada (salida GM):</b> '+esc(fmt(airportGmStart(x)))+' · <b>Primera detección:</b> '+esc(fmt(x.first_seen))+' · <b>Última lectura:</b> '+esc(fmt(x.last_seen))+'<br><b>Duración del servicio:</b> '+esc(airportElapsed(airportGmStart(x),x.ended_at))+'<h4>Geocercas ('+geos.length+')</h4>'+(geos.length?geos.map(g=>'<div style="border-left:3px solid #2563eb;padding:6px 10px;margin:5px 0;background:#f8fafc"><b>'+esc(g.geocerca||'Geocerca')+'</b> · '+esc(g.evento||'Evento')+'<br>'+esc(g.fechaHora||'Sin hora')+'</div>').join(''):'Todavía no hay eventos de geocercas para este viaje.')+'<h4>Cambios de viaje ('+changes.length+')</h4>'+changes.map(ev=>'<div style="border-left:3px solid #64748b;padding:5px 10px;margin:4px 0"><b>'+esc(ev.evento||'Cambio')+'</b> · '+esc(fmt(ev.fechaHora))+'<br>'+esc(ev.anterior||'')+(ev.anterior?' → ':'')+esc(ev.nuevo||'')+'</div>').join('')+'</div></details>';
  }).join(''):'No hay viajes históricos registrados.');
 }catch(e){body.innerHTML='<p style="padding:16px;color:#b91c1c">No fue posible consultar el historial: '+esc(e.message||e)+'</p>'}
}
function totalPages(){return Math.max(1,Math.ceil(filtered().length/PAGE_SIZE))}
function setPage(p){PAGE=Math.min(Math.max(1,p),totalPages());render({pageOnly:true})}
function stopAutoPaging(){clearInterval(AUTO_TIMER);AUTO_TIMER=null}
function syncAutoPaging(){
 stopAutoPaging();
 if((!AIR_EXTERNAL&&document.fullscreenElement!==$('ccPantallaAeropuertoMount'))||document.hidden||!$('ccPanelPantallaAeropuerto')?.classList.contains('active')||totalPages()<2||(AIR_EXTERNAL&&AUTO_SECONDS===0))return;
 AUTO_TIMER=setInterval(()=>{
  if((!AIR_EXTERNAL&&document.fullscreenElement!==$('ccPantallaAeropuertoMount'))||document.hidden||!$('ccPanelPantallaAeropuerto')?.classList.contains('active')){stopAutoPaging();return}
  const pages=totalPages();if(pages>1)setPage(PAGE>=pages?1:PAGE+1);
 },AUTO_SECONDS*1000);
}
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
let AIR_TRIP_CLOCKS=new Map();
function tripClockKey(x){return String(x.unidad||'')+'|'+String(x.identificadorViaje||x.numeroViaje||'')}
function airportGmStart(row){const v=String(row?.salida||'');return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)?v+'Z':row?.first_seen}
function airportElapsed(first,end){
 if(!first)return 'Pendiente';
 const elapsed=Math.max(0,Math.floor((new Date(end||Date.now()).getTime()-new Date(first).getTime())/60000));
 if(!Number.isFinite(elapsed))return '—';
 return Math.floor(elapsed/60)+' h '+String(elapsed%60).padStart(2,'0')+' min';
}
async function loadTripClocks(){
 if(AIR_EXTERNAL)return;
 try{
 const {data,error}=await sb().rpc('gm_trip_clock_snapshot');
 if(error)throw error;
 AIR_TRIP_CLOCKS=new Map((Array.isArray(data)?data:[]).map(v=>[String(v.unidad||'')+'|'+String(v.identificadorViaje||v.numeroViaje||''),v]));
 }catch(e){console.warn('GM_TRIP_CLOCK',e)}
}
function render(opts={}){
  const box=$('airList');if(!box)return;
  const root=document.querySelector('#ccPantallaAeropuertoMount .air');root?.classList.toggle('v2',VIEW==='v2');
  $('airActualBtn')?.classList.toggle('on',VIEW==='actual');$('airV2Btn')?.classList.toggle('on',VIEW==='v2');
  const prev=readPrev(),all=filtered(),pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));if(PAGE>pages)PAGE=pages;const start=(PAGE-1)*PAGE_SIZE,arr=all.slice(start,start+PAGE_SIZE);$('airVisibleCount').textContent=all.length+' servicios';
  if($('airV2Kpis')){const active=arr.filter(x=>/TRANS|RUTA|ACTIVO|CURSO/i.test(String(x.estatusViaje||''))).length,delay=arr.filter(x=>/DEMOR|ESPER/i.test(String(x.estatusViaje||''))).length,withGps=arr.filter(x=>Number.isFinite(Number(x.latitud))&&Number.isFinite(Number(x.longitud))).length;$('airV2Kpis').style.display=VIEW==='v2'?'grid':'none';$('airV2Kpis').innerHTML='<div class="airV2Kpi"><b>'+arr.length+'</b><span>Operaciones visibles</span></div><div class="airV2Kpi"><b>'+active+'</b><span>En ruta / activas</span></div><div class="airV2Kpi"><b>'+withGps+'</b><span>Con GPS</span></div><div class="airV2Kpi"><b>'+delay+'</b><span>Alertas / demora</span></div>'}
  box.innerHTML=arr.length?arr.map(x=>{const idx=LAST.indexOf(x),mi=movementInfo(x,prev),d=mi.dir,geoCount=Array.isArray(x.geocercas)?x.geocercas.length:0;return `<div class="airTrip ${mi.moved?'moved':''}">
    <div class="airMotion"><div class="airCompass">${esc(d.arrow)}</div><div class="airMotionText"><b>${esc(mi.state)}</b><span>${esc(d.label)} · ${esc(fmt(x.gpsAt))}</span></div></div>
    <div class="airStatusWrap"><span class="airStatus ${statusClass(x.estatusViaje)}">${esc(x.estatusViaje||'Sin estatus')}</span></div>
    <div class="airLocation"><div class="airLocationMain">${esc(x.ubicacion||x.ubicacionErp||'Sin ubicación')}</div>${geoCount?'<div class="airActions"><button class="airBtn geo" data-geo="'+idx+'">Recorrido '+geoCount+'</button></div>':''}</div>
    <div class="airClientName">${esc(x.cliente||'—')}</div>
    <div class="airVehicle"><div class="airUnit">${esc(x.unidad||'—')}</div><div class="airOperator">${esc(x.operador||'Sin operador')}</div><div class="airTags"><span class="airTag">${esc(x.placa||'Sin placa')}</span></div></div>
    <div class="airVehicle"><div class="airPointLabel">Remolque</div><div class="airTrailer">${esc(x.remolque||'—')}</div>${x.placasRemolque?'<div class="airTrailerPlate">'+esc(x.placasRemolque)+'</div>':''}${x.remolque2?'<div class="airSub">'+esc(x.remolque2)+(x.placasRemolque2?' · '+esc(x.placasRemolque2):'')+'</div>':''}</div>
    <div class="airRouteUnified"><div class="airPoint"><div class="airPointLabel">Origen</div><div class="airOrigin">${esc(x.origen||'—')}</div></div><div class="airRouteConnector">→</div><div class="airPoint"><div class="airPointLabel">Destino</div><div class="airDestination">${esc(x.destino||'—')}</div></div></div>
    <div class="airTime"><div class="airTripNo">${esc(x.numeroViaje||'—')}</div>${String(x.numeroViaje||'').trim()?(()=>{const t=AIR_TRIP_CLOCKS.get(tripClockKey(x));return '<div class="airTimeMain">Llegada: '+esc(t?fmt(t.llegada):'Pendiente')+'</div><div class="airTimeSub">Transcurrido desde llegada: '+esc(t?airportElapsed(t.llegada,t.fin):'Pendiente')+'</div>'})():''}</div>
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
  if(AIR_MAP_OPEN&&!opts.pageOnly)renderAirportMap({refit:false,refresh:true});
  if(!opts.pageOnly)syncAutoPaging();
}
async function load(){if(LOADING||document.hidden||!$('ccPanelPantallaAeropuerto')?.classList.contains('active'))return;LOADING=true;try{if(AIR_EXTERNAL){const r=await sb().functions.invoke('cc-mirror-airport',{body:{}});if(r.error)throw r.error;const data=r.data||{};if(!data.ok)throw Error(data.error||'Cuenta sin autorización');AIR_EXTERNAL_CLIENT=data.cliente;AIR_CLIENTS=[{id:data.cliente_id,nombre:data.cliente}];if(!data.permissions?.aeropuerto){LAST=[];AIR_GPS_VEHICLES=[];AIR_TRIP_CLOCKS=new Map();updateClientFilter();render();$('airUpdated').textContent='Vista de unidades no autorizada';schedule();return}AIR_GPS_VEHICLES=Array.isArray(data.vehicles)?data.vehicles:[];LAST=AIR_GPS_VEHICLES.map(x=>({...x,airManual:x.asignacion==='MANUAL',estatusViaje:x.asignacion==='MANUAL'?'Cuenta espejo':(x.estatusViaje||'En servicio')}));AIR_TRIP_CLOCKS=new Map((Array.isArray(data.tripClocks)?data.tripClocks:[]).map(v=>[String(v.unidad||'')+'|'+String(v.identificadorViaje||v.numeroViaje||''),v]));updateClientFilter();render();$('airUpdated').textContent='Actualizado '+new Date().toLocaleTimeString('es-MX',{timeZone:tz})+' · Modo consulta';schedule();return}$('airUpdated').textContent='Actualizando…';const r=await sb().functions.invoke('gm-flota');if(r.error)throw r.error;const data=r.data||{};if(!data.ok)throw new Error(data.error||'No se pudo leer Software GM');await airReadManual();if(!AIR_CLIENTS.length)await airReadClients();const vehicles=Array.isArray(data.vehicles)?data.vehicles:[];AIR_GPS_VEHICLES=vehicles;
 if(airIsSuperAdmin()){
  const detected=AIR_MANUAL.filter(a=>a.estado==='ACTIVA'&&a.modo==='HASTA_VIAJE'&&Date.parse(a.inicio)<=Date.now()&&vehicles.some(v=>airUnitKey(v.unidad)===airUnitKey(a.unidad)&&String(v.numeroViaje||'').trim()&&airClientKey(v.cliente)===airClientKey(a.cliente_nombre)));
  if(detected.length){const {error}=await sb().from('gm_airport_manual_assignments').update({estado:'FINALIZADA',updated_at:new Date().toISOString()}).in('id',detected.map(a=>a.id));if(error)console.warn('AIR_MIRROR_COMPLETE',error);else await airReadManual()}
 }
 LAST=airApplyManual(vehicles);await loadTripClocks();airManageRender();updateClientFilter();render();const pos={};LAST.forEach(x=>{const lat=Number(x.latitud),lng=Number(x.longitud);if(Number.isFinite(lat)&&Number.isFinite(lng))pos[String(x.unidad||'')]={lat,lng,ts:Date.now()}});savePrev(pos);const d=data.generatedAt?new Date(data.generatedAt):new Date();$('airUpdated').textContent='Actualizado '+d.toLocaleTimeString('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'})+'\nSiguiente lectura en 60 s';schedule()}catch(e){$('airUpdated').textContent='Error API: '+e.message+'\nConservando última lectura · reintento en 60 s';schedule()}finally{LOADING=false}}
function schedule(){clearTimeout(TIMER);TIMER=setTimeout(load,60000)}
function shell(){css();$('ccPantallaAeropuertoMount').innerHTML=`<div class="air">
  <div class="airTop"><div class="airTitleWrap"><div class="airBeacon"><i class="fa-solid fa-tower-broadcast"></i></div><div><h2 style="${AIR_EXTERNAL?'font-size:17px;line-height:1.25':''}">${AIR_EXTERNAL?esc(window.CC_MIRROR_BRAND?.mirrorAirportTitle||'Pantalla Aeropuerto Logistica Balderrama'):'Pantalla Aeropuerto'}</h2><p>Vista TV de operación · información actualizada cada minuto</p></div></div><div class="airTopActions"><label id="airAutoLabel" style="display:${AIR_EXTERNAL?'inline-flex':'none'};align-items:center;gap:5px;font-size:9px;font-weight:800;color:#475569">Páginas cada <select id="airAutoSeconds" aria-label="Segundos por página" style="border:1px solid #cbd5e1;border-radius:7px;padding:5px;background:white;color:#334155"><option value="3">3 s</option><option value="5">5 s</option><option value="6" selected>6 s</option><option value="10">10 s</option><option value="15">15 s</option><option value="30">30 s</option>${AIR_EXTERNAL?'<option value="60">60 s</option><option value="0">Manual (sin cambio)</option>':''}</select></label><button id="airDemorasBtn" type="button" class="airFullBtn" style="display:none"><i class="fa-solid fa-stopwatch"></i> Control de demoras</button>${AIR_EXTERNAL?'':'<button id="airGeoAdminBtn" type="button" class="airFullBtn"><i class="fa-solid fa-draw-polygon"></i> Geocercas</button>'}<button id="airHistoryBtn" type="button" class="airFullBtn" style="display:none"><i class="fa-solid fa-clock-rotate-left"></i> Historial</button><div id="airUpdated" class="airUpdated">Sin actualizar</div><button id="airFullBtn" class="airFullBtn" type="button"><i class="fa-solid fa-expand"></i> Pantalla completa</button></div></div>
  <div id="airManualPanel" style="display:none;margin-bottom:10px"><button type="button" id="airMirrorOpen" class="airFullBtn" style="font-size:11px"><i class="fa-solid fa-clone"></i> Cuentas espejo</button> <button type="button" id="airCreateAccounts" class="airFullBtn" style="font-size:11px;background:#0f172a;color:white;border-color:#0f172a"><i class="fa-solid fa-users-gear"></i> Crear cuentas</button></div>
  <div id="airMirrorModal" class="airModal"><div class="airModalCard" style="width:min(1080px,98vw);max-height:90vh;overflow:auto"><div class="airModalHead"><h3>Cuentas espejo · Pantalla Aeropuerto</h3><button id="airMirrorClose" type="button" class="airModalClose">Cerrar</button></div><div style="padding:17px"><label>Cliente del catálogo <select id="airManualClient" class="airSelect" style="display:block;margin-top:6px;min-width:260px"><option value="">Seleccionar cliente</option></select></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0"><section style="border:1px solid #dbe3ea;border-radius:12px;padding:12px"><h4 style="margin:0 0 9px">Unidades disponibles para agregar</h4><div id="airMirrorAvailable" style="max-height:250px;overflow:auto"></div></section><section style="border:1px solid #dbe3ea;border-radius:12px;padding:12px"><h4 style="margin:0 0 9px">Unidades visibles del cliente</h4><div id="airMirrorExisting" style="max-height:250px;overflow:auto"></div></section></div><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end"><label style="display:none">Unidad<select id="airManualUnit" class="airSelect" style="display:block"><option value="">Seleccionar unidad</option></select></label><label>Modo<select id="airManualMode" class="airSelect" style="display:block"><option value="HORARIO">Horario fijo</option><option value="HASTA_VIAJE">Hasta detectar viaje</option></select></label><label>Inicio<input id="airManualStart" class="airSelect" type="datetime-local" style="display:block"></label><label id="airManualEndWrap">Fin<input id="airManualEnd" class="airSelect" type="datetime-local" style="display:block"></label><button id="airManualSave" type="button" class="airFullBtn" style="background:#2563eb;color:white">Agregar a cuenta espejo</button></div><p style="font-size:11px;color:#64748b">Si GM detecta un viaje, se muestra el servicio real automáticamente. Las cuentas espejo no generan viajes ni demoras.</p><h4>Asignaciones registradas</h4><div id="airManualHistory"></div></div></div></div>
  <div class="airFilters"><label>Cliente</label><select id="airClient" class="airSelect"><option value="">Todos los clientes</option></select><label class="airCheck"><input id="airOnlyTrips" type="checkbox" checked> Solo unidades con número de viaje</label><span id="airVisibleCount" class="airCount">0 unidades</span><button id="airRentToggle" class="airRentToggle" type="button" aria-expanded="false"><i class="fa-solid fa-boxes-stacked"></i> Cajas de renta</button><button id="airMapToggle" class="airMapToggle" type="button"><i class="fa-solid fa-map-location-dot"></i> Mapa de unidades</button></div><div id="airFleetMapPanel" class="airFleetMapPanel"><div class="airFleetMapHead"><div class="airFleetMapHeadLeft"><strong>Mapa de unidades en operación</strong><span id="airFleetMapMeta">0 unidades</span></div><div class="airFleetMapControls"><label style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#334155;cursor:pointer"><input id="airMapShowTripBubbles" type="checkbox" checked style="accent-color:#2563eb"> Mostrar información de viajes</label><label id="airMapShowAllWrap" style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#334155;cursor:pointer"><input id="airMapShowAll" type="checkbox" style="accent-color:#2563eb"> Mostrar todas las unidades</label><span class="airMapSegment"><button id="airMapSatellite" class="airMapSegBtn on" type="button"><i class="fa-solid fa-satellite"></i> Satélite</button><button id="airMapStreet" class="airMapSegBtn" type="button"><i class="fa-solid fa-map"></i> Mapa</button></span><button id="airMapLock" class="airMapLockBtn on" type="button"><i class="fa-solid fa-lock"></i> Vista fija</button><button id="airFleetMapFullscreen" class="airFleetMapAction" type="button"><i class="fa-solid fa-expand"></i> Pantalla completa</button><button id="airFleetMapClose" class="airFleetMapAction" type="button"><i class="fa-solid fa-xmark"></i> Cerrar</button></div></div><div class="airFleetMapWorkspace"><aside class="airFleetMapSidebar"><div class="airFleetSidebarHead"><div class="airFleetSidebarTitle"><strong>Unidades visibles</strong><span id="airFleetSideCount">0</span></div><input id="airFleetSearch" class="airFleetSearch" type="search" placeholder="Buscar unidad, operador o cliente"></div><div id="airFleetSideList" class="airFleetSideList"></div><div id="airFleetDetail" class="airFleetDetail"><div class="airFleetDetailEmpty">Selecciona una unidad para ver el detalle operativo.</div></div></aside><div id="airFleetMapCanvas" class="airFleetMapCanvas"></div></div><div id="airClientLegend" class="airClientLegend"></div><div class="airFleetMapLegend"><span>Punto verde: con viaje</span><span>Punto gris: sin viaje</span><span>Color del vehículo: cliente</span><span>Globo operativo: operador · cliente · destino</span><span>Se actualizan posiciones cada 60 s</span><span class="legendLock"><i class="fa-solid fa-lock"></i> La vista no se mueve con el refresh</span></div></div>
  <div id="airV2Kpis" class="airV2Kpis" style="display:none"></div>
  <div class="airSplit"><div class="airOperations"><div class="airLegend"><div>Movimiento</div><div>Estatus</div><div>Ubicación actual</div><div>Cliente</div><div>Unidad / Operador</div><div>Remolque</div><div>Ruta · Origen → Destino</div><div>Viaje / ETA</div></div>
  <div id="airList" class="airList"></div><div id="airPager" class="airPager"></div>
  <div id="airV2Ticker" class="airV2Ticker" style="display:none"></div></div><aside id="airRentPanel" class="airRentPanel" aria-label="Cajas en renta"></aside></div>
  <div class="airFoot">Refresco cada 60 segundos · se pausa cuando esta pantalla no está visible · mapa y recorrido se cargan solo al abrirlos.</div>
  <div id="airDemorasModal" style="display:none;position:fixed;inset:0;z-index:250001;background:rgba(15,23,42,.75);align-items:center;justify-content:center;padding:20px"><section style="background:#f1f5f9;border-radius:15px;width:min(1100px,96vw);max-height:90vh;display:flex;flex-direction:column;overflow:hidden"><header style="display:flex;align-items:center;justify-content:space-between;padding:15px 20px;background:white"><h3 style="margin:0">Control de demoras · Origen</h3><button id="airDemorasClose" type="button" class="airFullBtn" style="background:#0f172a;color:#fff;border:1px solid #334155;padding:10px 16px;font-size:13px;cursor:pointer"><i class="fa-solid fa-arrow-left"></i> Regresar</button></header><div style="padding:12px 20px;background:white;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label>Desde <input id="airDemorasFrom" type="date"></label><label>Hasta <input id="airDemorasTo" type="date"></label><label>Viaje <input id="airDemorasViaje" type="search" inputmode="search" placeholder="Buscar número de viaje" style="padding:7px;border:1px solid #cbd5e1;border-radius:8px;min-width:180px"></label><button id="airDemorasFilter" type="button" class="airFullBtn">Filtrar</button><button id="airDemorasClear" type="button" class="airFullBtn">Limpiar</button></div><div id="airDemorasBody" style="padding:16px;overflow:auto"></div></section></div><div id="airHistoryModal" style="display:none;position:fixed;inset:0;z-index:250000;background:rgba(15,23,42,.75);align-items:center;justify-content:center;padding:20px"><section style="background:#f1f5f9;border-radius:15px;width:min(900px,96vw);max-height:90vh;display:flex;flex-direction:column;overflow:hidden"><header style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:white"><h3 style="margin:0">Historial de viajes y geocercas · GM</h3><button id="airHistoryClose" type="button" class="airFullBtn" style="background:#0f172a;color:#fff;border:1px solid #334155;padding:10px 16px;font-size:13px;cursor:pointer"><i class="fa-solid fa-arrow-left"></i> Regresar</button></header><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 20px;background:white;border-top:1px solid #e2e8f0"><label style="font-size:12px">Desde <input id="airHistoryFrom" type="date" style="padding:6px;border:1px solid #cbd5e1;border-radius:7px"></label><label style="font-size:12px">Hasta <input id="airHistoryTo" type="date" style="padding:6px;border:1px solid #cbd5e1;border-radius:7px"></label><button id="airHistorySearch" type="button" class="airFullBtn">Filtrar viajes</button><button id="airHistoryClear" type="button" class="airFullBtn">Limpiar</button></div><div id="airHistoryBody" style="padding:16px 20px;overflow:auto"></div></section></div><div id="airGeoModal" class="airModal"><div class="airModalCard"><div class="airModalHead"><h3 id="airGeoTitle">Geocercas</h3><button id="airGeoClose" class="airModalClose">Cerrar</button></div><div id="airGeoList" class="airGeoList"></div></div></div>
</div>`; VIEW='actual';RENT_OPEN=false;AIR_MAP_OPEN=false;AIR_MAP_MODE='MAPA';AIR_MAP_LOCKED=true;AIR_MAP_SELECTED_KEY=null;AIR_MAP_SEARCH='';PAGE=1;AUTO_SECONDS=6;stopAutoPaging();$('airHistoryBtn').style.display=airIsSuperAdmin()?'inline-flex':'none';$('airDemorasBtn').style.display=airIsSuperAdmin()?'inline-flex':'none';$('airDemorasBtn').onclick=showAirportDemoras;$('airDemorasClose').onclick=()=>$('airDemorasModal').style.display='none';$('airDemorasModal').addEventListener('click',e=>{if(e.target===$('airDemorasModal'))$('airDemorasModal').style.display='none'});$('airDemorasFilter').onclick=showAirportDemoras;$('airDemorasViaje').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();showAirportDemoras()}};$('airDemorasClear').onclick=()=>{$('airDemorasFrom').value='';$('airDemorasTo').value='';$('airDemorasViaje').value='';showAirportDemoras()};if(!AIR_EXTERNAL&&$('airGeoAdminBtn'))$('airGeoAdminBtn').onclick=airGeoPanel;$('airHistoryBtn').onclick=showAirportHistory;$('airHistorySearch').onclick=showAirportHistory;$('airHistoryClear').onclick=()=>{$('airHistoryFrom').value='';$('airHistoryTo').value='';showAirportHistory()};$('airHistoryClose').onclick=()=>$('airHistoryModal').style.display='none';$('airHistoryModal').addEventListener('click',e=>{if(e.target===$('airHistoryModal'))$('airHistoryModal').style.display='none'});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('airHistoryModal'))$('airHistoryModal').style.display='none';if($('airDemorasModal'))$('airDemorasModal').style.display='none'}});$('airAutoSeconds').onchange=e=>{AUTO_SECONDS=Number(e.target.value);if(!Number.isFinite(AUTO_SECONDS))AUTO_SECONDS=6;syncAutoPaging()};$('airManualSave').onclick=airManualSave;$('airMirrorOpen').onclick=()=>{$('airMirrorModal').classList.add('on');airManageRender()};$('airMirrorClose').onclick=()=>$('airMirrorModal').classList.remove('on');$('airManualClient').onchange=()=>{airMirrorList();airManageRender()};$('airManualMode').onchange=()=>{$('airManualEndWrap').style.display=$('airManualMode').value==='HORARIO'?'':'none'};updateClientFilter();airReadClients().catch(e=>{console.error('AIR_CLIENTS',e);const sel=$('airClient');if(sel)sel.innerHTML='<option value="">Error al cargar catálogo de clientes</option>';});$('airRentToggle').onclick=toggleRentals;$('airMapToggle').onclick=toggleAirportMap;$('airFleetMapClose').onclick=()=>{if(AIR_MAP_OPEN)toggleAirportMap()};$('airFleetMapFullscreen').onclick=toggleAirportMapFullscreen;$('airMapSatellite').onclick=()=>switchAirportMapMode('SATELITE');$('airMapStreet').onclick=()=>switchAirportMapMode('MAPA');$('airMapLock').onclick=toggleAirportMapLock;$('airMapShowTripBubbles').onchange=e=>$('airFleetMapPanel').classList.toggle('airHideTripBubbles',!e.target.checked);$('airMapShowAll').onchange=()=>{AIR_MAP_SELECTED_KEY=null;renderAirportMap({refit:true})};$('airFleetSearch').oninput=e=>{AIR_MAP_SEARCH=e.target.value||'';const rows=airportMapRows(),colors=airportClientColorMap(rows);renderAirportSidebar(rows,colors)};$('airFullBtn').onclick=toggleFullscreen;syncFullscreenButton();$('airClient').onchange=()=>{PAGE=1;syncAirportAllControl();render();if(RENT_OPEN)loadRentals()};$('airOnlyTrips').onchange=()=>{PAGE=1;render()};$('airGeoClose').onclick=()=>$('airGeoModal').classList.remove('on');$('airGeoModal').onclick=e=>{if(e.target===$('airGeoModal'))$('airGeoModal').classList.remove('on')};load()}
window.ccOpenPantallaAeropuerto=btn=>{document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>{x.classList.remove('active');x.style.removeProperty('display')});document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));$('ccPanelPantallaAeropuerto')?.classList.add('active');btn?.classList.add('active');clearTimeout(TIMER);stopAutoPaging();shell()};
if(AIR_EXTERNAL){window.ccMirrorAirportStart=(configuration={})=>{
 const panel=$('ccPanelPantallaAeropuerto');if(panel)panel.classList.add('active');
 const permissions=configuration.permissions||{aeropuerto:true,cajas_renta:false,mapa_unidades:false};
 window.CC_MIRROR_PERMISSIONS=permissions;
 shell();
 for(const id of ['airManualPanel','airDemorasBtn','airHistoryBtn']){const el=$(id);if(el)el.style.display='none'}
 if($('airRentToggle'))$('airRentToggle').style.display=permissions.cajas_renta?'':'none';
 if($('airMapToggle'))$('airMapToggle').style.display=permissions.mapa_unidades?'':'none';
 if($('airClient'))$('airClient').disabled=true;
 const defaultView=configuration.defaultView;
 const target=defaultView==='cajas_renta'&&permissions.cajas_renta?'cajas_renta':defaultView==='mapa_unidades'&&permissions.mapa_unidades?'mapa_unidades':permissions.aeropuerto?'aeropuerto':permissions.cajas_renta?'cajas_renta':permissions.mapa_unidades?'mapa_unidades':'aeropuerto';
 if(target==='cajas_renta')toggleRentals();
 else if(target==='mapa_unidades')toggleAirportMap();
 };}
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(TIMER);stopAutoPaging()}else if($('ccPanelPantallaAeropuerto')?.classList.contains('active')){load();syncAutoPaging()}});
document.addEventListener('fullscreenchange',()=>{syncFullscreenButton();syncAirportMapFullscreenButton();const full=document.fullscreenElement===$('ccPantallaAeropuertoMount');if($('airAutoLabel'))$('airAutoLabel').style.display=(AIR_EXTERNAL||full)?'inline-flex':'none';syncAutoPaging()});
})();