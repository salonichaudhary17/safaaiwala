/**
 * src/types/ewaste.ts
 *
 * Domain models for SafaaiWala's enterprise e-waste management extensions:
 *   - High-value e-waste sub-category classification (PCBs, Li-ion, CRT, rare-earth)
 *   - Extended Producer Responsibility (EPR) digital handover receipts
 *   - Offline-first transaction records (for the IndexedDB sync queue)
 *   - Informal collector cash/ledger balances
 *
 * This file contains type-only declarations plus a small number of
 * pure, side-effect-free constant catalogs (metal reference data,
 * sub-category catalog) that other modules import so the domain
 * vocabulary stays in one place.
 */

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

/** Languages the field UI (voice + text) is available in. */
export type SupportedLanguage = "en" | "hi" | "mr";

/** ISO-8601 timestamp string, e.g. new Date().toISOString(). */
export type IsoTimestamp = string;

/** Currency is always Indian Rupees for this deployment. */
export type Inr = number;

export interface GeoCoordinates {
  lat: number;
  lng: number;
  /** Accuracy radius reported by the Geolocation API, in meters. */
  accuracyMeters?: number;
  /** Human-readable resolved zone/locality, if reverse-geocoded locally. */
  resolvedZone?: string;
}

/* ------------------------------------------------------------------ */
/* E-waste material classification                                     */
/* ------------------------------------------------------------------ */

/**
 * High-value e-waste sub-categories. These sit "below" the coarse
 * materials already served by /api/materials (e.g. "e-waste-mixed")
 * and let the app price and route genuinely valuable scrap correctly
 * instead of bucketing it as generic mixed e-waste.
 */
export type EwasteCategoryId =
  | "pcb_telecom"
  | "pcb_server_motherboard"
  | "pcb_consumer"
  | "li_ion_cell"
  | "li_ion_pack"
  | "lead_acid_battery"
  | "crt_monitor"
  | "crt_tv"
  | "lcd_panel"
  | "rare_earth_magnet"
  | "gold_finger_connector"
  | "tantalum_capacitor"
  | "copper_cable_insulated"
  | "aluminium_chassis"
  | "mixed_plastic_housing";

/** The recoverable metals this app tracks for spot-rate valuation. */
export type MetalSymbol = "AU" | "AG" | "CU" | "PD" | "CO" | "TA" | "AL" | "LI" | "ND";

export interface MetalReference {
  symbol: MetalSymbol;
  /** Display name, English only — used for internal tables and CSV export. */
  name: string;
  /** Unit the spot rate and yields are expressed in. */
  unit: "g" | "mg";
}

/** Reference table of tracked metals. Order controls display order. */
export const METAL_REFERENCE: Record<MetalSymbol, MetalReference> = {
  AU: { symbol: "AU", name: "Gold", unit: "mg" },
  AG: { symbol: "AG", name: "Silver", unit: "mg" },
  CU: { symbol: "CU", name: "Copper", unit: "g" },
  PD: { symbol: "PD", name: "Palladium", unit: "mg" },
  CO: { symbol: "CO", name: "Cobalt", unit: "g" },
  TA: { symbol: "TA", name: "Tantalum", unit: "g" },
  AL: { symbol: "AL", name: "Aluminium", unit: "g" },
  LI: { symbol: "LI", name: "Lithium", unit: "g" },
  ND: { symbol: "ND", name: "Neodymium", unit: "g" },
};

/** Estimated recoverable-metal yield for one kilogram of a sub-category. */
export interface MetalYieldPerKg {
  metal: MetalSymbol;
  /** Amount recoverable per kg, expressed in METAL_REFERENCE[metal].unit. */
  amountPerKg: number;
  /** Realistic informal-sector recovery efficiency, 0–1 (not lab/refinery yield). */
  recoveryEfficiency: number;
}

/** Non-metal hazards a sub-category carries, used to trigger safety warnings. */
export type HazardTag =
  | "acid_leaching_risk"
  | "open_burning_risk"
  | "battery_puncture_risk"
  | "mercury_lead_exposure"
  | "sharp_glass_risk"
  | "fume_inhalation_risk";

export interface EwasteSubCategory {
  id: EwasteCategoryId;
  labels: Record<SupportedLanguage, string>;
  /** Icon key, matches keys already used by src/components/Icon.jsx where available. */
  icon: string;
  hazardous: boolean;
  hazardTags: HazardTag[];
  metalYields: MetalYieldPerKg[];
  /** Rough condition grade this yield table assumes. */
  gradeAssumption: "A" | "B" | "C";
  /** Fallback flat price band (INR/kg) used when spot-metal pricing is unavailable. */
  fallbackPriceBandInr: { min: number; max: number };
}

