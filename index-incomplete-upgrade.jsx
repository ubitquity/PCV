import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════
//  PRESETS DATA
// ═══════════════════════════════════════════
const PARAMETRIC_PRESETS = [
  { name:"Butterfly", x:"Math.sin(t)-0.50*Math.sin(3*t)", y:"-Math.cos(t)+0.50*Math.cos(3*t)", z:"Math.cos(t)*Math.cos(3*t)", w:"0.3333*Math.sin(5*t)", xL:"sin θ − 0.50 sin 3θ", yL:"−cos θ + 0.50 cos 3θ", zL:"cos θ · cos 3θ", wL:"0.3333 sin 5θ", xR:[-1.5,1.5], yR:[-1.5,1.5], zR:[-1,1], wR:[-.34,.34] },
  { name:"Lissajous", x:"Math.sin(3*t)", y:"Math.cos(2*t)", z:"Math.sin(5*t)*0.5", w:"0.5*Math.cos(7*t)", xL:"sin 3θ", yL:"cos 2θ", zL:"0.5 sin 5θ", wL:"0.5 cos 7θ", xR:[-1,1], yR:[-1,1], zR:[-.5,.5], wR:[-.5,.5] },
  { name:"Rose", x:"Math.cos(2*t)*Math.cos(t)", y:"Math.cos(2*t)*Math.sin(t)", z:"Math.sin(4*t)*0.3", w:"0.25*Math.sin(6*t)", xL:"cos 2θ · cos θ", yL:"cos 2θ · sin θ", zL:"0.3 sin 4θ", wL:"0.25 sin 6θ", xR:[-1,1], yR:[-1,1], zR:[-.3,.3], wR:[-.25,.25] },
  { name:"Trefoil", x:"Math.sin(t)+2*Math.sin(2*t)", y:"Math.cos(t)-2*Math.cos(2*t)", z:"-Math.sin(3*t)", w:"0.3333*Math.sin(3*t)", xL:"sin θ + 2 sin 2θ", yL:"cos θ − 2 cos 2θ", zL:"−sin 3θ", wL:"0.3333 sin 3θ", xR:[-3,3], yR:[-3,3], zR:[-1,1], wR:[-.34,.34] },
  { name:"Spirograph", x:"0.7*Math.cos(t)+0.3*Math.cos(7*t)", y:"0.7*Math.sin(t)+0.3*Math.sin(7*t)", z:"0.4*Math.sin(3*t)", w:"0.5*Math.cos(5*t)", xL:"0.7cos θ+0.3cos 7θ", yL:"0.7sin θ+0.3sin 7θ", zL:"0.4 sin 3θ", wL:"0.5 cos 5θ", xR:[-1,1], yR:[-1,1], zR:[-.4,.4], wR:[-.5,.5] },
  { name:"Figure-8", x:"Math.sin(t)", y:"Math.sin(t)*Math.cos(t)", z:"Math.sin(2*t)*0.5", w:"0.4*Math.cos(3*t)", xL:"sin θ", yL:"sin θ · cos θ", zL:"0.5 sin 2θ", wL:"0.4 cos 3θ", xR:[-1,1], yR:[-.5,.5], zR:[-.5,.5], wR:[-.4,.4] },
  { name:"Hypocycloid", x:"2*Math.cos(t)+Math.cos(2*t)", y:"2*Math.sin(t)-Math.sin(2*t)", z:"0.5*Math.sin(3*t)", w:"0.3*Math.cos(4*t)", xL:"2cos θ+cos 2θ", yL:"2sin θ−sin 2θ", zL:"0.5 sin 3θ", wL:"0.3 cos 4θ", xR:[-3,3], yR:[-3,3], zR:[-.5,.5], wR:[-.3,.3] },
  { name:"Star", x:"Math.cos(t)*Math.cos(t)*Math.cos(t)", y:"Math.sin(t)*Math.sin(t)*Math.sin(t)", z:"0.4*Math.sin(5*t)", w:"0.5*Math.sin(4*t)", xL:"cos³ θ", yL:"sin³ θ", zL:"0.4 sin 5θ", wL:"0.5 sin 4θ", xR:[-1,1], yR:[-1,1], zR:[-.4,.4], wR:[-.5,.5] },
];

