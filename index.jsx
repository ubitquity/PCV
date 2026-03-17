import { useState, useRef, useEffect, useCallback } from "react";

const PRESETS = [
  {
    name: "Butterfly",
    x: "sin(t) - 0.50 * sin(3*t)",
    y: "-cos(t) + 0.50 * cos(3*t)",
    z: "cos(t) * cos(3*t)",
    w: "0.3333 * sin(5*t)",
    xLabel: "sin Î¸ âˆ’ 0.50 sin 3Î¸",
    yLabel: "âˆ’cos Î¸ + 0.50 cos 3Î¸",
    zLabel: "cos Î¸ Â· cos 3Î¸",
    wLabel: "0.3333 sin 5Î¸",
    xRange: [-1.5, 1.5],
    yRange: [-1.5, 1.5],
    zRange: [-1, 1],
    wRange: [-0.34, 0.34],
  },
  {
    name: "Lissajous",
    x: "sin(3*t)",
    y: "cos(2*t)",
    z: "sin(5*t) * 0.5",
    w: "0.5 * cos(7*t)",
    xLabel: "sin 3Î¸",
    yLabel: "cos 2Î¸",
    zLabel: "0.5 sin 5Î¸",
    wLabel: "0.5 cos 7Î¸",
    xRange: [-1, 1],
    yRange: [-1, 1],
    zRange: [-0.5, 0.5],
    wRange: [-0.5, 0.5],
  },
  {
    name: "Rose",
    x: "cos(2*t) * cos(t)",
    y: "cos(2*t) * sin(t)",
    z: "sin(4*t) * 0.3",
    w: "0.25 * sin(6*t)",
    xLabel: "cos 2Î¸ Â· cos Î¸",
    yLabel: "cos 2Î¸ Â· sin Î¸",
    zLabel: "0.3 sin 4Î¸",
    wLabel: "0.25 sin 6Î¸",
    xRange: [-1, 1],
    yRange: [-1, 1],
    zRange: [-0.3, 0.3],
    wRange: [-0.25, 0.25],
  },
  {
    name: "Trefoil",
    x: "sin(t) + 2 * sin(2*t)",
    y: "cos(t) - 2 * cos(2*t)",
    z: "-sin(3*t)",
    w: "0.3333 * sin(3*t)",
    xLabel: "sin Î¸ + 2 sin 2Î¸",
    yLabel: "cos Î¸ âˆ’ 2 cos 2Î¸",
    zLabel: "âˆ’sin 3Î¸",
    wLabel: "0.3333 sin 3Î¸",
    xRange: [-3, 3],
    yRange: [-3, 3],
    zRange: [-1, 1],
    wRange: [-0.34, 0.34],
  },
  {
    name: "Spirograph",
    x: "0.7*cos(t) + 0.3*cos(7*t)",
    y: "0.7*sin(t) + 0.3*sin(7*t)",
    z: "0.4*sin(3*t)",
    w: "0.5*cos(5*t)",
    xLabel: "0.7 cos Î¸ + 0.3 cos 7Î¸",
    yLabel: "0.7 sin Î¸ + 0.3 sin 7Î¸",
    zLabel: "0.4 sin 3Î¸",
    wLabel: "0.5 cos 5Î¸",
    xRange: [-1, 1],
    yRange: [-1, 1],
    zRange: [-0.4, 0.4],
    wRange: [-0.5, 0.5],
  },
];

function evalParam(expr, t) {
  const s = expr
    .replace(/sin/g, "Math.sin")
    .replace(/cos/g, "Math.cos")
    .replace(/tan/g, "Math.tan")
    .replace(/abs/g, "Math.abs")
    .replace(/sqrt/g, "Math.sqrt");
  try {
    return new Function("t", `return ${s}`)(t);
  } catch {
    return 0;
  }
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return `rgb(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)})`;
}

