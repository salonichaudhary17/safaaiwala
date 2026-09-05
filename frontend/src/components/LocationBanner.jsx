import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function LocationBanner() {
  const { lang, locationState, retryLocation } = useApp();

  if (locationState.source === "resolving") return null;

  if (locationState.source === "gps") {
    return (
      <div className="offline-banner" style={{ background: "#e1f5ee", color: "#085041" }}>
        {t("locationUsing", lang)} — {locationState.location}
      </div>
    );
  }

  return (
    <div className="offline-banner row between" style={{ paddingRight: 10 }}>
      <span>{t("locationDemo", lang)}</span>
      <button
        onClick={retryLocation}
        style={{
          border: "none",
          background: "none",
          color: "#633806",
          fontWeight: 600,
          textDecoration: "underline",
          cursor: "pointer",
          flexShrink: 0,
          marginLeft: 8,
        }}
      >
        {t("locationRetry", lang)}
      </button>
    </div>
  );
}
