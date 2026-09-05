const crypto = require("crypto");
const mongoose = require("mongoose");

function hashPayload(parts) {
  return crypto
    .createHash("sha256")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex");
}

const materialSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hazardRating: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    defaultRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    label_en: { type: String, required: true, trim: true },
    label_hi: { type: String, required: true, trim: true },
    label_mr: { type: String, required: true, trim: true },
    subCategory: { type: String, default: "General", trim: true },
    hazardous: { type: Boolean, default: false },
    safety_note_en: { type: String, default: "" },
    safety_note_hi: { type: String, default: "" },
    safety_note_mr: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

materialSchema.pre("validate", function materialDefaults(next) {
  if (!this.code && this.name) {
    this.code = String(this.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  }
  if (!this.label_en) this.label_en = this.name;
  if (!this.label_hi) this.label_hi = this.name;
  if (!this.label_mr) this.label_mr = this.name;
  if (this.hazardous == null) {
    this.hazardous =
      this.hazardRating === "HIGH" || this.hazardRating === "CRITICAL";
  }
  next();
});

materialSchema.index({ code: 1, active: 1 });

const priceSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      index: true,
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      index: true,
    },
    materialCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    currentRate: { type: Number, min: 0, default: 0 },
    trend: {
      type: String,
      enum: ["up", "down", "stable"],
      default: "stable",
    },
    city: { type: String, trim: true, index: true, default: "Delhi" },
    lastUpdated: { type: Date, default: Date.now, index: true },
    locationName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    buyingPricePerKg: { type: Number, required: true, min: 0 },
    sellingPricePerKg: { type: Number, default: null, min: 0 },
    marketRangeMin: { type: Number, required: true, min: 0 },
    marketRangeMax: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    source: {
      type: String,
      enum: ["ADMIN", "RECYCLER", "MARKET", "SEEDED", "LIVE"],
      default: "ADMIN",
    },
    recycler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recycler",
      default: null,
    },
    effectiveFrom: { type: Date, default: Date.now, index: true },
    effectiveUntil: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

priceSchema.pre("validate", function priceDefaults(next) {
  if (!this.material && this.materialId) this.material = this.materialId;
  if (!this.materialId && this.material) this.materialId = this.material;
  if (!this.city && this.locationName) this.city = this.locationName;
  if (!this.locationName && this.city) this.locationName = this.city;
  if (this.currentRate == null && this.buyingPricePerKg != null) {
    this.currentRate = this.buyingPricePerKg;
  }
  if (this.buyingPricePerKg == null && this.currentRate != null) {
    this.buyingPricePerKg = this.currentRate;
  }
  if (this.marketRangeMin == null && this.buyingPricePerKg != null) {
    this.marketRangeMin = Math.max(0, this.buyingPricePerKg * 0.9);
  }
  if (this.marketRangeMax == null && this.buyingPricePerKg != null) {
    this.marketRangeMax = this.buyingPricePerKg * 1.15;
  }
  this.lastUpdated = new Date();
  next();
});

priceSchema.index({ materialCode: 1, locationName: 1, effectiveFrom: -1 });
priceSchema.index({ city: 1, lastUpdated: -1 });

const recyclerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "", trim: true },
    capacityKg: { type: Number, default: 5000, min: 0 },
    authorizedCategories: [{ type: String, lowercase: true, trim: true }],
    licenseNo: { type: String, trim: true, index: true },
    authorizationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    authorizationStatus: {
      type: String,
      enum: ["AUTHORIZED", "PENDING", "EXPIRED"],
      default: "AUTHORIZED",
      index: true,
    },
    contactPhone: { type: String, default: "", trim: true },
    facilityLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], required: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, default: "", trim: true },
    },
    materialsAccepted: [{ type: String, lowercase: true, trim: true }],
    pickupAvailable: { type: Boolean, default: true },
    serviceAreaRadiusKm: { type: Number, default: 25, min: 1 },
    offeredRates: [
      {
        materialCode: { type: String, lowercase: true, trim: true },
        pricePerKg: { type: Number, min: 0 },
      },
    ],
    batchWeightLogs: [
      {
        transactionId: String,
        weightKg: Number,
        verifiedBy: String,
        notes: String,
        loggedAt: { type: Date, default: Date.now },
      },
    ],
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

