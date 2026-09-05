const { load } = require("./db");

/**
 * answerQuery
 * -----------
 * This is a genuine retrieval step (find the relevant material/price/
 * recycler records from our structured datasets) followed by templated
 * generation — a "RAG-lite" that is fully deterministic and offline-safe,
 * which matters for a live demo with patchy conference wifi.
 *
 * PRODUCTION SWAP-IN: keep this same retrieval step (it's doing real work —
 * finding the right rows), but instead of the template strings below, pass
 * the retrieved rows as context into an AWS Bedrock (or Claude API) call so
 * the assistant can handle open-ended phrasing, not just keyword matches.
 * Only the "generation" half of this file changes; retrieval stays.
 */

const PRICE_KEYWORDS = ["price", "rate", "kitna", "kimat", "bhav", "daam", "भाव", "दाम", "किंमत"];
const SAFETY_KEYWORDS = ["safe", "safety", "danger", "hazard", "सुरक्षा", "सुरक्षित", "सुरक्षितता", "खतरा"];
const RECYCLER_KEYWORDS = ["recycler", "kaha", "kahan", "nearby", "कहाँ", "कुठे", "रिसायकलर", "रिसायकलर"];

function findMaterialInText(text, materials) {
  const lower = text.toLowerCase();
  return materials.find((m) =>
    [m.id, m.category, m.label_en, m.label_hi, m.label_mr].some(
      (label) => label && lower.includes(label.toLowerCase())
    )
  );
}

function detectIntent(text) {
  const lower = text.toLowerCase();
  if (PRICE_KEYWORDS.some((k) => lower.includes(k))) return "price";
  if (SAFETY_KEYWORDS.some((k) => lower.includes(k))) return "safety";
  if (RECYCLER_KEYWORDS.some((k) => lower.includes(k))) return "recycler";
  return "unknown";
}

function currentPriceFor(materialId, location) {
  const prices = load("prices").filter(
    (p) => p.material_id === materialId && (!location || p.location === location)
  );
  if (prices.length === 0) return null;
  return prices.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

const templates = {
  askMaterial: {
    en: "Which material — CRT, LCD, PCB, cables, battery, motor, or plastic?",
    hi: "कौन सी सामग्री — सीआरटी, एलसीडी, पीसीबी, केबल, बैटरी, मोटर, या प्लास्टिक?",
    mr: "कोणती सामग्री — सीआरटी, एलसीडी, पीसीबी, केबल, बॅटरी, मोटर, की प्लास्टिक?",
  },
  noPriceData: {
    en: "No recent price on file for that material here yet.",
    hi: "इस सामग्री के लिए अभी यहाँ कोई हालिया भाव उपलब्ध नहीं है।",
    mr: "या सामग्रीसाठी सध्या इथे अलीकडील भाव उपलब्ध नाही.",
  },
  price: {
    en: (label, price, loc) => `${label} in ${loc} is selling around ₹${price} per kg today.`,
    hi: (label, price, loc) => `${loc} में ${label} का भाव आज लगभग ₹${price} प्रति किलो है।`,
    mr: (label, price, loc) => `${loc} मध्ये ${label} चा भाव आज सुमारे ₹${price} प्रति किलो आहे.`,
  },
  unknown: {
    en: "You can ask me the price of a material, safety tips, or the nearest recycler.",
    hi: "आप मुझसे किसी सामग्री का भाव, सुरक्षा सलाह, या नज़दीकी रीसाइकलर पूछ सकते हैं।",
    mr: "तुम्ही मला एखाद्या सामग्रीचा भाव, सुरक्षा सल्ला, किंवा जवळचा रिसायकलर विचारू शकता.",
  },
};

function labelFor(material, lang) {
  return material[`label_${lang}`] || material.label_en;
}

function answerQuery({ text, lang = "en", location = "Mayapuri" }) {
  const materials = load("materials");
  const intent = detectIntent(text);
  const material = findMaterialInText(text, materials);

  if (intent === "price") {
    if (!material) return { answer: templates.askMaterial[lang], intent, sources: [] };
    const priceRow = currentPriceFor(material.id, location);
    if (!priceRow) return { answer: templates.noPriceData[lang], intent, sources: [] };
    const answer = templates.price[lang](
      labelFor(material, lang),
      priceRow.sell_price_per_kg,
      priceRow.location
    );
    return { answer, intent, sources: [priceRow.id] };
  }

  if (intent === "safety") {
    if (!material) return { answer: templates.askMaterial[lang], intent, sources: [] };
    return {
      answer: material[`safety_note_${lang}`] || material.safety_note_en,
      intent,
      sources: [material.id],
    };
  }

  if (intent === "recycler") {
    const recyclers = load("recyclers").filter(
      (r) => !material || r.materials_accepted.includes(material.id)
    );
    const names = recyclers.map((r) => r.name).join(", ") || "none nearby yet";
    return { answer: `Authorized recyclers: ${names}`, intent, sources: recyclers.map((r) => r.id) };
  }

  return { answer: templates.unknown[lang], intent, sources: [] };
}

module.exports = { answerQuery, detectIntent, findMaterialInText };
