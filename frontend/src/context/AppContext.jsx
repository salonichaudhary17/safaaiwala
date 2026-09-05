import { createContext, useContext, useEffect, useState } from "react";
import { trySync } from "../lib/offlineQueue";
import { API_BASE } from "../lib/api";
import { nearestZone } from "../lib/zones";
import i18n from "../i18n/config";

const AppContext = createContext(null);

const COLLECTOR_ID_KEY = "safaaiwala_collector_id";

// Used only if geolocation is denied, unavailable, or times out — so the
// app is never stuck with no location at all. Delhi as the default fallback
// since it currently has the most complete seeded dataset (4 recyclers).
const FALLBACK_ZONE = { location: "Delhi", lat: 28.6519, lng: 77.1246 };
const GEO_TIMEOUT_MS = 6000;

function getOrCreateCollectorId() {
  let id = localStorage.getItem(COLLECTOR_ID_KEY);
  if (!id) {
    // No auth system by design (the PS asks us to avoid unnecessary
    // personal information) — each device just gets its own anonymous,
    // persistent identity so earnings/ledger history don't collide
    // between different collectors testing the same deployed link.
    id = `c_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(COLLECTOR_ID_KEY, id);
  }
  return id;
}

function requestLocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }
    const timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), GEO_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        clearTimeout(timer);
        resolve({ ok: false, reason: err.code === 1 ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS, maximumAge: 5 * 60 * 1000 }
    );
  });
}

const LANGUAGE_KEY = "safaaiwala_language";

function readStoredLanguage() {
  const stored =
    typeof window !== "undefined"
      ? window.localStorage.getItem(LANGUAGE_KEY)
      : null;
  if (stored === "en" || stored === "hi" || stored === "mr") {
    return stored;
  }
  return i18n.language === "en" || i18n.language === "mr" ? i18n.language : "hi";
}

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLanguage);

  function setLang(next) {
    if (next !== "en" && next !== "hi" && next !== "mr") {
      return;
    }
    setLangState(next);
    if (i18n.language !== next) {
      i18n.changeLanguage(next);
    }
  }

  useEffect(() => {
    const onChanged = (language) => {
      if (language === "en" || language === "hi" || language === "mr") {
        setLangState(language);
      }
    };
    i18n.on("languageChanged", onChanged);
    return () => {
      i18n.off("languageChanged", onChanged);
    };
  }, []);
  const [online, setOnline] = useState(navigator.onLine);
  const [collectorId] = useState(getOrCreateCollectorId);
  const [locationState, setLocationState] = useState({
    ...FALLBACK_ZONE,
    source: "resolving", // 'resolving' | 'gps' | 'demo'
  });

  useEffect(() => {
    let cancelled = false;
    requestLocation().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        const zone = nearestZone(res.lat, res.lng);
        setLocationState({
          location: zone.name,
          lat: res.lat,
          lng: res.lng,
          source: "gps",
          nearestZoneDistanceKm: zone.distanceKm,
        });
      } else {
        setLocationState({ ...FALLBACK_ZONE, source: "demo", reason: res.reason });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function retryLocation() {
    setLocationState((prev) => ({ ...prev, source: "resolving" }));
    const res = await requestLocation();
    if (res.ok) {
      const zone = nearestZone(res.lat, res.lng);
      setLocationState({
        location: zone.name,
        lat: res.lat,
        lng: res.lng,
        source: "gps",
        nearestZoneDistanceKm: zone.distanceKm,
      });
    } else {
      setLocationState({ ...FALLBACK_ZONE, source: "demo", reason: res.reason });
    }
  }

  useEffect(() => {
    const goOnline = async () => {
      setOnline(true);
      await trySync(API_BASE);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const collector = {
    id: collectorId,
    location: locationState.location,
    lat: locationState.lat,
    lng: locationState.lng,
  };

  return (
    <AppContext.Provider
      value={{ lang, setLang, online, collector, locationState, retryLocation }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