const FOURIER_PRESETS = [
  { name:"Square Wave", terms:[{a:1,b:0,n:1},{a:0,b:0,n:2},{a:.333,b:0,n:3},{a:0,b:0,n:4},{a:.2,b:0,n:5},{a:0,b:0,n:6},{a:.143,b:0,n:7}], yL:"Σ sin(nθ)/n [odd]" },
  { name:"Sawtooth", terms:[{a:0,b:1,n:1},{a:0,b:-.5,n:2},{a:0,b:.333,n:3},{a:0,b:-.25,n:4},{a:0,b:.2,n:5}], yL:"Σ (-1)^(n+1) sin(nθ)/n" },
  { name:"Triangle Wave", terms:[{a:1,b:0,n:1},{a:-.111,b:0,n:3},{a:.04,b:0,n:5},{a:-.0204,b:0,n:7}], yL:"Σ (-1)^k cos((2k+1)θ)/(2k+1)²" },
  { name:"Pulse", terms:[{a:.5,b:.5,n:1},{a:.5,b:0,n:2},{a:.5,b:-.3,n:3},{a:.3,b:.2,n:5},{a:-.2,b:.1,n:7}], yL:"custom pulse harmonics" },
  { name:"Clover", terms:[{a:1,b:0,n:1},{a:0,b:.5,n:3},{a:.3,b:0,n:5},{a:0,b:.2,n:7}], yL:"mixed harmonic clover" },
];

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function evalExpr(expr, t) {
  try { return new Function("t", "return " + expr)(t); } catch { return 0; }
}

function hslStr(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r, g, b;
  if (h<60){r=c;g=x;b=0} else if(h<120){r=x;g=c;b=0} else if(h<180){r=0;g=c;b=x}
  else if(h<240){r=0;g=x;b=c} else if(h<300){r=x;g=0;b=c} else{r=c;g=0;b=x}
  return `rgb(${(r+m)*255|0},${(g+m)*255|0},${(b+m)*255|0})`;
}

function wrapMath(s) {
  return s.replace(/sin/g,"Math.sin").replace(/cos/g,"Math.cos").replace(/tan/g,"Math.tan")
    .replace(/abs/g,"Math.abs").replace(/sqrt/g,"Math.sqrt").replace(/PI/g,"Math.PI");
}

function autoRange(expr) {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i <= 500; i++) {
    const t = (i / 500) * Math.PI * 2;
    const v = evalExpr(expr, t);
    if (v < min) min = v; if (v > max) max = v;
  }
  return [min - 0.1, max + 0.1];
}