export default function ParametricCurvePanel() {
  const canvasRef = useRef(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("parametric");
  const [rotation, setRotation] = useState({ x: 0.3, y: -0.4 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [animPhase, setAnimPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const animRef = useRef(null);
  const preset = PRESETS[presetIdx];

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    const steps = 2000;
    const cx = W / 2;
    const cy = H / 2;
    const scale = Math.min(W, H) * 0.28 * zoom;

    const cosRx = Math.cos(rotation.x);
    const sinRx = Math.sin(rotation.x);
    const cosRy = Math.cos(rotation.y);
    const sinRy = Math.sin(rotation.y);

    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      let px = evalParam(preset.x, t);
      let py = evalParam(preset.y, t);
      let pz = evalParam(preset.z, t);
      const w = evalParam(preset.w, t);

      // Normalize to roughly -1..1
      const xRange = preset.xRange[1] - preset.xRange[0];
      const yRange = preset.yRange[1] - preset.yRange[0];
      const zRange = preset.zRange[1] - preset.zRange[0];
      px = (px - (preset.xRange[0] + preset.xRange[1]) / 2) / (xRange / 2);
      py = (py - (preset.yRange[0] + preset.yRange[1]) / 2) / (yRange / 2);
      pz = (pz - (preset.zRange[0] + preset.zRange[1]) / 2) / (zRange / 2);

      // 3D rotation
      let x1 = px * cosRy - pz * sinRy;
      let z1 = px * sinRy + pz * cosRy;
      let y1 = py * cosRx - z1 * sinRx;
      let z2 = py * sinRx + z1 * cosRx;

      const screenX = cx + x1 * scale;
      const screenY = cy + y1 * scale;

      // Map w to hue
      const wNorm = preset.wRange[1] === 0 ? 0 : w / Math.max(Math.abs(preset.wRange[0]), Math.abs(preset.wRange[1]));
      const hue = ((wNorm + 1) / 2) * 300 + animPhase;

      points.push({ x: screenX, y: screenY, z: z2, hue, t });
    }

    // Draw with line segments colored by hue
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const alpha = 0.4 + 0.6 * ((p1.z + 1) / 2);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = hslToRgb(p1.hue, 80, 55 + 15 * ((p1.z + 1) / 2));
      ctx.globalAlpha = Math.max(0.2, Math.min(1, alpha));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [preset, rotation, zoom, animPhase]);

  useEffect(() => {
    drawCurve();
  }, [drawCurve]);

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    let frame;
    const animate = () => {
      setAnimPhase((p) => (p + 0.3) % 360);
      frame = requestAnimationFrame(animate);
      animRef.current = frame;
    };
    frame = requestAnimationFrame(animate);
    animRef.current = frame;
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const handleResize = () => drawCurve();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawCurve]);

  const handleMouseDown = (e) => {
    setDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setRotation((r) => ({ x: r.x + dy * 0.005, y: r.y + dx * 0.005 }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(5, z - e.deltaY * 0.001)));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };
  const handleTouchMove = (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMouse.x;
    const dy = e.touches[0].clientY - lastMouse.y;
    setRotation((r) => ({ x: r.x + dy * 0.005, y: r.y + dx * 0.005 }));
    setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const prevPreset = () => setPresetIdx((i) => (i - 1 + PRESETS.length) % PRESETS.length);
  const nextPreset = () => setPresetIdx((i) => (i + 1) % PRESETS.length);

  const paramCards = [
    { label: "X", color: "#ff6b6b", range: preset.xRange, formula: preset.xLabel },
    { label: "Y", color: "#51cf66", range: preset.yRange, formula: preset.yLabel },
    { label: "Z", color: "#339af0", range: preset.zRange, formula: preset.zLabel },
    { label: "W", color: "#fcc419", range: preset.wRange, formula: preset.wLabel },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#131518",
        color: "#a0a4ab",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: 48,
          borderBottom: "1px solid #23262b",
          flexShrink: 0,
          background: "#16181c",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button
            onClick={() => setActiveTab("parametric")}
            style={{
              background: "none",
              border: "none",
              color: activeTab === "parametric" ? "#e1e3e8" : "#5c6069",
              fontSize: 11,
              fontFamily: "inherit",
              letterSpacing: "0.12em",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 0",
            }}
          >
            <span style={{ fontSize: 14 }}>â–£</span> PARAMETRIC CURVE CONTROL PANEL
          </button>
          <button
            onClick={() => setActiveTab("fourier")}
            style={{
              background: "none",
              border: "none",
              color: activeTab === "fourier" ? "#e1e3e8" : "#5c6069",
              fontSize: 11,
              fontFamily: "inherit",
              letterSpacing: "0.12em",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 0",
            }}
          >
            <span style={{ fontSize: 13 }}>âˆ¿</span> FOURIER CURVE CONTROL PANEL
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              background: "#1e2127",
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid #2a2d33",
            }}
          >
            <button onClick={prevPreset} style={navBtnStyle}>â®</button>
            <button onClick={() => setPlaying(!playing)} style={{ ...navBtnStyle, fontSize: 14 }}>
              {playing ? "â¸" : "â–¶"}
            </button>
            <button onClick={nextPreset} style={navBtnStyle}>â­</button>
          </div>
          <button style={headerBtnStyle}>
            <span style={{ fontSize: 14 }}>â˜†</span> FAVOURITES
          </button>
          <button style={{ ...headerBtnStyle, border: "1px solid #3a3d44" }}>
            <span style={{ fontSize: 14 }}>â†’</span> SIGN IN
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Equation display */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
            fontSize: 12.5,
            lineHeight: 1.8,
            color: "#7a7e86",
          }}
        >
          <div>
            <span style={{ color: "#ff6b6b" }}>x</span> = {preset.xLabel}
          </div>
          <div>
            <span style={{ color: "#51cf66" }}>y</span> = {preset.yLabel}
          </div>
          <div>
            <span style={{ color: "#339af0" }}>z</span> = {preset.zLabel}
          </div>
          <div>
            <span style={{ color: "#fcc419" }}>w</span> = {preset.wLabel}{" "}
            <span style={{ color: "#555" }}>[â†’ hue]</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 10, letterSpacing: "0.15em", color: "#4a4d54" }}>
            DRAG Â· SCROLL Â· PINCH
          </div>
        </div>

        {/* Parameter cards - left side */}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 10,
          }}
        >
          {paramCards.map((card) => (
            <div
              key={card.label}
              style={{
                width: 52,
                padding: "8px 6px",
                background: "rgba(22, 24, 28, 0.9)",
                border: `1px solid ${card.color}33`,
                borderRadius: 8,
                textAlign: "center",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: card.color,
                  marginBottom: 4,
                }}
              >
                {card.label}
              </div>
              <div style={{ fontSize: 7, color: "#555", lineHeight: 1.3 }}>
                RANGE: {card.range[0].toFixed(1)}
                <br />
                to {card.range[1].toFixed(1)}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 6,
                  color: "#444",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {card.label === "W" ? "â†’ color" : "cartesian"}
              </div>
            </div>
          ))}
        </div>

        {/* Preset name indicator */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 10,
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "#3a3d44",
            textTransform: "uppercase",
          }}
        >
          PRESET: {preset.name} ({presetIdx + 1}/{PRESETS.length})
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", cursor: dragging ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setDragging(false)}
        />

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 20,
            fontSize: 10,
            color: "#2a2d33",
            letterSpacing: "0.05em",
          }}
        >
          Â© 2026 Parametric Curve Explorer
        </div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: "none",
  border: "none",
  color: "#7a7e86",
  fontSize: 12,
  padding: "6px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const headerBtnStyle = {
  background: "none",
  border: "none",
  color: "#7a7e86",
  fontSize: 11,
  fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
  letterSpacing: "0.1em",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
};
