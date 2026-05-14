import React, { useState } from "react";
import { buildDrawerCloseAccounting } from "./cashDrawerAccounting.mjs";

/* ─── DESIGN TOKENS — exact eZee Absolute from screenshots ─────────────── */
const T = {
  topbarBg:"#2D3748", topbarBorder:"#3D4A5C",
  outerBg:"#1A1A2E",  pageBg:"#FFFFFF",
  blue:"#1A73E8", blueDark:"#1558B0", blueLight:"#E8F0FE", blueBorder:"#BBDEFB",
  activeColor:"#2E7D32", activeBg:"#F1FAF1", activeBdr:"#A5D6A7",
  inactiveColor:"#C62828", inactiveBg:"#FFF1F1", inactiveBdr:"#FFCDD2",
  warnColor:"#C62828", warnBg:"#FFF1F1", warnBdr:"#FFCDD2",
  amberColor:"#E65100", amberBg:"#FFF8F1", amberBdr:"#FFCC80",
  infoBg:"#E8F0FE", infoBdr:"#BBDEFB", infoColor:"#1558B0",
  txt:"#1A202C", txtMid:"#4A5568", txtLight:"#718096", txtXlight:"#A0AEC0",
  thBg:"#F5F5F5", rowBorder:"#E8EAED", rowHover:"#F8F9FA",
  inputBdr:"#D1D5DB", inputFocus:"#1A73E8",
  overlay:"rgba(0,0,0,0.35)",
  border:"#E5E7EB", cardBg:"#FFFFFF",
  statBg:"#F8FAFF", statBdr:"#DBEAFE",
  shiftBg:"#EFF6FF", shiftBdr:"#BFDBFE", shiftColor:"#1D4ED8",
};

/* ─── SHIFT ID GENERATOR ─────────────────────────────────────────────────
   Format: SH-YYYYMMDD-NNN  e.g. SH-20250724-001
   Every drawer open = one new unique shift session.
─────────────────────────────────────────────────────────────────────────── */
let shiftCounter = 4; // existing shifts already consumed 1-3
const genShiftId = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  return `SH-${ymd}-${String(++shiftCounter).padStart(3,"0")}`;
};

/* ─── SEED DATA ──────────────────────────────────────────────────────────── */

// Shift history — one record per past session
const SHIFTS_INIT = [
  // ── Closed shift — USD only (simple example) ──────────────────────────────
  { id:"SH-20250724-001", drawerId:2, drawerName:"Bar Drawer",
    staff:"Maria Santos", openedAt:"2025-07-24 06:00 AM", closedAt:"2025-07-24 02:00 PM",
    openingBal:500, closingBal:743, cashIn:293, cashOut:50,
    status:"Closed", variance:0,
    ccySummary:[
      { code:"USD", inCount:4, outCount:1, totIn:293, totOut:50, bal:743 },
    ]
  },
  // ── Closed shift — multi-currency (AUD + AED + USD) ───────────────────────
  { id:"SH-20250724-002", drawerId:3, drawerName:"Restaurant Drawer",
    staff:"Densal Demoniya", openedAt:"2025-07-24 10:00 AM", closedAt:"2025-07-24 06:00 PM",
    openingBal:500, closingBal:648.25, cashIn:312.75, cashOut:50,
    status:"Closed", variance:0,
    ccySummary:[
      { code:"USD", inCount:3, outCount:1, totIn:247.75, totOut:50,  bal:697.75 },
      { code:"AUD", inCount:2, outCount:0, totIn:65,     totOut:0,   bal:65     },
      { code:"AED", inCount:1, outCount:0, totIn:150,    totOut:0,   bal:150    },
    ]
  },
  // ── Open shift — USD only (simple, Drawer 2 — Bar) ────────────────────────
  { id:"SH-20250724-004", drawerId:2, drawerName:"Bar Drawer",
    staff:"Maria Santos", openedAt:"2025-07-24 02:10 PM", closedAt:null,
    openingBal:500, closingBal:null, cashIn:180, cashOut:0,
    status:"Open", variance:null, ccySummary:null
  },
  // ── Open shift — multi-currency (Drawer 1 — Front Desk) ───────────────────
  { id:"SH-20250724-003", drawerId:1, drawerName:"Front Desk Drawer",
    staff:"Raj Kumar", openedAt:"2025-07-24 02:05 PM", closedAt:null,
    openingBal:812.75, closingBal:null, cashIn:165, cashOut:0,
    status:"Open", variance:null, ccySummary:null
  },
];

const DRAWERS_INIT = [
  // Drawer 1 — Open, MULTI-CURRENCY (USD + AUD + AED)
  { id:1, name:"Front Desk Drawer", opened:14,
    ccyBalances:{ USD:385.75, AUD:10.00, AED:1.00 },
    balance:385.75,
    lastOpened:"2025-07-24 02:05 PM", lastClosed:"2025-07-24 02:00 PM",
    lastBy:"Raj Kumar", status:"Active",
    inUseBy:"Raj Kumar", currentShift:"SH-20250724-003" },
  // Drawer 2 — Open, USD ONLY (simple)
  { id:2, name:"Bar Drawer", opened:10,
    ccyBalances:{ USD:680 },
    balance:680,
    lastOpened:"2025-07-24 02:10 PM", lastClosed:"2025-07-24 02:00 PM",
    lastBy:"Maria Santos", status:"Active",
    inUseBy:"Maria Santos", currentShift:"SH-20250724-004" },
  // Drawer 3 — Closed (last shift was multi-currency)
  { id:3, name:"Restaurant Drawer", opened:6,
    ccyBalances:{ USD:648.25, AED:150, AUD:65 },
    balance:648.25,
    lastOpened:"2025-07-24 10:00 AM", lastClosed:"2025-07-24 06:00 PM",
    lastBy:"Densal Demoniya", status:"Active",
    inUseBy:null, currentShift:null },
  { id:4, name:"Gift Shop Drawer",  balance:500, ccyBalances:{ USD:500 }, opened:2,
    lastOpened:"2025-07-24 10:00 AM", lastClosed:"2025-07-23 11:00 PM",
    lastBy:"Densal Demoniya", status:"Inactive", inUseBy:null, currentShift:null },
  { id:5, name:"Spa Drawer",        balance:500, ccyBalances:{ USD:500 }, opened:14,
    lastOpened:"2025-07-24 10:00 AM", lastClosed:"2025-07-23 11:00 PM",
    lastBy:"Densal Demoniya", status:"Inactive", inUseBy:null, currentShift:null },
];

const OPEN_TXNS_INIT = [
  // ── Drawer 1 (SH-20250724-003) — MULTI-CURRENCY: USD + AUD + AED ──────────
  { id:"TXN-001", shiftId:"SH-20250724-003", date:"2025-07-24 02:12 PM", acct:"RES-4821", name:"Gianluca", surname:"Katona",    room:"102", notes:"", amount:100,   ccy:"USD", by:"Raj Kumar" },
  { id:"TXN-002", shiftId:"SH-20250724-003", date:"2025-07-24 02:16 PM", acct:"",         name:"",         surname:"",          room:"",    notes:"Cash Received", amount:65, ccy:"USD", by:"Raj Kumar" },
  { id:"TXN-003", shiftId:"SH-20250724-003", date:"2025-07-24 02:25 PM", acct:"RES-4822", name:"Sophie",   surname:"Williams",  room:"205", notes:"", amount:6.49,  ccy:"USD", fxCcy:"AUD", fxAmt:10,  fxRate:1.54, fxSymbol:"AUD", by:"Raj Kumar" },
  { id:"TXN-004", shiftId:"SH-20250724-003", date:"2025-07-24 02:38 PM", acct:"RES-4823", name:"Ahmed",    surname:"Al Rashid", room:"310", notes:"", amount:4.50,  ccy:"USD", fxCcy:"AUD", fxAmt:7,   fxRate:1.54, fxSymbol:"AUD", by:"Raj Kumar" },
  { id:"TXN-005", shiftId:"SH-20250724-003", date:"2025-07-24 02:45 PM", acct:"RES-4825", name:"Hassan",   surname:"Ali",       room:"",    notes:"Cash Drawer",  amount:0.27, ccy:"USD", fxCcy:"AED", fxAmt:1,   fxRate:3.67, fxSymbol:"AED", by:"Raj Kumar" },
  { id:"TXN-006", shiftId:"SH-20250724-003", date:"2025-07-24 03:10 PM", acct:"RES-4824", name:"Liu",      surname:"Yang",      room:"418", notes:"", amount:-10,   ccy:"USD", by:"Raj Kumar" },
  { id:"TXN-010", shiftId:"SH-20250724-003", date:"2025-07-24 03:30 PM", acct:"RES-4826", name:"Fatima",   surname:"Al Zaabi",  room:"501", notes:"", amount:5.45,  ccy:"USD", fxCcy:"AED", fxAmt:20,  fxRate:3.67, fxSymbol:"AED", by:"Raj Kumar" },
  { id:"TXN-011", shiftId:"SH-20250724-003", date:"2025-07-24 03:55 PM", acct:"RES-4827", name:"Pierre",   surname:"Dupont",    room:"112", notes:"", amount:32.47, ccy:"USD", fxCcy:"AUD", fxAmt:50,  fxRate:1.54, fxSymbol:"AUD", by:"Raj Kumar" },

  // ── Drawer 2 (SH-20250724-004) — USD ONLY (simple flow) ──────────────────
  { id:"TXN-007", shiftId:"SH-20250724-004", date:"2025-07-24 02:15 PM", acct:"RES-4830", name:"Carlos",   surname:"Mendez",    room:"101", notes:"", amount:80,    ccy:"USD", by:"Maria Santos" },
  { id:"TXN-008", shiftId:"SH-20250724-004", date:"2025-07-24 02:40 PM", acct:"RES-4831", name:"Priya",    surname:"Sharma",    room:"203", notes:"", amount:55,    ccy:"USD", by:"Maria Santos" },
  { id:"TXN-009", shiftId:"SH-20250724-004", date:"2025-07-24 03:05 PM", acct:"",         name:"",         surname:"",          room:"",    notes:"Cash Received", amount:45, ccy:"USD", by:"Maria Santos" },
];

const PETTY_FUNDS_INIT = [
  {
    id:"pf1", name:"Front Desk Petty Fund", department:"Front Desk",
    custodian:"Densal Demoniya", openingAmt:500, currentBalance:312.75,
    replenishAt:100, drawerId:"1",
    transactions:[
      { id:"PC-0047", shiftId:"SH-20250724-003", date:"2025-07-24 10:30 AM", type:"out", amount:45,    voucherRef:"EXP-0047", desc:"Guest airport taxi",     by:"Raj Kumar"       },
      { id:"PC-0046", shiftId:"SH-20250724-003", date:"2025-07-24 08:00 AM", type:"out", amount:38.50, voucherRef:"EXP-0046", desc:"Printer paper + toner",  by:"Raj Kumar"       },
      { id:"PC-0045", shiftId:"SH-20250724-001", date:"2025-07-23 02:00 PM", type:"out", amount:103.50,voucherRef:"EXP-0045", desc:"Emergency lobby bulb",   by:"Densal Demoniya" },
      { id:"PC-R012", shiftId:"SH-20250724-001", date:"2025-07-22 09:00 AM", type:"in",  amount:200,   voucherRef:"",         desc:"Monthly fund top-up",    by:"John Manager"    },
      { id:"PC-0044", shiftId:"SH-20250724-002", date:"2025-07-21 11:30 AM", type:"out", amount:27,    voucherRef:"EXP-0044", desc:"Welcome gift — Room 204", by:"Maria Santos"    },
    ],
  },
  {
    id:"pf2", name:"Bar Petty Fund", department:"Bar",
    custodian:"Maria Santos", openingAmt:300, currentBalance:78,
    replenishAt:80, drawerId:"2",
    transactions:[
      { id:"PC-0043", shiftId:"SH-20250724-002", date:"2025-07-24 07:00 AM", type:"out", amount:55,  voucherRef:"EXP-0043", desc:"Fresh herbs — market run", by:"Maria Santos" },
      { id:"PC-R011", shiftId:"SH-20250724-001", date:"2025-07-20 10:00 AM", type:"in",  amount:150, voucherRef:"",         desc:"Fund replenishment",       by:"John Manager"  },
    ],
  },
];



/* ─── SUPPORTED CURRENCIES ───────────────────────────────────────────────────
   Physical cash currencies that can be received into the drawer.
   No conversion — amounts are recorded as-is in the original currency.
   Base currency is always first (USD). Configured by Manager/Admin.
──────────────────────────────────────────────────────────────────────────── */
const CURRENCIES = [
  { code:"USD", symbol:"USD",  name:"US Dollar",         defaultRate:1      },
  { code:"EUR", symbol:"EUR",  name:"Euro",              defaultRate:0.92   },
  { code:"GBP", symbol:"GBP",  name:"British Pound",     defaultRate:0.79   },
  { code:"AUD", symbol:"AUD",  name:"Australian Dollar", defaultRate:1.54   },
  { code:"AED", symbol:"AED", name:"UAE Dirham",         defaultRate:3.67   },
  { code:"INR", symbol:"INR",  name:"Indian Rupee",      defaultRate:83.50  },
  { code:"SGD", symbol:"SGD",  name:"Singapore Dollar",  defaultRate:1.34   },
];
const BASE_CCY = "USD";
// Format in foreign currency
const ccyFmt = (amt, code) => {
  const c = CURRENCIES.find(x => x.code===code)||CURRENCIES[0];
  return `${c.code} ${parseFloat(amt||0).toFixed(2)}`;
};
// Convert foreign → USD:  foreignAmt / rate = USD
// e.g. €20 / 0.92 = $21.74 USD
const toUSD = (foreignAmt, rate) => parseFloat((parseFloat(foreignAmt||0) / parseFloat(rate||1)).toFixed(2));

