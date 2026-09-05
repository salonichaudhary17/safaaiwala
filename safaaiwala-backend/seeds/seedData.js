const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Material, Price, Recycler, Transaction, Traceability, Collector } = require('../models/Schemas');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safaaiwala';

const seedMaterials = [
  {
    name: 'Printed Circuit Board (Motherboards & Telecom Cards)',
    category: 'PCB',
    hazardRating: 4,
    defaultRate: 180,
    safetyNotes: {
      en: 'Contains lead solder and brominated flame retardants. Wear heavy cotton gloves.',
      hi: 'सर्किट बोर्ड में सीसा और जहरीले पदार्थ होते हैं। दस्ताने अवश्य पहनें।',
      mr: 'यात शिसे असते. तोडू नका किंवा जाळू नका; हातमोजे वापरा.'
    }
  },
  {
    name: 'Lithium-ion Battery Packs (Phone & EV Cells)',
    category: 'Lithium Battery',
    hazardRating: 5,
    defaultRate: 220,
    safetyNotes: {
      en: 'Risk of fire and thermal runaway. Never puncture or expose to heat or water.',
      hi: 'आग लगने का गंभीर खतरा। बैटरी को कभी न फोड़ें और पानी व धूप से दूर रखें।',
      mr: 'आग लागण्याचा धोका! बॅटरीला छिद्र पाडू नका व उष्णतेपासून दूर ठेवा.'
    }
  },
  {
    name: 'Copper Wires & Armature Coils',
    category: 'Copper Wires',
    hazardRating: 2,
    defaultRate: 440,
    safetyNotes: {
      en: 'Never burn wires in open air. Toxic dioxins are released. Mechanically strip insulation.',
      hi: 'तारों को कभी आग में न जलाएं। जहरीला धुआं स्वास्थ्य को नुकसान पहुंचाता है।',
      mr: 'तारा उघड्यावर जाळू नका! विषारी धूर फुफ्फुसांना हानी पोहोचवतो.'
    }
  },
  {
    name: 'CRT Monitor Glass & Electron Guns',
    category: 'CRT Monitor',
    hazardRating: 4,
    defaultRate: 85,
    safetyNotes: {
      en: 'High vacuum implosion hazard and up to 2kg of toxic lead per funnel.',
      hi: 'कांच फूटने और सीसे का जहर फैलने का खतरा। चश्मा व फेस शील्ड पहनें।',
      mr: 'यात विषारी शिसे असते व काच फुटण्याचा धोका असतो. चष्मा वापरा.'
    }
  },
  {
    name: 'Aluminium Scrap & Castings',
    category: 'Aluminium Scrap',
    hazardRating: 1,
    defaultRate: 155,
    safetyNotes: {
      en: 'Sharp metal edges. Store in dry area away from food scrap.',
      hi: 'नुकीले किनारों से हाथ कटने का खतरा। सुरक्षित रूप से बांध कर रखें।',
      mr: 'धारदार कडांमुळे जखम होऊ शकते. कोरड्या जागी सुरक्षित ठेवा.'
    }
  },
  {
    name: 'Mixed Rigid Polymer & Monitor Casings',
    category: 'Mixed Plastic',
    hazardRating: 2,
    defaultRate: 28,
    safetyNotes: {
      en: 'Segregate flame-retardant plastics from food grade polymers.',
      hi: 'प्लास्टिक को कभी न जलाएं। ग्रेड के अनुसार छांट कर रखें।',
      mr: 'प्रकारानुसार वेगळे करा. उघड्यावर जाळू नका.'
    }
  }
];

const seedPrices = [
  { materialName: 'Copper Wires & Cables', category: 'Copper Wires', city: 'Delhi', currentRate: 442, minRate: 420, maxRate: 465, trend: 'up' },
  { materialName: 'Printed Circuit Boards', category: 'PCB', city: 'Delhi', currentRate: 182, minRate: 165, maxRate: 205, trend: 'up' },
  { materialName: 'Lithium Battery Packs', category: 'Lithium Battery', city: 'Delhi', currentRate: 224, minRate: 210, maxRate: 245, trend: 'up' },
  { materialName: 'Copper Wires & Coils', category: 'Copper Wires', city: 'Mumbai', currentRate: 448, minRate: 430, maxRate: 470, trend: 'up' },
  { materialName: 'Lithium Battery Cells', category: 'Lithium Battery', city: 'Mumbai', currentRate: 228, minRate: 215, maxRate: 250, trend: 'stable' },
  { materialName: 'Aluminium Scrap', category: 'Aluminium Scrap', city: 'Bengaluru', currentRate: 158, minRate: 145, maxRate: 170, trend: 'down' },
  { materialName: 'CRT Monitor Glass', category: 'CRT Monitor', city: 'Pune', currentRate: 85, minRate: 75, maxRate: 95, trend: 'stable' },
  { materialName: 'Mixed Rigid Plastic', category: 'Mixed Plastic', city: 'Ahmedabad', currentRate: 28, minRate: 24, maxRate: 32, trend: 'up' }
];

