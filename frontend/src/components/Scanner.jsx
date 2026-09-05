import { useRef, useState } from "react";
import { Camera, ImagePlus, WifiOff, ScanLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { queueClassification } from "../db/offlineDb";

const CATALOG = [
  {
    code: "battery",
    category: "Batteries",
    itemType: "Lithium / lead-acid battery",
    recyclability: "specialized",
    estimatedValuePerKg: 60,
    hazardLevel: "CRITICAL",
    disposalTips:
      "Do not puncture, crush, or expose to fire. Store separately from other scrap.",
  },
  {
    code: "pcb",
    category: "PCB",
    itemType: "Printed circuit board",
    recyclability: "high",
    estimatedValuePerKg: 185,
    hazardLevel: "HIGH",
    disposalTips:
      "Never burn or acid-wash boards. Send whole boards to an authorized recycler.",
  },
  {
    code: "cable",
    category: "Cables",
    itemType: "Insulated copper cable",
    recyclability: "high",
    estimatedValuePerKg: 140,
    hazardLevel: "HIGH",
    disposalTips: "Do not burn cables to strip insulation.",
  },
  {
    code: "lcd",
    category: "LCD panel",
    itemType: "LCD/LED panel",
    recyclability: "medium",
    estimatedValuePerKg: 30,
    hazardLevel: "MEDIUM",
    disposalTips: "Handle with care to avoid backlight breakage on older panels.",
  },
  {
    code: "crt",
    category: "CRT",
    itemType: "CRT monitor/TV",
    recyclability: "specialized",
    estimatedValuePerKg: 8,
    hazardLevel: "HIGH",
    disposalTips: "Contains leaded glass. Do not break the tube.",
  },
  {
    code: "motor",
    category: "Motors/magnets",
    itemType: "Motor and magnet assembly",
    recyclability: "high",
    estimatedValuePerKg: 210,
    hazardLevel: "LOW",
    disposalTips: "Keep magnets intact for better recycler pricing.",
  },
  {
    code: "plastic",
    category: "Mixed plastics",
    itemType: "Device housing plastic",
    recyclability: "medium",
    estimatedValuePerKg: 18,
    hazardLevel: "LOW",
    disposalTips: "Sort by plastic type where possible for a better rate.",
  },
];

function classifyFromCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const sample = context.getImageData(0, 0, width, height).data;

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  let dark = 0;
  let greenish = 0;
  let yellowish = 0;
  let metallic = 0;
  let warm = 0;

  for (let i = 0; i < sample.length; i += 16) {
    const red = sample[i];
    const green = sample[i + 1];
    const blue = sample[i + 2];
    r += red;
    g += green;
    b += blue;
    count += 1;
    const luma = (red * 299 + green * 587 + blue * 114) / 1000;
    if (luma < 70) dark += 1;
    if (green > red + 18 && green > blue + 10) greenish += 1;
    if (red > 140 && green > 110 && blue < 90) yellowish += 1;
    if (Math.abs(red - green) < 18 && Math.abs(green - blue) < 18 && luma > 90 && luma < 190) {
      metallic += 1;
    }
    if (red > 90 && red > green && red > blue) warm += 1;
  }

  const avgR = r / count;
  const avgG = g / count;
  const avgB = b / count;
  const darkRatio = dark / count;
  const greenRatio = greenish / count;
  const yellowRatio = yellowish / count;
  const metalRatio = metallic / count;
  const warmRatio = warm / count;

  let code = "plastic";
  if (darkRatio > 0.45 && greenRatio > 0.12) code = "pcb";
  else if (yellowRatio > 0.16 || (warmRatio > 0.28 && avgR > 140)) code = "battery";
  else if (metalRatio > 0.22 && avgG > 90 && avgB > 90) code = "cable";
  else if (darkRatio > 0.38 && avgB > avgR + 8) code = "lcd";
  else if (avgR > 90 && avgG > 70 && avgB < 70 && darkRatio < 0.35) code = "crt";
  else if (metalRatio > 0.18 && darkRatio < 0.3) code = "motor";

  const catalog = CATALOG.find((item) => item.code === code) || CATALOG[6];
  return {
    ...catalog,
    materialCode: catalog.code,
    confidence: 0.62,
    source: "offline-canvas-histogram",
    histogram: {
      avgR: Math.round(avgR),
      avgG: Math.round(avgG),
      avgB: Math.round(avgB),
      darkRatio: Number(darkRatio.toFixed(3)),
    },
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function rasterize(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const max = 320;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  canvas.width = Math.max(32, Math.round(image.width * scale));
  canvas.height = Math.max(32, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export default function Scanner({ onClassified }) {
  const { authFetch } = useAuth();
  const { online, collector } = useApp();
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(online ? "online" : "offline");
  const cameraRef = useRef(null);

  async function analyse(dataUrl, mimeType) {
    setBusy(true);
    setError("");
    setPreview(dataUrl);

    const canvas = await rasterize(dataUrl);
    const offlineResult = classifyFromCanvas(canvas);

    if (!online) {
      setMode("offline");
      setResult(offlineResult);
      await queueClassification(offlineResult);
      onClassified?.(offlineResult, dataUrl);
      setBusy(false);
      return;
    }

    try {
      const response = await authFetch("/api/waste/classify", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: mimeType || "image/jpeg",
          city: collector.location,
        }),
      });
      const data = await response.json();
      if (!response.ok && !data.category) {
        throw new Error(data.error || "classify failed");
      }
      const merged = {
        ...offlineResult,
        ...data,
        materialCode: data.materialCode || offlineResult.materialCode,
        source: data.source || "gemini-1.5-flash",
      };
      setMode(data.fallback ? "fallback" : "online");
      setResult(merged);
      await queueClassification(merged);
      onClassified?.(merged, dataUrl);
    } catch (err) {
      setMode("offline");
      setError(err.message);
      setResult(offlineResult);
      await queueClassification(offlineResult);
      onClassified?.(offlineResult, dataUrl);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    await analyse(dataUrl, file.type);
  }

  return (
    <div className="stack">
      <div>
        <div className="h1">E-waste scanner</div>
        <p className="muted">
          Photograph scrap for Gemini classification. Offline, the app uses a
          Canvas colour-histogram fallback.
        </p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className={`pill ${online ? "pill-teal" : "pill-amber"}`}>
          {online ? "Online vision" : "Offline canvas"}
        </span>
        <span className="pill pill-amber">{mode}</span>
      </div>

      <label className="btn btn-primary btn-block">
        <Camera size={18} />
        Capture or upload photo
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          hidden
        />
      </label>

      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() => cameraRef.current?.click()}
      >
        <ImagePlus size={18} />
        Choose from gallery
      </button>

      {preview ? (
        <img src={preview} alt="Selected scrap" className="scan-preview" />
      ) : (
        <div className="scan-placeholder">
          <ScanLine size={36} />
          <div>No photo yet</div>
        </div>
      )}

      {busy ? <p className="muted">Analysing image…</p> : null}
      {error ? (
        <p className="muted">
          <WifiOff size={14} /> Vision API failed — used local histogram. {error}
        </p>
      ) : null}

      {result ? (
        <div className="card">
          <div className="h2">{result.itemType}</div>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row between">
              <span>Category</span>
              <strong>{result.category}</strong>
            </div>
            <div className="row between">
              <span>Recyclability</span>
              <strong>{result.recyclability}</strong>
            </div>
            <div className="row between">
              <span>Est. value</span>
              <strong>₹{result.estimatedValuePerKg}/kg</strong>
            </div>
            <div className="row between">
              <span>Hazard</span>
              <span className="pill pill-danger">{result.hazardLevel}</span>
            </div>
            <p className="muted">{result.disposalTips}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
