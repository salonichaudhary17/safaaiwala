const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Collector, Recycler } = require("../models/Schemas");

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      email: user.email,
      name: user.name,
      linkedCollectorId: user.linkedCollectorId,
      linkedRecyclerId: user.linkedRecyclerId
        ? String(user.linkedRecyclerId)
        : null,
      city: user.city,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      role = "user",
      phone = "",
      language = "hi",
      city = "Delhi",
      vehicleType = "e-rickshaw",
      licenseNo,
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "name, email and password are required",
      });
    }

    const allowedRoles = ["user", "collector", "recycler"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const existing = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    let linkedCollectorId = null;
    let linkedRecyclerId = null;

    if (role === "collector") {
      linkedCollectorId = `c_${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      await Collector.create({
        collectorId: linkedCollectorId,
        name,
        displayName: name,
        phone,
        preferredLanguage: ["en", "hi", "mr"].includes(language)
          ? language
          : "hi",
        locationName: city,
        assignedZone: city,
        vehicleType,
        activeStatus: true,
        active: true,
        totalPickups: 0,
      });
    }

    if (role === "recycler") {
      const recycler = await Recycler.create({
        name,
        location: city,
        licenseNo: licenseNo || `CPCB-TMP-${Date.now()}`,
        authorizationNumber: licenseNo || `CPCB-TMP-${Date.now()}`,
        authorizationStatus: "PENDING",
        contactPhone: phone,
        facilityLocation: {
          type: "Point",
          coordinates: [77.1246, 28.6519],
          address: city,
          city,
        },
        materialsAccepted: [
          "pcb",
          "cable",
          "battery",
          "plastic",
          "lcd",
          "crt",
          "motor",
        ],
        authorizedCategories: [
          "pcb",
          "cable",
          "battery",
          "plastic",
          "lcd",
          "crt",
          "motor",
        ],
        capacityKg: 8000,
        pickupAvailable: true,
        active: true,
      });
      linkedRecyclerId = recycler._id;
    }

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role,
      phone,
      language: ["en", "hi", "mr"].includes(language) ? language : "hi",
      city,
      linkedCollectorId,
      linkedRecyclerId,
      active: true,
    });

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Unable to register" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Unable to login" });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user: user.toSafeJSON() });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load profile" });
  }
}

module.exports = {
  register,
  login,
  me,
};
