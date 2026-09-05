import { useState } from "react";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { KNOWN_ZONES } from "../lib/zones";

const LANGS = [
  { code: "hi", label: "हि" },
  { code: "mr", label: "म" },
  { code: "en", label: "En" },
];

export default function TopBar() {
  const { lang, setLang } = useApp();
  const [showZones, setShowZones] = useState(false);

  return (
    <div className="topbar" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div className="row between">
        <div className="h1" style={{ fontSize: 18, margin: 0 }}>{t("appName", lang)}</div>
        <div className="lang-toggle">
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={lang === l.code ? "active" : ""}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => setShowZones((v) => !v)}
        className="pill pill-teal"
        style={{ alignSelf: "flex-start", border: "none", cursor: "pointer" }}
      >
        {t("pilotBadge", lang)} ⓘ
      </button>
      {showZones && (
        <div className="muted" style={{ fontSize: 12.5 }}>
          {t("pilotZonesIntro", lang)}: {KNOWN_ZONES.map((z) => z.name).join(" · ")}
        </div>
      )}
    </div>
  );
}
