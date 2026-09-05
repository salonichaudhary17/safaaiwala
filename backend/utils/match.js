const { load } = require("./db");

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * matchRecyclers
 * Ranks authorized recyclers for a given material + collector location by:
 *   1) whether they accept the material at all (hard filter)
 *   2) distance (closer is better, capped by their service area)
 *   3) offered rate index (higher pays the collector more)
 *   4) pickup availability (small boost)
 */
function matchRecyclers({ materialId, lat, lng }) {
  const recyclers = load("recyclers");

  return recyclers
    .filter(
      (r) =>
        r.authorization_status === "authorized" &&
        r.materials_accepted.includes(materialId)
    )
    .map((r) => {
      const distanceKm = haversineKm(lat, lng, r.lat, r.lng);
      const inRange = distanceKm <= r.service_area_km;
      const score =
        (inRange ? 1 : 0.3) * r.offered_rate_index * (r.pickup_available ? 1.1 : 1.0) -
        distanceKm * 0.01;
      return { ...r, distanceKm: Math.round(distanceKm * 10) / 10, inRange, score };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = { matchRecyclers, haversineKm };
