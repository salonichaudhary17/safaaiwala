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

export default function BottomNav({ active, onChange }) {
  const { lang } = useApp();
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item ${active === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          <Icon name={tab.icon} size={22} />
          <span>{t(tab.label, lang)}</span>
        </button>
      ))}
    </nav>
  );
}
