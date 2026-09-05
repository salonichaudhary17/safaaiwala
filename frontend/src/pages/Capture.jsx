import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { getMaterials, createLot, createTransaction } from "../lib/api";
import Icon from "../components/Icon";

export default function Capture() {
  const { lang, collector } = useApp();
  const [materials, setMaterials] = useState([]);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [weight, setWeight] = useState("");
  const [lot, setLot] = useState(null);
  const [recyclers, setRecyclers] = useState([]);
  const [chosenRecycler, setChosenRecycler] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMaterials().then(setMaterials).catch(() => {});
  }, []);

  const materialLabel = (m) => m[`label_${lang}`] || m.label_en;
  const safetyNote = (m) => m[`safety_note_${lang}`] || m.safety_note_en;

  async function handleGetValue() {
    if (!selected || !weight) return;
    setLoading(true);
    try {
      const res = await createLot({
        materialHint: selected.id,
        hasPhoto,
        weightKg: parseFloat(weight),
        location: collector.location,
        lat: collector.lat,
        lng: collector.lng,
      });
      setLot(res.lot);
      setRecyclers(res.recommendedRecyclers);
      setStep(3);
    } catch (err) {
      alert("Could not reach the pricing service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await createTransaction({
        collectorId: collector.id,
        materialId: selected.id,
        weightKg: parseFloat(weight),
        finalPrice: lot.estimatedValue,
        recyclerId: chosenRecycler.id,
        lat: collector.lat,
        lng: collector.lng,
      });
      setReceipt(res);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setSelected(null);
    setHasPhoto(false);
    setWeight("");
    setLot(null);
    setRecyclers([]);
    setChosenRecycler(null);
    setReceipt(null);
  }

  return (
    <div className="stack">
      {step === 1 && (
        <>
          <div className="h1">{t("captureTitle", lang)}</div>
          <div className="material-grid">
            {materials.map((m) => (
              <div
                key={m.id}
                className={`material-tile ${selected?.id === m.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(m);
                  setStep(2);
                }}
              >
                <Icon name={m.id} size={26} color="#0F6E56" />
                <span>{materialLabel(m)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 2 && selected && (
        <>
          <div className="row" style={{ gap: 8 }}>
            <Icon name={selected.id} size={24} color="#0F6E56" />
            <div className="h2" style={{ margin: 0 }}>{materialLabel(selected)}</div>
          </div>

          {selected.hazardous && (
            <div className="card" style={{ borderColor: "#f0c9c9", background: "#fcebeb" }}>
              <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                <Icon name="warning" size={20} color="#a32d2d" />
                <p className="muted" style={{ color: "#a32d2d", margin: 0 }}>{safetyNote(selected)}</p>
              </div>
            </div>
          )}

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>{t("weightLabel", lang)}</div>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.0"
            />
          </label>

          <button
            className="btn btn-secondary btn-block"
            onClick={() => setHasPhoto(true)}
            style={hasPhoto ? { borderColor: "#0F6E56", background: "#e1f5ee" } : undefined}
          >
            <Icon name="camera" size={18} color="#0F6E56" />
            {hasPhoto ? "Photo attached ✓" : "Attach photo (optional)"}
          </button>

          <button
            className="btn btn-primary btn-block"
            disabled={!weight || loading}
            onClick={handleGetValue}
          >
            {loading ? "..." : t("getValue", lang)}
          </button>
        </>
      )}

      {step === 3 && lot && (
        <>
          <div className="card">
            <div className="row between">
              <span className="muted">{t("estimatedValue", lang)}</span>
              <span className="pill pill-amber" style={{ fontSize: 18 }}>
                ₹{lot.estimatedValue ?? "N/A"}
              </span>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {weight} kg × ₹{lot.pricePerKg}/kg
            </div>
            {lot.anomaly?.isAnomaly && (
              <div className="pill pill-danger" style={{ marginTop: 10 }}>
                Quoted rate looks unusual — double-check before confirming
              </div>
            )}
          </div>

          <div className="h2">{t("findRecyclers", lang)}</div>
          <div className="stack" style={{ gap: 10 }}>
            {recyclers.map((r) => (
              <div
                key={r.id}
                className="card"
                style={{
                  cursor: "pointer",
                  borderColor: chosenRecycler?.id === r.id ? "#0F6E56" : undefined,
                }}
                onClick={() => setChosenRecycler(r)}
              >
                <div className="row between">
                  <strong style={{ fontSize: 15 }}>{r.name}</strong>
                  <span className="pill pill-teal">{r.distanceKm} {t("km", lang)}</span>
                </div>
                <div className="muted">{r.location}, {r.city}</div>
                <div className="row" style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}>
                  <span className="pill" style={{ background: r.pickup_available ? "#e1f5ee" : "#f1efe8" }}>
                    {r.pickup_available ? t("pickupYes", lang) : t("pickupNo", lang)}
                  </span>
                  {!r.inRange && (
                    <span className="pill pill-amber">{t("outOfRange", lang)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-block"
            disabled={!chosenRecycler || loading}
            onClick={handleConfirm}
          >
            {loading ? "..." : t("confirmHandover", lang)}
          </button>
        </>
      )}

      {step === 4 && receipt && (
        <div className="card" style={{ textAlign: "center" }}>
          <Icon name="check" size={36} color="#0F6E56" />
          <div className="h2" style={{ marginTop: 10 }}>{t("handoverDone", lang)}</div>
          <p className="muted">
            {t("refHash", lang)}: {receipt.reference_hash || "queued"}
          </p>
          {receipt.queued && (
            <div className="pill pill-amber">Saved offline — will sync automatically</div>
          )}
          <button className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={reset}>
            {t("startPickup", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