/**
 * Catalog of high-value e-waste sub-categories. Kept here (rather than
 * only inside the valuation calculator) so EPR receipts, the offline
 * queue, and any future reporting screens share one source of truth
 * for category metadata.
 */
export const EWASTE_SUBCATEGORIES: EwasteSubCategory[] = [
  {
    id: "pcb_telecom",
    labels: { en: "Telecom PCB", hi: "टेलीकॉम पीसीबी", mr: "टेलिकॉम पीसीबी" },
    icon: "pcb",
    hazardous: true,
    hazardTags: ["acid_leaching_risk", "open_burning_risk", "fume_inhalation_risk"],
    gradeAssumption: "B",
    metalYields: [
      { metal: "AU", amountPerKg: 250, recoveryEfficiency: 0.35 },
      { metal: "CU", amountPerKg: 180, recoveryEfficiency: 0.6 },
      { metal: "PD", amountPerKg: 40, recoveryEfficiency: 0.3 },
      { metal: "TA", amountPerKg: 8, recoveryEfficiency: 0.25 },
    ],
    fallbackPriceBandInr: { min: 350, max: 650 },
  },
  {
    id: "pcb_server_motherboard",
    labels: {
      en: "Server Motherboard",
      hi: "सर्वर मदरबोर्ड",
      mr: "सर्व्हर मदरबोर्ड",
    },
    icon: "pcb",
    hazardous: true,
    hazardTags: ["acid_leaching_risk", "open_burning_risk", "fume_inhalation_risk"],
    gradeAssumption: "A",
    metalYields: [
      { metal: "AU", amountPerKg: 450, recoveryEfficiency: 0.35 },
      { metal: "CU", amountPerKg: 220, recoveryEfficiency: 0.6 },
      { metal: "PD", amountPerKg: 70, recoveryEfficiency: 0.3 },
      { metal: "TA", amountPerKg: 15, recoveryEfficiency: 0.25 },
    ],
    fallbackPriceBandInr: { min: 550, max: 950 },
  },
  {
    id: "pcb_consumer",
    labels: { en: "Consumer PCB (mixed)", hi: "मिश्रित पीसीबी", mr: "मिश्र पीसीबी" },
    icon: "pcb",
    hazardous: true,
    hazardTags: ["acid_leaching_risk", "open_burning_risk"],
    gradeAssumption: "C",
    metalYields: [
      { metal: "AU", amountPerKg: 90, recoveryEfficiency: 0.3 },
      { metal: "CU", amountPerKg: 150, recoveryEfficiency: 0.55 },
      { metal: "PD", amountPerKg: 10, recoveryEfficiency: 0.25 },
    ],
    fallbackPriceBandInr: { min: 150, max: 320 },
  },
  {
    id: "li_ion_cell",
    labels: { en: "Li-ion Cells (loose)", hi: "लिथियम-आयन सेल", mr: "लिथियम-आयन सेल" },
    icon: "battery",
    hazardous: true,
    hazardTags: ["battery_puncture_risk", "fume_inhalation_risk"],
    gradeAssumption: "B",
    metalYields: [
      { metal: "CO", amountPerKg: 120, recoveryEfficiency: 0.4 },
      { metal: "LI", amountPerKg: 20, recoveryEfficiency: 0.3 },
      { metal: "CU", amountPerKg: 50, recoveryEfficiency: 0.5 },
    ],
    fallbackPriceBandInr: { min: 90, max: 220 },
  },
  {
    id: "li_ion_pack",
    labels: {
      en: "Li-ion Battery Pack (laptop/power bank)",
      hi: "लिथियम-आयन बैटरी पैक",
      mr: "लिथियम-आयन बॅटरी पॅक",
    },
    icon: "battery",
    hazardous: true,
    hazardTags: ["battery_puncture_risk", "fume_inhalation_risk"],
    gradeAssumption: "B",
    metalYields: [
      { metal: "CO", amountPerKg: 95, recoveryEfficiency: 0.35 },
      { metal: "LI", amountPerKg: 16, recoveryEfficiency: 0.28 },
      { metal: "CU", amountPerKg: 60, recoveryEfficiency: 0.5 },
    ],
    fallbackPriceBandInr: { min: 70, max: 180 },
  },
  {
    id: "lead_acid_battery",
    labels: { en: "Lead-Acid Battery", hi: "लेड-एसिड बैटरी", mr: "लेड-अ‍ॅसिड बॅटरी" },
    icon: "battery",
    hazardous: true,
    hazardTags: ["acid_leaching_risk", "mercury_lead_exposure"],
    gradeAssumption: "B",
    metalYields: [{ metal: "CU", amountPerKg: 15, recoveryEfficiency: 0.4 }],
    fallbackPriceBandInr: { min: 60, max: 110 },
  },
  {
    id: "crt_monitor",
    labels: { en: "CRT Monitor", hi: "सीआरटी मॉनिटर", mr: "सीआरटी मॉनिटर" },
    icon: "crt",
    hazardous: true,
    hazardTags: ["mercury_lead_exposure", "sharp_glass_risk"],
    gradeAssumption: "C",
    metalYields: [{ metal: "CU", amountPerKg: 25, recoveryEfficiency: 0.45 }],
    fallbackPriceBandInr: { min: 15, max: 40 },
  },
  {
    id: "crt_tv",
    labels: { en: "CRT Television", hi: "सीआरटी टीवी", mr: "सीआरटी टीव्ही" },
    icon: "crt",
    hazardous: true,
    hazardTags: ["mercury_lead_exposure", "sharp_glass_risk"],
    gradeAssumption: "C",
    metalYields: [{ metal: "CU", amountPerKg: 30, recoveryEfficiency: 0.45 }],
    fallbackPriceBandInr: { min: 20, max: 55 },
  },
  {
    id: "lcd_panel",
    labels: { en: "LCD Panel", hi: "एलसीडी पैनल", mr: "एलसीडी पॅनल" },
    icon: "lcd",
    hazardous: true,
    hazardTags: ["mercury_lead_exposure", "sharp_glass_risk"],
    gradeAssumption: "C",
    metalYields: [{ metal: "CU", amountPerKg: 18, recoveryEfficiency: 0.4 }],
    fallbackPriceBandInr: { min: 25, max: 60 },
  },
  {
    id: "rare_earth_magnet",
    labels: {
      en: "Rare-Earth Magnets (HDD/motor)",
      hi: "दुर्लभ-मृदा मैग्नेट",
      mr: "दुर्मिळ-पृथ्वी चुंबक",
    },
    icon: "motor",
    hazardous: false,
    hazardTags: [],
    gradeAssumption: "A",
    metalYields: [{ metal: "ND", amountPerKg: 280, recoveryEfficiency: 0.55 }],
    fallbackPriceBandInr: { min: 180, max: 420 },
  },
  {
    id: "gold_finger_connector",
    labels: { en: "Gold Finger Connectors", hi: "गोल्ड फिंगर कनेक्टर", mr: "गोल्ड फिंगर कनेक्टर" },
    icon: "pcb",
    hazardous: true,
    hazardTags: ["acid_leaching_risk", "open_burning_risk"],
    gradeAssumption: "A",
    metalYields: [{ metal: "AU", amountPerKg: 600, recoveryEfficiency: 0.4 }],
    fallbackPriceBandInr: { min: 700, max: 1400 },
  },
  {
    id: "tantalum_capacitor",
    labels: { en: "Tantalum Capacitors", hi: "टैंटलम कैपेसिटर", mr: "टँटलम कॅपेसिटर" },
    icon: "pcb",
    hazardous: false,
    hazardTags: [],
    gradeAssumption: "A",
    metalYields: [{ metal: "TA", amountPerKg: 90, recoveryEfficiency: 0.5 }],
    fallbackPriceBandInr: { min: 250, max: 500 },
  },
  {
    id: "copper_cable_insulated",
    labels: { en: "Insulated Copper Cable", hi: "इंसुलेटेड तांबे का तार", mr: "इन्सुलेटेड तांबे तार" },
    icon: "cable",
    hazardous: true,
    hazardTags: ["open_burning_risk", "fume_inhalation_risk"],
    gradeAssumption: "B",
    metalYields: [{ metal: "CU", amountPerKg: 550, recoveryEfficiency: 0.65 }],
    fallbackPriceBandInr: { min: 220, max: 400 },
  },
  {
    id: "aluminium_chassis",
    labels: { en: "Aluminium Chassis/Heatsinks", hi: "एल्युमिनियम चेसिस", mr: "अ‍ॅल्युमिनियम चेसिस" },
    icon: "motor",
    hazardous: false,
    hazardTags: [],
    gradeAssumption: "B",
    metalYields: [{ metal: "AL", amountPerKg: 850, recoveryEfficiency: 0.7 }],
    fallbackPriceBandInr: { min: 110, max: 190 },
  },
  {
    id: "mixed_plastic_housing",
    labels: { en: "Mixed Plastic Housing", hi: "मिश्रित प्लास्टिक बॉडी", mr: "मिश्र प्लास्टिक बॉडी" },
    icon: "plastic",
    hazardous: false,
    hazardTags: [],
    gradeAssumption: "C",
    metalYields: [],
    fallbackPriceBandInr: { min: 8, max: 18 },
  },
];