recyclerSchema.pre("validate", function recyclerDefaults(next) {
  if (!this.licenseNo && this.authorizationNumber) {
    this.licenseNo = this.authorizationNumber;
  }
  if (!this.authorizationNumber && this.licenseNo) {
    this.authorizationNumber = this.licenseNo;
  }
  if (!this.location && this.facilityLocation?.address) {
    this.location = this.facilityLocation.address;
  }
  if (
    (!this.authorizedCategories || this.authorizedCategories.length === 0) &&
    this.materialsAccepted?.length
  ) {
    this.authorizedCategories = this.materialsAccepted;
  }
  next();
});

recyclerSchema.index({ facilityLocation: "2dsphere" });

const transactionItemSchema = new mongoose.Schema(
  {
    materialCode: { type: String, lowercase: true, trim: true },
    itemType: { type: String, trim: true },
    category: { type: String, trim: true },
    weightKg: { type: Number, min: 0, default: 0 },
    ratePerKg: { type: Number, min: 0, default: 0 },
    amount: { type: Number, min: 0, default: 0 },
    hazardLevel: { type: String, default: "MEDIUM" },
    recyclability: { type: String, default: "recyclable" },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, index: true },
    clientTransactionId: { type: String, unique: true, index: true },
    lotId: { type: String, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    recyclerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recycler",
      required: true,
    },
    collectorId: { type: String, required: true, index: true },
    itemsList: { type: [transactionItemSchema], default: [] },
    totalAmount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: [
        "requested",
        "assigned",
        "in_transit",
        "verified",
        "completed",
        "cancelled",
        "INITIATED",
        "VERIFIED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "requested",
      index: true,
    },
    dynamicQrCode: { type: String, default: "" },
    materialCode: { type: String, lowercase: true, trim: true },
    weightKg: { type: Number, min: 0.001 },
    quotedPriceINR: { type: Number, min: 0 },
    finalPriceINR: { type: Number, min: 0 },
    paymentType: {
      type: String,
      enum: ["CASH", "DIGITAL"],
      default: "CASH",
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },
    transactionStatus: {
      type: String,
      enum: ["INITIATED", "VERIFIED", "COMPLETED", "CANCELLED"],
      default: "INITIATED",
    },
    collectionLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
      address: { type: String, default: "" },
    },
    handoverLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
    },
    referenceHash: { type: String, unique: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    originNotes: { type: String, default: "" },
    environmentalImpactScore: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    verificationTimestamp: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    syncSource: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "ONLINE",
    },
  },
  { timestamps: true }
);

transactionSchema.pre("validate", function transactionDefaults(next) {
  if (!this.clientTransactionId) {
    this.clientTransactionId = `ct_${crypto.randomBytes(8).toString("hex")}`;
  }
  if (!this.transactionId) {
    this.transactionId = `TX-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;
  }
  if (!this.lotId) {
    this.lotId = `LOT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  }
  if ((!this.itemsList || this.itemsList.length === 0) && this.materialCode) {
    const amount = Number(this.finalPriceINR || this.quotedPriceINR || 0);
    this.itemsList = [
      {
        materialCode: this.materialCode,
        itemType: this.materialCode,
        category: this.materialCode,
        weightKg: this.weightKg || 0.001,
        ratePerKg:
          this.weightKg > 0 ? amount / this.weightKg : this.quotedPriceINR || 0,
        amount,
      },
    ];
  }
  if (this.itemsList?.length) {
    const totalWeight = this.itemsList.reduce(
      (sum, item) => sum + Number(item.weightKg || 0),
      0
    );
    const totalAmount = this.itemsList.reduce(
      (sum, item) =>
        sum +
        Number(
          item.amount ||
            Number(item.weightKg || 0) * Number(item.ratePerKg || 0)
        ),
      0
    );
    if (!this.materialCode) {
      this.materialCode = this.itemsList[0].materialCode || "mixed";
    }
    if (this.weightKg == null) {
      this.weightKg = Math.max(0.001, totalWeight || 0.001);
    }
    if (this.totalAmount == null || this.totalAmount === 0) {
      this.totalAmount = Number(totalAmount.toFixed(2));
    }
    if (this.quotedPriceINR == null) this.quotedPriceINR = this.totalAmount;
    if (this.finalPriceINR == null) this.finalPriceINR = this.totalAmount;
  }
  if (this.weightKg == null) this.weightKg = 0.001;
  if (this.quotedPriceINR == null) this.quotedPriceINR = this.totalAmount || 0;
  if (this.finalPriceINR == null) this.finalPriceINR = this.totalAmount || 0;
  if (!this.referenceHash) {
    this.referenceHash = hashPayload([
      this.transactionId,
      this.lotId,
      String(this.collectorId),
      this.materialCode,
      String(this.weightKg),
      String(this.finalPriceINR),
      String(this.recyclerId),
    ]);
  }
  if (!this.dynamicQrCode) {
    this.dynamicQrCode = JSON.stringify({
      v: 1,
      platform: "safaaiwala",
      transactionId: this.transactionId,
      hash: this.referenceHash,
      amount: this.finalPriceINR || this.totalAmount,
    });
  }
  if (this.status && !this.transactionStatus) {
    const map = {
      requested: "INITIATED",
      assigned: "INITIATED",
      in_transit: "INITIATED",
      verified: "VERIFIED",
      completed: "COMPLETED",
      cancelled: "CANCELLED",
    };
    this.transactionStatus = map[this.status] || "INITIATED";
  }
  next();
});

