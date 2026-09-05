import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { API_BASE } from "../lib/api";
import { cacheGet, readCache } from "../lib/offlineQueue";

export default function Recyclers() {
  const { lang } = useApp();
  const [recyclers, setRecyclers] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/recyclers`)
      .then((r) => r.json())
      .then((data) => {
        setRecyclers(data);
        cacheGet("recyclers_all", data);
      })
      .catch(() => setRecyclers(readCache("recyclers_all") || []));
  }, []);

  return (
    <div className="stack">
      <div className="h1">{t("recyclersTitle", lang)}</div>
      <div className="stack" style={{ gap: 10 }}>
        {recyclers.map((r) => (
          <div className="card" key={r.id}>
            <div className="row between">
              <strong style={{ fontSize: 15 }}>{r.name}</strong>
              <span className="pill pill-teal">{r.authorization_id}</span>
            </div>
            <div className="muted">{r.location}, {r.city}</div>
            <div className="row" style={{ marginTop: 8, flexWrap: "wrap", gap: 6 }}>
              {r.materials_accepted.map((mat) => (
                <span key={mat} className="pill" style={{ background: "#f1efe8" }}>{mat}</span>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="pill" style={{ background: r.pickup_available ? "#e1f5ee" : "#f1efe8" }}>
                {r.pickup_available ? t("pickupYes", lang) : t("pickupNo", lang)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
