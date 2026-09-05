/**
 * src/components/EwasteValuationCalculator.tsx
 *
 * Lets an informal collector pick a high-value e-waste sub-category
 * (Telecom PCB, Server Motherboard, Li-ion cells, gold-finger
 * connectors, etc.), estimate weight and physical condition, and get
 * a spot-metal-yield-based valuation (Gold, Copper, Cobalt, Tantalum,
 * ...), blended with a flat-rate fallback and a confidence score.
 *
 * "AI-assisted" here means the yield model combines category-level
 * extraction-yield data (src/types/ewaste.ts) with a condition-grade
 * modifier and market spot rates to produce a scored estimate and a
 * confidence label — a lightweight expert-system heuristic that
 * degrades gracefully rather than a hosted ML call, which keeps this
 * fully usable offline in the field.
 *
 * Confirmed valuations can be logged straight into a cash-first
 * ledger (localStorage-backed, per collectorId) so collectors have an
 * immediate running cash balance even before a recycler settlement is
 * confirmed — this is separate from, and feeds into, the formal
 * ledger shown by src/pages/Ledger.jsx.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EWASTE_SUBCATEGORIES,
  METAL_REFERENCE,
  type CollectorLedgerEntry,
  type EwasteCategoryId,
  type EwasteSubCategory,
  type MetalSymbol,
  type MetalValuationLine,
  type SupportedLanguage,
  type ValuationConfidence,
  type ValuationResult,
} from "../types/ewaste";

/* ------------------------------------------------------------------ */
/* Spot rate table (manually maintained reference rates)               */
/* ------------------------------------------------------------------ */

interface SpotRate {
  rateInrPerGram: number;
  lastUpdated: string;
}

/**
 * Reference spot rates in INR per gram (mg-denominated metals are
 * converted at call time). These are illustrative defaults a market
 * operator would update periodically — not a live feed — and the UI
 * lets the collector or operator override them per session.
 */
const DEFAULT_SPOT_RATES: Record<MetalSymbol, SpotRate> = {
  AU: { rateInrPerGram: 6200, lastUpdated: "2026-08-01" },
  AG: { rateInrPerGram: 78, lastUpdated: "2026-08-01" },
  CU: { rateInrPerGram: 0.72, lastUpdated: "2026-08-01" },
  PD: { rateInrPerGram: 3400, lastUpdated: "2026-08-01" },
  CO: { rateInrPerGram: 2.9, lastUpdated: "2026-08-01" },
  TA: { rateInrPerGram: 4.1, lastUpdated: "2026-08-01" },
  AL: { rateInrPerGram: 0.19, lastUpdated: "2026-08-01" },
  LI: { rateInrPerGram: 5.8, lastUpdated: "2026-08-01" },
  ND: { rateInrPerGram: 6.5, lastUpdated: "2026-08-01" },
};

const GRADE_MODIFIER: Record<"A" | "B" | "C", number> = { A: 1.1, B: 1.0, C: 0.8 };

