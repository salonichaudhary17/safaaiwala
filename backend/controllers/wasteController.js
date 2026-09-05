const { Price, Material, Transaction, Collector } = require("../models/Schemas");
const { addSseClient, emitTransaction } = require("../utils/realtime");

const MATERIAL_CATALOG = {
  pcb: {
    category: "PCB",
    itemType: "Printed circuit board",
    recyclability: "high",
    estimatedValuePerKg: 185,
    hazardLevel: "HIGH",
    disposalTips:
      "Do not burn or acid-wash boards. Keep whole and send to a CPCB-authorized recycler.",
  },
  cable: {
    category: "Cables",
    itemType: "Insulated copper cable",
    recyclability: "high",
    estimatedValuePerKg: 140,
    hazardLevel: "HIGH",
    disposalTips:
      "Do not burn insulation. Coil cables and hand over to an authorized facility.",
  },
  battery: {
    category: "Batteries",
    itemType: "Lithium / lead-acid battery",
    recyclability: "specialized",
    estimatedValuePerKg: 60,
    hazardLevel: "CRITICAL",
    disposalTips:
      "Do not puncture, crush, or expose to fire. Store separately from other scrap.",
  },
  plastic: {
    category: "Mixed plastics",
    itemType: "Device housing plastic",
    recyclability: "medium",
    estimatedValuePerKg: 18,
    hazardLevel: "LOW",
    disposalTips: "Sort by plastic type where possible for a better rate.",
  },
  lcd: {
    category: "LCD panel",
    itemType: "LCD/LED panel",
    recyclability: "medium",
    estimatedValuePerKg: 30,
    hazardLevel: "MEDIUM",
    disposalTips:
      "Handle carefully to avoid mercury backlight breakage on older panels.",
  },
  crt: {
    category: "CRT",
    itemType: "CRT monitor/TV",
    recyclability: "specialized",
    estimatedValuePerKg: 8,
    hazardLevel: "HIGH",
    disposalTips:
      "Contains leaded glass. Do not break the tube or remove the flyback transformer.",
  },
  motor: {
    category: "Motors/magnets",
    itemType: "Motor and magnet assembly",
    recyclability: "high",
    estimatedValuePerKg: 210,
    hazardLevel: "LOW",
    disposalTips:
      "Keep neodymium magnets intact for better recycler pricing.",
  },
};

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeClassification(parsed, liveRates) {
  const key = String(parsed?.itemType || parsed?.category || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  let catalogKey = "plastic";
  for (const candidate of Object.keys(MATERIAL_CATALOG)) {
    if (key.includes(candidate) || String(parsed?.category || "").toLowerCase().includes(candidate)) {
      catalogKey = candidate;
      break;
    }
  }

  const catalog = MATERIAL_CATALOG[catalogKey];
  const live = liveRates[catalogKey];

  return {
    category: parsed?.category || catalog.category,
    itemType: parsed?.itemType || catalog.itemType,
    recyclability: parsed?.recyclability || catalog.recyclability,
    estimatedValuePerKg: Number(
      parsed?.estimatedValuePerKg || live || catalog.estimatedValuePerKg
    ),
    hazardLevel: String(parsed?.hazardLevel || catalog.hazardLevel).toUpperCase(),
    disposalTips: parsed?.disposalTips || catalog.disposalTips,
    materialCode: catalogKey,
    confidence: Number(parsed?.confidence || 0.82),
    source: parsed?.source || "gemini-1.5-flash",
  };
}

async function loadLiveRateMap(city) {
  const query = { active: true };
  if (city) query.$or = [{ city }, { locationName: city }];

  const prices = await Price.find(query)
    .sort({ lastUpdated: -1, effectiveFrom: -1 })
    .lean();

  const map = {};
  for (const price of prices) {
    if (!map[price.materialCode]) {
      map[price.materialCode] = price.currentRate || price.buyingPricePerKg;
    }
  }
  return map;
}

async function callGeminiVision(imageBase64, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.code = "NO_KEY";
    throw error;
  }

  const models = [
    process.env.GEMINI_MODEL || "gemini-1.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
  ];

  const prompt = `You are an e-waste classifier for Indian informal collectors on the Safaaiwala platform.
Identify the waste in the photo. Return ONLY compact JSON with keys:
category, itemType, recyclability, estimatedValuePerKg, hazardLevel, disposalTips, confidence.
hazardLevel must be one of LOW, MEDIUM, HIGH, CRITICAL.
recyclability must be one of high, medium, low, specialized.
estimatedValuePerKg should be a realistic INR number for Indian scrap markets.
Prefer categories: PCB, Cables, Batteries, Mixed plastics, LCD panel, CRT, Motors/magnets.`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType || "image/jpeg",
              data: String(imageBase64).replace(/^data:[^;]+;base64,/, ""),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  };

  let lastError = null;

  for (const model of [...new Set(models)]) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) {
        lastError = new Error(json?.error?.message || `Gemini ${model} failed`);
        continue;
      }

      const text =
        json?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("\n") || "";

      const parsed = extractJson(text);
      if (parsed) {
        parsed.source = model;
        return parsed;
      }
      lastError = new Error("Gemini returned non-JSON output");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Gemini classification failed");
}

