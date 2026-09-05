/**
 * src/components/EprReceiptGenerator.tsx
 *
 * Generates a legally-oriented Extended Producer Responsibility (EPR)
 * digital handover receipt: geotagged, photo-documented, and
 * dual-signed by both the collector and the receiving recycler.
 *
 * Flow:
 *   1. Handover details (recycler + registration number, category, weight)
 *   2. Geotag capture (Geolocation API) + photo proof (file input, read
 *      as a data URL and "uploaded" with a simulated progress bar —
 *      there is no real upload backend for this prototype, but the
 *      resulting artifact — a base64 photo attached to the receipt —
 *      is exactly what a real upload would produce)
 *   3. Dual digital signatures captured on <canvas> signature pads
 *   4. Generated certificate view, downloadable as a self-contained
 *      HTML "digital certificate" file
 *
 * On confirm, the receipt is POSTed to `${API_BASE}/api/handover`;
 * if that fails (offline or server error) it is transparently queued
 * via the IndexedDB-backed offline queue in `src/utils/offlineQueue.ts`
 * and marked `queued_offline`, matching the pattern already used by
 * `createTransaction()` in `src/lib/api.js`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api";
import { offlineQueue } from "../utils/offlineQueue";
import {
  EWASTE_SUBCATEGORIES,
  type DigitalSignature,
  type EprReceipt,
  type EprReceiptStatus,
  type EwasteCategoryId,
  type GeoCoordinates,
  type PhotoProof,
  type SupportedLanguage,
} from "../types/ewaste";

const STRINGS: Record<string, Record<SupportedLanguage, string>> = {
  title: { en: "EPR Handover Receipt", hi: "ईपीआर हस्तांतरण रसीद", mr: "ईपीआर हस्तांतरण पावती" },
  category: { en: "Material category", hi: "सामग्री श्रेणी", mr: "साहित्य श्रेणी" },
  weight: { en: "Weight (kg)", hi: "वज़न (किलो)", mr: "वजन (किलो)" },
  recyclerName: { en: "Recycler name", hi: "रीसाइकलर का नाम", mr: "रिसायकलरचे नाव" },
  recyclerReg: { en: "EPR / CPCB registration no.", hi: "ईपीआर / सीपीसीबी पंजीकरण नं.", mr: "ईपीआर / सीपीसीबी नोंदणी क्र." },
  next: { en: "Next", hi: "आगे", mr: "पुढे" },
  back: { en: "Back", hi: "पीछे", mr: "मागे" },
  captureLocation: { en: "Capture GPS location", hi: "जीपीएस लोकेशन लें", mr: "जीपीएस लोकेशन घ्या" },
  locationCaptured: { en: "Location captured", hi: "लोकेशन दर्ज हुई", mr: "लोकेशन नोंदवले" },
  locationFailed: { en: "Could not get location — check permissions", hi: "लोकेशन नहीं मिला — अनुमति जांचें", mr: "लोकेशन मिळाले नाही — परवानगी तपासा" },
  attachPhoto: { en: "Attach photo proof", hi: "फोटो प्रमाण जोड़ें", mr: "फोटो पुरावा जोडा" },
  uploading: { en: "Uploading photo...", hi: "फोटो अपलोड हो रहा है...", mr: "फोटो अपलोड होत आहे..." },
  photoAttached: { en: "Photo attached", hi: "फोटो जोड़ी गई", mr: "फोटो जोडला" },
  collectorSign: { en: "Collector signature", hi: "कलेक्टर हस्ताक्षर", mr: "कलेक्टर स्वाक्षरी" },
  recyclerSign: { en: "Recycler signature", hi: "रीसाइकलर हस्ताक्षर", mr: "रिसायकलर स्वाक्षरी" },
  clear: { en: "Clear", hi: "साफ़ करें", mr: "साफ करा" },
  signHere: { en: "Sign in the box above", hi: "ऊपर बॉक्स में हस्ताक्षर करें", mr: "वरील बॉक्समध्ये स्वाक्षरी करा" },
  nameLabel: { en: "Full name", hi: "पूरा नाम", mr: "पूर्ण नाव" },
  generate: { en: "Generate receipt", hi: "रसीद बनाएं", mr: "पावती तयार करा" },
  certTitle: { en: "Digital Handover Certificate", hi: "डिजिटल हस्तांतरण प्रमाणपत्र", mr: "डिजिटल हस्तांतरण प्रमाणपत्र" },
  reference: { en: "Reference", hi: "संदर्भ", mr: "संदर्भ" },
  status: { en: "Status", hi: "स्थिति", mr: "स्थिती" },
  download: { en: "Download certificate", hi: "प्रमाणपत्र डाउनलोड करें", mr: "प्रमाणपत्र डाउनलोड करा" },
  startNew: { en: "Start new receipt", hi: "नई रसीद शुरू करें", mr: "नवीन पावती सुरू करा" },
  queuedNotice: {
    en: "Saved offline. It will sync to the recycler's compliance record automatically once you're back online.",
    hi: "ऑफ़लाइन सेव हुआ। इंटरनेट आने पर यह रीसाइकलर के अनुपालन रिकॉर्ड में अपने आप सिंक हो जाएगा।",
    mr: "ऑफलाइन सेव्ह झाले. इंटरनेट आल्यावर हे रिसायकलरच्या अनुपालन नोंदीत आपोआप सिंक होईल.",
  },
  submitting: { en: "Submitting...", hi: "जमा हो रहा है...", mr: "सादर होत आहे..." },
};

function t(key: keyof typeof STRINGS, lang: SupportedLanguage): string {
  return STRINGS[key]?.[lang] ?? key;
}

function generateReferenceCode(): string {
  return `EPR-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function captureGeolocation(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

/* ------------------------------------------------------------------ */
/* Signature pad                                                        */
/* ------------------------------------------------------------------ */

