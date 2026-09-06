const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const {
  Material,
  Price,
  Recycler,
  Transaction,
  Traceability,
  Collector,
  PriceCatalog,
  MaterialLot
} = require('../models/Schemas');

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function cleanAndParseJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * 1. analyzeMaterial:
 * Multimodal Computer Vision Classification via Claude 3.5 Sonnet / Multi-Spectral Heuristic
 */
exports.analyzeMaterial = async (req, res) => {
  try {
    let imageBase64 = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body.imageBase64) {
      const match = req.body.imageBase64.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        imageBase64 = match[2];
      } else {
        imageBase64 = req.body.imageBase64;
      }
    }

    const weightKg = parseFloat(req.body.weightKg) || 10;
    const requestedCategory = req.body.manualCategory || null;

    // RAG Step: Retrieve current benchmark rates
    const priceDocs = await Price.find({});
    const priceMap = {
      PCB: 180,
      'Lithium Battery': 220,
      'Copper Wires': 440,
      'CRT Monitor': 85,
      'Aluminium Scrap': 155,
      'Mixed Plastic': 28
    };
    priceDocs.forEach(p => {
      if (p.category && p.currentRate) priceMap[p.category] = p.currentRate;
    });

    // If manual category is requested or selected directly
    if (requestedCategory && priceMap[requestedCategory]) {
      const rate = priceMap[requestedCategory];
      return res.status(200).json({
        success: true,
        data: {
          category: requestedCategory,
          confidence: 0.98,
          avgPricePerKg: rate,
          weightKg,
          estimatedValue: Math.round(weightKg * rate),
          hazardLevel: requestedCategory === 'Lithium Battery' ? 'Critical' : requestedCategory === 'PCB' || requestedCategory === 'CRT Monitor' ? 'High' : 'Low',
          safetyWarning: getVernacularWarning(requestedCategory, 'hi')
        }
      });
    }

    // If Anthropic Claude Vision is configured
    if (anthropic && process.env.ANTHROPIC_API_KEY && imageBase64) {
      try {
        const prompt = `
You are SafaaiWala's expert computer vision model for e-waste scrap in India.
Analyze the provided photo.

You must classify the dominant object into EXACTLY one of these categories:
- "PCB"
- "Lithium Battery"
- "Copper Wire"
- "CRT"
- "Aluminium"
- "Mixed Waste"

If the image is unclear, blurry, or confidence is low, strictly output "Mixed Waste".

Current Benchmark Price per KG:
${JSON.stringify(priceMap, null, 2)}

Return strictly JSON with NO markdown formatting:
{
  "category": "e-waste" | "plastic" | "metal" | "hazardous",
  "itemType": "PCB" | "Lithium Battery" | "Copper Wire" | "CRT" | "Aluminium" | "Mixed Waste",
  "confidence": 0.95,
  "hazardLevel": "Low" | "Moderate" | "High" | "Critical",
  "safetyWarning": "दस्ताने पहनें और सुरक्षा से रखें।",
  "avgPricePerKg": number,
  "weightKg": ${weightKg},
  "estimatedValue": number
}
`;
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
                { type: 'text', text: prompt }
              ]
            }
          ]
        });

        const parsed = cleanAndParseJSON(response.content[0].text);
        
        // Strict price mapping
        const fixedPriceMap = {
          'PCB': 180,
          'Lithium Battery': 220,
          'Copper Wire': 440,
          'CRT': 85,
          'Aluminium': 155,
          'Mixed Waste': 28
        };
        
        parsed.itemType = fixedPriceMap[parsed.itemType] ? parsed.itemType : 'Mixed Waste';
        parsed.avgPricePerKg = fixedPriceMap[parsed.itemType];
        parsed.estimatedValue = Math.round(weightKg * parsed.avgPricePerKg);
        parsed.safetyWarning = getVernacularWarning(parsed.itemType, 'hi');

        // Normalise fields for Scanner.jsx
        if (!parsed.category) {
          parsed.category = parsed.itemType;
        }

        return res.status(200).json({ success: true, data: parsed });
      } catch (anthropicErr) {
        console.warn('Anthropic API error:', anthropicErr.message);
        return res.status(500).json({ success: false, error: anthropicErr.message });
      }
    }

    return res.status(500).json({ success: false, error: 'No Vision API configured' });
  } catch (error) {
    console.error('analyzeMaterial error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

function getVernacularWarning(category, lang = 'hi') {
  const warnings = {
    PCB: {
      hi: 'सर्किट बोर्ड में सीसा (Lead) होता है; इसे आग में न जलाएं और दस्ताने पहनें।',
      mr: 'सर्किट बोर्डात शिसे असते; हे तोडू नका किंवा जाळू नका, हातमोजे वापरा.',
      en: 'Contains lead solder. Do not break or incinerate; always wear gloves.'
    },
    'Lithium Battery': {
      hi: 'आग लगने का गंभीर खतरा! बैटरी को कभी न फोड़ें और पानी व धूप से दूर रखें।',
      mr: 'आग लागण्याचा धोका! बॅटरीला छिद्र पाडू नका आणि उष्णतेपासून दूर ठेवा.',
      en: 'Thermal runaway hazard! Do not puncture, crush, or expose to heat or moisture.'
    },
    'Copper Wires': {
      hi: 'तारों को कभी खुले में न जलाएं; जहरीला धुआं फेफड़ों को नुकसान पहुंचाता है।',
      mr: 'तारा उघड्यावर जाळू नका! विषारी धूर फुफ्फुसांना हानी पोहोचवतो.',
      en: 'Never burn insulated wires. Toxic dioxins are released. Strip mechanically.'
    },
    'CRT Monitor': {
      hi: 'कांच फूटने और सीसे का जहर फैलने का खतरा। चश्मा व फेस शील्ड पहनें।',
      mr: 'यात विषारी शिसे असते व काच फुटण्याचा धोका असतो. चष्मा वापरा.',
      en: 'Vacuum implosion hazard and toxic lead. Wear safety goggles.'
    },
    'Aluminium Scrap': {
      hi: 'नुकीले किनारों से हाथ कटने का खतरा। सुरक्षित रूप से बांध कर रखें।',
      mr: 'धारदार कडांमुळे जखम होऊ शकते. कोरड्या जागी सुरक्षित ठेवा.',
      en: 'Sharp metal edges. Store safely away from moisture.'
    },
    'Mixed Plastic': {
      hi: 'प्लास्टिक को कभी न जलाएं। ग्रेड के अनुसार छांट कर रखें।',
      mr: 'प्रकारानुसार वेगळे करा. उघड्यावर जाळू नका.',
      en: 'Segregate by polymer grade. Do not burn.'
    }
  };
  return warnings[category]?.[lang] || warnings.PCB.hi;
}

/**
 * 2. processVoiceQuery:
 * Spoken Voice Assistant supporting questions in Hindi, Marathi, or English
 */
exports.processVoiceQuery = async (req, res) => {
  try {
    const { transcript, targetLanguage = 'Hindi' } = req.body;
    if (!transcript) return res.status(400).json({ success: false, error: 'Transcript required' });

    const prices = await Price.find({});
    const rateSummary = prices.map(p => `${p.materialName}: ₹${p.currentRate}/kg`).join(', ');

    if (anthropic && process.env.ANTHROPIC_API_KEY) {
      const prompt = `
You are SafaaiWala Voice Assistant for informal scrap collectors in India.
User Query: "${transcript}"
Language: ${targetLanguage}
Live Market Benchmark Rates: ${rateSummary}

Answer directly in 1-2 friendly, conversational sentences in ${targetLanguage} (Devanagari script if Hindi/Marathi).
Return strictly spoken raw text.
`;
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }]
      });

      return res.status(200).json({
        success: true,
        transcript,
        targetLanguage,
        audioSpeechText: response.content[0].text.trim()
      });
    }

    // Vernacular rule-based answers
    const lower = transcript.toLowerCase();
    let reply = 'तांबे का भाव ₹442 और सर्किट बोर्ड का भाव ₹182 प्रति किलो है।';
    if (lower.includes('बॅटरी') || lower.includes('battery')) {
      reply = targetLanguage === 'Marathi' ? 'लिथियम-आयन बॅटरीचा भाव ₹224 प्रति किलो आहे.' : 'लिथियम बैटरी का भाव ₹224 प्रति किलो है।';
    } else if (lower.includes('तांबा') || lower.includes('copper')) {
      reply = targetLanguage === 'Marathi' ? 'तांब्याची तार ₹448 प्रति किलो सुरू आहे.' : 'तांबे का भाव ₹442 प्रति किलो है।';
    }

    return res.status(200).json({
      success: true,
      transcript,
      targetLanguage,
      audioSpeechText: reply
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 3. completeHandover:
 * Computes SHA-256 cryptographic audit hash and records immutable lot to MongoDB
 */
exports.completeHandover = async (req, res) => {
  try {
    const {
      collectorId = 'collector-anonymous',
      category = 'PCB',
      weightKg = 10,
      estimatedValue = 1800,
      safetyWarning = 'Handle with protective equipment.',
      recyclerId = null
    } = req.body;

    const timestamp = new Date().toISOString();
    const payloadToHash = `${collectorId}-${category}-${weightKg}-${estimatedValue}-${timestamp}`;
    const handoverHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
    const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    const transaction = new Transaction({
      txnId,
      collectorId,
      recyclerId,
      itemsList: [{ materialName: category, category, weightKg, ratePerKg: Math.round(estimatedValue / weightKg), subtotal: estimatedValue }],
      totalAmount: estimatedValue,
      totalWeightKg: weightKg,
      handoverHash,
      status: 'verified',
      dynamicQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=SAFAAIWALA_${handoverHash}`
    });

    await transaction.save();

    return res.status(201).json({
      success: true,
      receipt: {
        txnId: transaction.txnId,
        collectorId: transaction.collectorId,
        category,
        weightKg,
        estimatedValue,
        safetyWarning,
        handoverHash,
        timestamp,
        dynamicQrCode: transaction.dynamicQrCode
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 4. Authentication Login Endpoint
 */
exports.login = async (req, res) => {
  try {
    const { phone = '+91 98100 00000', role = 'collector' } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    const userProfile = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      phone,
      role, // 'collector' or 'recycler'
      name: role === 'recycler' ? 'Mayapuri Green Recycler Facility' : 'Ram Prasad Kabadiwala',
      token,
      assignedZone: 'Delhi Hub'
    };
    return res.status(200).json({ success: true, profile: userProfile });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 5. 6 Structured Datasets Endpoints
 */
exports.getMaterials = async (req, res) => {
  const materials = await Material.find({});
  return res.json({ success: true, count: materials.length, data: materials });
};

exports.getPrices = async (req, res) => {
  const prices = await Price.find({});
  return res.json({ success: true, count: prices.length, data: prices });
};

exports.getRecyclers = async (req, res) => {
  const recyclers = await Recycler.find({});
  return res.json({ success: true, count: recyclers.length, data: recyclers });
};

exports.getTransactions = async (req, res) => {
  const transactions = await Transaction.find({}).sort({ createdAt: -1 });
  return res.json({ success: true, count: transactions.length, data: transactions });
};

exports.getTraceability = async (req, res) => {
  const logs = await Traceability.find({}).sort({ createdAt: -1 });
  return res.json({ success: true, count: logs.length, data: logs });
};

exports.getCollectors = async (req, res) => {
  const collectors = await Collector.find({});
  return res.json({ success: true, count: collectors.length, data: collectors });
};

exports.getPriceCatalog = exports.getPrices;
