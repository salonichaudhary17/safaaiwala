import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { TrendingDown, TrendingUp, Minus, Wifi, WifiOff } from "lucide-react";
import { API_BASE } from "../lib/api";
import { useApp } from "../context/AppContext";
import { readPriceSnapshot, savePriceSnapshot } from "../db/offlineDb";

function TrendIcon({ trend }) {
  if (trend === "up") return <TrendingUp size={16} />;
  if (trend === "down") return <TrendingDown size={16} />;
  return <Minus size={16} />;
}

export default function LivePrices() {
  const { collector, online } = useApp();
  const [prices, setPrices] = useState([]);
  const [source, setSource] = useState("loading");
  const [updatedAt, setUpdatedAt] = useState("");

  const city = collector.location || "Delhi";

  useEffect(() => {
    let cancelled = false;
    let socket;
    let eventSource;

    async function loadRest() {
      try {
        const response = await fetch(
          `${API_BASE}/api/waste/prices?city=${encodeURIComponent(city)}`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "price load failed");
        if (cancelled) return;
        setPrices(data.prices || []);
        setUpdatedAt(data.generatedAt);
        setSource("rest");
        await savePriceSnapshot(city, data.prices || []);
      } catch {
        const cached = await readPriceSnapshot(city);
        if (cancelled) return;
        if (cached.length) {
          setPrices(cached.map((row) => row.payload || row));
          setSource("indexeddb");
        }
      }
    }

    loadRest();

    if (online) {
      socket = io(API_BASE, {
        transports: ["websocket", "polling"],
      });
      socket.emit("subscribe:prices", city);
      socket.emit("join", { city });
      const apply = (payload) => {
        if (!payload?.prices) return;
        const filtered = city
          ? payload.prices.filter(
              (row) => !row.city || row.city === city || payload.city === "All India"
            )
          : payload.prices;
        const unique = [];
        const seen = new Set();
        for (const row of filtered) {
          if (row.city && row.city !== city && payload.city === "All India") {
            if (row.city !== city) continue;
          }
          const key = row.materialCode;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(row);
        }
        const next =
          unique.length > 0
            ? unique.filter((row) => !row.city || row.city === city)
            : payload.prices.filter((row) => row.city === city);
        setPrices(next.length ? next : payload.prices.slice(0, 8));
        setUpdatedAt(payload.generatedAt);
        setSource("socket");
        savePriceSnapshot(city, next.length ? next : payload.prices);
      };
      socket.on("price:update", apply);
      socket.on("aajKaBhaav", apply);

      eventSource = new EventSource(`${API_BASE}/api/waste/prices/stream?city=${encodeURIComponent(city)}`);
      eventSource.addEventListener("price", (event) => {
        try {
          apply(JSON.parse(event.data));
          setSource((current) => (current === "socket" ? current : "sse"));
        } catch {
          /* ignore malformed SSE */
        }
      });
    }

    return () => {
      cancelled = true;
      socket?.disconnect();
      eventSource?.close();
    };
  }, [city, online]);

  const rows = useMemo(() => {
    const unique = new Map();
    for (const price of prices) {
      const key = price.materialCode || price.id;
      if (!unique.has(key)) unique.set(key, price);
    }
    return Array.from(unique.values());
  }, [prices]);

  return (
    <div className="card">
      <div className="row between">
        <div>
          <div className="h2">Aaj Ka Bhaav</div>
          <div className="muted">{city}</div>
        </div>
        <span className={`pill ${online ? "pill-teal" : "pill-amber"}`}>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {source}
        </span>
      </div>
      {updatedAt ? (
        <p className="muted">Updated {new Date(updatedAt).toLocaleTimeString()}</p>
      ) : null}
      <div className="price-table">
        {rows.map((row) => (
          <div className="price-row" key={row.materialCode || row.id}>
            <div>
              <strong>{row.name || row.materialCode}</strong>
              <div className="muted">{row.label_hi || row.category}</div>
            </div>
            <div className={`trend trend-${row.trend || "stable"}`}>
              <TrendIcon trend={row.trend} />
              ₹{Number(row.currentRate || row.buyingPricePerKg || 0).toFixed(1)}/kg
            </div>
          </div>
        ))}
        {!rows.length ? <p className="muted">Waiting for live rates…</p> : null}
      </div>
    </div>
  );
}