/* ------------------------------------------------------------------ */
/* Safety / accessibility                                              */
/* ------------------------------------------------------------------ */

export type SafetyWarningTopic =
  | "acid_leaching"
  | "open_cable_burning"
  | "battery_puncture"
  | "mercury_lead_exposure"
  | "fume_inhalation"
  | "sharp_glass";

/** Maps a sub-category's hazard tags to the safety-warning topics to surface. */
export const HAZARD_TAG_TO_WARNING_TOPIC: Record<HazardTag, SafetyWarningTopic> = {
  acid_leaching_risk: "acid_leaching",
  open_burning_risk: "open_cable_burning",
  battery_puncture_risk: "battery_puncture",
  mercury_lead_exposure: "mercury_lead_exposure",
  fume_inhalation_risk: "fume_inhalation",
  sharp_glass_risk: "sharp_glass",
};

/* ------------------------------------------------------------------ */
/* EPR digital handover receipt                                        */
/* ------------------------------------------------------------------ */

export type EprReceiptStatus =
  | "draft"
  | "awaiting_collector_signature"
  | "awaiting_recycler_signature"
  | "confirmed"
  | "queued_offline";

export interface PhotoProof {
  id: string;
  /** Data URL (base64) for the captured/selected photo. */
  dataUrl: string;
  capturedAt: IsoTimestamp;
  /** Approximate file size in bytes, used for storage-budget display. */
  sizeBytes: number;
}