const ALL_CATS = ["Office Supplies","Taxi / Transport","Guest Services","Minor Repairs","F&B Supplies","Tips / Gratuity","Postage / Courier","Miscellaneous"];
const DEPTS    = ["Front Desk","Bar","Restaurant","Housekeeping","Gift Shop","Spa","Management"];
const STAFF    = ["Densal Demoniya","Maria Santos","John Manager","Raj Kumar","Ahmed Salim"];
const fmt      = n => `USD ${parseFloat(n||0).toFixed(2)}`;
const nowStr   = () => new Date().toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).replace(",","");

/* ─── SHIFT ID BADGE — small blue chip shown everywhere ──────────────────── */
const ShiftBadge = ({ id, size="sm" }) => {
  if (!id) return null;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:3,
      background:T.shiftBg, border:`1px solid ${T.shiftBdr}`,
      color:T.shiftColor, borderRadius:4,
      fontSize: size==="sm" ? 10 : 11,
      fontWeight:600, padding: size==="sm" ? "1px 6px" : "2px 8px",
      whiteSpace:"nowrap", fontFamily:"'SF Mono',monospace,sans-serif",
      letterSpacing:"0.3px",
    }}>
      ⏱ {id}
    </span>
  );
};

/* ─── SVG ICONS ──────────────────────────────────────────────────────────── */
const Svg = ({ ch, s=14 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ch}</svg>
);
const IC = {
  close:  <Svg ch={<path d="M18 6L6 18M6 6l12 12"/>}/>,
  edit:   <Svg ch={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></>}/>,
  trash:  <Svg ch={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>}/>,
  chevD:  <Svg ch={<path d="M6 9l6 6 6-6"/>}/>,
  chevU:  <Svg ch={<path d="M18 15l-6-6-6 6"/>}/>,
  plus:   <Svg s={16} ch={<path d="M12 5v14M5 12h14" strokeWidth="2.5"/>}/>,
  back:   <Svg ch={<path d="M19 12H5M12 5l-7 7 7 7"/>}/>,
  warn:   <Svg ch={<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}/>,
  info:   <Svg ch={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}/>,
  check:  <Svg ch={<polyline points="20 6 9 17 4 12" strokeWidth="2.5"/>}/>,
  sort:   <Svg s={12} ch={<path d="M7 15V4m0 11l-3-3m3 3l3-3M17 9v11m0-11l-3 3m3-3l3 3"/>}/>,
  search: <Svg ch={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}/>,
  shift:  <Svg ch={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}/>,
  export: <Svg ch={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}/>,
  replen: <Svg ch={<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>}/>,
};

/* ─── SLIDE-IN DRAWER PANEL ──────────────────────────────────────────────── */
function DrawerPanel({ open, onClose, title, width=420, children, onSave, saveLabel="Save", saveDisabled, extraFooter }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:900, display:"flex", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:T.overlay }}/>
      <div style={{ position:"relative", width, maxWidth:"100vw", background:T.pageBg, height:"100%", display:"flex", flexDirection:"column", boxShadow:"-2px 0 24px rgba(0,0,0,0.2)", animation:"ezSlide .22s cubic-bezier(0.16,1,0.3,1)" }}>
        <style>{`@keyframes ezSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ padding:"16px 20px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:600, color:T.txt }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.txtLight, display:"flex", padding:2 }}>{IC.close}</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>{children}</div>
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8, flexShrink:0 }}>
          {extraFooter}
          {!extraFooter && <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:4, border:`1px solid ${T.inputBdr}`, background:T.pageBg, color:T.txtMid, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>}
          {onSave && (
            <button onClick={saveDisabled?undefined:onSave} disabled={saveDisabled}
              style={{ padding:"7px 20px", borderRadius:4, border:"none", background:saveDisabled?"#93C5FD":T.blue, color:"#fff", fontSize:13, fontWeight:600, cursor:saveDisabled?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FORM PRIMITIVES ────────────────────────────────────────────────────── */
const Lbl = ({ children, req }) => (
  <label style={{ display:"block", fontSize:12, fontWeight:500, color:T.txtMid, marginBottom:5 }}>
    {children}{req && <span style={{ color:T.warnColor }}> *</span>}
  </label>
);
const iStyle = { width:"100%", padding:"7px 10px", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:13, fontFamily:"inherit", color:T.txt, background:"#fff", boxSizing:"border-box", outline:"none" };
const Inp = ({ value, onChange, placeholder, type="text", readOnly, style={} }) => (
  <input value={value} onChange={onChange} placeholder={placeholder} type={type} readOnly={readOnly} style={{ ...iStyle, background:readOnly?"#F9FAFB":"#fff", ...style }}/>
);
const Sel = ({ value, onChange, children, disabled }) => (
  <div style={{ position:"relative" }}>
    <select value={value} onChange={onChange} disabled={disabled} style={{ ...iStyle, paddingRight:28, appearance:"none", cursor:"pointer" }}>{children}</select>
    <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:T.txtLight }}>{IC.chevD}</span>
  </div>
);
const Txt = ({ value, onChange, placeholder, rows=3 }) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{ ...iStyle, resize:"vertical" }}/>
);
const Fld = ({ label, req, children, hint }) => (
  <div style={{ marginBottom:14 }}>
    {label && <Lbl req={req}>{label}</Lbl>}
    {children}
    {hint && <div style={{ fontSize:11, color:T.txtXlight, marginTop:3 }}>{hint}</div>}
  </div>
);
const R2 = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>{children}</div>;

/* ─── ALERT ──────────────────────────────────────────────────────────────── */
const Alert = ({ type="warn", children }) => {
  const c = { warn:{bg:T.warnBg,bdr:T.warnBdr,col:T.warnColor,ic:IC.warn}, info:{bg:T.infoBg,bdr:T.infoBdr,col:T.infoColor,ic:IC.info}, amber:{bg:T.amberBg,bdr:T.amberBdr,col:T.amberColor,ic:IC.warn}, ok:{bg:"#F0FDF4",bdr:"#A7F3D0",col:"#065F46",ic:IC.check} }[type]||{};
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.bdr}`, borderRadius:4, padding:"9px 12px", display:"flex", gap:8, alignItems:"flex-start", marginBottom:14, fontSize:12, color:c.col, lineHeight:1.5 }}>
      <span style={{ flexShrink:0, marginTop:1 }}>{c.ic}</span><span>{children}</span>
    </div>
  );
};

/* ─── STATUS BADGE ───────────────────────────────────────────────────────── */
const StatusBadge = ({ s }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:4, fontSize:12, fontWeight:500, border:`1px solid ${s==="Active"?T.activeBdr:T.inactiveBdr}`, background:s==="Active"?T.activeBg:T.inactiveBg, color:s==="Active"?T.activeColor:T.inactiveColor }}>
    {s} {IC.chevD}
  </span>
);

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, accent, warn }) => (
  <div style={{ background:warn?T.warnBg:accent?T.blueLight:T.statBg, border:`1px solid ${warn?T.warnBdr:accent?T.blueBorder:T.statBdr}`, borderRadius:6, padding:"14px 18px" }}>
    <div style={{ fontSize:11, fontWeight:600, color:warn?T.warnColor:accent?T.blue:T.txtLight, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:700, color:warn?T.warnColor:accent?T.blue:T.txt, fontVariantNumeric:"tabular-nums" }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:T.txtLight, marginTop:3 }}>{sub}</div>}
  </div>
);

/* ─── STEP WIZARD ────────────────────────────────────────────────────────── */
const Steps = ({ steps, cur }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
    {steps.map((s,i) => (
      <div key={s} style={{ display:"flex", alignItems:"center" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:64 }}>
          <div style={{ width:12, height:12, borderRadius:"50%", boxSizing:"border-box", background:i<=cur?T.blue:"transparent", border:i<=cur?"none":"2px solid #CBD5E0", ...(i===cur?{boxShadow:`0 0 0 3px ${T.blueBorder}`}:{}) }}/>
          <span style={{ fontSize:11, fontWeight:i===cur?600:400, color:i<=cur?T.blue:T.txtXlight, whiteSpace:"nowrap" }}>{s}</span>
        </div>
        {i<steps.length-1 && <div style={{ width:72, height:2, background:i<cur?T.blue:"#E2E8F0", margin:"0 4px", marginBottom:16, flexShrink:0 }}/>}
      </div>
    ))}
  </div>
);

const Sec = ({ label }) => (
  <div style={{ fontSize:11, fontWeight:600, color:T.txtXlight, textTransform:"uppercase", letterSpacing:"0.6px", borderBottom:`1px solid ${T.border}`, paddingBottom:5, marginBottom:12, marginTop:4 }}>{label}</div>
);

