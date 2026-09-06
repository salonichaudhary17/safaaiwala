const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Price, Material } = require('../models/Schemas');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

// Computer Vision E-Waste Classifier via Gemini 1.5 Flash
exports.classifyWaste = async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Base64 image string is required' });
    }

    // Strip header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Analyze this image of waste or electronic waste. 
You must classify the dominant object into EXACTLY one of these categories:
- "PCB"
- "Lithium Battery"
- "Copper Wire"
- "CRT"
- "Aluminium"
- "Mixed Waste"

If the image is unclear, blurry, or confidence is low, strictly output "Mixed Waste".

Return ONLY a raw JSON object with no markdown formatting or code blocks.
JSON Schema:
{
  "category": "e-waste" | "plastic" | "metal" | "hazardous",
  "itemType": "PCB" | "Lithium Battery" | "Copper Wire" | "CRT" | "Aluminium" | "Mixed Waste",
  "recyclability": "High" | "Medium" | "Low",
  "hazardLevel": "Low" | "Moderate" | "High" | "Critical",
  "disposalTips": "string"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const responseText = result.response.text().trim();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    // Strict price mapping as requested
    const priceMap = {
      'PCB': 180,
      'Lithium Battery': 220,
      'Copper Wire': 440,
      'CRT': 85,
      'Aluminium': 155,
      'Mixed Waste': 28
    };

    parsedData.estimatedValuePerKg = priceMap[parsedData.itemType] || 28;
    if (!priceMap[parsedData.itemType]) {
      parsedData.itemType = 'Mixed Waste';
    }

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error('Gemini Classification Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Fetch Live Market Prices ("Aaj Ka Bhaav")
exports.getLivePrices = async (req, res) => {
  try {
    const prices = await Price.find().populate('materialId');
    if (!prices || prices.length === 0) {
      return res.status(200).json([]);
    }
    return res.status(200).json(prices);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