async function classifyImage(req, res) {
  try {
    const { imageBase64, mimeType, city } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const liveRates = await loadLiveRateMap(city || req.user?.city || "Delhi");

    try {
      const parsed = await callGeminiVision(imageBase64, mimeType);
      const result = normalizeClassification(parsed, liveRates);
      return res.json(result);
    } catch (error) {
      if (error.code === "NO_KEY") {
        return res.status(503).json({
          error: "Vision API unavailable",
          fallback: true,
          ...normalizeClassification({ source: "server-catalog" }, liveRates),
        });
      }

      console.error("Gemini classify error:", error);
      return res.status(502).json({
        error: "Vision model failed",
        fallback: true,
        ...normalizeClassification({ source: "server-fallback" }, liveRates),
      });
    }
  } catch (error) {
    console.error("classifyImage error:", error);
    return res.status(500).json({ error: "Unable to classify image" });
  }
}

function serializePrice(price, materialMap) {
  const material = materialMap.get(String(price.materialId || price.material || "")) ||
    materialMap.get(price.materialCode);

  return {
    id: String(price._id),
    materialId: price.materialId || price.material,
    materialCode: price.materialCode,
    name: material?.name || material?.label_en || price.materialCode,
    label_hi: material?.label_hi || price.materialCode,
    category: material?.category || price.materialCode,
    currentRate: price.currentRate || price.buyingPricePerKg,
    buyingPricePerKg: price.buyingPricePerKg,
    sellingPricePerKg: price.sellingPricePerKg,
    trend: price.trend || "stable",
    city: price.city || price.locationName,
    lastUpdated: price.lastUpdated || price.updatedAt,
    marketRangeMin: price.marketRangeMin,
    marketRangeMax: price.marketRangeMax,
  };
}

async function getLivePrices(req, res) {
  try {
    const city = req.query.city || req.user?.city;
    const prices = await latestPricesForCity(city);
    return res.json({
      city: city || "All India",
      generatedAt: new Date().toISOString(),
      prices,
    });
  } catch (error) {
    console.error("getLivePrices error:", error);
    return res.status(500).json({ error: "Unable to load live prices" });
  }
}

async function latestPricesForCity(city) {
  const match = { active: true };
  if (city) {
    match.$or = [{ city }, { locationName: city }];
  }

  const prices = await Price.find(match)
    .sort({ lastUpdated: -1, effectiveFrom: -1 })
    .lean();

  const materials = await Material.find({ active: true }).lean();
  const materialMap = new Map();
  for (const material of materials) {
    materialMap.set(String(material._id), material);
    materialMap.set(material.code, material);
  }

  const unique = new Map();
  for (const price of prices) {
    const key = `${price.materialCode}:${price.city || price.locationName}`;
    if (!unique.has(key)) {
      unique.set(key, serializePrice(price, materialMap));
    }
  }

  return Array.from(unique.values());
}

async function streamPrices(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  addSseClient(res);

  try {
    const prices = await latestPricesForCity(req.query.city);
    res.write(
      `event: price\ndata: ${JSON.stringify({
        city: req.query.city || "All India",
        generatedAt: new Date().toISOString(),
        prices,
      })}\n\n`
    );
  } catch {
    res.write(`event: error\ndata: ${JSON.stringify({ error: "seed failed" })}\n\n`);
  }

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
}

async function schedulePickup(req, res) {
  try {
    const {
      address,
      preferredTime,
      notes = "",
      items = [],
      recyclerId,
      lat,
      lng,
    } = req.body || {};

    if (!address) {
      return res.status(400).json({ error: "address is required" });
    }

    const collectorId =
      req.user?.linkedCollectorId ||
      req.body.collectorId ||
      `guest_${Date.now().toString(36)}`;

    const recycler = recyclerId
      ? await require("../models/Schemas").Recycler.findById(recyclerId)
      : await require("../models/Schemas").Recycler.findOne({ active: true });

    if (!recycler) {
      return res.status(404).json({ error: "No recycler available" });
    }

    const itemsList = (Array.isArray(items) ? items : []).map((item) => ({
      materialCode: item.materialCode || "mixed",
      itemType: item.itemType || item.materialCode || "mixed waste",
      category: item.category || item.materialCode || "mixed",
      weightKg: Number(item.weightKg || 1),
      ratePerKg: Number(item.ratePerKg || item.estimatedValuePerKg || 0),
      amount:
        Number(item.amount) ||
        Number(item.weightKg || 1) *
          Number(item.ratePerKg || item.estimatedValuePerKg || 0),
      hazardLevel: item.hazardLevel || "MEDIUM",
      recyclability: item.recyclability || "medium",
    }));

    const transaction = await Transaction.create({
      userId: req.user?.id || null,
      recyclerId: recycler._id,
      collectorId,
      itemsList,
      status: "requested",
      originNotes: notes,
      collectionLocation: {
        type: "Point",
        coordinates:
          Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))
            ? [Number(lng), Number(lat)]
            : undefined,
        address,
      },
    });

    await Collector.updateOne(
      { collectorId },
      { $inc: { totalPickups: 1 }, $set: { lastSeenAt: new Date() } }
    );

    emitTransaction("pickup:requested", {
      transactionId: transaction.transactionId,
      recyclerId: String(recycler._id),
      collectorId,
      userId: req.user?.id || null,
      address,
      preferredTime: preferredTime || null,
      status: transaction.status,
    });

    return res.status(201).json({
      ok: true,
      message: "Pickup scheduled",
      transactionId: transaction.transactionId,
      preferredTime: preferredTime || null,
      recycler: {
        id: String(recycler._id),
        name: recycler.name,
        location: recycler.location || recycler.facilityLocation?.address,
      },
    });
  } catch (error) {
    console.error("schedulePickup error:", error);
    return res.status(500).json({ error: "Unable to schedule pickup" });
  }
}

module.exports = {
  classifyImage,
  getLivePrices,
  streamPrices,
  schedulePickup,
  latestPricesForCity,
  MATERIAL_CATALOG,
};
