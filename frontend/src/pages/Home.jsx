import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { getMaterials, getPrice } from "../lib/api";
import Icon from "../components/Icon";

const HIGHLIGHT_MATERIALS = ["pcb", "cable", "battery", "plastic"];

export default function Home({ onNavigate }) {
  const { lang, collector } = useApp();
  const [materials, setMaterials] = useState([]);
  const [prices, setPrices] = useState({});

  useEffect(() => {
    getMaterials().then(setMaterials).catch(() => {});
  }, []);

  useEffect(() => {
    HIGHLIGHT_MATERIALS.forEach((id) => {
      getPrice(id, collector.location)
        .then((res) => setPrices((prev) => ({ ...prev, [id]: res.latest })))
        .catch(() => {});
    });
  }, [collector.location]);

  const labelFor = (id) => {
    const m = materials.find((mat) => mat.id === id);
    return m ? m[`label_${lang}`] || m.label_en : id;
  };

  return (
    <div className="stack">
      <div>
        <div className="h1">{t("homeGreeting", lang)}</div>
        <p className="muted">{t("homeSubtitle", lang)}</p>
      </div>

      <button className="btn btn-primary btn-block" onClick={() => onNavigate("capture")}>
        <Icon name="camera" size={20} color="#fff" />
        {t("startPickup", lang)}
      </button>

      <div className="card">
        <div className="h2">{t("todaysPrices", lang)}</div>
        <div className="stack" style={{ gap: 8 }}>
          {HIGHLIGHT_MATERIALS.map((id) => (
            <div className="row between" key={id}>
              <span>{labelFor(id)}</span>
              <span className="pill pill-amber">
                {prices[id] ? `\u20B9${prices[id].sell_price_per_kg}/kg` : "..."}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