// ═══════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════
export default function ParametricCurvePanel() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const toastRef = useRef(null);

  const [mode, setMode] = useState("parametric");
  const [presetIdx, setPresetIdx] = useState(0);
  const [rotation, setRotation] = useState({ x: 0.3, y: -0.4 });
  const [zoom, setZoom] = useState(1);
  const [animPhase, setAnimPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [lineWidth, setLineWidth] = useState(1.5);
  const [steps, setSteps] = useState(2000);
  const [dragging, setDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [selectedParam, setSelectedParam] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);
  const [signinOpen, setSigninOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [favourites, setFavourites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("curveFavs") || "[]"); } catch { return []; }
  });
  const [customExpr, setCustomExpr] = useState(null);
  const [editX, setEditX] = useState("");
  const [editY, setEditY] = useState("");
  const [editZ, setEditZ] = useState("");
  const [editW, setEditW] = useState("");

  const presets = mode === "parametric" ? PARAMETRIC_PRESETS : FOURIER_PRESETS;
  const preset = presets[presetIdx];
  const activePreset = customExpr || preset;

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMsg(""), 2200);
  }, []);

  useEffect(() => { localStorage.setItem("curveFavs", JSON.stringify(favourites)); }, [favourites]);

  useEffect(() => {
    if (mode === "parametric") {
      const p = customExpr || preset;
      setEditX(p.x.replace(/Math\./g, ""));
      setEditY(p.y.replace(/Math\./g, ""));
      setEditZ(p.z.replace(/Math\./g, ""));
      setEditW(p.w.replace(/Math\./g, ""));
    }
  }, [presetIdx, mode, customExpr, preset]);

  // ── Drawing ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    if (mode === "parametric") {
      const p = customExpr || preset;
      const cx = W/2, cy = H/2, sc = Math.min(W,H)*0.28*zoom;
      const crx=Math.cos(rotation.x),srx=Math.sin(rotation.x),cry=Math.cos(rotation.y),sry=Math.sin(rotation.y);
      const xM=(p.xR[0]+p.xR[1])/2,yM=(p.yR[0]+p.yR[1])/2,zM=(p.zR[0]+p.zR[1])/2;
      const xH=(p.xR[1]-p.xR[0])/2||1,yH=(p.yR[1]-p.yR[0])/2||1,zH=(p.zR[1]-p.zR[0])/2||1;
      const wMax=Math.max(Math.abs(p.wR[0]),Math.abs(p.wR[1]))||1;
      const pts=[];
      for(let i=0;i<=steps;i++){
        const t=(i/steps)*Math.PI*2;
        let px=(evalExpr(p.x,t)-xM)/xH,py=(evalExpr(p.y,t)-yM)/yH,pz=(evalExpr(p.z,t)-zM)/zH;
        const w=evalExpr(p.w,t);
        const x1=px*cry-pz*sry,z1=px*sry+pz*cry,y1=py*crx-z1*srx,z2=py*srx+z1*crx;
        pts.push({x:cx+x1*sc,y:cy+y1*sc,z:z2,hue:((w/wMax+1)/2)*300+animPhase});
      }
      ctx.lineWidth=lineWidth;ctx.lineCap="round";ctx.lineJoin="round";
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=hslStr(b.hue,80,55+15*((b.z+1)/2));
        ctx.globalAlpha=Math.max(.15,Math.min(1,.35+.65*((b.z+1)/2)));
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    } else {
      const p=preset, terms=p.terms, N=steps, pts=[];
      let minY=Infinity,maxY=-Infinity;
      for(let i=0;i<=N;i++){const t=(i/N)*Math.PI*2;let v=0;for(const tm of terms)v+=tm.a*Math.cos(tm.n*t)+tm.b*Math.sin(tm.n*t);pts.push({t,val:v});if(v<minY)minY=v;if(v>maxY)maxY=v}
      const pad=60,plotW=W-pad*2,plotH=H-pad*2,vR=maxY-minY||1;
      ctx.strokeStyle="rgba(255,255,255,.04)";ctx.lineWidth=1;
      for(let i=0;i<=8;i++){const gx=pad+plotW*(i/8);ctx.beginPath();ctx.moveTo(gx,pad);ctx.lineTo(gx,H-pad);ctx.stroke()}
      for(let i=0;i<=6;i++){const gy=pad+plotH*(i/6);ctx.beginPath();ctx.moveTo(pad,gy);ctx.lineTo(W-pad,gy);ctx.stroke()}
      ctx.font="9px monospace";ctx.fillStyle="#3a3d44";
      ctx.fillText("0",pad-4,H-pad+14);ctx.fillText("2π",W-pad-10,H-pad+14);
      for(let ti=0;ti<terms.length;ti++){const tm=terms[ti];ctx.beginPath();ctx.lineWidth=.8;ctx.globalAlpha=.2;ctx.strokeStyle=hslStr((ti/terms.length)*300+animPhase,70,55);for(let i=0;i<=N;i++){const t=(i/N)*Math.PI*2,v=tm.a*Math.cos(tm.n*t)+tm.b*Math.sin(tm.n*t),sx=pad+plotW*(i/N),sy=pad+plotH*(1-(v-minY)/vR);i===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy)}ctx.stroke()}
      ctx.lineWidth=lineWidth;ctx.globalAlpha=1;
      for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const sx1=pad+plotW*((i-1)/N),sy1=pad+plotH*(1-(a.val-minY)/vR),sx2=pad+plotW*(i/N),sy2=pad+plotH*(1-(b.val-minY)/vR);ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.strokeStyle=hslStr(((b.val-minY)/vR)*300+animPhase,85,58);ctx.stroke()}
      ctx.globalAlpha=1;
    }
  }, [mode, preset, customExpr, rotation, zoom, animPhase, lineWidth, steps]);

  useEffect(() => {
    if (!playing) { if(animRef.current) cancelAnimationFrame(animRef.current); return; }
    let frame;
    const tick = () => { setAnimPhase(p=>(p+0.3*speed)%360); frame=requestAnimationFrame(tick); animRef.current=frame; };
    frame = requestAnimationFrame(tick); animRef.current = frame;
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { const h=()=>draw(); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); }, [draw]);

  // ── Controls ──
  const switchTab = (tab) => { setMode(tab); setPresetIdx(0); setCustomExpr(null); setSelectedParam(null); setOpenPanel(null); };
  const prevPreset = useCallback(() => { setPresetIdx(i=>(i-1+presets.length)%presets.length); setCustomExpr(null); }, [presets.length]);
  const nextPreset = useCallback(() => { setPresetIdx(i=>(i+1)%presets.length); setCustomExpr(null); }, [presets.length]);
  const togglePlay = useCallback(() => setPlaying(p=>!p), []);
  const selectParam = (k) => { const n=selectedParam===k?null:k; setSelectedParam(n); if(n&&mode==="parametric")setOpenPanel("editor"); else if(!n)setOpenPanel(null); };
  const togglePanel = (id) => setOpenPanel(p=>p===id?null:id);
  const resetView = () => { setRotation({x:.3,y:-.4});setZoom(1);setSpeed(1);setLineWidth(1.5);setSteps(2000);showToast("View reset"); };

  const randomize = () => {
    const fns=["sin","cos"],rn=()=>(Math.random()*6+1|0),rc=()=>(Math.random()*1.5+.1).toFixed(2);
    const rf=()=>`${rc()}*Math.${fns[Math.random()*2|0]}(${rn()}*t)`;
    const x=rf(),y=rf(),z=`${(Math.random()*.6+.1).toFixed(2)}*Math.${fns[Math.random()*2|0]}(${rn()}*t)`;
    const w=`${(Math.random()*.5+.1).toFixed(2)}*Math.${fns[Math.random()*2|0]}(${rn()}*t)`;
    setCustomExpr({x,y,z,w,xL:x.replace(/Math\./g,""),yL:y.replace(/Math\./g,""),zL:z.replace(/Math\./g,""),wL:w.replace(/Math\./g,""),xR:autoRange(x),yR:autoRange(y),zR:autoRange(z),wR:autoRange(w),name:"Random"});
    showToast("Random curve generated!");
  };

  const applyEdits = () => {
    const x=wrapMath(editX),y=wrapMath(editY),z=wrapMath(editZ),w=wrapMath(editW);
    setCustomExpr({x,y,z,w,xL:editX,yL:editY,zL:editZ,wL:editW,xR:autoRange(x),yR:autoRange(y),zR:autoRange(z),wR:autoRange(w),name:"Custom"});
    showToast("Equations updated");
  };

  const addCurrentFav = () => {
    const p=customExpr||preset;
    const fav={name:p.name,mode,presetIdx,isCustom:!!customExpr};
    if(customExpr)Object.assign(fav,{x:p.x,y:p.y,z:p.z,w:p.w,xL:p.xL,yL:p.yL,zL:p.zL,wL:p.wL,xR:p.xR,yR:p.yR,zR:p.zR,wR:p.wR});
    if(!favourites.some(f=>f.name===fav.name&&f.mode===fav.mode)){setFavourites(prev=>[...prev,fav]);showToast(`★ "${p.name}" favourited`)}else showToast("Already in favourites");
  };

  const toggleFavPreset = (idx) => {
    const p=presets[idx]; const fi=favourites.findIndex(f=>f.name===p.name&&f.mode===mode);
    if(fi>=0){setFavourites(prev=>prev.filter((_,i)=>i!==fi));showToast(`Removed "${p.name}"`);}
    else{setFavourites(prev=>[...prev,{name:p.name,mode,presetIdx:idx,isCustom:false}]);showToast(`★ "${p.name}" favourited`);}
  };
  const loadFav = (fi) => { const f=favourites[fi]; setMode(f.mode); if(f.isCustom){setCustomExpr({x:f.x,y:f.y,z:f.z,w:f.w,xL:f.xL,yL:f.yL,zL:f.zL,wL:f.wL,xR:f.xR,yR:f.yR,zR:f.zR,wR:f.wR,name:f.name})}else{setPresetIdx(f.presetIdx);setCustomExpr(null)} showToast(`Loaded "${f.name}"`); };
  const removeFav = (i) => { setFavourites(prev=>prev.filter((_,idx)=>idx!==i)); showToast("Removed"); };

  const exportPNG = () => { const l=document.createElement("a");l.download="curve.png";l.href=canvasRef.current.toDataURL("image/png");l.click();showToast("PNG downloaded");setExportOpen(false); };
  const exportJSON = () => { const p=customExpr||preset; navigator.clipboard.writeText(JSON.stringify({mode,preset:p.name,equations:{x:p.xL||"",y:p.yL,z:p.zL||"",w:p.wL||""},rotation,zoom,speed},null,2));showToast("JSON copied");setExportOpen(false); };
  const copyShareLink = () => { const p=customExpr||preset;const params=new URLSearchParams({m:mode,p:p.name});navigator.clipboard.writeText(location.origin+"#"+params.toString());showToast("Link copied!");setExportOpen(false); };

  // ── Mouse / Touch ──
  const onMouseDown = (e) => { if(e.button===2)return; setDragging(true); lastMouseRef.current={x:e.clientX,y:e.clientY}; };
  const onMouseMove = (e) => { if(!dragging)return; setRotation(r=>({x:r.x+(e.clientY-lastMouseRef.current.y)*.005,y:r.y+(e.clientX-lastMouseRef.current.x)*.005})); lastMouseRef.current={x:e.clientX,y:e.clientY}; };
  const onMouseUp = () => setDragging(false);
  const onWheel = (e) => { e.preventDefault(); setZoom(z=>Math.max(.3,Math.min(5,z-e.deltaY*.001))); };
  const onTouchStart = (e) => { if(e.touches.length===1){setDragging(true);lastMouseRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY}} };
  const onTouchMove = (e) => { if(!dragging||e.touches.length!==1)return;setRotation(r=>({x:r.x+(e.touches[0].clientY-lastMouseRef.current.y)*.005,y:r.y+(e.touches[0].clientX-lastMouseRef.current.x)*.005}));lastMouseRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onContextMenu = (e) => { e.preventDefault(); setCtxMenu({x:Math.min(e.clientX,window.innerWidth-200),y:Math.min(e.clientY,window.innerHeight-280)}); };

  useEffect(() => {
    const handler = (e) => {
      if(e.target.tagName==="INPUT")return;
      if(e.key==="ArrowLeft")prevPreset();if(e.key==="ArrowRight")nextPreset();
      if(e.key===" "){e.preventDefault();togglePlay();}
      if(e.key==="e"||e.key==="E")setOpenPanel(p=>p==="editor"?null:"editor");
      if(e.key==="f"||e.key==="F")setOpenPanel(p=>p==="favourites"?null:"favourites");
      if(e.key==="p"||e.key==="P")setOpenPanel(p=>p==="presets"?null:"presets");
      if(e.key==="r"||e.key==="R")randomize();
      if(e.key==="Escape"){setOpenPanel(null);setSigninOpen(false);setExportOpen(false);setCtxMenu(null)}
      if(e.key==="+"||e.key==="=")setSpeed(s=>Math.min(5,s+.2));
      if(e.key==="-")setSpeed(s=>Math.max(.1,s-.2));
    };
    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  }, [prevPreset, nextPreset, togglePlay]);

  useEffect(() => { const h=()=>setCtxMenu(null); window.addEventListener("click",h); return()=>window.removeEventListener("click",h); }, []);

  // ═══════════════════════════════════════════
  //  STYLES
  // ═══════════════════════════════════════════
  const COLORS = { x:"#ff6b6b", y:"#51cf66", z:"#339af0", w:"#fcc419" };

  const cardStyle = (color, sel) => ({
    width:54, padding:"8px 6px", background:"rgba(22,24,28,.92)", borderRadius:8, textAlign:"center",
    cursor:"pointer", backdropFilter:"blur(10px)", transition:"all .2s",
    border:`1px solid ${color}${sel?"80":"33"}`, boxShadow:sel?"0 0 12px rgba(255,255,255,.08)":"none",
  });

  // ═══════════════════════════════════════════
  //  PANEL CONTENT
  // ═══════════════════════════════════════════
  const renderPanel = () => {
    const sTitle = { fontSize:9, letterSpacing:"0.18em", color:"#4a4d54", marginBottom:10, textTransform:"uppercase" };
    const fInput = { width:"100%", background:"#1e2127", border:"1px solid #2a2d33", color:"#e1e3e8", fontFamily:"inherit", fontSize:12, padding:"8px 10px", borderRadius:6, outline:"none" };
    const btn = (v) => ({ background:"#1e2127", border:`1px solid ${v==="danger"?"#ff6b6b":"#2a2d33"}`, color:v==="danger"?"#ff6b6b":"#a0a4ab", fontFamily:"inherit", fontSize:10, letterSpacing:".05em", padding:"6px 12px", borderRadius:5, cursor:"pointer" });
    const pItem = (cur) => ({ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:6, cursor:"pointer", border:`1px solid ${cur?"#339af0":"#23262b"}`, background:cur?"rgba(51,154,240,.06)":"transparent", fontSize:11, color:cur?"#e1e3e8":"#a0a4ab", marginBottom:4 });
    const fBtn = (f) => ({ background:"none", border:"none", cursor:"pointer", fontSize:14, color:f?"#fcc419":"#3a3d44", padding:2 });

    if (openPanel === "favourites") return (
      <div>
        <div style={sTitle}>SAVED CURVES</div>
        {favourites.length === 0
          ? <div style={{textAlign:"center",padding:"40px 20px",color:"#4a4d54",fontSize:11,lineHeight:1.8}}>No favourites yet.<br/>Right-click canvas or click ☆ to add.</div>
          : <>
              {favourites.map((f,i) => (
                <div key={i} style={pItem(false)} onClick={()=>loadFav(i)}>
                  <span>{f.mode==="fourier"?"∿":"▣"} {f.name}</span>
                  <button style={fBtn(true)} onClick={e=>{e.stopPropagation();removeFav(i)}}>★</button>
                </div>
              ))}
              <div style={{marginTop:16}}><button style={btn("danger")} onClick={()=>{setFavourites([]);showToast("Cleared")}}>CLEAR ALL</button></div>
            </>
        }
      </div>
    );

    if (openPanel === "editor") return (
      <div>
        {mode==="parametric" && <div style={{marginBottom:20}}>
          <div style={sTitle}>EQUATIONS</div>
          {[{k:"x",l:"X(θ)",v:editX,s:setEditX},{k:"y",l:"Y(θ)",v:editY,s:setEditY},{k:"z",l:"Z(θ)",v:editZ,s:setEditZ},{k:"w",l:"W(θ)→hue",v:editW,s:setEditW}].map(v=>(
            <div key={v.k} style={{marginBottom:12}}>
              <div style={{fontSize:10,color:"#5c6069",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:COLORS[v.k]}}/>{v.l}
              </div>
              <input style={fInput} value={v.v} onChange={e=>v.s(e.target.value)} onBlur={applyEdits} onKeyDown={e=>{if(e.key==="Enter")applyEdits()}}/>
            </div>
          ))}
        </div>}
        <div style={{marginBottom:20}}>
          <div style={sTitle}>DISPLAY</div>
          {[{l:"Line width",v:lineWidth,s:setLineWidth,min:.5,max:5,step:.1,f:v=>v.toFixed(1)},{l:"Resolution",v:steps,s:setSteps,min:500,max:5000,step:100,f:v=>v},{l:"Speed",v:speed,s:setSpeed,min:.1,max:5,step:.1,f:v=>v.toFixed(1)},{l:"Zoom",v:zoom,s:setZoom,min:.3,max:5,step:.1,f:v=>v.toFixed(1)}].map(sl=>(
            <div key={sl.l} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:10,color:"#5c6069",width:70,flexShrink:0}}>{sl.l}</span>
              <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.v} onChange={e=>sl.s(+e.target.value)} style={{flex:1,WebkitAppearance:"none",height:3,background:"#2a2d33",borderRadius:2,outline:"none"}}/>
              <span style={{fontSize:10,color:"#e1e3e8",width:44,textAlign:"right",flexShrink:0}}>{sl.f(sl.v)}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={sTitle}>ACTIONS</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={btn()} onClick={resetView}>↺ RESET</button>
            <button style={btn()} onClick={randomize}>🎲 RANDOM</button>
            <button style={btn()} onClick={()=>setExportOpen(true)}>📤 EXPORT</button>
            <button style={btn()} onClick={addCurrentFav}>☆ SAVE</button>
          </div>
        </div>
      </div>
    );

    if (openPanel === "presets") return (
      <div>
        <div style={sTitle}>{mode.toUpperCase()} PRESETS</div>
        {presets.map((p,i) => {
          const isFav=favourites.some(f=>f.name===p.name&&f.mode===mode);
          return <div key={i} style={pItem(i===presetIdx&&!customExpr)} onClick={()=>{setPresetIdx(i);setCustomExpr(null)}}>
            <span>{p.name}</span>
            <button style={fBtn(isFav)} onClick={e=>{e.stopPropagation();toggleFavPreset(i)}}>{isFav?"★":"☆"}</button>
          </div>;
        })}
      </div>
    );
    return null;
  };

  const panelTitles = { favourites:"☆ FAVOURITES", editor:"✎ EQUATION EDITOR", presets:"☰ PRESETS" };

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════
  return (
    <div style={{width:"100%",height:"100vh",background:"#131518",color:"#a0a4ab",fontFamily:"'JetBrains Mono','SF Mono','Fira Code',monospace",display:"flex",flexDirection:"column",overflow:"hidden",userSelect:"none"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:48,borderBottom:"1px solid #23262b",background:"#16181c",flexShrink:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button style={{background:mode==="parametric"?"rgba(255,255,255,.05)":"none",border:"none",color:mode==="parametric"?"#e1e3e8":"#5c6069",fontSize:11,fontFamily:"inherit",letterSpacing:".12em",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:6,whiteSpace:"nowrap"}} onClick={()=>switchTab("parametric")}>▣ PARAMETRIC CURVE CONTROL PANEL</button>
          <button style={{background:mode==="fourier"?"rgba(255,255,255,.05)":"none",border:"none",color:mode==="fourier"?"#e1e3e8":"#5c6069",fontSize:11,fontFamily:"inherit",letterSpacing:".12em",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:6,whiteSpace:"nowrap"}} onClick={()=>switchTab("fourier")}>∿ FOURIER CURVE CONTROL PANEL</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",background:"#1e2127",borderRadius:6,overflow:"hidden",border:"1px solid #2a2d33"}}>
            <button style={{background:"none",border:"none",color:"#5c6069",fontSize:13,padding:"7px 11px",cursor:"pointer",fontFamily:"inherit"}} onClick={prevPreset} title="Previous (←)">⏮</button>
            <button style={{background:"none",border:"none",color:playing?"#51cf66":"#5c6069",fontSize:13,padding:"7px 11px",cursor:"pointer",fontFamily:"inherit"}} onClick={togglePlay} title="Play/Pause (Space)">{playing?"⏸":"▶"}</button>
            <button style={{background:"none",border:"none",color:"#5c6069",fontSize:13,padding:"7px 11px",cursor:"pointer",fontFamily:"inherit"}} onClick={nextPreset} title="Next (→)">⏭</button>
          </div>
          <button style={{background:"none",border:"none",color:"#7a7e86",fontSize:11,fontFamily:"inherit",letterSpacing:".08em",cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:6,whiteSpace:"nowrap"}} onClick={()=>togglePanel("favourites")}>
            <span style={{fontSize:14}}>☆</span> FAVOURITES {favourites.length>0&&<span style={{background:"#fcc419",color:"#000",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,marginLeft:2}}>{favourites.length}</span>}
          </button>
          <button style={{background:"none",border:"1px solid #3a3d44",color:"#7a7e86",fontSize:11,fontFamily:"inherit",letterSpacing:".08em",cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:6,whiteSpace:"nowrap"}} onClick={()=>setSigninOpen(true)}>→ SIGN IN</button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex"}}>
        <div style={{flex:1,position:"relative"}}>
          {/* Equations */}
          <div style={{position:"absolute",top:20,left:76,zIndex:10,fontSize:12.5,lineHeight:1.9,color:"#5c6069",pointerEvents:"none"}}>
            {mode==="parametric"?<>
              <div><span style={{color:COLORS.x,fontWeight:600}}>x</span> = {activePreset.xL}</div>
              <div><span style={{color:COLORS.y,fontWeight:600}}>y</span> = {activePreset.yL}</div>
              <div><span style={{color:COLORS.z,fontWeight:600}}>z</span> = {activePreset.zL}</div>
              <div><span style={{color:COLORS.w,fontWeight:600}}>w</span> = {activePreset.wL} <span style={{color:"#444"}}>[→ hue]</span></div>
              <div style={{marginTop:10,fontSize:9,letterSpacing:".18em",color:"#4a4d54"}}>DRAG · SCROLL · PINCH</div>
            </>:<>
              <div><span style={{color:COLORS.y,fontWeight:600}}>f(θ)</span> = {preset.yL}</div>
              <div style={{color:"#444"}}>terms: {preset.terms.length}</div>
              <div style={{marginTop:10,fontSize:9,letterSpacing:".18em",color:"#4a4d54"}}>FOURIER DECOMPOSITION</div>
            </>}
          </div>

          {/* Param cards */}
          <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:6,zIndex:10}}>
            {mode==="parametric"
              ? [{l:"X",c:COLORS.x,k:"x",r:activePreset.xR,m:"cartesian"},{l:"Y",c:COLORS.y,k:"y",r:activePreset.yR,m:"cartesian"},{l:"Z",c:COLORS.z,k:"z",r:activePreset.zR,m:"depth"},{l:"W",c:COLORS.w,k:"w",r:activePreset.wR,m:"→ color"}].map(cd=>(
                  <div key={cd.k} style={cardStyle(cd.c,selectedParam===cd.k)} onClick={()=>selectParam(cd.k)}>
                    <div style={{fontSize:16,fontWeight:700,color:cd.c,marginBottom:3}}>{cd.l}</div>
                    <div style={{fontSize:7,color:"#555",lineHeight:1.3}}>RANGE: {cd.r[0].toFixed(2)}<br/>to {cd.r[1].toFixed(2)}</div>
                    <div style={{marginTop:3,fontSize:6,color:"#444",letterSpacing:".1em",textTransform:"uppercase"}}>{cd.m}</div>
                  </div>
                ))
              : preset.terms.slice(0,4).map((tm,i)=>(
                  <div key={i} style={{...cardStyle(hslStr(i/preset.terms.length*300,60,40),false),width:54}}>
                    <div style={{fontSize:13,fontWeight:700,color:hslStr(i/preset.terms.length*300,70,60),marginBottom:3}}>n={tm.n}</div>
                    <div style={{fontSize:7,color:"#555",lineHeight:1.3}}>a:{tm.a.toFixed(2)}<br/>b:{tm.b.toFixed(2)}</div>
                  </div>
                ))
            }
          </div>

          <div style={{position:"absolute",top:20,right:20,zIndex:10,fontSize:10,letterSpacing:".15em",color:"#3a3d44",textTransform:"uppercase",pointerEvents:"none"}}>{mode.toUpperCase()} · {activePreset.name} ({presetIdx+1}/{presets.length})</div>

          <canvas ref={canvasRef} style={{width:"100%",height:"100%",cursor:dragging?"grabbing":"grab",display:"block"}}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={()=>setDragging(false)}
            onContextMenu={onContextMenu}/>

          <div style={{position:"absolute",bottom:12,left:20,fontSize:9,letterSpacing:".12em",color:"#3a3d44",zIndex:10,pointerEvents:"none"}}>SPEED: {speed.toFixed(1)}x · ZOOM: {zoom.toFixed(1)}x</div>
          <div style={{position:"absolute",bottom:40,left:20,fontSize:8,letterSpacing:".15em",color:"#3a3d44",zIndex:10,pointerEvents:"none",lineHeight:2}}>E editor · P presets · F favs · R random · SPACE play · ←→ presets · +/- speed</div>
          <div style={{position:"absolute",bottom:12,right:20,fontSize:10,color:"#3a3d44",letterSpacing:".05em",pointerEvents:"none"}}>© 2026 Faroe Bourke · faroe-cek.caffeine.xyz</div>
        </div>

        {/* Side Panel */}
        <div style={{width:openPanel?340:0,overflow:"hidden",background:"#1a1d22",borderLeft:"1px solid #23262b",flexShrink:0,transition:"width .3s ease",zIndex:50,display:"flex",flexDirection:"column"}}>
          {openPanel&&<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid #23262b",fontSize:11,letterSpacing:".12em",fontWeight:600,color:"#e1e3e8"}}>
              <span>{panelTitles[openPanel]}</span>
              <button style={{background:"none",border:"none",color:"#5c6069",fontSize:18,cursor:"pointer",padding:4,lineHeight:1}} onClick={()=>setOpenPanel(null)}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16}}>{renderPanel()}</div>
          </>}
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu&&<div style={{position:"fixed",left:ctxMenu.x,top:ctxMenu.y,background:"#1a1d22",border:"1px solid #2a2d33",borderRadius:8,padding:4,zIndex:500,minWidth:180,boxShadow:"0 8px 32px rgba(0,0,0,.5)"}} onClick={e=>e.stopPropagation()}>
        {[{l:"✎ Edit equations",fn:()=>{setOpenPanel("editor");setCtxMenu(null)}},{l:"☰ Browse presets",fn:()=>{setOpenPanel("presets");setCtxMenu(null)}},{l:"🎲 Random curve",fn:()=>{randomize();setCtxMenu(null)}},null,{l:"☆ Favourite",fn:()=>{addCurrentFav();setCtxMenu(null)}},{l:"📤 Export",fn:()=>{setExportOpen(true);setCtxMenu(null)}},null,{l:"↺ Reset view",fn:()=>{resetView();setCtxMenu(null)}}].map((it,i)=>it===null?<div key={i} style={{height:1,background:"#23262b",margin:"4px 8px"}}/>:<button key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",fontSize:11,color:"#a0a4ab",cursor:"pointer",borderRadius:5,border:"none",background:"none",width:"100%",fontFamily:"inherit",textAlign:"left"}} onClick={it.fn}>{it.l}</button>)}
      </div>}

      {/* Sign In */}
      {signinOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}} onClick={()=>setSigninOpen(false)}>
        <div style={{background:"#1a1d22",border:"1px solid #23262b",borderRadius:12,padding:24,width:380,maxWidth:"90vw"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:13,fontWeight:600,color:"#e1e3e8",marginBottom:16}}>SIGN IN</div>
          <div style={{fontSize:11,color:"#5c6069",lineHeight:1.7,marginBottom:16}}>Save favourites and custom presets across devices.</div>
          <div style={{marginBottom:12}}><div style={{fontSize:10,color:"#5c6069",marginBottom:5}}>EMAIL</div><input style={{width:"100%",background:"#1e2127",border:"1px solid #2a2d33",color:"#e1e3e8",fontFamily:"inherit",fontSize:12,padding:"8px 10px",borderRadius:6,outline:"none"}} type="email" placeholder="you@example.com"/></div>
          <div style={{marginBottom:20}}><div style={{fontSize:10,color:"#5c6069",marginBottom:5}}>PASSWORD</div><input style={{width:"100%",background:"#1e2127",border:"1px solid #2a2d33",color:"#e1e3e8",fontFamily:"inherit",fontSize:12,padding:"8px 10px",borderRadius:6,outline:"none"}} type="password" placeholder="••••••••"/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{background:"#1e2127",border:"1px solid #2a2d33",color:"#a0a4ab",fontFamily:"inherit",fontSize:11,padding:"8px 18px",borderRadius:6,cursor:"pointer"}} onClick={()=>setSigninOpen(false)}>CANCEL</button>
            <button style={{background:"#339af0",border:"1px solid #339af0",color:"#fff",fontFamily:"inherit",fontSize:11,padding:"8px 18px",borderRadius:6,cursor:"pointer"}} onClick={()=>{setSigninOpen(false);showToast("Demo — favourites saved locally!")}}>SIGN IN</button>
          </div>
        </div>
      </div>}

      {/* Export */}
      {exportOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}} onClick={()=>setExportOpen(false)}>
        <div style={{background:"#1a1d22",border:"1px solid #23262b",borderRadius:12,padding:24,width:380,maxWidth:"90vw"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:13,fontWeight:600,color:"#e1e3e8",marginBottom:16}}>EXPORT CURVE</div>
          <div style={{fontSize:11,color:"#5c6069",lineHeight:1.7,marginBottom:16}}>Export the current curve as an image or share parameters.</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            <button style={{background:"#1e2127",border:"1px solid #2a2d33",color:"#a0a4ab",fontFamily:"inherit",fontSize:10,padding:"6px 12px",borderRadius:5,cursor:"pointer"}} onClick={exportPNG}>📷 PNG</button>
            <button style={{background:"#1e2127",border:"1px solid #2a2d33",color:"#a0a4ab",fontFamily:"inherit",fontSize:10,padding:"6px 12px",borderRadius:5,cursor:"pointer"}} onClick={exportJSON}>📋 JSON</button>
            <button style={{background:"#1e2127",border:"1px solid #2a2d33",color:"#a0a4ab",fontFamily:"inherit",fontSize:10,padding:"6px 12px",borderRadius:5,cursor:"pointer"}} onClick={copyShareLink}>🔗 LINK</button>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{background:"#1e2127",border:"1px solid #2a2d33",color:"#a0a4ab",fontFamily:"inherit",fontSize:11,padding:"8px 18px",borderRadius:6,cursor:"pointer"}} onClick={()=>setExportOpen(false)}>CLOSE</button>
          </div>
        </div>
      </div>}

      {/* Toast */}
      <div style={{position:"fixed",bottom:24,left:"50%",transform:`translateX(-50%) translateY(${toastMsg?0:80}px)`,background:"#1a1d22",border:"1px solid #2a2d33",color:"#e1e3e8",fontFamily:"inherit",fontSize:11,padding:"10px 20px",borderRadius:8,zIndex:2000,opacity:toastMsg?1:0,transition:"all .3s ease",pointerEvents:"none",boxShadow:"0 8px 32px rgba(0,0,0,.4)"}}>{toastMsg}</div>
    </div>
  );
}