/* ─── TOPBAR ─────────────────────────────────────────────────────────────── */
function Topbar() {
  return (
    <div style={{ height:52, background:T.topbarBg, borderBottom:`1px solid ${T.topbarBorder}`, display:"flex", alignItems:"center", padding:"0 14px", gap:10, flexShrink:0, position:"sticky", top:0, zIndex:200 }}>
      <button style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8", display:"flex" }}>
        <Svg s={18} ch={<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}/>
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8 }}>
        <div style={{ width:28, height:28, background:"linear-gradient(135deg,#3B82F6,#6366F1)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7v5c0 5.5 4 10.7 10 12 6-1.3 10-6.5 10-12V7L12 2z"/></svg>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff", lineHeight:1.2 }}>eZee Absolute</div>
          <div style={{ fontSize:9, color:"#94A3B8", letterSpacing:"0.5px" }}>Powered by YCS</div>
        </div>
      </div>
      <div style={{ display:"flex", flex:1, maxWidth:320, background:"#3D4A5C", borderRadius:4, overflow:"hidden" }}>
        <input placeholder="Quick Search" style={{ flex:1, padding:"6px 10px", background:"transparent", border:"none", color:"#E2E8F0", fontSize:12, fontFamily:"inherit", outline:"none" }}/>
        <button style={{ width:34, background:T.blue, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}>{IC.search}</button>
      </div>
      <span style={{ fontSize:12, color:"#94A3B8", marginLeft:6 }}>Unlock</span>
      <div style={{ flex:1 }}/>
      {["🗓","💳","🏨","📋"].map((ic,i) => <button key={i} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", color:"#94A3B8" }}>{ic}</button>)}
      <div style={{ position:"relative" }}>
        <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", color:"#94A3B8" }}>🔔</button>
        <span style={{ position:"absolute", top:4, right:4, width:8, height:8, background:T.warnColor, borderRadius:"50%", border:"2px solid "+T.topbarBg }}/>
      </div>
      <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", color:"#94A3B8" }}>⋮⋮</button>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:4, padding:"4px 10px", border:"1px solid #4A5568", borderRadius:6 }}>
        <div style={{ width:22, height:22, borderRadius:2, background:"#4A5568", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>🏨</div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:"#E2E8F0", lineHeight:1.2 }}>John</div>
          <div style={{ fontSize:10, color:"#94A3B8", lineHeight:1.2 }}>Royal Beach Reaso...</div>
        </div>
        {IC.chevD}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 1 — CREATE / MODIFY CASH DRAWERS
   Adds: Current Shift ID column on table
═══════════════════════════════════════════════════════════════════════════ */
function CreateModifyPage({ drawers, setDrawers }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTgt, setEditTgt]     = useState(null);
  const [name, setName]           = useState("");
  const [bal, setBal]             = useState("0.00");

  const openAdd  = ()  => { setEditTgt(null); setName(""); setBal("0.00"); setPanelOpen(true); };
  const openEdit = (d) => { setEditTgt(d); setName(d.name); setBal(String(d.balance)); setPanelOpen(true); };
  const save = () => {
    if (!name.trim()) return;
    editTgt
      ? setDrawers(p => p.map(d => d.id===editTgt.id ? {...d, name, balance:parseFloat(bal||0)} : d))
      : setDrawers(p => [...p, { id:Date.now(), name, balance:parseFloat(bal||0), opened:0, lastOpened:"N/A", lastClosed:"N/A", lastBy:"N/A", status:"Active", inUseBy:null, currentShift:null }]);
    setPanelOpen(false);
  };
  const toggleStatus = id => setDrawers(p => p.map(d => d.id===id ? {...d, status:d.status==="Active"?"Inactive":"Active"} : d));

  return (
    <>
      <div style={{ padding:"20px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h1 style={{ fontSize:17, fontWeight:600, color:T.txt }}>Cash Drawers</h1>
          <button onClick={openAdd} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {IC.plus} Add New Cash Drawer
          </button>
        </div>

        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:T.thBg }}>
              {["Drawer Name","Current Shift","Last Closing Balance","Times Opened","Last Opened","Last Closed","Last Opened By","Status","Action"].map(h => (
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, fontSize:12, color:T.txtMid, borderBottom:`1px solid ${T.rowBorder}`, borderTop:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drawers.map(d => (
              <tr key={d.id} style={{ borderBottom:`1px solid ${T.rowBorder}` }}
                onMouseEnter={e => e.currentTarget.style.background=T.rowHover}
                onMouseLeave={e => e.currentTarget.style.background=""}>
                <td style={{ padding:"11px 14px", color:T.txt, fontWeight:500 }}>{d.name}</td>
                {/* SHIFT COLUMN */}
                <td style={{ padding:"11px 14px" }}>
                  {d.currentShift
                    ? <ShiftBadge id={d.currentShift}/>
                    : <span style={{ color:T.txtXlight, fontSize:12 }}>—</span>}
                  {d.inUseBy && <div style={{ fontSize:11, color:T.txtLight, marginTop:3 }}>👤 {d.inUseBy}</div>}
                </td>
                <td style={{ padding:"11px 14px", color:T.txtMid }}>{fmt(d.balance)}</td>
                <td style={{ padding:"11px 14px", color:T.txtMid }}>{String(d.opened).padStart(2,"0")}</td>
                <td style={{ padding:"11px 14px", color:T.txtMid, fontSize:12 }}>{d.lastOpened}</td>
                <td style={{ padding:"11px 14px", color:T.txtMid, fontSize:12 }}>{d.lastClosed}</td>
                <td style={{ padding:"11px 14px", color:T.txtMid }}>{d.lastBy}</td>
                <td style={{ padding:"11px 14px" }} onClick={() => toggleStatus(d.id)}><StatusBadge s={d.status}/></td>
                <td style={{ padding:"11px 14px" }}>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => openEdit(d)} style={{ background:"none", border:"none", cursor:"pointer", color:T.txtLight, padding:2, display:"flex" }}>{IC.edit}</button>
                    <button onClick={() => setDrawers(p => p.filter(x => x.id!==d.id))} style={{ background:"none", border:"none", cursor:"pointer", color:T.txtLight, padding:2, display:"flex" }}>{IC.trash}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DrawerPanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editTgt?"Edit Cash Drawer":"Create New Cash Drawer"} onSave={save} saveDisabled={!name.trim()}>
        <Fld label="Drawer Name" req><Inp value={name} onChange={e => setName(e.target.value)} placeholder="Front Desk Drawer"/></Fld>
        <Fld label="Starting Balance">
          <div style={{ display:"flex" }}>
            <div style={{ padding:"7px 10px", background:"#F3F4F6", border:`1px solid ${T.inputBdr}`, borderRight:"none", borderRadius:"4px 0 0 4px", fontSize:12, color:T.txtMid, display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>USD ($) {IC.chevD}</div>
            <Inp value={bal} onChange={e => setBal(e.target.value)} placeholder="0.00" type="number" style={{ borderRadius:"0 4px 4px 0" }}/>
          </div>
        </Fld>
      </DrawerPanel>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 2 — OPEN CASH DRAWER
   Per-currency starting balance rows matching reference image.
   Single-currency drawers show one row; multi-currency show one row per currency.
═══════════════════════════════════════════════════════════════════════════ */
function OpenDrawerPage({ drawers, setDrawers, shifts, setShifts }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [sel, setSel]             = useState("");
  const [staff, setStaff]         = useState("Densal Demoniya");
  const [enterBals, setEnterBals] = useState({});   // { USD:"385.75", AUD:"10.00", ... }
  const [notes, setNotes]         = useState("");
  const [lastShift, setLastShift] = useState(null);

  const selected    = drawers.find(d => String(d.id)===sel);
  const selCcys     = selected ? Object.keys(selected.ccyBalances||{ USD: selected.balance }) : [];

  const handleSelect = (id) => {
    setSel(id);
    const d = drawers.find(x => String(x.id)===id);
    if (d) {
      const bals = d.ccyBalances || { USD: d.balance };
      const init = {};
      Object.entries(bals).forEach(([code, val]) => { init[code] = String(val); });
      setEnterBals(init);
    } else {
      setEnterBals({});
    }
  };

  const handleOpen = () => {
    if (!sel || !staff) return;
    const shiftId   = genShiftId();
    const openedAt  = nowStr();
    const openingBal = parseFloat(enterBals["USD"] || selected?.balance || 0);
    const newShift  = {
      id: shiftId, drawerId: selected.id, drawerName: selected.name,
      staff, openedAt, closedAt: null,
      openingBal, openingCcyBals: { ...enterBals },
      closingBal: null, cashIn:0, cashOut:0, status:"Open", variance:null,
    };
    setShifts(p => [...p, newShift]);
    setDrawers(p => p.map(d => d.id===selected.id
      ? { ...d, inUseBy:staff, currentShift:shiftId, lastOpened:openedAt, lastBy:staff, opened:d.opened+1 }
      : d));
    setLastShift(newShift);
    setPanelOpen(false);
  };

  return (
    <>
      <div style={{ padding:"20px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h1 style={{ fontSize:17, fontWeight:600, color:T.txt }}>Open Cash Drawer</h1>
          <button onClick={() => { setLastShift(null); setSel(""); setStaff("Densal Demoniya"); setEnterBals({}); setNotes(""); setPanelOpen(true); }}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {IC.plus} Open Cash Drawer
          </button>
        </div>

        {lastShift && (
          <div style={{ background:T.blueLight, border:`1px solid ${T.blueBorder}`, borderRadius:6, padding:"14px 18px", marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.blue, marginBottom:8 }}>✓ Cash Drawer Opened Successfully</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, fontSize:12 }}>
              {[["Shift ID", <ShiftBadge id={lastShift.id} size="md"/>], ["Drawer", lastShift.drawerName], ["Staff", lastShift.staff], ["Opened At", lastShift.openedAt], ["Status", "Open — Session Active"]].map(([l,v]) => (
                <div key={l}><div style={{ color:T.txtLight, marginBottom:2 }}>{l}</div><div style={{ fontWeight:600, color:T.txt }}>{v}</div></div>
              ))}
            </div>
          </div>
        )}
        <p style={{ fontSize:13, color:T.txtLight }}>Each drawer opening creates a new shift session with a unique Shift ID. All transactions recorded during this session will be tagged to that shift.</p>
      </div>

      <DrawerPanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Open Cash Drawer" onSave={handleOpen} saveLabel="Continue" saveDisabled={!sel||!staff}>
        <Fld label="Select Drawer*">
          <Sel value={sel} onChange={e => handleSelect(e.target.value)}>
            <option value="">— Select a drawer —</option>
            {drawers.filter(d => d.status==="Active" && !d.inUseBy).map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </Sel>
        </Fld>

        {/* Per-currency balance rows — one per currency in selected drawer */}
        {selCcys.map(code => {
          const sysBal = (selected?.ccyBalances||{})[code] || 0;
          return (
            <div key={code} style={{ marginBottom:14 }}>
              <R2>
                <Fld label="System Starting Balance">
                  <div style={{ padding:"8px 12px", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:13, color:T.txtMid, background:"#FAFAFA" }}>
                    {code} {parseFloat(sysBal).toFixed(2)}
                  </div>
                </Fld>
                <Fld label="Enter Starting Balance">
                  <Inp
                    value={enterBals[code] !== undefined ? `${code}  ${enterBals[code]}` : ""}
                    onChange={e => setEnterBals(p => ({ ...p, [code]: e.target.value.replace(code,"").trimStart() }))}
                    placeholder={`${code}  0.00`}
                  />
                </Fld>
              </R2>
            </div>
          );
        })}

        <Fld label="Notes"><Txt value={notes} onChange={e => setNotes(e.target.value)} rows={4}/></Fld>
      </DrawerPanel>
    </>
  );
}

// Helper: render multi-line currency string as stacked divs
function mlPrint(str) {
  return (str||"").split("\n").map((l,i) => <div key={i}>{l}</div>);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 3 — CLOSE CASH DRAWER
   Two views:
   1. LIST — all closed shifts (Cashier Reports table) with date/user/drawer filters
   2. DETAIL — click a report → Summary (per-currency) + transaction table
   Plus: "Close Cash Drawer" button opens the 3-step wizard panel
═══════════════════════════════════════════════════════════════════════════ */
function CloseDrawerPage({ drawers, setDrawers, shifts, setShifts, txns }) {
  // Wizard state
  const [panelOpen, setPanelOpen] = useState(false);
  const [step, setStep]           = useState(0);
  const [sel, setSel]             = useState(String(drawers.find(d=>d.inUseBy)?.id||""));
  const [ccyCounts, setCcyCounts] = useState({});
  const [drop, setDrop]           = useState("");
  const [notes, setNotes]         = useState("");

  // List / detail view state
  const [detailShift, setDetailShift] = useState(null);
  const [filterOpen,  setFilterOpen]  = useState(true);
  const [exportOpen,  setExportOpen]  = useState(false);
  const handlePrint = () => {
    const el = document.getElementById("cashier-print-frame");
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write("<html><head><title>Cashier Report</title></head><body>" + el.innerHTML + "</body></html>");
    win.document.close();
    win.print();
  };
  const [filterDate,  setFilterDate]  = useState("01/01/2025 - 13/03/2026");
  const [filterUser,  setFilterUser]  = useState("ALL USERS");
  const [filterDrawer,setFilterDrawer]= useState("ALL DRAWERS");
  const [filterView,  setFilterView]  = useState("ALL REPORTS");
  const [filterReport,setFilterReport]= useState("");
  const [searchTxn,   setSearchTxn]   = useState("");

  const selected    = drawers.find(d => String(d.id)===sel);
  const activeShift = selected ? shifts.find(s => s.id===selected.currentShift) : null;
  const closeTxns   = activeShift ? (txns||[]).filter(t => t.shiftId===activeShift.id) : [];
  const closeAccounting = activeShift
    ? buildDrawerCloseAccounting({ shift:activeShift, drawer:selected, txns:closeTxns, counts:ccyCounts, cashDrop:drop })
    : null;
  const sysBal      = closeAccounting?.systemBalances?.USD || 0;
  const variance    = closeAccounting?.variance || 0;
  const mismatch    = ccyCounts["USD"] !== undefined && variance !== 0;

  // All closed shifts = our "Cashier Reports"
  const closedShifts = shifts.filter(s => s.status==="Closed");

  // Filtered list
  const filteredShifts = closedShifts.filter(s => {
    if (filterUser   !== "ALL USERS"   && s.staff       !== filterUser)    return false;
    if (filterDrawer !== "ALL DRAWERS" && s.drawerName  !== filterDrawer)  return false;
    if (filterReport && !s.id.includes(filterReport))                       return false;
    if (filterView === "OVERAGE"  && !(s.variance > 0))                    return false;
    if (filterView === "SHORTAGE" && !(s.variance < 0))                    return false;
    return true;
  });

  const handleClose = () => {
    if (!selected || !activeShift) return;
    const closedAt   = nowStr();
    const closeDrop = parseFloat(drop||0);
    const accounting = buildDrawerCloseAccounting({
      shift:activeShift,
      drawer:selected,
      txns:closeTxns,
      counts:ccyCounts,
      cashDrop:closeDrop,
    });
    setShifts(p => p.map(s => s.id===selected.currentShift
      ? { ...s, closedAt, closingBal:accounting.closingBal, status:"Closed",
          variance:accounting.variance, ccySummary:accounting.ccySummary,
          cashIn:accounting.cashIn, cashOut:accounting.cashOut,
          cashDrop:closeDrop, closeNotes:notes, openNotes:s.openNotes||"" }
      : s));
    setDrawers(p => p.map(d => d.id===selected.id
      ? { ...d, inUseBy:null, currentShift:null, lastClosed:closedAt,
          balance:accounting.drawerBalances.USD ?? accounting.closingBal,
          ccyBalances:accounting.drawerBalances }
      : d));
    setStep(0); setPanelOpen(false);
    setCcyCounts({}); setDrop(""); setNotes("");
  };

  const stepFooter = (
    <>
      <button onClick={() => step===0?setPanelOpen(false):setStep(s=>s-1)}
        style={{ padding:"7px 16px", borderRadius:4, border:`1px solid ${T.inputBdr}`, background:T.pageBg, color:T.txtMid, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
        {step===0?"Cancel":"Back"}
      </button>
      <button onClick={() => step<2 ? setStep(s=>s+1) : handleClose()}
        style={{ padding:"7px 20px", borderRadius:4, border:"none", background:T.blue, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
        {step===2 ? "Close Drawer" : "Continue"}
      </button>
    </>
  );

  /* ── DETAIL VIEW ─────────────────────────────────────────────────────────── */
  if (detailShift) {
    const s       = detailShift;
    const shiftTxns = (txns||[]).filter(t => t.shiftId===s.id);
    const filteredTxns = shiftTxns.filter(t => {
      if (!searchTxn) return true;
      const q = searchTxn.toLowerCase();
      return [t.acct,t.name,t.surname,t.room,t.notes].some(v=>v&&v.toLowerCase().includes(q));
    });

    return (
      <div style={{ padding:"20px 28px", overflowY:"auto" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>setDetailShift(null)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:T.pageBg, border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, color:T.txtMid, cursor:"pointer", fontFamily:"inherit" }}>
              {IC.back} Back
            </button>
            <h1 style={{ fontSize:16, fontWeight:600, color:T.txt, margin:0 }}>
              Cashier Report / <span style={{ color:T.blue }}>{s.id}</span>
            </h1>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ padding:"6px 14px", background:"#2E7D32", color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer" }}>📧 Email</button>
            <button style={{ padding:"6px 14px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer" }}>{IC.export} Export To ▾</button>
          </div>
        </div>

        {/* Filter — collapsed static display in detail view */}
        <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, marginBottom:0, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", fontSize:13, fontWeight:500, color:T.txtMid }}>
            <span style={{ fontSize:11 }}>›</span> Filter
          </div>
        </div>
        <div style={{ height:3, background:`linear-gradient(to right, ${T.blue}, #93C5FD)`, marginBottom:16, borderRadius:"0 0 2px 2px" }}/>

        {/* Summary — per-currency blocks stacked */}
        <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"11px 16px", borderBottom:`2px solid ${T.blue}`, fontSize:13, fontWeight:600, color:T.txt }}>Summary</div>
          {(s.ccySummary||[{code:"USD",inCount:0,outCount:0,totIn:s.cashIn||0,totOut:s.cashOut||0,bal:s.closingBal||0}]).map((cs,ci,arr) => (
            <div key={cs.code}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:T.thBg }}>
                    <th style={{ padding:"8px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}` }}></th>
                    <th style={{ padding:"8px 16px", textAlign:"right", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}` }}># OF TRANSACTIONS ({cs.code})</th>
                    <th style={{ padding:"8px 16px", textAlign:"right", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}` }}>AMOUNT ({cs.code})</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label:"Shift Start Overage / Shortage", count:"",          amount:`${cs.code} 0.00`,                   bold:false },
                    { label:"Starting Balance",               count:"",          amount:`${cs.code} 0.00`,                   bold:true  },
                    { label:"Cash Received",                  count:cs.inCount,  amount:`${cs.code} ${cs.totIn.toFixed(2)}`, bold:false },
                    { label:"Cash Paid Out",                  count:cs.outCount, amount:`${cs.code} ${cs.totOut.toFixed(2)}`,bold:false },
                    { label:"Shift End Overage / Shortage",   count:"",          amount:`${cs.code} 0.00`,                   bold:false },
                    { label:"Drawer Balance",                 count:"",          amount:`${cs.code} ${cs.bal.toFixed(2)}`,   bold:true  },
                    { label:"Cash Drop",                      count:"",          amount:`${cs.code} ${(s.cashDrop||0).toFixed(2)}`, bold:false },
                    { label:"Ending Balance",                 count:"",          amount:`${cs.code} ${(cs.bal-(s.cashDrop||0)).toFixed(2)}`, bold:true },
                  ].map((row,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${T.rowBorder}`, background:row.bold?"#EFF6FF":"" }}>
                      <td style={{ padding:"9px 16px", fontWeight:row.bold?700:400, color:row.bold?T.txt:T.txtMid }}>{row.label}</td>
                      <td style={{ padding:"9px 16px", textAlign:"right", color:T.txtMid }}>{row.count}</td>
                      <td style={{ padding:"9px 16px", textAlign:"right", fontWeight:row.bold?700:400, color:row.bold?T.txt:T.txtMid }}>{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ci < arr.length-1 && <div style={{ height:1, background:T.border }}/>}
            </div>
          ))}
        </div>

        {/* Transaction filter */}
        <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 16px", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.txtMid, marginBottom:8, cursor:"pointer" }}>▾ Filter</div>
          <div style={{ display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:11, color:T.txtLight, marginBottom:3 }}>Account #, Res #, Room #, Name</div>
              <Inp value={searchTxn} onChange={e=>setSearchTxn(e.target.value)} placeholder="Account #, Res #, Room #, Name"/>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.txtLight, marginBottom:3 }}>Group by</div>
              <Sel style={{ minWidth:120 }}><option>NONE</option><option>DATE</option><option>CURRENCY</option></Sel>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ padding:"7px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>APPLY</button>
              <button onClick={()=>setSearchTxn("")} style={{ padding:"7px 14px", background:T.pageBg, border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, cursor:"pointer", fontFamily:"inherit", color:T.txtMid }}>CLEAR</button>
            </div>
          </div>
        </div>

        {/* Transaction table */}
        <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.border}`, fontSize:13, fontWeight:600, color:T.txt }}>
            Cash Drawer Report — {s.drawerName} — {s.staff} — {s.closedAt?.split(" ")[0]}
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:T.thBg }}>
                  {["DATE/TIME","ACCOUNT #, RES #","NAME","SURNAME","ROOM","NOTES","AMOUNT"].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:h==="AMOUNT"?"right":"left", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>{h} <span style={{ opacity:.4 }}>{IC.sort}</span></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTxns.length===0 ? (
                  <tr><td colSpan={7} style={{ padding:"24px", textAlign:"center", color:T.txtXlight, fontSize:12 }}>No transactions for this shift.</td></tr>
                ) : filteredTxns.map((t,i) => {
                  const dispCcy = t.fxCcy||"USD";
                  const dispAmt = t.fxCcy ? Math.abs(t.fxAmt||0) : Math.abs(t.amount);
                  const isNeg   = t.fxCcy ? (t.fxAmt||0)<0 : t.amount<0;
                  return (
                    <tr key={t.id||i} style={{ borderBottom:`1px solid ${T.rowBorder}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.rowHover}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={{ padding:"9px 12px", color:T.txtMid, whiteSpace:"nowrap", fontSize:11 }}>{t.date}</td>
                      <td style={{ padding:"9px 12px" }}>{t.acct?<span style={{ color:T.blue, textDecoration:"underline", cursor:"pointer" }}>{t.acct}</span>:<span style={{ color:T.txtLight, fontSize:11 }}>Cash Drawer</span>}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.name||""}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.surname||""}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.room||""}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.notes||""}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:600, color:isNeg?T.warnColor:T.txt, whiteSpace:"nowrap" }}>
                        {dispCcy} {isNeg?"-":""}{dispAmt.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {filteredTxns.length > 0 && (
                  <tr style={{ background:T.thBg }}>
                    <td colSpan={6} style={{ padding:"8px 12px", textAlign:"right", fontSize:11, color:T.txtLight }}>Transactions Total</td>
                    <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:700, color:T.txt, fontSize:12 }}>
                      USD {filteredTxns.filter(t=>!t.fxCcy).reduce((a,t)=>a+t.amount,0).toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ── LIST VIEW ───────────────────────────────────────────────────────────── */
  return (
    <>
      <div style={{ padding:"20px 28px", overflowY:"auto" }}>
        {/* Header — eZee style */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <h1 style={{ fontSize:17, fontWeight:700, color:T.txt, margin:0 }}>Close Cash Drawer</h1>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#2E7D32", color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer" }}>📧 Email</button>
            <button onClick={()=>setExportOpen(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer" }}>{IC.export} Export To ▾</button>
            <button onClick={() => { setStep(0); setCcyCounts({}); setDrop(""); setNotes(""); setPanelOpen(true); }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Close Cash Drawer
            </button>
          </div>
        </div>

        {/* Collapsible Filter — eZee style: collapsed by default, "› Filter" header */}
        <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, marginBottom:0, overflow:"hidden" }}>
          <div onClick={()=>setFilterOpen(o=>!o)}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", cursor:"pointer", fontSize:13, fontWeight:500, color:T.txtMid, userSelect:"none" }}>
            <span style={{ fontSize:11, transition:"transform .2s", display:"inline-block", transform:filterOpen?"rotate(90deg)":"rotate(0deg)" }}>›</span>
            Filter
          </div>
          {filterOpen && (
            <div style={{ padding:"12px 16px 14px", borderTop:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontSize:11, color:T.txtLight, marginBottom:3 }}>Date Range</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, color:T.txtMid, background:"#FAFAFA", minWidth:200 }}>
                    📅 {filterDate} ▾
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:T.txtLight, marginBottom:3 }}>User</div>
                  <Sel value={filterUser} onChange={e=>setFilterUser(e.target.value)} style={{ minWidth:140 }}>
                    <option>ALL USERS</option>
                    {[...new Set(closedShifts.map(s=>s.staff))].map(u=><option key={u}>{u}</option>)}
                  </Sel>
                </div>
                <div>
                  <div style={{ fontSize:11, color:T.txtLight, marginBottom:3 }}>Drawer</div>
                  <Sel value={filterDrawer} onChange={e=>setFilterDrawer(e.target.value)} style={{ minWidth:150 }}>
                    <option>ALL DRAWERS</option>
                    {[...new Set(closedShifts.map(s=>s.drawerName))].map(d=><option key={d}>{d}</option>)}
                  </Sel>
                </div>
                <div>
                  <div style={{ fontSize:11, color:T.txtLight, marginBottom:3 }}>View</div>
                  <Sel value={filterView} onChange={e=>setFilterView(e.target.value)} style={{ minWidth:180 }}>
                    <option value="ALL REPORTS">All Reports</option>
                    <option value="OVERAGE">Ending Balance Overages Only</option>
                    <option value="SHORTAGE">Ending Balance Shortages Only</option>
                  </Sel>
                </div>
                <div>
                  <div style={{ fontSize:11, color:T.txtLight, marginBottom:3 }}>Report #</div>
                  <Inp value={filterReport} onChange={e=>setFilterReport(e.target.value)} placeholder="Report #" style={{ width:120 }}/>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button style={{ padding:"7px 18px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", letterSpacing:.3 }}>APPLY</button>
                  <button onClick={()=>{setFilterUser("ALL USERS");setFilterDrawer("ALL DRAWERS");setFilterView("ALL REPORTS");setFilterReport("");}}
                    style={{ padding:"7px 14px", background:"#fff", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, cursor:"pointer", fontFamily:"inherit", color:T.txtMid }}>CLEAR</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blue separator line — eZee style */}
        <div style={{ height:3, background:`linear-gradient(to right, ${T.blue}, #93C5FD)`, marginBottom:16, borderRadius:"0 0 2px 2px" }}/>

        {/* Cashier Reports table — eZee card style */}
        <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ padding:"11px 16px", borderBottom:`2px solid ${T.blue}`, fontSize:13, fontWeight:600, color:T.txt, display:"flex", alignItems:"center", gap:8 }}>
            🗂 Cashier Reports
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:T.thBg }}>
                  {["REPORT #","USER","DRAWER","DATE/TIME OPENED","DATE/TIME CLOSED",
                    "EXPECTED STARTING CASH BALANCE","STARTING CASH BALANCE",
                    "EXPECTED ENDING CASH BALANCE","ENDING CASH BALANCE",
                    "AMOUNT RECEIVED","CASH DROP","OPEN NOTES","CLOSE NOTES"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", textAlign:["EXPECTED STARTING CASH BALANCE","STARTING CASH BALANCE","EXPECTED ENDING CASH BALANCE","ENDING CASH BALANCE","AMOUNT RECEIVED","CASH DROP"].includes(h)?"right":"left", fontWeight:600, fontSize:10, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:2 }}>{h} <span style={{ opacity:.4 }}>{IC.sort}</span></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredShifts.length===0 ? (
                  <tr><td colSpan={13} style={{ padding:"32px", textAlign:"center", color:T.txtXlight }}>No closed drawer reports found.</td></tr>
                ) : filteredShifts.map(s => {
                  const usdCs   = (s.ccySummary||[]).find(x=>x.code==="USD");
                  const fxCodes = (s.ccySummary||[]).filter(x=>x.code!=="USD");
                  const isMulti = fxCodes.length > 0;
                  const amtReceived = s.ccySummary
                    ? s.ccySummary.map(cs=>`${cs.code} ${cs.totIn.toFixed(2)}`).join("\n")
                    : `USD ${(s.cashIn||0).toFixed(2)}`;
                  const endingBal = s.ccySummary
                    ? s.ccySummary.map(cs=>`${cs.code} ${(cs.bal-(s.cashDrop||0)).toFixed(2)}`).join("\n")
                    : `USD ${(s.closingBal||0).toFixed(2)}`;
                  const startBal = s.ccySummary
                    ? s.ccySummary.map(cs=>`${cs.code} 0.00`).join("\n")
                    : "USD 0.00";

                  return (
                    <tr key={s.id} style={{ borderBottom:`1px solid ${T.rowBorder}`, verticalAlign:"top" }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.rowHover}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={{ padding:"10px 10px" }}>
                        <span onClick={()=>setDetailShift(s)} style={{ color:T.blue, textDecoration:"underline", cursor:"pointer", fontWeight:600 }}>{s.id}</span>
                      </td>
                      <td style={{ padding:"10px 10px", color:T.txtMid }}>{s.staff}</td>
                      <td style={{ padding:"10px 10px", color:T.txtMid, whiteSpace:"nowrap" }}>{s.drawerName}</td>
                      <td style={{ padding:"10px 10px", color:T.txtMid, whiteSpace:"nowrap", fontSize:11 }}>{s.openedAt}</td>
                      <td style={{ padding:"10px 10px", color:T.txtMid, whiteSpace:"nowrap", fontSize:11 }}>{s.closedAt}</td>
                      <td style={{ padding:"10px 10px", textAlign:"right", color:T.txtMid }}>{mlPrint(startBal)}</td>
                      <td style={{ padding:"10px 10px", textAlign:"right", color:s.variance&&s.variance!==0?T.warnColor:T.blue }}>
                        {mlPrint(startBal)}
                      </td>
                      <td style={{ padding:"10px 10px", textAlign:"right", color:T.txtMid }}>{mlPrint(endingBal)}</td>
                      <td style={{ padding:"10px 10px", textAlign:"right", color:T.txt, fontWeight:600 }}>{mlPrint(endingBal)}</td>
                      <td style={{ padding:"10px 10px", textAlign:"right", color:T.txt }}>{mlPrint(amtReceived)}</td>
                      <td style={{ padding:"10px 10px", textAlign:"right", color:T.txtMid }}>
                        {mlPrint(s.ccySummary ? s.ccySummary.map(cs=>`${cs.code} ${(s.cashDrop||0).toFixed(2)}`).join("\n") : `USD ${(s.cashDrop||0).toFixed(2)}`)}
                      </td>
                      <td style={{ padding:"10px 10px", color:T.txtMid, fontSize:11 }}>{s.openNotes||""}</td>
                      <td style={{ padding:"10px 10px", color:T.txtMid, fontSize:11 }}>{s.closeNotes||""}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Repeat header at bottom like reference image */}
              <tfoot>
                <tr style={{ background:T.thBg }}>
                  {["REPORT #","USER","DRAWER","DATE/TIME OPENED","DATE/TIME CLOSED",
                    "EXPECTED STARTING CASH BALANCE","STARTING CASH BALANCE",
                    "EXPECTED ENDING CASH BALANCE","ENDING CASH BALANCE",
                    "AMOUNT RECEIVED","CASH DROP","OPEN NOTES","CLOSE NOTES"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", textAlign:["EXPECTED STARTING CASH BALANCE","STARTING CASH BALANCE","EXPECTED ENDING CASH BALANCE","ENDING CASH BALANCE","AMOUNT RECEIVED","CASH DROP"].includes(h)?"right":"left", fontWeight:600, fontSize:10, color:T.txtLight, borderTop:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── EXPORT / PRINT MODAL ── */}
      {exportOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>{ if(e.target===e.currentTarget) setExportOpen(false); }}>
          <div style={{ background:"#fff", borderRadius:8, width:"90vw", maxWidth:1100, maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,.25)" }}>
            {/* Toolbar */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #E5E7EB", background:"#F9FAFB" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Cashier Report — Export Preview</span>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={handlePrint}
                  style={{ padding:"6px 14px", background:"#1D4ED8", color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer" }}>🖨 Print</button>
                <button onClick={()=>setExportOpen(false)}
                  style={{ padding:"6px 12px", background:"#fff", border:"1px solid #D1D5DB", borderRadius:4, fontSize:12, cursor:"pointer", color:"#6B7280" }}>✕ Close</button>
              </div>
            </div>
            {/* Report body */}
            <div style={{ overflowY:"auto", flex:1, padding:"0 0 24px 0" }}>
              <div id="cashier-print-frame" style={{ background:"#fff", maxWidth:900, margin:"32px auto", padding:"40px 48px", fontFamily:"Arial, sans-serif", fontSize:12, color:"#111" }}>
                {/* Header */}
                <div style={{ fontSize:16, fontWeight:700, marginBottom:24, color:"#111" }}>BlueGreen Ocean Zanzibar - Cashier Report</div>
                {/* Table */}
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ borderTop:"2px solid #111", borderBottom:"1px solid #111" }}>
                      {["Report #","User","Drawer","Date/Time Opened","Date/Time Closed",
                        "Expected Starting Cash Balance","Starting Cash Balance",
                        "Expected Ending Cash Balance","Ending Cash Balance",
                        "Amount Received","Cash Drop","Open Notes","Close Notes"].map(h=>(
                        <th key={h} style={{ padding:"6px 8px", textAlign:["Expected Starting Cash Balance","Starting Cash Balance","Expected Ending Cash Balance","Ending Cash Balance","Amount Received","Cash Drop"].includes(h)?"right":"left", fontWeight:700, fontSize:10, whiteSpace:"normal", lineHeight:1.3, verticalAlign:"bottom" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShifts.map(s => {
                      const amtR    = s.ccySummary ? s.ccySummary.map(cs=>`${cs.code} ${cs.totIn.toFixed(2)}`).join("\n") : `USD ${(s.cashIn||0).toFixed(2)}`;
                      const endB    = s.ccySummary ? s.ccySummary.map(cs=>`${cs.code} ${(cs.bal-(s.cashDrop||0)).toFixed(2)}`).join("\n") : `USD ${(s.closingBal||0).toFixed(2)}`;
                      const startB  = s.ccySummary ? s.ccySummary.map(cs=>`${cs.code} 0.00`).join("\n") : "USD 0.00";
                      const dropB   = s.ccySummary ? s.ccySummary.map(cs=>`${cs.code} ${(s.cashDrop||0).toFixed(2)}`).join("\n") : `USD ${(s.cashDrop||0).toFixed(2)}`;
                      return (
                        <tr key={s.id} style={{ borderBottom:"1px solid #E5E7EB", verticalAlign:"top" }}>
                          <td style={{ padding:"5px 8px" }}>{s.id}</td>
                          <td style={{ padding:"5px 8px" }}>{s.staff}</td>
                          <td style={{ padding:"5px 8px" }}>{s.drawerName}</td>
                          <td style={{ padding:"5px 8px", whiteSpace:"nowrap", fontSize:10 }}>{s.openedAt}</td>
                          <td style={{ padding:"5px 8px", whiteSpace:"nowrap", fontSize:10 }}>{s.closedAt}</td>
                          <td style={{ padding:"5px 8px", textAlign:"right" }}>{mlPrint(startB)}</td>
                          <td style={{ padding:"5px 8px", textAlign:"right" }}>{mlPrint(startB)}</td>
                          <td style={{ padding:"5px 8px", textAlign:"right" }}>{mlPrint(endB)}</td>
                          <td style={{ padding:"5px 8px", textAlign:"right" }}>{mlPrint(endB)}</td>
                          <td style={{ padding:"5px 8px", textAlign:"right" }}>{mlPrint(amtR)}</td>
                          <td style={{ padding:"5px 8px", textAlign:"right" }}>{mlPrint(dropB)}</td>
                          <td style={{ padding:"5px 8px", fontSize:10 }}>{s.openNotes||""}</td>
                          <td style={{ padding:"5px 8px", fontSize:10 }}>{s.closeNotes||""}</td>
                        </tr>
                      );
                    })}
                    {/* Repeat header row at bottom */}
                    <tr style={{ borderTop:"1px solid #111", borderBottom:"2px solid #111" }}>
                      {["Report #","User","Drawer","Date/Time Opened","Date/Time Closed",
                        "Expected Starting Cash Balance","Starting Cash Balance",
                        "Expected Ending Cash Balance","Ending Cash Balance",
                        "Amount Received","Cash Drop","Open Notes","Close Notes"].map(h=>(
                        <th key={h} style={{ padding:"6px 8px", textAlign:["Expected Starting Cash Balance","Starting Cash Balance","Expected Ending Cash Balance","Ending Cash Balance","Amount Received","Cash Drop"].includes(h)?"right":"left", fontWeight:700, fontSize:10, whiteSpace:"normal", lineHeight:1.3, verticalAlign:"bottom" }}>{h}</th>
                      ))}
                    </tr>
                  </tbody>
                </table>
                {/* Footer */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:40, paddingTop:12, borderTop:"1px solid #E5E7EB", fontSize:10, color:"#6B7280" }}>
                  <span>Report generated on {new Date().toLocaleDateString("en-GB").replace(/\//g,"/") + " - " + new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
                  <span style={{ fontWeight:700, color:"#111" }}>✦ eZee Absolute</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CLOSE DRAWER WIZARD PANEL ── */}
      <DrawerPanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Close Cash Drawer" width={500} extraFooter={stepFooter}>
        <Steps steps={["Balance","Cash Drop","Summary"]} cur={step}/>

        {step===0 && (<>
          <Fld label="Select Drawer">
            <Sel value={sel} onChange={e => { setSel(e.target.value); setCcyCounts({}); }}>
              {drawers.filter(d => d.inUseBy).map(d => <option key={d.id} value={String(d.id)}>{d.name} (In use by {d.inUseBy})</option>)}
            </Sel>
          </Fld>
          {activeShift && (
            <div style={{ background:T.shiftBg, border:`1px solid ${T.shiftBdr}`, borderRadius:4, padding:"10px 12px", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:600, color:T.shiftColor }}>Active Shift</span>
                <ShiftBadge id={activeShift.id}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:11, color:T.txtMid }}>
                <div><div style={{ color:T.txtXlight }}>Opened By</div><strong>{activeShift.staff}</strong></div>
                <div><div style={{ color:T.txtXlight }}>Opened At</div><strong>{activeShift.openedAt}</strong></div>
                <div><div style={{ color:T.txtXlight }}>Opening Bal</div><strong>USD {(activeShift.openingBal||0).toFixed(2)}</strong></div>
              </div>
            </div>
          )}
          {(() => {
            const drawerCcys = closeAccounting?.currencies || ["USD"];
            const sysByCode  = closeAccounting?.systemBalances || { USD:sysBal };
            return drawerCcys.map(code => (
              <div key={code} style={{ marginBottom:14 }}>
                <R2>
                  <Fld label="Drawer Balance">
                    <Inp value={ccyCounts[code]!==undefined?`${code}  ${ccyCounts[code]}`:""}
                      onChange={e=>setCcyCounts(p=>({...p,[code]:e.target.value.replace(code,"").trimStart()}))}
                      placeholder={`${code}  0.00`}/>
                  </Fld>
                  <Fld label="System Balance">
                    <div style={{ padding:"8px 12px", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:13, color:T.txtMid, background:"#FAFAFA" }}>
                      {code} {(sysByCode[code]||0).toFixed(2)}
                    </div>
                  </Fld>
                </R2>
              </div>
            ));
          })()}
          {mismatch && <Alert type="warn">USD variance of {fmt(Math.abs(variance))}. Will be flagged in audit log.</Alert>}
          <Fld label="Notes"><Txt value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/></Fld>
        </>)}

        {step===1 && (<>
          {(() => {
            const drawerCcys = closeAccounting?.currencies || ["USD"];
            const sysByCode  = closeAccounting?.systemBalances || { USD:sysBal };
            const countedByCode = closeAccounting?.closingBalances || {};
            return (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:6 }}>
                  {["Drawer Balance","Cash Drop","Ending Shift Balance"].map(h=>(
                    <div key={h} style={{ fontSize:11, fontWeight:600, color:T.txtMid }}>{h}</div>
                  ))}
                </div>
                {drawerCcys.map(code => {
                  const drawerBal = countedByCode[code] ?? sysByCode[code] ?? 0;
                  const cashDrop  = code==="USD" ? parseFloat(drop||0) : 0;
                  const endingBal = drawerBal - cashDrop;
                  return (
                    <div key={code} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12, alignItems:"center" }}>
                      <div style={{ padding:"8px 12px", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:13, color:T.txtMid, background:"#FAFAFA" }}>{code} {drawerBal.toFixed(2)}</div>
                      {code==="USD"
                        ? <Inp value={drop} onChange={e=>setDrop(e.target.value)} placeholder={`${code}  0.00`}/>
                        : <div style={{ padding:"8px 12px", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:13, color:T.txtXlight, background:"#FAFAFA" }}>{code}  0.00</div>}
                      <div style={{ padding:"8px 12px", border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:13, color:T.txtMid, background:"#FAFAFA" }}>{code} {endingBal.toFixed(2)}</div>
                    </div>
                  );
                })}
                <Fld label="Notes"><Txt value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></Fld>
              </>
            );
          })()}
        </>)}

        {step===2 && (<>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, padding:"10px 14px", background:T.statBg, border:`1px solid ${T.statBdr}`, borderRadius:6 }}>
            <div><div style={{ fontSize:11, color:T.txtLight, marginBottom:2 }}>Cashier</div><div style={{ fontSize:13, fontWeight:600, color:T.txt }}>{activeShift?.staff||"—"}</div></div>
            <div><div style={{ fontSize:11, color:T.txtLight, marginBottom:2 }}>Shift ID</div><div style={{ fontSize:13, fontWeight:600, color:T.txt }}>{activeShift?.id||"—"}</div></div>
            <div style={{ cursor:"pointer", color:T.txtMid }}>🖨</div>
          </div>
          {(() => {
            const summaries = closeAccounting?.ccySummary || [];
            return summaries.map((summary, ci) => {
              const code = summary.code;
              const isUSD = code==="USD";
              const drawerBal = closeAccounting?.closingBalances?.[code] ?? summary.bal;
              const cashDrop  = isUSD ? parseFloat(drop||0) : 0;
              const endingBal = closeAccounting?.drawerBalances?.[code] ?? (drawerBal - cashDrop);
              const rows2 = [
                { label:"Starting Balance",              count:"",       amount:`${code} 0.00`,               bold:true  },
                { label:"Shift Start Overage / Shortage",count:"",       amount:`${code} 0.00`,               bold:false },
                { label:"Cash Received",                 count:summary.inCount,  amount:`${code} ${summary.totIn.toFixed(2)}`,bold:false },
                { label:"Cash Paid Out",                 count:summary.outCount, amount:`${code} ${summary.totOut.toFixed(2)}`,bold:false},
                { label:"Shift End Overage / Shortage",  count:"",       amount:`${code} 0.00`,               bold:false },
                { label:"Drawer Balance",                count:"",       amount:`${code} ${drawerBal.toFixed(2)}`, bold:true },
                { label:"Cash Drop",                     count:"",       amount:`${code} ${cashDrop.toFixed(2)}`,  bold:false },
                { label:"Ending Shift Balance",          count:"",       amount:`${code} ${endingBal.toFixed(2)}`, bold:true },
              ];
              return (
                <div key={code}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:T.thBg }}>
                        <th style={{ padding:"6px 10px", textAlign:"left", fontWeight:600, fontSize:10, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}` }}>Type</th>
                        <th style={{ padding:"6px 10px", textAlign:"center", fontWeight:600, fontSize:10, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}` }}># of Transactions</th>
                        <th style={{ padding:"6px 10px", textAlign:"right", fontWeight:600, fontSize:10, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}` }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows2.map((r,i)=>(
                        <tr key={i} style={{ borderBottom:`1px solid ${T.rowBorder}`, background:r.bold?"#EFF6FF":"" }}>
                          <td style={{ padding:"7px 10px", fontWeight:r.bold?700:400, color:r.bold?T.txt:T.txtMid }}>{r.label}</td>
                          <td style={{ padding:"7px 10px", textAlign:"center", color:T.txtMid }}>{r.count||""}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:r.bold?700:400, color:r.bold?T.txt:T.txtMid }}>{r.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ci < summaries.length-1 && <div style={{ height:10 }}/>}
                </div>
              );
            });
          })()}
          {mismatch && <div style={{ marginTop:10 }}><Alert type="warn">USD variance of {fmt(Math.abs(variance))}. Will be flagged in audit log.</Alert></div>}
        </>)}
      </DrawerPanel>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 4 — ACCESS OPEN DRAWERS
   Multi-currency: summary table has columns per currency (like the reference image).
   Transaction log shows native currency amount per row.
   Currency filter, group-by filter.
   Export button opens a print-ready cashier report matching the PDF reference.
═══════════════════════════════════════════════════════════════════════════ */
function AccessPage({ drawers, shifts, txns: txnsProp, setTxns: setTxnsProp }) {
  const openD   = drawers.filter(d => d.inUseBy);
  const [sel, setSel]           = useState(String(openD[0]?.id||""));
  const [txnsLocal, setTxnsLocal] = useState(OPEN_TXNS_INIT);
  const txns    = txnsProp    || txnsLocal;
  const setTxns = setTxnsProp || setTxnsLocal;

  // Filter state
  const [search,  setSearch]  = useState("");
  const [selCcys, setSelCcys] = useState(CURRENCIES.map(c=>c.code)); // all selected
  const [ccyDropOpen, setCcyDropOpen] = useState(false);

  // Add/Remove Cash panel state
  const [addOpen, setAddOpen] = useState(false);
  const [remOpen, setRemOpen] = useState(false);
  const [amt,     setAmt]     = useState("");
  const [note,    setNote]    = useState("");
  const [ccy,     setCcy]     = useState("USD");
  const [fxRate,  setFxRate]  = useState("");

  const selCcyObj = CURRENCIES.find(c => c.code===ccy) || CURRENCIES[0];
  const useRate   = ccy==="USD" ? 1 : (parseFloat(fxRate)||selCcyObj.defaultRate);
  const usdAmt    = ccy==="USD" ? parseFloat(amt||0) : toUSD(amt, useRate);

  const selD        = drawers.find(d => String(d.id)===sel);
  const activeShift = selD ? shifts.find(s => s.id===selD.currentShift) : null;

  // All txns for this drawer's current shift
  const shiftTxns = activeShift ? txns.filter(t => t.shiftId===activeShift.id) : [];

  // Determine all currencies present in this shift
  const ccysInShift = [...new Set([
    "USD",
    ...shiftTxns.filter(t=>t.fxCcy).map(t=>t.fxCcy)
  ])];

  // Filtered txns for the transaction table
  const visibleTxns = shiftTxns.filter(t => {
    const txnCcy = t.fxCcy || "USD";
    if (!selCcys.includes(txnCcy)) return false;
    if (search) {
      const s = search.toLowerCase();
      return [t.acct,t.name,t.surname,t.room,t.notes].some(v=>v&&v.toLowerCase().includes(s));
    }
    return true;
  });

  // Per-currency summary data
  const ccySummary = ccysInShift.map(code => {
    const isBase = code==="USD";
    const rows   = isBase
      ? shiftTxns.filter(t => !t.fxCcy)          // pure USD txns
      : shiftTxns.filter(t => t.fxCcy===code);   // foreign txns in this currency
    const getAmt  = t => isBase ? t.amount : (t.fxAmt||0);
    const inRows  = rows.filter(t => (isBase?t.amount:t.fxAmt||0) > 0);
    const outRows = rows.filter(t => (isBase?t.amount:t.fxAmt||0) < 0);
    const totIn   = inRows.reduce((a,t)=>a+Math.abs(getAmt(t)),0);
    const totOut  = outRows.reduce((a,t)=>a+Math.abs(getAmt(t)),0);
    const bal     = totIn - totOut;
    const c       = CURRENCIES.find(x=>x.code===code)||{symbol:code,code};
    return { code, symbol:c.symbol, name:c.name, inCount:inRows.length, outCount:outRows.length, totIn, totOut, bal };
  });

  const buildTxn = (sign) => {
    const base = { id:`TXN-${Date.now()}`, shiftId:selD?.currentShift||"", date:nowStr(), acct:"", name:"Manual", surname:"", room:"", notes:note||(sign>0?"Cash Added":"Cash Removed"), ccy:"USD", amount:sign*usdAmt, by:"John Manager" };
    if (ccy !== "USD") { base.fxCcy=ccy; base.fxAmt=sign*parseFloat(amt); base.fxRate=useRate; base.fxSymbol=selCcyObj.symbol; }
    return base;
  };
  const doAdd = () => { if(!amt) return; setTxns(p=>[buildTxn(1),...p]); setAmt(""); setNote(""); setCcy("USD"); setFxRate(""); setAddOpen(false); };
  const doRem = () => { if(!amt) return; setTxns(p=>[buildTxn(-1),...p]); setAmt(""); setNote(""); setCcy("USD"); setFxRate(""); setRemOpen(false); };

  // ── CASHIER REPORT — inline modal (popup blocker safe) ──
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <div style={{ padding:"20px 28px", overflowY:"auto" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <h1 style={{ fontSize:17, fontWeight:600, color:T.txt }}>
            Cash Drawer / <span style={{ fontWeight:400, color:T.txtMid }}>{selD?.name||"—"}</span>
          </h1>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>📧 Email</button>
            <button onClick={()=>setReportOpen(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{IC.export} Export To ▾</button>
          </div>
        </div>

        {/* Active shift info bar */}
        {activeShift && (
          <div style={{ background:T.shiftBg, border:`1px solid ${T.shiftBdr}`, borderRadius:6, padding:"10px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>{IC.shift}
              <span style={{ fontSize:12, fontWeight:600, color:T.shiftColor }}>Active Shift</span>
              <ShiftBadge id={activeShift.id} size="md"/>
            </div>
            <div style={{ fontSize:12, color:T.txtMid, display:"flex", gap:20 }}>
              <span>👤 {activeShift.staff}</span>
              <span>🕐 Opened {activeShift.openedAt}</span>
              <span>Opening balance: <strong>{fmt(activeShift.openingBal)}</strong></span>
            </div>
          </div>
        )}

        {/* Drawer selector */}
        <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px", marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.txtMid, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.4px" }}>Filter</div>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:11, color:T.txtLight, marginBottom:4 }}>Select Cash Drawer</div>
              <div style={{ minWidth:280 }}>
                <Sel value={sel} onChange={e => setSel(e.target.value)}>
                  {openD.map(d => <option key={d.id} value={String(d.id)}>{d.name.toUpperCase()} (IN USE BY {d.inUseBy?.toUpperCase()})</option>)}
                </Sel>
              </div>
            </div>
          </div>
        </div>

        {/* ── SUMMARY TABLE — columns per currency, matching reference image ── */}
        <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.border}`, fontSize:13, fontWeight:600, color:T.txt, display:"flex", alignItems:"center", gap:8 }}>
            Summary {activeShift && <ShiftBadge id={activeShift.id}/>}
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:T.thBg }}>
                  <th style={{ padding:"8px 14px", textAlign:"left", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}`, minWidth:180 }}></th>
                  {ccySummary.map(s => (
                    <React.Fragment key={s.code}>
                      <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}`, borderLeft:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}># OF TRANSACTIONS ({s.code})</th>
                      <th style={{ padding:"8px 14px", textAlign:"right", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}>AMOUNT ({s.code})</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label:"Shift Start Overage / Shortage", bold:false, key:"overage" },
                  { label:"Starting Balance",               bold:true,  key:"start"   },
                  { label:"Cash Received",                  bold:false, key:"in"      },
                  { label:"Cash Paid Out",                  bold:false, key:"out"     },
                  { label:"CURRENT BALANCE",                bold:true,  key:"bal"     },
                ].map(row => (
                  <tr key={row.key} style={{ borderBottom:`1px solid ${T.rowBorder}`, background:row.key==="start"?"#EFF6FF":row.key==="bal"?T.thBg:"" }}>
                    <td style={{ padding:"9px 14px", fontWeight:row.bold?700:400, color:row.bold?T.txt:T.txtMid }}>{row.label}</td>
                    {ccySummary.map(s => (
                      <React.Fragment key={s.code}>
                        <td style={{ padding:"9px 10px", textAlign:"right", color:T.txtMid, borderLeft:`1px solid ${T.rowBorder}` }}>
                          {row.key==="in" ? s.inCount : row.key==="out" ? s.outCount : ""}
                        </td>
                        <td style={{ padding:"9px 14px", textAlign:"right", fontWeight:row.bold?700:400, color:row.bold?T.txt:T.txtMid }}>
                          {row.key==="overage" ? `${s.code} 0.00`
                          :row.key==="start"   ? `${s.code} 0.00`
                          :row.key==="in"      ? `${s.code} ${s.totIn.toFixed(2)}`
                          :row.key==="out"     ? `${s.code} ${s.totOut.toFixed(2)}`
                          :                      `${s.code} ${s.bal.toFixed(2)}`}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FILTER BAR above transaction table ── */}
        <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.txtMid, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.4px" }}>Filter</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:11, color:T.txtLight, marginBottom:4 }}>Account #, Res #, Room #, Name</div>
              <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Account #, Res #, Room #, Name"/>
            </div>
            <div style={{ minWidth:160, position:"relative" }}>
              <div style={{ fontSize:11, color:T.txtLight, marginBottom:4 }}>Currency</div>
              <button onClick={()=>setCcyDropOpen(p=>!p)} style={{ width:"100%", padding:"7px 10px", border:`1px solid ${T.inputBdr}`, borderRadius:4, background:"#fff", fontSize:12, textAlign:"left", cursor:"pointer", fontFamily:"inherit", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>{selCcys.length} OF {CURRENCIES.length} SELECTED</span>
                {IC.chevD}
              </button>
              {ccyDropOpen && (
                <div style={{ position:"absolute", top:"100%", left:0, zIndex:100, background:"#fff", border:`1px solid ${T.border}`, borderRadius:4, boxShadow:"0 4px 12px rgba(0,0,0,0.1)", minWidth:180, padding:"6px 0" }}>
                  {CURRENCIES.map(c => (
                    <label key={c.code} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", cursor:"pointer", fontSize:12, color:T.txt }}>
                      <input type="checkbox" checked={selCcys.includes(c.code)}
                        onChange={e => setSelCcys(p => e.target.checked ? [...p,c.code] : p.filter(x=>x!==c.code))}
                        style={{ accentColor:T.blue }}/>
                      {c.code} — {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setCcyDropOpen(false)} style={{ padding:"7px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>APPLY</button>
              <button onClick={()=>{setSearch("");setSelCcys(CURRENCIES.map(c=>c.code));}} style={{ padding:"7px 14px", background:T.pageBg, border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, cursor:"pointer", fontFamily:"inherit", color:T.txtMid }}>CLEAR</button>
            </div>
          </div>
        </div>

        {/* Add / Remove Cash buttons */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <button onClick={()=>setAddOpen(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>+ ADD CASH</button>
          <button onClick={()=>setRemOpen(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 16px", background:T.warnColor, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>− REMOVE CASH</button>
        </div>

        {/* ── TRANSACTION TABLE — native currency amount per row ── */}
        <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.border}`, fontSize:13, fontWeight:600, color:T.txt }}>
            Cash Drawer — {selD?.name} (Drawer Open) — {selD?.inUseBy}
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:T.thBg }}>
                  {["DATE/TIME","ACCOUNT #, RES #","NAME","SURNAME","ROOM","NOTES","AMOUNT"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", textAlign:h==="AMOUNT"?"right":"left", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>{h} <span style={{ opacity:.4 }}>{IC.sort}</span></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTxns.map((t,i) => {
                  const dispCcy = t.fxCcy || "USD";
                  const dispAmt = t.fxCcy ? Math.abs(t.fxAmt||0) : Math.abs(t.amount);
                  const isNeg   = t.fxCcy ? (t.fxAmt||0)<0 : t.amount<0;
                  const sym     = CURRENCIES.find(c=>c.code===dispCcy)?.symbol||dispCcy;
                  return (
                    <tr key={t.id||i} style={{ borderBottom:`1px solid ${T.rowBorder}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.rowHover}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={{ padding:"9px 12px", color:T.txtMid, whiteSpace:"nowrap" }}>{t.date}</td>
                      <td style={{ padding:"9px 12px" }}>{t.acct ? <span style={{ color:T.blue, textDecoration:"underline", cursor:"pointer" }}>{t.acct}</span> : <span style={{ color:T.txtLight, fontSize:11 }}>Cash Drawer</span>}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.name}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.surname}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.room || selD?.name}</td>
                      <td style={{ padding:"9px 12px", color:T.txtMid }}>{t.notes}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:600, color:isNeg?T.warnColor:T.txt, whiteSpace:"nowrap" }}>
                        {dispCcy} {isNeg?"-":""}{dispAmt.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {/* Transactions total footer — grouped per currency */}
                {ccySummary.map(s => (
                  <tr key={`tot-${s.code}`} style={{ background:T.thBg }}>
                    <td colSpan={6} style={{ padding:"8px 12px", textAlign:"right", fontSize:11, color:T.txtLight }}>
                      Transactions Total ({s.code})
                    </td>
                    <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:700, color:T.txt, whiteSpace:"nowrap" }}>
                      {s.code} {s.bal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── ADD / REMOVE CASH panels ── */}
      {[{open:addOpen,onClose:()=>{setAddOpen(false);setCcy("USD");setFxRate("");},onSave:doAdd,title:"Add Cash",label:"Add Cash"},
        {open:remOpen,onClose:()=>{setRemOpen(false);setCcy("USD");setFxRate("");},onSave:doRem,title:"Remove Cash",label:"Remove Cash"}
      ].map(({open,onClose,onSave,title,label}) => (
        <DrawerPanel key={title} open={open} onClose={onClose} title={title} onSave={onSave} saveLabel={label} saveDisabled={!amt}>
          <Fld label="Currency Received" hint="Currency the guest is physically handing over">
            <Sel value={ccy} onChange={e=>{setCcy(e.target.value);setFxRate("");}}>
              {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>)}
            </Sel>
          </Fld>
          <Fld label={`Amount in ${ccy}`} req>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.txtMid, fontWeight:600, fontSize:12, pointerEvents:"none" }}>{selCcyObj.code}</span>
              <Inp value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00" type="number" style={{ paddingLeft:28 }}/>
            </div>
          </Fld>
          {ccy !== "USD" && (
            <>
              <Fld label={`Conversion Rate (1 USD = ? ${ccy})`} hint={`Default: ${selCcyObj.defaultRate}`}>
                <Inp value={fxRate} onChange={e=>setFxRate(e.target.value)} placeholder={String(selCcyObj.defaultRate)} type="number"/>
              </Fld>
              {amt && (
                <div style={{ background:T.shiftBg, border:`1px solid ${T.shiftBdr}`, borderRadius:6, padding:"12px 14px", marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:T.shiftColor, marginBottom:8 }}>Conversion Preview</div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:12, color:T.txtMid }}>Received:</span>
                    <span style={{ fontWeight:700, color:"#C2410C" }}>{ccy} {parseFloat(amt||0).toFixed(2)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:12, color:T.txtMid }}>Rate:</span>
                    <span style={{ fontSize:12, color:T.txtMid }}>1 USD = {useRate} {ccy}</span>
                  </div>
                  <div style={{ borderTop:`1px solid ${T.shiftBdr}`, paddingTop:8, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:600, color:T.shiftColor }}>USD posted:</span>
                    <span style={{ fontWeight:800, color:T.blue, fontSize:15 }}>${usdAmt.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          )}
          <Fld label="Notes"><Txt value={note} onChange={e=>setNote(e.target.value)} rows={2}/></Fld>
          {activeShift && <div style={{ fontSize:12, color:T.txtLight, marginTop:4 }}>Tagged to <ShiftBadge id={activeShift.id}/></div>}
        </DrawerPanel>
      ))}

      {/* ── CASHIER REPORT MODAL ── */}
      {reportOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"32px 16px" }}>
          <div style={{ background:"#fff", width:"100%", maxWidth:860, borderRadius:8, boxShadow:"0 8px 40px rgba(0,0,0,0.25)", fontFamily:"Arial,sans-serif" }}>
            {/* Modal toolbar */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderBottom:"1px solid #e5e7eb", background:"#f9fafb", borderRadius:"8px 8px 0 0" }}>
              <span style={{ fontWeight:700, fontSize:14, color:"#111" }}>Cashier Report — {selD?.name}</span>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>window.print()} style={{ padding:"6px 14px", background:"#1d4ed8", color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer" }}>🖨 Print</button>
                <button onClick={()=>setReportOpen(false)} style={{ padding:"6px 12px", background:"#fff", border:"1px solid #d1d5db", borderRadius:4, fontSize:12, cursor:"pointer", color:"#374151" }}>✕ Close</button>
              </div>
            </div>

            {/* Report body */}
            <div style={{ padding:"40px 48px", fontSize:12, color:"#111" }}>
              <h2 style={{ fontSize:16, fontWeight:700, margin:"0 0 6px" }}>Cashier Report — {selD?.name}</h2>
              <div style={{ fontSize:12, color:"#555", marginBottom:20, display:"flex", gap:20 }}>
                <span>Shift: <strong style={{ color:"#111" }}>{activeShift?.id||"—"}</strong></span>
                <span>Staff: <strong style={{ color:"#111" }}>{activeShift?.staff||"—"}</strong></span>
                <span>Opened: <strong style={{ color:"#111" }}>{activeShift?.openedAt||"—"}</strong></span>
              </div>

              {/* Per-currency summary blocks */}
              {ccySummary.map(s => (
                <div key={s.code}>
                  <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:4, fontSize:12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:"left", padding:"4px 8px", borderBottom:"1px solid #000", fontWeight:600 }}></th>
                        <th style={{ textAlign:"right", padding:"4px 8px", borderBottom:"1px solid #000", fontWeight:600 }}># of Transactions ({s.code})</th>
                        <th style={{ textAlign:"right", padding:"4px 8px", borderBottom:"1px solid #000", fontWeight:600 }}>Amount ({s.code})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Shift Start Overage / Shortage", "", `${s.code} 0.00`, false, false],
                        ["Starting Balance",               "", `${s.code} 0.00`, true,  false],
                        ["Cash Received",     String(s.inCount),  `${s.code} ${s.totIn.toFixed(2)}`,  false, false],
                        ["Cash Paid Out",     String(s.outCount), `${s.code} ${s.totOut.toFixed(2)}`, false, false],
                        ["Ending Balance",                 "", `${s.code} ${s.bal.toFixed(2)}`,  true,  true ],
                      ].map(([label, count, amount, bold, underline]) => (
                        <tr key={label}>
                          <td style={{ padding:"4px 8px", textAlign:"left", fontWeight:bold?700:400, borderBottom:underline?"2px solid #000":"none" }}>{label}</td>
                          <td style={{ padding:"4px 8px", textAlign:"right", borderBottom:underline?"2px solid #000":"none" }}>{count}</td>
                          <td style={{ padding:"4px 8px", textAlign:"right", fontWeight:bold?700:400, borderBottom:underline?"2px solid #000":"none" }}>{amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ borderTop:"1px solid #ccc", margin:"14px 0" }}/>
                </div>
              ))}

              {/* Transaction detail table */}
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, marginTop:8 }}>
                <thead>
                  <tr>
                    {["Date/Time","Account #, Res #","Name","Surname","Room","Notes","Amount"].map(h => (
                      <th key={h} style={{ textAlign:h==="Amount"?"right":"left", padding:"6px 8px", borderBottom:"1px solid #000", fontSize:11, fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shiftTxns.map((t,i) => {
                    const dispCcy = t.fxCcy||"USD";
                    const dispAmt = t.fxCcy ? `${t.fxCcy} ${Math.abs(t.fxAmt||0).toFixed(2)}` : `USD ${Math.abs(t.amount).toFixed(2)}`;
                    return (
                      <tr key={t.id||i} style={{ borderBottom:"1px solid #f3f4f6" }}>
                        <td style={{ padding:"5px 8px" }}>{t.date}</td>
                        <td style={{ padding:"5px 8px" }}>{t.acct||"Cash Drawer"}</td>
                        <td style={{ padding:"5px 8px" }}>{t.name||""}</td>
                        <td style={{ padding:"5px 8px" }}>{t.surname||""}</td>
                        <td style={{ padding:"5px 8px" }}>{t.room||selD?.name||""}</td>
                        <td style={{ padding:"5px 8px" }}>{t.notes||""}</td>
                        <td style={{ padding:"5px 8px", textAlign:"right" }}>{dispCcy} {dispAmt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:24, fontSize:11, color:"#555", borderTop:"1px solid #ccc", paddingTop:10 }}>
                <span>Report generated on {nowStr()}</span>
                <span style={{ fontWeight:700, fontSize:13 }}>⊕ eZee Absolute</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 5 — PETTY CASH MANAGEMENT (Redesigned)

   What this module owns:
     • Fund setup — opening amount, custodian, department, replenishment threshold
     • Running balance tracker (goes down when voucher paid out, up when replenished)
     • Voucher linkage — cashier enters existing Expense Voucher # + amount only
     • Replenishment — manager tops up, records how much
     • Low-balance alert
     • Shift-grouped transaction view

   What this module does NOT do (already handled by Expense Voucher):
     • Re-entering expense category / description / guest details
     • Approval workflow for over-limit transactions
     • Generating vouchers

   Transaction types:
     "out" — Voucher paid out → balance decreases
     "in"  — Replenishment   → balance increases
═══════════════════════════════════════════════════════════════════════════ */
function PettyCashPage({ drawers, shifts }) {
  const [funds, setFunds]       = useState(PETTY_FUNDS_INIT);
  const [detail, setDetail]     = useState(null);
  const [createOpen, setCreate] = useState(false);
  const [payOpen, setPay]       = useState(false);   // link voucher payout
  const [repOpen, setRep]       = useState(false);   // replenish fund
  const [rptOpen, setRpt]       = useState(false);   // report
  const [groupByShift, setGBS]  = useState(false);

  // Create fund form
  const blankF = { name:"", department:"Front Desk", drawerId:"", openingAmt:"", replenishAt:"100", custodian:"" };
  const [ff, setFF] = useState(blankF);

  // Pay-out form — just voucher ref + amount
  const [pf, setPF] = useState({ voucherRef:"", amount:"", note:"" });

  // Replenish form
  const [rf, setRF] = useState({ amount:"", note:"" });

  const live = detail ? funds.find(f => f.id===detail.id)||detail : null;

  /* ── helpers ── */
  const activeShiftId = () => shifts.find(s=>s.status==="Open")?.id || "SH-MANUAL";

  const saveCreate = () => {
    if (!ff.name.trim()||!ff.openingAmt) return;
    setFunds(p => [...p, {
      ...ff, id:`pf${Date.now()}`,
      openingAmt:parseFloat(ff.openingAmt),
      currentBalance:parseFloat(ff.openingAmt),
      replenishAt:parseFloat(ff.replenishAt||100),
      transactions:[{
        id:`PC-R${Date.now()}`, shiftId:activeShiftId(), date:nowStr(),
        type:"in", amount:parseFloat(ff.openingAmt),
        desc:"Initial fund opening", voucherRef:"", by:"John Manager"
      }]
    }]);
    setFF(blankF); setCreate(false);
  };

  const savePay = () => {
    if (!pf.amount || !pf.voucherRef) return;
    const amt = parseFloat(pf.amount);
    const txn = {
      id:`PC-${String(Math.floor(Math.random()*89999)+10000)}`,
      shiftId:activeShiftId(), date:nowStr(),
      type:"out", amount:amt,
      voucherRef:pf.voucherRef,
      desc:pf.note||`Paid — ${pf.voucherRef}`,
      by:"John Manager"
    };
    setFunds(p => p.map(f => f.id===live.id ? { ...f, currentBalance:f.currentBalance-amt, transactions:[txn,...f.transactions] } : f));
    setPF({ voucherRef:"", amount:"", note:"" }); setPay(false);
  };

  const saveRep = () => {
    if (!rf.amount) return;
    const amt = parseFloat(rf.amount);
    const txn = {
      id:`PC-R${String(Math.floor(Math.random()*899)+100)}`,
      shiftId:activeShiftId(), date:nowStr(),
      type:"in", amount:amt,
      voucherRef:"", desc:rf.note||"Fund replenishment",
      by:"John Manager"
    };
    setFunds(p => p.map(f => f.id===live.id ? { ...f, currentBalance:f.currentBalance+amt, transactions:[txn,...f.transactions] } : f));
    setRF({ amount:"", note:"" }); setRep(false);
  };

  /* ════════════════════════════════════════════════════════
     FUND DETAIL VIEW
  ════════════════════════════════════════════════════════ */
  if (detail && live) {
    const pct      = Math.min(100, Math.round((live.currentBalance/live.openingAmt)*100));
    const isLow    = live.currentBalance <= live.replenishAt;
    const totOut   = live.transactions.filter(t=>t.type==="out").reduce((a,t)=>a+t.amount,0);
    const totIn    = live.transactions.filter(t=>t.type==="in").reduce((a,t)=>a+t.amount,0);
    const shiftIds = [...new Set(live.transactions.map(t=>t.shiftId).filter(Boolean))];

    const txnRow = (txn,i) => (
      <tr key={txn.id||i} style={{ borderBottom:`1px solid ${T.rowBorder}` }}
        onMouseEnter={e=>e.currentTarget.style.background=T.rowHover}
        onMouseLeave={e=>e.currentTarget.style.background=""}>
        <td style={{ padding:"9px 12px" }}><ShiftBadge id={txn.shiftId}/></td>
        <td style={{ padding:"9px 12px", color:T.txtMid, whiteSpace:"nowrap", fontSize:11 }}>{txn.date}</td>
        <td style={{ padding:"9px 12px" }}>
          {txn.voucherRef
            ? <span style={{ color:T.blue, fontWeight:600, fontSize:12 }}>📄 {txn.voucherRef}</span>
            : <span style={{ color:T.txtXlight, fontSize:11 }}>—</span>}
        </td>
        <td style={{ padding:"9px 12px", color:T.txtMid, fontSize:12 }}>{txn.desc}</td>
        <td style={{ padding:"9px 12px", fontSize:11, color:T.txtMid }}>{txn.by}</td>
        <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:700, fontSize:13,
          color:txn.type==="in"?"#065F46":T.warnColor }}>
          {txn.type==="in" ? "+" : "−"}${txn.amount.toFixed(2)}
        </td>
      </tr>
    );

    const renderTxns = () => {
      if (!groupByShift) return live.transactions.map((t,i)=>txnRow(t,i));
      return shiftIds.map(sid => {
        const rows = live.transactions.filter(t=>t.shiftId===sid);
        const net  = rows.reduce((a,t)=>a+(t.type==="in"?t.amount:-t.amount),0);
        return (
          <React.Fragment key={sid}>
            <tr>
              <td colSpan={6} style={{ padding:"7px 12px", background:T.shiftBg, borderBottom:`1px solid ${T.shiftBdr}`, borderTop:`1px solid ${T.shiftBdr}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <ShiftBadge id={sid} size="md"/>
                  <span style={{ fontSize:11, color:T.shiftColor, fontWeight:600 }}>Net: {net>=0?"+":""}{fmt(net)}</span>
                </div>
              </td>
            </tr>
            {rows.map((t,i)=>txnRow(t,i))}
          </React.Fragment>
        );
      });
    };

    return (
      <>
        <div style={{ padding:"20px 28px", overflowY:"auto" }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={() => setDetail(null)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:T.pageBg, border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, color:T.txtMid, cursor:"pointer", fontFamily:"inherit" }}>
                {IC.back} Back
              </button>
              <span style={{ color:T.txtXlight, fontSize:13 }}>Petty Cash /</span>
              <span style={{ fontWeight:600, fontSize:13, color:T.txt }}>{live.name}</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setRpt(true)} style={{ padding:"6px 14px", background:T.pageBg, border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", color:T.txtMid }}>📊 Report</button>
              <button onClick={() => { setRF({ amount:String((live.openingAmt-live.currentBalance).toFixed(2)), note:"" }); setRep(true); }}
                style={{ padding:"6px 14px", background:T.pageBg, border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", color:T.txtMid }}>
                {IC.replen} Replenish Fund
              </button>
              <button onClick={() => { setPF({ voucherRef:"", amount:"", note:"" }); setPay(true); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {IC.plus} Link Voucher Payout
              </button>
            </div>
          </div>

          {/* Info bar — custodian + department */}
          <div style={{ background:T.statBg, border:`1px solid ${T.statBdr}`, borderRadius:6, padding:"10px 16px", marginBottom:14, display:"flex", gap:24, flexWrap:"wrap", fontSize:12, color:T.txtMid }}>
            <span>🏢 <strong>{live.department}</strong></span>
            <span>👤 Custodian: <strong>{live.custodian||"—"}</strong></span>
            <span>📅 Replenish alert at: <strong style={{ color:isLow?T.warnColor:T.txt }}>{fmt(live.replenishAt)}</strong></span>
            {live.drawerId && <span>🗄 Linked drawer: <strong>{drawers.find(d=>String(d.id)===live.drawerId)?.name||live.drawerId}</strong></span>}
          </div>

          {/* Low balance alert */}
          {isLow && <Alert type="warn">Fund balance is below the replenishment threshold ({fmt(live.replenishAt)}). Please replenish before the next shift.</Alert>}

          {/* Stat cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <StatCard label="Current Balance" value={fmt(live.currentBalance)} sub={`of ${fmt(live.openingAmt)} opening`} accent={!isLow} warn={isLow}/>
            <StatCard label="Total Paid Out" value={fmt(totOut)} sub={`${live.transactions.filter(t=>t.type==="out").length} vouchers`}/>
            <StatCard label="Total Replenished" value={fmt(totIn)} sub={`${live.transactions.filter(t=>t.type==="in").length} replenishments`}/>
          </div>

          {/* Balance bar */}
          <div style={{ background:T.pageBg, border:`1px solid ${isLow?T.warnBdr:T.border}`, borderRadius:6, padding:"12px 16px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:T.txtMid, marginBottom:6 }}>
              <span>Fund Balance</span>
              <span style={{ fontWeight:600, color:isLow?T.warnColor:T.txt }}>{fmt(live.currentBalance)} / {fmt(live.openingAmt)} ({pct}%)</span>
            </div>
            <div style={{ height:8, background:"#E5E7EB", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:isLow?T.warnColor:pct<40?T.amberColor:T.blue, borderRadius:4, transition:"width .4s" }}/>
            </div>
          </div>

          {/* Transaction log */}
          <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600, color:T.txt }}>Transaction Log</span>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.txtMid, cursor:"pointer" }}>
                <input type="checkbox" checked={groupByShift} onChange={e=>setGBS(e.target.checked)} style={{ accentColor:T.blue }}/>
                Group by Shift
              </label>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:T.thBg }}>
                    {["SHIFT","DATE/TIME","VOUCHER REF","DESCRIPTION","BY","AMOUNT"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:h==="AMOUNT"?"right":"left", fontWeight:600, fontSize:11, color:T.txtLight, borderBottom:`1px solid ${T.rowBorder}`, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderTxns()}</tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── LINK VOUCHER PAYOUT panel ── */}
        <DrawerPanel open={payOpen} onClose={()=>setPay(false)} title="Link Voucher Payout"
          onSave={savePay} saveLabel="Deduct from Fund" saveDisabled={!pf.voucherRef||!pf.amount}>
          <Alert type="info">
            The expense has already been recorded in Expense Voucher. Enter the voucher reference and amount here to deduct it from this petty cash fund balance.
          </Alert>
          <Fld label="Expense Voucher Reference" req hint="e.g. EXP-0047 from Expense Voucher module">
            <Inp value={pf.voucherRef} onChange={e=>setPF(p=>({...p,voucherRef:e.target.value}))} placeholder="EXP-XXXX"/>
          </Fld>
          <Fld label="Amount Paid Out (USD)" req>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.txtMid, fontWeight:600 }}>$</span>
              <Inp value={pf.amount} onChange={e=>setPF(p=>({...p,amount:e.target.value}))} placeholder="0.00" type="number" style={{ paddingLeft:22 }}/>
            </div>
          </Fld>
          {pf.amount && parseFloat(pf.amount) > 0 && (
            <div style={{ background:T.shiftBg, border:`1px solid ${T.shiftBdr}`, borderRadius:4, padding:"10px 12px", marginBottom:14, fontSize:12, color:T.shiftColor }}>
              Fund balance after deduction: <strong>USD {(live.currentBalance - parseFloat(pf.amount)).toFixed(2)}</strong>
              {live.currentBalance - parseFloat(pf.amount) <= live.replenishAt && (
                <div style={{ color:T.warnColor, marginTop:4 }}>⚠ This will bring balance below replenishment threshold.</div>
              )}
            </div>
          )}
          <Fld label="Note (optional)">
            <Inp value={pf.note} onChange={e=>setPF(p=>({...p,note:e.target.value}))} placeholder="Brief note..."/>
          </Fld>
          {shifts.find(s=>s.status==="Open") && (
            <div style={{ fontSize:12, color:T.txtLight }}>Tagged to active shift <ShiftBadge id={shifts.find(s=>s.status==="Open").id}/></div>
          )}
        </DrawerPanel>

        {/* ── REPLENISH FUND panel ── */}
        <DrawerPanel open={repOpen} onClose={()=>setRep(false)} title="Replenish Fund"
          onSave={saveRep} saveLabel="Confirm Replenishment" saveDisabled={!rf.amount}>
          {isLow && <Alert type="warn">Balance below threshold ({fmt(live.replenishAt)}). Replenishment recommended.</Alert>}
          <Alert type="info">Suggested top-up: <strong>{fmt(live.openingAmt-live.currentBalance)}</strong> to restore to opening balance.</Alert>
          <Fld label="Amount to Add (USD)" req>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.txtMid, fontWeight:600 }}>$</span>
              <Inp value={rf.amount} onChange={e=>setRF(p=>({...p,amount:e.target.value}))} placeholder="0.00" type="number" style={{ paddingLeft:22 }}/>
            </div>
          </Fld>
          {rf.amount && parseFloat(rf.amount) > 0 && (
            <div style={{ background:"#F0FDF4", border:"1px solid #A7F3D0", borderRadius:4, padding:"10px 12px", marginBottom:14, fontSize:12, color:"#065F46" }}>
              Fund balance after replenishment: <strong>USD {(live.currentBalance + parseFloat(rf.amount)).toFixed(2)}</strong>
            </div>
          )}
          <Fld label="Note / Auth Reference" hint="e.g. Approved by GM — ref INV-2024-089">
            <Inp value={rf.note} onChange={e=>setRF(p=>({...p,note:e.target.value}))} placeholder="Approved by..."/>
          </Fld>
        </DrawerPanel>

        {/* ── REPORT panel ── */}
        <DrawerPanel open={rptOpen} onClose={()=>setRpt(false)} title={`Report — ${live.name}`} width={440}
          extraFooter={<button style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", background:T.pageBg, border:`1px solid ${T.inputBdr}`, borderRadius:4, fontSize:12, cursor:"pointer", fontFamily:"inherit", color:T.txtMid }}>{IC.export} Export PDF</button>}>
          <Sec label="Fund Summary"/>
          {[["Opening Balance",fmt(live.openingAmt)],["Total Replenishments","+"+fmt(totIn)],["Total Paid Out","−"+fmt(totOut)],["Current Balance",fmt(live.currentBalance)]].map(([l,v],i) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
              <span style={{ color:i===3?T.txt:T.txtMid, fontWeight:i===3?700:400 }}>{l}</span>
              <span style={{ fontWeight:700, color:i===1?"#065F46":i===2?T.warnColor:i===3?T.blue:T.txt }}>{v}</span>
            </div>
          ))}
          <Sec label="Voucher Payouts"/>
          {live.transactions.filter(t=>t.type==="out").map(t => (
            <div key={t.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${T.rowBorder}`, fontSize:12 }}>
              <div>
                <span style={{ color:T.blue, fontWeight:600 }}>{t.voucherRef||t.id}</span>
                <span style={{ color:T.txtLight, marginLeft:8 }}>{t.date}</span>
              </div>
              <span style={{ fontWeight:600, color:T.warnColor }}>−${t.amount.toFixed(2)}</span>
            </div>
          ))}
          {live.transactions.filter(t=>t.type==="out").length===0 && <div style={{ fontSize:12, color:T.txtXlight, padding:"8px 0" }}>No payouts yet.</div>}
        </DrawerPanel>
      </>
    );
  }

  /* ════════════════════════════════════════════════════════
     FUND LIST VIEW
  ════════════════════════════════════════════════════════ */
  return (
    <>
      <div style={{ padding:"20px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h1 style={{ fontSize:17, fontWeight:600, color:T.txt }}>Petty Cash Funds</h1>
          <button onClick={() => { setFF(blankF); setCreate(true); }}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", background:T.blue, color:"#fff", border:"none", borderRadius:4, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {IC.plus} New Fund
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {funds.map(f => {
            const pct   = Math.min(100,Math.round((f.currentBalance/f.openingAmt)*100));
            const isLow = f.currentBalance <= f.replenishAt;
            return (
              <div key={f.id} onClick={() => setDetail(f)}
                style={{ background:T.pageBg, border:`1px solid ${isLow?T.warnBdr:T.border}`, borderRadius:8, padding:"16px 18px", cursor:"pointer", transition:"box-shadow .15s" }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.08)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:T.txt }}>{f.name}</div>
                    <div style={{ fontSize:11, color:T.txtLight, marginTop:2 }}>{f.department} · {f.custodian}</div>
                  </div>
                  {isLow && <span style={{ fontSize:10, background:T.warnBg, color:T.warnColor, border:`1px solid ${T.warnBdr}`, padding:"2px 7px", borderRadius:10, fontWeight:600, whiteSpace:"nowrap" }}>Low</span>}
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:isLow?T.warnColor:T.blue, marginBottom:6 }}>{fmt(f.currentBalance)}</div>
                <div style={{ height:5, background:"#E5E7EB", borderRadius:3, overflow:"hidden", marginBottom:6 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:isLow?T.warnColor:pct<40?T.amberColor:T.blue, borderRadius:3 }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.txtLight }}>
                  <span>{pct}% of {fmt(f.openingAmt)}</span>
                  <span>{f.transactions.length} transactions</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CREATE FUND panel ── */}
      <DrawerPanel open={createOpen} onClose={()=>setCreate(false)} title="New Petty Cash Fund"
        onSave={saveCreate} saveLabel="Create Fund" saveDisabled={!ff.name||!ff.openingAmt}>
        <Sec label="Fund Details"/>
        <Fld label="Fund Name" req><Inp value={ff.name} onChange={e=>setFF(p=>({...p,name:e.target.value}))} placeholder="e.g. Front Desk Petty Fund"/></Fld>
        <R2>
          <Fld label="Department" req>
            <Sel value={ff.department} onChange={e=>setFF(p=>({...p,department:e.target.value}))}>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </Sel>
          </Fld>
          <Fld label="Custodian">
            <Sel value={ff.custodian} onChange={e=>setFF(p=>({...p,custodian:e.target.value}))}>
              <option value="">— Select —</option>
              {STAFF.map(s=><option key={s}>{s}</option>)}
            </Sel>
          </Fld>
        </R2>
        <Fld label="Linked Cash Drawer">
          <Sel value={ff.drawerId} onChange={e=>setFF(p=>({...p,drawerId:e.target.value}))}>
            <option value="">— None —</option>
            {drawers.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </Sel>
        </Fld>
        <Sec label="Financial Settings"/>
        <R2>
          <Fld label="Opening Amount (USD)" req hint="Physical cash put into the fund">
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.txtMid, fontWeight:600 }}>$</span>
              <Inp value={ff.openingAmt} onChange={e=>setFF(p=>({...p,openingAmt:e.target.value}))} placeholder="500.00" type="number" style={{ paddingLeft:22 }}/>
            </div>
          </Fld>
          <Fld label="Replenish Alert At" hint="Warn when balance falls below this">
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.txtMid, fontWeight:600 }}>$</span>
              <Inp value={ff.replenishAt} onChange={e=>setFF(p=>({...p,replenishAt:e.target.value}))} placeholder="100.00" type="number" style={{ paddingLeft:22 }}/>
            </div>
          </Fld>
        </R2>
      </DrawerPanel>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════════════ */
const PAGES = [
  { key:"create", label:"Create / Modify Cash Drawers" },
  { key:"open",   label:"Open Cash Drawer" },
  { key:"close",  label:"Close Cash Drawer" },
  { key:"access", label:"Access Open Drawers" },
  { key:"petty",  label:"Petty Cash Management" },
];

export default function App() {
  const [page, setPage]       = useState("create");
  const [drawers, setDrawers] = useState(DRAWERS_INIT);
  const [openTxns, setOpenTxns] = useState(OPEN_TXNS_INIT);
  const [shifts, setShifts]   = useState(SHIFTS_INIT);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:T.outerBg, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,textarea,button{font-family:inherit}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${T.inputFocus}!important;box-shadow:0 0 0 2px ${T.blueBorder}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:3px}
      `}</style>
      <Topbar/>
      <div style={{ flex:1, display:"flex", overflow:"hidden", padding:"12px", gap:"12px" }}>
        {/* Left nav */}
        <div style={{ width:220, background:T.pageBg, borderRadius:6, flexShrink:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 14px", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.txtMid, textTransform:"uppercase", letterSpacing:"0.5px" }}>Cash Drawer</span>
          </div>
          {PAGES.map(p => (
            <button key={p.key} onClick={() => setPage(p.key)} style={{ display:"flex", alignItems:"center", width:"100%", padding:"10px 14px", background:page===p.key?T.blueLight:"none", border:"none", cursor:"pointer", textAlign:"left", fontSize:12, color:page===p.key?T.blue:T.txtMid, fontWeight:page===p.key?600:400, borderLeft:page===p.key?`3px solid ${T.blue}`:"3px solid transparent", justifyContent:"space-between" }}>
              {p.label}
              {p.key==="petty" && <span style={{ background:T.blue, color:"#fff", fontSize:9, padding:"1px 6px", borderRadius:10, fontWeight:700 }}>NEW</span>}
            </button>
          ))}
        </div>
        {/* Main content */}
        <div style={{ flex:1, background:T.pageBg, borderRadius:6, overflow:"auto", minWidth:0 }}>
          {page==="create" && <CreateModifyPage drawers={drawers} setDrawers={setDrawers}/>}
          {page==="open"   && <OpenDrawerPage drawers={drawers} setDrawers={setDrawers} shifts={shifts} setShifts={setShifts}/>}
          {page==="close"  && <CloseDrawerPage drawers={drawers} setDrawers={setDrawers} shifts={shifts} setShifts={setShifts} txns={openTxns}/>}
          {page==="access" && <AccessPage drawers={drawers} shifts={shifts} txns={openTxns} setTxns={setOpenTxns}/>}
          {page==="petty"  && <PettyCashPage drawers={drawers} shifts={shifts}/>}
        </div>
      </div>
    </div>
  );
}
