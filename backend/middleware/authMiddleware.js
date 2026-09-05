const jwt = require("jsonwebtoken");
const { User } = require("../models/Schemas");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  if (req.query?.token) return String(req.query.token);
  return null;
}

async function protect(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).lean();

    if (!user || user.active === false) {
      return res.status(401).json({ error: "Account is not active" });
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      linkedCollectorId: user.linkedCollectorId,
      linkedRecyclerId: user.linkedRecyclerId
        ? String(user.linkedRecyclerId)
        : null,
      city: user.city,
      language: user.language,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function optionalAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token || !process.env.JWT_SECRET) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      linkedCollectorId: decoded.linkedCollectorId || null,
      linkedRecyclerId: decoded.linkedRecyclerId || null,
      name: decoded.name,
      email: decoded.email,
      city: decoded.city,
    };
  } catch {
    req.user = null;
  }

  return next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role permissions" });
    }
    return next();
  };
}

module.exports = {
  protect,
  optionalAuth,
  requireRoles,
};
