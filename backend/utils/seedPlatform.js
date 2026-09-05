const bcrypt = require("bcryptjs");
const { load } = require("./db");
const {
  Material,
  Price,
  Recycler,
  Collector,
  User,
} = require("../models/Schemas");

const HAZARD_BY_CODE = {
  battery: "CRITICAL",
  pcb: "HIGH",
  cable: "HIGH",
  crt: "HIGH",
  lcd: "MEDIUM",
  plastic: "LOW",
  motor: "LOW",
};

const DEFAULT_RATES = {
  pcb: 185,
  cable: 140,
  battery: 60,
  plastic: 18,
  lcd: 30,
  crt: 8,
  motor: 210,
};

async function seedPlatform() {
  const materialsData = load("materials");
  const pricesData = load("prices");
  const recyclersData = load("recyclers");
  const collectorsData = load("collectors");

  if ((await Material.countDocuments()) === 0) {
    await Material.insertMany(
      materialsData.map((row) => ({
        code: row.id,
        name: row.label_en,
        category: row.category,
        hazardRating: HAZARD_BY_CODE[row.id] || (row.hazardous ? "HIGH" : "LOW"),
        defaultRate: DEFAULT_RATES[row.id] || 20,
        label_en: row.label_en,
        label_hi: row.label_hi,
        label_mr: row.label_mr,
        hazardous: Boolean(row.hazardous),
        safety_note_en: row.safety_note_en,
        safety_note_hi: row.safety_note_hi,
        safety_note_mr: row.safety_note_mr,
        active: true,
      }))
    );
    console.log(`Seeded ${materialsData.length} materials`);
  }

  const materials = await Material.find({}).lean();
  const materialByCode = new Map(materials.map((row) => [row.code, row]));

  if ((await Price.countDocuments()) === 0) {
    const latestByKey = new Map();
    for (const row of pricesData) {
      const key = `${row.material_id}:${row.location}`;
      const current = latestByKey.get(key);
      if (!current || String(row.date) > String(current.date)) {
        latestByKey.set(key, row);
      }
    }

    const previousByKey = new Map();
    for (const row of pricesData) {
      const key = `${row.material_id}:${row.location}`;
      const latest = latestByKey.get(key);
      if (row !== latest) {
        const prev = previousByKey.get(key);
        if (!prev || String(row.date) > String(prev.date)) {
          previousByKey.set(key, row);
        }
      }
    }

    const docs = [];
    for (const [key, row] of latestByKey.entries()) {
      const material = materialByCode.get(row.material_id);
      const previous = previousByKey.get(key);
      let trend = "stable";
      if (previous) {
        if (row.buy_price_per_kg > previous.buy_price_per_kg) trend = "up";
        else if (row.buy_price_per_kg < previous.buy_price_per_kg) trend = "down";
      }

      docs.push({
        materialId: material?._id || null,
        material: material?._id || null,
        materialCode: row.material_id,
        currentRate: row.buy_price_per_kg,
        trend,
        city: row.location,
        lastUpdated: new Date(`${row.date}T09:00:00.000Z`),
        locationName: row.location,
        buyingPricePerKg: row.buy_price_per_kg,
        sellingPricePerKg: row.sell_price_per_kg,
        marketRangeMin: Math.round(row.buy_price_per_kg * 0.92),
        marketRangeMax: Math.round(row.sell_price_per_kg * 1.05),
        source: "SEEDED",
        effectiveFrom: new Date(`${row.date}T09:00:00.000Z`),
        active: true,
      });
    }

    if (docs.length) {
      await Price.insertMany(docs);
      console.log(`Seeded ${docs.length} live prices`);
    }
  }

  if ((await Recycler.countDocuments()) === 0) {
    await Recycler.insertMany(
      recyclersData.map((row) => ({
        name: row.name,
        location: `${row.location}, ${row.city}`,
        capacityKg: 5000 + Math.round((row.service_area_km || 10) * 80),
        authorizedCategories: row.materials_accepted,
        licenseNo: row.authorization_id,
        authorizationNumber: row.authorization_id,
        authorizationStatus:
          String(row.authorization_status).toUpperCase() === "AUTHORIZED"
            ? "AUTHORIZED"
            : "PENDING",
        contactPhone: row.contact || "",
        facilityLocation: {
          type: "Point",
          coordinates: [row.lng, row.lat],
          address: `${row.location}, ${row.city}`,
          city: row.city,
        },
        materialsAccepted: row.materials_accepted,
        pickupAvailable: Boolean(row.pickup_available),
        serviceAreaRadiusKm: row.service_area_km || 25,
        offeredRates: (row.materials_accepted || []).map((code) => ({
          materialCode: code,
          pricePerKg: Math.round(
            (DEFAULT_RATES[code] || 20) * (row.offered_rate_index || 1)
          ),
        })),
        batchWeightLogs: [],
        active: true,
      }))
    );
    console.log(`Seeded ${recyclersData.length} recyclers`);
  }

  if ((await Collector.countDocuments()) === 0) {
    await Collector.insertMany(
      collectorsData.map((row, index) => ({
        collectorId: row.id,
        name: `Field collector ${index + 1}`,
        displayName: `Field collector ${index + 1}`,
        vehicleType: index === 0 ? "e-rickshaw" : "tempo",
        activeStatus: true,
        assignedZone: row.operating_location,
        totalPickups: 0,
        preferredLanguage: row.preferred_language,
        location: {
          type: "Point",
          coordinates: [row.lng, row.lat],
        },
        locationName: row.operating_location,
        active: true,
      }))
    );
    console.log(`Seeded ${collectorsData.length} collectors`);
  }

  const demoPassword = await bcrypt.hash(
    process.env.DEMO_PASSWORD || "demo1234",
    10
  );

  const firstRecycler = await Recycler.findOne({ active: true });

  const demoUsers = [
    {
      email: "user@safaaiwala.in",
      name: "Household User",
      role: "user",
      city: "Delhi",
    },
    {
      email: "collector@safaaiwala.in",
      name: "Mayapuri Collector",
      role: "collector",
      city: "Delhi",
      linkedCollectorId: "c1",
    },
    {
      email: "recycler@safaaiwala.in",
      name: firstRecycler?.name || "Authorized Recycler",
      role: "recycler",
      city: firstRecycler?.facilityLocation?.city || "Delhi",
      linkedRecyclerId: firstRecycler?._id || null,
    },
  ];

  for (const demo of demoUsers) {
    const exists = await User.findOne({ email: demo.email });
    if (exists) continue;
    await User.create({
      ...demo,
      passwordHash: demoPassword,
      phone: "",
      language: "hi",
      active: true,
    });
  }
}

module.exports = { seedPlatform };
