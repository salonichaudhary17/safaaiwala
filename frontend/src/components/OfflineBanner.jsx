import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function OfflineBanner() {
  const { online, lang } = useApp();
  if (online) return null;
  return <div className="offline-banner">{t("offline", lang)}</div>;
}