export interface DigitalSignature {
  /** Data URL (base64 PNG) of the captured signature stroke. */
  signatureImageDataUrl: string;
  signedByName: string;
  signedAt: IsoTimestamp;
  /** True once at least one stroke was drawn on the signature pad. */
  hasStrokes: boolean;
}

export interface EprReceipt {
  id: string;
  /** Links back to the underlying /api/transactions record, once known. */
  transactionId: string | null;
  collectorId: string;
  collectorName?: string;
  recyclerId: string;
  recyclerName: string;
  /** CPCB / State Pollution Control Board EPR registration number. */
  recyclerRegistrationNumber: string;
  category: EwasteCategoryId;
  weightKg: number;
  estimatedValueInr: Inr;
  geotag: GeoCoordinates;
  photoProofs: PhotoProof[];
  collectorSignature: DigitalSignature | null;
  recyclerSignature: DigitalSignature | null;
  status: EprReceiptStatus;
  createdAt: IsoTimestamp;
  confirmedAt: IsoTimestamp | null;
  /** Short human-shareable reference, e.g. "EPR-7F3A9C21". */
  referenceCode: string;
}

/* ------------------------------------------------------------------ */
/* Offline sync queue                                                   */
/* ------------------------------------------------------------------ */

export type OfflineRecordKind = "epr_receipt" | "transaction" | "ledger_entry";

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface OfflineTransactionRecord<TPayload = unknown> {
  id: string;
  kind: OfflineRecordKind;
  /** API path this record should be POSTed to once online. */
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  payload: TPayload;
  createdAt: IsoTimestamp;
  syncStatus: SyncStatus;
  retryCount: number;
  lastAttemptAt: IsoTimestamp | null;
  lastError: string | null;
}

/* ------------------------------------------------------------------ */
/* Collector cash-first ledger                                         */
/* ------------------------------------------------------------------ */

export type LedgerEntryType = "collection_credit" | "cash_advance" | "payout_debit" | "adjustment";

export interface CollectorLedgerEntry {
  id: string;
  collectorId: string;
  type: LedgerEntryType;
  amountInr: Inr;
  /** Balance immediately after this entry was applied. */
  runningBalanceInr: Inr;
  note: string;
  relatedReceiptId: string | null;
  category: EwasteCategoryId | null;
  weightKg: number | null;
  createdAt: IsoTimestamp;
}

export interface CollectorLedgerSummary {
  collectorId: string;
  cashBalanceInr: Inr;
  totalCreditedInr: Inr;
  totalDebitedInr: Inr;
  entries: CollectorLedgerEntry[];
}

/* ------------------------------------------------------------------ */
/* Valuation calculator                                                 */
/* ------------------------------------------------------------------ */

export type ValuationConfidence = "high" | "medium" | "low";

export interface MetalValuationLine {
  metal: MetalSymbol;
  estimatedAmount: number;
  unit: "g" | "mg";
  spotRateInrPerGram: number;
  lineValueInr: Inr;
}

export interface ValuationResult {
  category: EwasteCategoryId;
  weightKg: number;
  conditionGrade: "A" | "B" | "C";
  metalLines: MetalValuationLine[];
  metalValueSubtotalInr: Inr;
  /** Fallback flat-rate estimate, shown alongside the metal-based one. */
  flatRateEstimateInr: Inr;
  /** Blended figure the UI presents as "the" estimate. */
  finalEstimateInr: Inr;
  confidence: ValuationConfidence;
  computedAt: IsoTimestamp;
}