const STRINGS: Record<string, Record<SupportedLanguage, string>> = {
  title: { en: "Scrap value calculator", hi: "स्क्रैप मूल्य कैलकुलेटर", mr: "स्क्रॅप मूल्य कॅल्क्युलेटर" },
  category: { en: "Category", hi: "श्रेणी", mr: "श्रेणी" },
  weight: { en: "Weight (kg)", hi: "वज़न (किलो)", mr: "वजन (किलो)" },
  grade: { en: "Condition grade", hi: "स्थिति ग्रेड", mr: "स्थिती ग्रेड" },
  gradeA: { en: "A — clean, sorted", hi: "A — साफ़, छांटा हुआ", mr: "A — स्वच्छ, वर्गीकृत" },
  gradeB: { en: "B — mixed, average", hi: "B — मिश्रित, औसत", mr: "B — मिश्र, सरासरी" },
  gradeC: { en: "C — degraded/corroded", hi: "C — खराब/जंग लगा", mr: "C — खराब/गंजलेले" },
  calculate: { en: "Calculate value", hi: "मूल्य निकालें", mr: "मूल्य काढा" },
  breakdown: { en: "Metal yield breakdown", hi: "धातु उपज विवरण", mr: "धातू उत्पन्न तपशील" },
  metalValue: { en: "Metal-based estimate", hi: "धातु-आधारित अनुमान", mr: "धातू-आधारित अंदाज" },
  flatValue: { en: "Flat-rate fallback", hi: "फ्लैट-रेट अनुमान", mr: "फ्लॅट-रेट अंदाज" },
  finalValue: { en: "Estimated value", hi: "अनुमानित मूल्य", mr: "अंदाजे मूल्य" },
  confidence: { en: "Confidence", hi: "विश्वसनीयता", mr: "विश्वासार्हता" },
  confHigh: { en: "High", hi: "उच्च", mr: "उच्च" },
  confMed: { en: "Medium", hi: "मध्यम", mr: "मध्यम" },
  confLow: { en: "Low", hi: "कम", mr: "कमी" },
  adjustRates: { en: "Adjust spot rates", hi: "स्पॉट रेट समायोजित करें", mr: "स्पॉट रेट समायोजित करा" },
  ratePerGram: { en: "₹ per gram", hi: "₹ प्रति ग्राम", mr: "₹ प्रति ग्रॅम" },
  logToLedger: { en: "Log to cash ledger", hi: "कैश लेजर में दर्ज करें", mr: "कॅश लेजरमध्ये नोंदवा" },
  ledgerTitle: { en: "Cash-first ledger", hi: "कैश-फर्स्ट लेजर", mr: "कॅश-फर्स्ट लेजर" },
  balance: { en: "Current balance", hi: "वर्तमान बैलेंस", mr: "सद्य शिल्लक" },
  noEntries: { en: "No entries yet.", hi: "अभी कोई प्रविष्टि नहीं।", mr: "अजून नोंद नाही." },
  exportCsv: { en: "Export ledger (CSV)", hi: "लेजर निर्यात करें (CSV)", mr: "लेजर निर्यात करा (CSV)" },
  loggedNotice: { en: "Logged to your cash ledger.", hi: "आपके कैश लेजर में दर्ज हुआ।", mr: "तुमच्या कॅश लेजरमध्ये नोंदवले." },
};

function t(key: keyof typeof STRINGS, lang: SupportedLanguage): string {
  return STRINGS[key]?.[lang] ?? key;
}

function convertToGrams(amount: number, unit: "g" | "mg"): number {
  return unit === "mg" ? amount / 1000 : amount;
}

