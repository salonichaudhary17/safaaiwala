import Icon from "./Icon";
import { t } from "../lib/i18n";
import { useApp } from "../context/AppContext";

const TABS = [
  { key: "home", icon: "home", label: "navHome" },
  { key: "capture", icon: "camera", label: "navCapture" },
  { key: "recyclers", icon: "truck", label: "navRecyclers" },
  { key: "ledger", icon: "wallet", label: "navLedger" },
  { key: "assistant", icon: "chat", label: "navAssistant" },
];

const LANGS = [
  { code: "hi", label: "हिंदी", icon: "🇮🇳", aria: "Hindi" },
  { code: "mr", label: "मराठी", icon: "🟧", aria: "Marathi" },
  { code: "en", label: "English", icon: "🇬🇧", aria: "English" },
];

export default function BottomNav({ active, onChange }) {
  const { lang, setLang } = useApp();

  return (
    <div className="bottom-nav-shell">
      <div className="lang-toggle nav-lang-toggle" role="group" aria-label={t("select", lang)}>
        {LANGS.map((item) => (
          <button
            key={item.code}
            type="button"
            className={lang === item.code ? "active" : ""}
            aria-pressed={lang === item.code}
            aria-label={item.aria}
            onClick={() => setLang(item.code)}
          >
            <span className="lang-flag" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <nav className="bottom-nav">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`nav-item ${active === tab.key ? "active" : ""}`}
            onClick={() => onChange(tab.key)}
          >
            <Icon name={tab.icon} size={22} />
            <span>{t(tab.label, lang)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
