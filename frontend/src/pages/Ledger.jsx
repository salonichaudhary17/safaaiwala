import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { getLedger } from "../lib/api";
import Icon from "../components/Icon";

export default function Ledger() {
  const { lang, collector } = useApp();
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    getLedger(collector.id).then(setLedger).catch(() => {});
  }, [collector.id]);

  if (!ledger) return <div className="muted">...</div>;

  return (
    <div className="stack">
      <div className="h1">{t("ledgerTitle", lang)}</div>

      <div className="card" style={{ textAlign: "center", background: "#0F6E56", color: "#fff", border: "none" }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>{t("totalEarned", lang)}</div>
        <div style={{ fontSize: 32, fontWeight: 500, margin: "4px 0" }}>₹{ledger.totalEarned}</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>{t("totalWeight", lang)}: {ledger.totalWeightKg} kg</div>
      </div>

      <div className="card">
        <div className="row between">
          <span className="muted">{t("vsInformal", lang)}</span>
          <Icon name="wallet" size={18} color="#BA7517" />
        </div>
        <div className="row between" style={{ marginTop: 8 }}>
          <span>₹{ledger.informalEquivalent}</span>
          <span className="pill pill-amber">+₹{ledger.upliftAmount} ({ledger.upliftPercent}%) {t("moreEarned", lang)}</span>
        </div>
      </div>

      <div className="h2">{t("navLedger", lang)}</div>
      <div className="stack" style={{ gap: 8 }}>
        {ledger.transactions.slice().reverse().map((txn) => (
          <div className="card" key={txn.lot_id}>
            <div className="row between">
              <strong>{txn.material_id}</strong>
              <span className="pill pill-amber">₹{txn.final_price}</span>
            </div>
            <div className="muted">{txn.weight_kg} kg · {new Date(txn.timestamp).toLocaleDateString()}</div>
            <div className="muted" style={{ fontSize: 12 }}>{t("refHash", lang)}: {txn.reference_hash}</div>
          </div>
        ))}
        {ledger.transactions.length === 0 && (
          <p className="muted">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}