const seedRecyclers = [
  {
    name: 'Delhi Green Recyclers Pvt Ltd',
    city: 'Delhi',
    location: 'Mayapuri Phase II, New Delhi',
    licenseNo: 'CPCB/EPR/0142/DL',
    capacityKgPerYear: 12000,
    acceptedMaterials: ['PCB', 'Copper Wires', 'Lithium Battery'],
    contactPhone: '+91 98110 24810',
    isEprAuthorized: true
  },
  {
    name: 'Wazirpur E-Waste Refining Facility',
    city: 'Delhi',
    location: 'Wazirpur Industrial Area, Delhi',
    licenseNo: 'CPCB/EPR/0217/DL',
    capacityKgPerYear: 8500,
    acceptedMaterials: ['CRT Monitor', 'Mixed Plastic', 'PCB'],
    contactPhone: '+91 98102 33422',
    isEprAuthorized: true
  },
  {
    name: 'Dharavi Circular Metals Cooperative',
    city: 'Mumbai',
    location: '13th Compound, Dharavi, Mumbai',
    licenseNo: 'CPCB/EPR/0451/MH',
    capacityKgPerYear: 15000,
    acceptedMaterials: ['Copper Wires', 'Lithium Battery', 'Mixed Plastic'],
    contactPhone: '+91 98201 44551',
    isEprAuthorized: true
  },
  {
    name: 'Peenya Electronics Recyclers',
    city: 'Bengaluru',
    location: 'Peenya Industrial Area 4th Phase, Bengaluru',
    licenseNo: 'CPCB/EPR/0512/KA',
    capacityKgPerYear: 10500,
    acceptedMaterials: ['PCB', 'CRT Monitor', 'Lithium Battery'],
    contactPhone: '+91 98450 67512',
    isEprAuthorized: true
  },
  {
    name: 'Bhosari Eco-Refinery & Metal Recovery',
    city: 'Pune',
    location: 'Bhosari MIDC, Pune',
    licenseNo: 'CPCB/EPR/0489/MH',
    capacityKgPerYear: 6000,
    acceptedMaterials: ['Copper Wires', 'Lithium Battery'],
    contactPhone: '+91 98500 12890',
    isEprAuthorized: true
  }
];

const seedTransactions = [
  {
    txnId: 'TXN-90812',
    collectorId: 'c_ramprasad_01',
    itemsList: [{ materialName: 'Printed Circuit Boards', category: 'PCB', weightKg: 145.5, ratePerKg: 180, subtotal: 26190 }],
    totalAmount: 26190,
    totalWeightKg: 145.5,
    handoverHash: 'a7b8f9e01234c5678d90ef123456789a2b3c4d5e',
    status: 'verified',
    dynamicQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SAFAAIWALA_a7b8f9e01234c5678d90ef123456789a2b3c4d5e'
  },
  {
    txnId: 'TXN-90815',
    collectorId: 'c_kishanlal_02',
    itemsList: [{ materialName: 'Copper Scrap & Shredded Wires', category: 'Copper Wires', weightKg: 320.0, ratePerKg: 440, subtotal: 140800 }],
    totalAmount: 140800,
    totalWeightKg: 320.0,
    handoverHash: 'f1e2d3c4b5a69788776655443322110099887766',
    status: 'verified',
    dynamicQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SAFAAIWALA_f1e2d3c4b5a69788776655443322110099887766'
  }
];

const seedTraceability = [
  {
    transactionId: 'TXN-90812',
    batchHash: 'a7b8f9e01234c5678d90ef123456789a2b3c4d5e',
    currentStage: 'processing',
    custodyChainLog: [
      { stage: 'pickup_scheduled', handler: 'Ram Prasad (CW-481)', notes: 'Picked up from Okhla scrap yard' },
      { stage: 'in_transit', handler: 'Driver Mohan (DL-1L-4921)', notes: 'En route to Mayapuri facility' },
      { stage: 'received_at_facility', handler: 'Gate Officer S. Sharma', notes: 'Weight verified: 145.5 KG' },
      { stage: 'processing', handler: 'Supervisor R. Verma', notes: 'Leaded solder separation in furnace' }
    ]
  }
];

const seedCollectors = [
  {
    collectorId: 'c_ramprasad_01',
    phone: '+91 98101 23456',
    assignedZone: 'Okhla Industrial Area, Delhi',
    vehicleType: 'E-Rickshaw',
    activeStatus: true,
    totalPickups: 34,
    totalEarningsInr: 88500
  },
  {
    collectorId: 'c_kishanlal_02',
    phone: '+91 98202 34567',
    assignedZone: 'Mayapuri Metal Yard, Delhi',
    vehicleType: 'Three-Wheeler Tempo',
    activeStatus: true,
    totalPickups: 58,
    totalEarningsInr: 215000
  }
];

async function runSeed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected to MongoDB.');

    await Material.deleteMany({});
    await Material.insertMany(seedMaterials);
    console.log('[Seed] 1. Materials populated.');

    await Price.deleteMany({});
    await Price.insertMany(seedPrices);
    console.log('[Seed] 2. Prices populated.');

    await Recycler.deleteMany({});
    await Recycler.insertMany(seedRecyclers);
    console.log('[Seed] 3. Recyclers populated.');

    await Transaction.deleteMany({});
    await Transaction.insertMany(seedTransactions);
    console.log('[Seed] 4. Transactions populated.');

    await Traceability.deleteMany({});
    await Traceability.insertMany(seedTraceability);
    console.log('[Seed] 5. Traceability populated.');

    await Collector.deleteMany({});
    await Collector.insertMany(seedCollectors);
    console.log('[Seed] 6. Collectors populated.');

    console.log('[Seed] All 6 structured datasets seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

runSeed();