function computeValuation(
  subcategory: EwasteSubCategory,
  weightKg: number,
  grade: "A" | "B" | "C",
  spotRates: Record<MetalSymbol, SpotRate>
): ValuationResult {
  const gradeModifier = GRADE_MODIFIER[grade];

  const metalLines: MetalValuationLine[] = subcategory.metalYields.map((yieldEntry) => {
    const ref = METAL_REFERENCE[yieldEntry.metal];
    const rawAmount = yieldEntry.amountPerKg * weightKg * yieldEntry.recoveryEfficiency * gradeModifier;
    const amountInGrams = convertToGrams(rawAmount, ref.unit);
    const spotRate = spotRates[yieldEntry.metal];
    const lineValueInr = amountInGrams * spotRate.rateInrPerGram;
    return {
      metal: yieldEntry.metal,
      estimatedAmount: rawAmount,
      unit: ref.unit,
      spotRateInrPerGram: spotRate.rateInrPerGram,
      lineValueInr,
    };
  });

  const metalValueSubtotalInr = metalLines.reduce((sum, line) => sum + line.lineValueInr, 0);
  const flatBand = subcategory.fallbackPriceBandInr;
  const flatMidpoint = (flatBand.min + flatBand.max) / 2;
  const flatRateEstimateInr = flatMidpoint * weightKg * gradeModifier;

  // Blend: when metal-yield data exists, weight it heavily (it reflects
  // this specific category's chemistry); otherwise fall back entirely
  // to the flat rate (e.g. mixed plastic housing has no tracked metals).
  const hasMetalData = metalLines.length > 0;
  const finalEstimateInr = hasMetalData
    ? metalValueSubtotalInr * 0.75 + flatRateEstimateInr * 0.25
    : flatRateEstimateInr;

  let confidence: ValuationConfidence = "medium";
  if (hasMetalData && grade !== "C" && weightKg >= 0.5) confidence = "high";
  else if (!hasMetalData || weightKg < 0.1) confidence = "low";

  return {
    category: subcategory.id,
    weightKg,
    conditionGrade: grade,
    metalLines,
    metalValueSubtotalInr,
    flatRateEstimateInr,
    finalEstimateInr,
    confidence,
    computedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Cash-first ledger persistence (localStorage, per collector)          */
/* ------------------------------------------------------------------ */

function ledgerKey(collectorId: string): string {
  return `safaaiwala_cash_ledger_${collectorId}`;
}

function loadLedger(collectorId: string): CollectorLedgerEntry[] {
  try {
    const raw = window.localStorage.getItem(ledgerKey(collectorId));
    return raw ? (JSON.parse(raw) as CollectorLedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLedger(collectorId: string, entries: CollectorLedgerEntry[]): void {
  try {
    window.localStorage.setItem(ledgerKey(collectorId), JSON.stringify(entries));
  } catch {
    // Storage unavailable — the in-memory state in the component still
    // reflects the entry for the remainder of this session.
  }
}

function appendLedgerEntry(
  collectorId: string,
  input: Omit<CollectorLedgerEntry, "id" | "collectorId" | "runningBalanceInr" | "createdAt">
): CollectorLedgerEntry[] {
  const existing = loadLedger(collectorId);
  const previousBalance = existing.length > 0 ? existing[existing.length - 1].runningBalanceInr : 0;
  const delta = input.type === "payout_debit" ? -Math.abs(input.amountInr) : Math.abs(input.amountInr);
  const entry: CollectorLedgerEntry = {
    ...input,
    id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    collectorId,
    runningBalanceInr: previousBalance + delta,
    createdAt: new Date().toISOString(),
  };
  const updated = [...existing, entry];
  saveLedger(collectorId, updated);
  return updated;
}

function ledgerToCsv(entries: CollectorLedgerEntry[]): string {
  const header = "date,type,category,weightKg,amountInr,runningBalanceInr,note";
  const rows = entries.map((e) =>
    [
      new Date(e.createdAt).toISOString(),
      e.type,
      e.category ?? "",
      e.weightKg ?? "",
      e.amountInr.toFixed(2),
      e.runningBalanceInr.toFixed(2),
      `"${e.note.replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export interface EwasteValuationCalculatorProps {
  collectorId: string;
  lang?: SupportedLanguage;
  onLogged?: (entry: CollectorLedgerEntry, valuation: ValuationResult) => void;
}

export default function EwasteValuationCalculator({
  collectorId,
  lang = "hi",
  onLogged,
}: EwasteValuationCalculatorProps) {
  const [categoryId, setCategoryId] = useState<EwasteCategoryId>(EWASTE_SUBCATEGORIES[0].id);
  const [weightInput, setWeightInput] = useState("1");
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");
  const [spotRates, setSpotRates] = useState<Record<MetalSymbol, SpotRate>>(DEFAULT_SPOT_RATES);
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [ledger, setLedger] = useState<CollectorLedgerEntry[]>([]);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    setLedger(loadLedger(collectorId));
  }, [collectorId]);

  const subcategory = useMemo(
    () => EWASTE_SUBCATEGORIES.find((c) => c.id === categoryId) ?? EWASTE_SUBCATEGORIES[0],
    [categoryId]
  );

  const handleCalculate = useCallback(() => {
    const weight = parseFloat(weightInput);
    if (!Number.isFinite(weight) || weight <= 0) return;
    setResult(computeValuation(subcategory, weight, grade, spotRates));
    setJustLogged(false);
  }, [grade, spotRates, subcategory, weightInput]);

  const handleRateChange = useCallback((metal: MetalSymbol, value: string) => {
    const parsed = parseFloat(value);
    setSpotRates((prev) => ({
      ...prev,
      [metal]: { ...prev[metal], rateInrPerGram: Number.isFinite(parsed) ? parsed : prev[metal].rateInrPerGram },
    }));
  }, []);

  const handleLogToLedger = useCallback(() => {
    if (!result) return;
    const updated = appendLedgerEntry(collectorId, {
      type: "collection_credit",
      amountInr: Math.round(result.finalEstimateInr),
      note: `${subcategory.labels.en} · ${result.weightKg} kg · grade ${result.conditionGrade}`,
      relatedReceiptId: null,
      category: result.category,
      weightKg: result.weightKg,
    });
    setLedger(updated);
    setJustLogged(true);
    onLogged?.(updated[updated.length - 1], result);
  }, [collectorId, onLogged, result, subcategory]);

  const handleExportCsv = useCallback(() => {
    const csv = ledgerToCsv(ledger);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `safaaiwala_cash_ledger_${collectorId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [collectorId, ledger]);

  const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].runningBalanceInr : 0;

  const confidenceLabel = (confidence: ValuationConfidence): string => {
    if (confidence === "high") return t("confHigh", lang);
    if (confidence === "low") return t("confLow", lang);
    return t("confMed", lang);
  };

  const confidencePillClass = (confidence: ValuationConfidence): string => {
    if (confidence === "high") return "pill pill-teal";
    if (confidence === "low") return "pill pill-danger";
    return "pill pill-amber";
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="h1">{t("title", lang)}</div>

      <div className="card stack">
        <label>
          <div className="muted" style={{ marginBottom: 6 }}>
            {t("category", lang)}
          </div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value as EwasteCategoryId)}>
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
          <input type="number" inputMode="decimal" min="0" step="0.05" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
        </label>

        <label>
          <div className="muted" style={{ marginBottom: 6 }}>
            {t("grade", lang)}
          </div>
          <select value={grade} onChange={(e) => setGrade(e.target.value as "A" | "B" | "C")}>
            <option value="A">{t("gradeA", lang)}</option>
            <option value="B">{t("gradeB", lang)}</option>
            <option value="C">{t("gradeC", lang)}</option>
          </select>
        </label>

        <button type="button" className="btn btn-secondary btn-block" onClick={() => setShowRateEditor((v) => !v)}>
          {t("adjustRates", lang)}
        </button>

        {showRateEditor && (
          <div className="stack" style={{ gap: 8 }}>
            {(Object.keys(spotRates) as MetalSymbol[]).map((metal) => (
              <div key={metal} className="row between">
                <span className="muted">{METAL_REFERENCE[metal].name}</span>
                <input
                  type="number"
                  step="0.01"
                  style={{ width: 110 }}
                  value={spotRates[metal].rateInrPerGram}
                  onChange={(e) => handleRateChange(metal, e.target.value)}
                  aria-label={`${METAL_REFERENCE[metal].name} ${t("ratePerGram", lang)}`}
                />
              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-primary btn-block" onClick={handleCalculate}>
          {t("calculate", lang)}
        </button>
      </div>

      {result && (
        <div className="card stack">
          <div className="row between">
            <span className="muted">{t("finalValue", lang)}</span>
            <span className="pill pill-amber" style={{ fontSize: 18 }}>
              ₹{Math.round(result.finalEstimateInr)}
            </span>
          </div>
          <div className="row between">
            <span className="muted">{t("confidence", lang)}</span>
            <span className={confidencePillClass(result.confidence)}>{confidenceLabel(result.confidence)}</span>
          </div>

          {result.metalLines.length > 0 && (
            <>
              <div className="h2" style={{ marginTop: 6 }}>
                {t("breakdown", lang)}
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {result.metalLines.map((line) => (
                  <div key={line.metal} className="row between">
                    <span className="muted">
                      {METAL_REFERENCE[line.metal].name} ({line.estimatedAmount.toFixed(2)} {line.unit})
                    </span>
                    <span>₹{Math.round(line.lineValueInr)}</span>
                  </div>
                ))}
              </div>
              <div className="row between" style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                <span className="muted">{t("metalValue", lang)}</span>
                <span>₹{Math.round(result.metalValueSubtotalInr)}</span>
              </div>
            </>
          )}
          <div className="row between">
            <span className="muted">{t("flatValue", lang)}</span>
            <span>₹{Math.round(result.flatRateEstimateInr)}</span>
          </div>

          <button type="button" className="btn btn-primary btn-block" onClick={handleLogToLedger}>
            {t("logToLedger", lang)}
          </button>
          {justLogged && (
            <div className="pill pill-teal" style={{ alignSelf: "flex-start" }}>
              {t("loggedNotice", lang)}
            </div>
          )}
        </div>
      )}

      <div className="card stack">
        <div className="row between">
          <div className="h2" style={{ margin: 0 }}>
            {t("ledgerTitle", lang)}
          </div>
          <button type="button" className="btn btn-secondary" style={{ minHeight: 32, padding: "6px 12px" }} onClick={handleExportCsv} disabled={ledger.length === 0}>
            {t("exportCsv", lang)}
          </button>
        </div>
        <div className="row between">
          <span className="muted">{t("balance", lang)}</span>
          <strong>₹{Math.round(currentBalance)}</strong>
        </div>
        {ledger.length === 0 ? (
          <p className="muted">{t("noEntries", lang)}</p>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {ledger
              .slice()
              .reverse()
              .slice(0, 10)
              .map((entry) => (
                <div key={entry.id} className="row between">
                  <span className="muted" style={{ fontSize: 13 }}>
                    {new Date(entry.createdAt).toLocaleDateString()} · {entry.note}
                  </span>
                  <span style={{ color: entry.type === "payout_debit" ? "#a32d2d" : "#0F6E56" }}>
                    {entry.type === "payout_debit" ? "-" : "+"}₹{Math.round(Math.abs(entry.amountInr))}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}