transactionSchema.index({ collectorId: 1, createdAt: -1 });
transactionSchema.index({ recyclerId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

const custodyEntrySchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    actorRole: { type: String, required: true },
    actorId: { type: String, default: "" },
    location: { type: String, default: "" },
    notes: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const traceabilitySchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      unique: true,
      index: true,
    },
    publicTransactionId: { type: String, index: true },
    batchHash: { type: String, required: true, unique: true },
    currentStage: {
      type: String,
      enum: [
        "collected",
        "in_transit",
        "received",
        "verified",
        "processed",
        "closed",
      ],
      default: "collected",
      index: true,
    },
    custodyChainLog: { type: [custodyEntrySchema], default: [] },
  },
  { timestamps: true }
);

const collectorSchema = new mongoose.Schema(
  {
    collectorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: { type: String, trim: true, default: "Collector" },
    vehicleType: {
      type: String,
      enum: ["cycle", "e-rickshaw", "tempo", "van", "walk", "other"],
      default: "e-rickshaw",
    },
    activeStatus: { type: Boolean, default: true, index: true },
    assignedZone: { type: String, default: "Delhi", trim: true },
    totalPickups: { type: Number, default: 0, min: 0 },
    displayName: { type: String, default: "Collector", trim: true },
    phone: { type: String, default: null, trim: true },
    preferredLanguage: {
      type: String,
      enum: ["en", "hi", "mr"],
      default: "hi",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], default: undefined },
    },
    locationName: { type: String, default: "Delhi", trim: true },
    lastSeenAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

collectorSchema.pre("validate", function collectorDefaults(next) {
  if (!this.name && this.displayName) this.name = this.displayName;
  if (!this.displayName && this.name) this.displayName = this.name;
  if (!this.assignedZone && this.locationName) {
    this.assignedZone = this.locationName;
  }
  if (this.activeStatus == null && this.active != null) {
    this.activeStatus = this.active;
  }
  if (this.active == null && this.activeStatus != null) {
    this.active = this.activeStatus;
  }
  next();
});

collectorSchema.index({ location: "2dsphere" });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "collector", "recycler"],
      default: "user",
      index: true,
    },
    phone: { type: String, default: "", trim: true },
    language: { type: String, enum: ["en", "hi", "mr"], default: "hi" },
    linkedCollectorId: { type: String, default: null },
    linkedRecyclerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recycler",
      default: null,
    },
    city: { type: String, default: "Delhi" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    language: this.language,
    linkedCollectorId: this.linkedCollectorId,
    linkedRecyclerId: this.linkedRecyclerId,
    city: this.city,
  };
};

const Material =
  mongoose.models.Material || mongoose.model("Material", materialSchema);
const Price = mongoose.models.Price || mongoose.model("Price", priceSchema);
const Recycler =
  mongoose.models.Recycler || mongoose.model("Recycler", recyclerSchema);
const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
const Traceability =
  mongoose.models.Traceability ||
  mongoose.model("Traceability", traceabilitySchema);
const Collector =
  mongoose.models.Collector || mongoose.model("Collector", collectorSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = {
  Material,
  Price,
  Recycler,
  Transaction,
  Traceability,
  Collector,
  User,
  hashPayload,
};