interface SignaturePadProps {
  label: string;
  clearLabel: string;
  hintLabel: string;
  onChange: (dataUrl: string, hasStrokes: boolean) => void;
}

function SignaturePad({ label, clearLabel, hintLabel, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokesRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const getRelativePoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"), hasStrokesRef.current);
  }, [onChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      drawingRef.current = true;
      lastPointRef.current = getRelativePoint(e);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [getRelativePoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const ctx = getContext();
      const last = lastPointRef.current;
      const point = getRelativePoint(e);
      if (!ctx || !last) return;
      ctx.strokeStyle = "#1f2a24";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
      hasStrokesRef.current = true;
    },
    [getContext, getRelativePoint]
  );

  const handlePointerUp = useCallback(() => {
    drawingRef.current = false;
    lastPointRef.current = null;
    emitChange();
  }, [emitChange]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokesRef.current = false;
    emitChange();
  }, [emitChange, getContext]);

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between">
        <span className="muted" style={{ fontWeight: 500 }}>
          {label}
        </span>
        <button type="button" className="btn btn-secondary" style={{ minHeight: 32, padding: "6px 12px" }} onClick={handleClear}>
          {clearLabel}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        style={{
          width: "100%",
          height: 120,
          background: "#fff",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-sm)",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <span className="muted" style={{ fontSize: 12 }}>
        {hintLabel}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Certificate rendering                                                */
/* ------------------------------------------------------------------ */

function buildCertificateHtml(receipt: EprReceipt): string {
  const category = EWASTE_SUBCATEGORIES.find((c) => c.id === receipt.category);
  const categoryLabel = category ? category.labels.en : receipt.category;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>EPR Certificate ${receipt.referenceCode}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f6f5f1; color:#1f2a24; padding:32px; }
  .sheet { max-width:640px; margin:0 auto; background:#fff; border:1px solid #dbd8cd; border-radius:14px; padding:32px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .muted { color:#5f6b63; font-size:13px; }
  table { width:100%; border-collapse:collapse; margin-top:20px; }
  td { padding:8px 0; border-bottom:1px solid #eee; font-size:14px; vertical-align:top; }
  td.label { color:#5f6b63; width:45%; }
  .sig { display:flex; gap:16px; margin-top:24px; }
  .sig div { flex:1; text-align:center; }
  .sig img { max-width:100%; border:1px solid #dbd8cd; border-radius:8px; background:#fff; }
  .badge { display:inline-block; background:#e1f5ee; color:#085041; padding:4px 10px; border-radius:999px; font-size:12px; margin-top:8px; }
  .photos { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
  .photos img { width:96px; height:96px; object-fit:cover; border-radius:8px; border:1px solid #dbd8cd; }
</style>
</head>
<body>
  <div class="sheet">
    <h1>Extended Producer Responsibility — Digital Handover Certificate</h1>
    <div class="muted">Generated by SafaaiWala · Reference ${receipt.referenceCode}</div>
    <span class="badge">${receipt.status.replace(/_/g, " ")}</span>
    <table>
      <tr><td class="label">Collector ID</td><td>${receipt.collectorId}</td></tr>
      <tr><td class="label">Recycler</td><td>${receipt.recyclerName}</td></tr>
      <tr><td class="label">Recycler EPR/CPCB reg. no.</td><td>${receipt.recyclerRegistrationNumber}</td></tr>
      <tr><td class="label">Material category</td><td>${categoryLabel}</td></tr>
      <tr><td class="label">Weight</td><td>${receipt.weightKg} kg</td></tr>
      <tr><td class="label">Estimated value</td><td>₹${receipt.estimatedValueInr}</td></tr>
      <tr><td class="label">Geotag</td><td>${receipt.geotag.lat.toFixed(5)}, ${receipt.geotag.lng.toFixed(5)} (±${Math.round(
    receipt.geotag.accuracyMeters ?? 0
  )} m)</td></tr>
      <tr><td class="label">Created</td><td>${new Date(receipt.createdAt).toLocaleString()}</td></tr>
      <tr><td class="label">Confirmed</td><td>${
        receipt.confirmedAt ? new Date(receipt.confirmedAt).toLocaleString() : "—"
      }</td></tr>
    </table>
    ${
      receipt.photoProofs.length
        ? `<div class="photos">${receipt.photoProofs
            .map((p) => `<img src="${p.dataUrl}" alt="Photo proof" />`)
            .join("")}</div>`
        : ""
    }
    <div class="sig">
      <div>
        <div class="muted">Collector signature</div>
        ${
          receipt.collectorSignature
            ? `<img src="${receipt.collectorSignature.signatureImageDataUrl}" alt="Collector signature" /><div class="muted">${receipt.collectorSignature.signedByName}</div>`
            : "<div class='muted'>Not signed</div>"
        }
      </div>
      <div>
        <div class="muted">Recycler signature</div>
        ${
          receipt.recyclerSignature
            ? `<img src="${receipt.recyclerSignature.signatureImageDataUrl}" alt="Recycler signature" /><div class="muted">${receipt.recyclerSignature.signedByName}</div>`
            : "<div class='muted'>Not signed</div>"
        }
      </div>
    </div>
  </div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export interface EprReceiptGeneratorProps {
  collectorId: string;
  collectorName?: string;
  lang?: SupportedLanguage;
  /** Called once the receipt is confirmed (locally, before/instead of server ack). */
  onComplete?: (receipt: EprReceipt) => void;
}

type Step = "details" | "capture" | "signatures" | "certificate";

export default function EprReceiptGenerator({
  collectorId,
  collectorName,
  lang = "hi",
  onComplete,
}: EprReceiptGeneratorProps) {
  const [step, setStep] = useState<Step>("details");
  const [category, setCategory] = useState<EwasteCategoryId>(EWASTE_SUBCATEGORIES[0].id);
  const [weightKg, setWeightKg] = useState("");
  const [estimatedValueInr, setEstimatedValueInr] = useState("");
  const [recyclerName, setRecyclerName] = useState("");
  const [recyclerRegistrationNumber, setRecyclerRegistrationNumber] = useState("");

  const [geotag, setGeotag] = useState<GeoCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoProofs, setPhotoProofs] = useState<PhotoProof[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [collectorSignerName, setCollectorSignerName] = useState(collectorName ?? "");
  const [recyclerSignerName, setRecyclerSignerName] = useState("");
  const collectorSigRef = useRef<{ dataUrl: string; hasStrokes: boolean }>({ dataUrl: "", hasStrokes: false });
  const recyclerSigRef = useRef<{ dataUrl: string; hasStrokes: boolean }>({ dataUrl: "", hasStrokes: false });

  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<EprReceipt | null>(null);

  useEffect(() => {
    void offlineQueue.init();
  }, []);

  const handleCaptureLocation = useCallback(async () => {
    setLocationError(null);
    try {
      const coords = await captureGeolocation();
      setGeotag(coords);
    } catch {
      setLocationError(t("locationFailed", lang));
    }
  }, [lang]);

  const handlePhotoSelected = useCallback(async (file: File) => {
    setUploadingPhoto(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      // Simulated network upload latency — in production this would be
      // a real multipart upload; the resulting artifact stored on the
      // receipt (a durable URL/data URL) is identical either way.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setPhotoProofs((prev) => [
        ...prev,
        { id: `photo_${Date.now()}`, dataUrl, capturedAt: new Date().toISOString(), sizeBytes: file.size },
      ]);
    } finally {
      setUploadingPhoto(false);
    }
  }, []);

  const buildDraftReceipt = useCallback((): EprReceipt | null => {
    if (!geotag) return null;
    const weight = parseFloat(weightKg);
    const value = parseFloat(estimatedValueInr) || 0;
    if (!Number.isFinite(weight) || weight <= 0) return null;

    const collectorSignature: DigitalSignature | null = collectorSigRef.current.hasStrokes
      ? {
          signatureImageDataUrl: collectorSigRef.current.dataUrl,
          signedByName: collectorSignerName || "Collector",
          signedAt: new Date().toISOString(),
          hasStrokes: true,
        }
      : null;

    const recyclerSignature: DigitalSignature | null = recyclerSigRef.current.hasStrokes
      ? {
          signatureImageDataUrl: recyclerSigRef.current.dataUrl,
          signedByName: recyclerSignerName || recyclerName || "Recycler",
          signedAt: new Date().toISOString(),
          hasStrokes: true,
        }
      : null;

    const status: EprReceiptStatus =
      collectorSignature && recyclerSignature ? "confirmed" : "awaiting_recycler_signature";

    return {
      id: `epr_${Date.now()}`,
      transactionId: null,
      collectorId,
      collectorName,
      recyclerId: `manual_${recyclerRegistrationNumber || "unregistered"}`,
      recyclerName,
      recyclerRegistrationNumber,
      category,
      weightKg: weight,
      estimatedValueInr: value,
      geotag,
      photoProofs,
      collectorSignature,
      recyclerSignature,
      status,
      createdAt: new Date().toISOString(),
      confirmedAt: status === "confirmed" ? new Date().toISOString() : null,
      referenceCode: generateReferenceCode(),
    };
  }, [
    category,
    collectorId,
    collectorName,
    collectorSignerName,
    estimatedValueInr,
    geotag,
    photoProofs,
    recyclerName,
    recyclerRegistrationNumber,
    recyclerSignerName,
    weightKg,
  ]);

  const handleGenerate = useCallback(async () => {
    const draft = buildDraftReceipt();
    if (!draft) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setReceipt(draft);
      } else {
        throw new Error(`Server responded ${res.status}`);
      }
    } catch {
      await offlineQueue.enqueue({
        kind: "epr_receipt",
        endpoint: "/api/handover",
        method: "POST",
        payload: draft,
      });
      setReceipt({ ...draft, status: "queued_offline" });
    } finally {
      setSubmitting(false);
      setStep("certificate");
      onComplete?.(draft);
    }
  }, [buildDraftReceipt, onComplete]);

  const handleDownloadCertificate = useCallback(() => {
    if (!receipt) return;
    const html = buildCertificateHtml(receipt);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${receipt.referenceCode}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [receipt]);

  const resetAll = useCallback(() => {
    setStep("details");
    setCategory(EWASTE_SUBCATEGORIES[0].id);
    setWeightKg("");
    setEstimatedValueInr("");
    setRecyclerName("");
    setRecyclerRegistrationNumber("");
    setGeotag(null);
    setLocationError(null);
    setPhotoProofs([]);
    setCollectorSignerName(collectorName ?? "");
    setRecyclerSignerName("");
    collectorSigRef.current = { dataUrl: "", hasStrokes: false };
    recyclerSigRef.current = { dataUrl: "", hasStrokes: false };
    setReceipt(null);
  }, [collectorName]);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="h1">{t("title", lang)}</div>

      {step === "details" && (
        <div className="stack">
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>
              {t("category", lang)}
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value as EwasteCategoryId)}>
              {EWASTE_SUBCATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.labels[lang]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>
              {t("weight", lang)}
            </div>
            <input type="number" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0.0" />
          </label>

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>
              {t("recyclerName", lang)}
            </div>
            <input type="text" value={recyclerName} onChange={(e) => setRecyclerName(e.target.value)} />
          </label>

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>
              {t("recyclerReg", lang)}
            </div>
            <input
              type="text"
              value={recyclerRegistrationNumber}
              onChange={(e) => setRecyclerRegistrationNumber(e.target.value)}
              placeholder="EPR/CPCB/xxxxxx"
            />
          </label>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!weightKg || !recyclerName || !recyclerRegistrationNumber}
            onClick={() => setStep("capture")}
          >
            {t("next", lang)}
          </button>
        </div>
      )}

      {step === "capture" && (
        <div className="stack">
          <div className="card">
            <div className="row between">
              <span className="muted">{t("captureLocation", lang)}</span>
              <button type="button" className="btn btn-secondary" onClick={handleCaptureLocation}>
                {t("captureLocation", lang)}
              </button>
            </div>
            {geotag && (
              <div className="pill pill-teal" style={{ marginTop: 10 }}>
                {t("locationCaptured", lang)}: {geotag.lat.toFixed(5)}, {geotag.lng.toFixed(5)}
              </div>
            )}
            {locationError && (
              <div className="pill pill-danger" style={{ marginTop: 10 }}>
                {locationError}
              </div>
            )}
          </div>

          <div className="card">
            <div className="row between">
              <span className="muted">{t("attachPhoto", lang)}</span>
              <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                {t("attachPhoto", lang)}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePhotoSelected(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {uploadingPhoto && (
              <div className="muted" style={{ marginTop: 8 }}>
                {t("uploading", lang)}
              </div>
            )}
            {photoProofs.length > 0 && (
              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                {photoProofs.map((p) => (
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt={t("photoAttached", lang)}
                    style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep("details")}>
              {t("back", lang)}
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={!geotag} onClick={() => setStep("signatures")}>
              {t("next", lang)}
            </button>
          </div>
        </div>
      )}

      {step === "signatures" && (
        <div className="stack">
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>
              {t("nameLabel", lang)} ({t("collectorSign", lang)})
            </div>
            <input type="text" value={collectorSignerName} onChange={(e) => setCollectorSignerName(e.target.value)} />
          </label>
          <SignaturePad
            label={t("collectorSign", lang)}
            clearLabel={t("clear", lang)}
            hintLabel={t("signHere", lang)}
            onChange={(dataUrl, hasStrokes) => {
              collectorSigRef.current = { dataUrl, hasStrokes };
            }}
          />

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>
              {t("nameLabel", lang)} ({t("recyclerSign", lang)})
            </div>
            <input type="text" value={recyclerSignerName} onChange={(e) => setRecyclerSignerName(e.target.value)} />
          </label>
          <SignaturePad
            label={t("recyclerSign", lang)}
            clearLabel={t("clear", lang)}
            hintLabel={t("signHere", lang)}
            onChange={(dataUrl, hasStrokes) => {
              recyclerSigRef.current = { dataUrl, hasStrokes };
            }}
          />

          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep("capture")}>
              {t("back", lang)}
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleGenerate}>
              {submitting ? t("submitting", lang) : t("generate", lang)}
            </button>
          </div>
        </div>
      )}

      {step === "certificate" && receipt && (
        <div className="stack">
          <div className="card" style={{ textAlign: "center" }}>
            <div className="h2">{t("certTitle", lang)}</div>
            <p className="muted">
              {t("reference", lang)}: {receipt.referenceCode}
            </p>
            <div className="pill pill-teal">
              {t("status", lang)}: {receipt.status.replace(/_/g, " ")}
            </div>
            {receipt.status === "queued_offline" && (
              <p className="muted" style={{ marginTop: 10 }}>
                {t("queuedNotice", lang)}
              </p>
            )}
            <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={handleDownloadCertificate}>
              {t("download", lang)}
            </button>
            <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 10 }} onClick={resetAll}>
              {t("startNew", lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}