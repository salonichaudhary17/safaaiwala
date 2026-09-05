// Known e-waste collection hubs across India, matching the `location`
// strings used in backend/data/prices.json and backend/data/recyclers.json.
// Real GPS coordinates get resolved to the nearest of these so price
// lookups (keyed by hub name, not raw coordinates) work anywhere in the
// country — while recycler *matching* already uses raw lat/lng directly
// and doesn't need this resolution step at all.
//
// Adding a new city later is just adding a row here plus matching rows in
// the two datasets above — nothing else in the app needs to change, since
// the whole pipeline (pricing, matching, ledger) is already city-agnostic.
export const KNOWN_ZONES = [
  { name: "Delhi", lat: 28.6519, lng: 77.1246 },
  { name: "Mumbai", lat: 19.0728, lng: 72.8826 },
  { name: "Bengaluru", lat: 13.0284, lng: 77.5386 },
  { name: "Chennai", lat: 13.1067, lng: 80.2206 },
  { name: "Kolkata", lat: 22.5497, lng: 88.3872 },
  { name: "Hyderabad", lat: 17.4849, lng: 78.4108 },
  { name: "Pune", lat: 18.6186, lng: 73.8637 },
  { name: "Ahmedabad", lat: 23.0301, lng: 72.6108 },
];

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

export function nearestZone(lat, lng) {
  let best = KNOWN_ZONES[0];
  let bestDist = Infinity;
  for (const zone of KNOWN_ZONES) {
    const d = haversineKm(lat, lng, zone.lat, zone.lng);
    if (d < bestDist) {
      bestDist = d;
      best = zone;
    }
  }
  return { ...best, distanceKm: Math.round(bestDist * 10) / 10 };
}
