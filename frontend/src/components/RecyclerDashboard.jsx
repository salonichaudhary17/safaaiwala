import { useEffect, useState } from "react";
import { CheckCircle2, Scale, ShieldCheck, Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RecyclerDashboard() {
  const { authFetch, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [weightDrafts, setWeightDrafts] = useState({});
  const [busyId, setBusyId] = useState("");

  async function load() {
    try {
      const response = await authFetch("/api/portal/dashboard");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load dashboard");
      setData(json);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 12000);
    return () => clearInterval(timer);
  }, []);

  async function verify(transactionId, decision) {
    setBusyId(transactionId);
    try {
      const response = await authFetch(`/api/portal/requests/${transactionId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Verify failed");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function logWeight(transactionId) {
    const weightKg = Number(weightDrafts[transactionId] || 0);
    if (!weightKg) return;
    setBusyId(transactionId);
    try {
      const response = await authFetch("/api/portal/batches", {
        method: "POST",
        body: JSON.stringify({ transactionId, weightKg }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Batch log failed");
      setWeightDrafts((prev) => ({ ...prev, [transactionId]: "" }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  if (!data) {
    return (
      <div className="stack">
        <div className="h1">Recycler portal</div>
        <p className="muted">{error || "Loading incoming requests…"}</p>
      </div>
    );
  }

  const { recycler, summary, incoming, batchWeightLogs } = data;

  return (
    <div className="stack">
      <div>
        <div className="h1">{recycler.name}</div>
        <p className="muted">
          {recycler.location} · License {recycler.licenseNo}
        </p>
      </div>

      {user?.role !== "recycler" ? (
        <div className="card">
          Demo view. Sign in as recycler@safaaiwala.in to verify and log batches.
        </div>
      ) : null}

      {error ? <div className="card">{error}</div> : null}

      <div className="material-grid">
        <div className="card">
          <Truck size={18} />
          <div className="muted">Incoming</div>
          <strong>{summary.incomingCount}</strong>
        </div>
        <div className="card">
          <ShieldCheck size={18} />
          <div className="muted">Pending</div>
          <strong>{summary.pendingVerification}</strong>
        </div>
        <div className="card">
          <Scale size={18} />
          <div className="muted">Kg pending</div>
          <strong>{summary.pendingWeightKg}</strong>
        </div>
      </div>

      <div className="h2">Incoming collection requests</div>
      {incoming.map((row) => (
        <div className="card" key={row.transactionId}>
          <div className="row between">
            <strong>{row.transactionId}</strong>
            <span className="pill pill-teal">{row.status}</span>
          </div>
          <p className="muted">
            Origin: {row.origin.collectorName} · {row.origin.zone || row.origin.address || "field"}
          </p>
          <p className="muted">
            Verification: {row.verificationStatus} · Stage: {row.currentStage}
          </p>
          <ul className="muted">
            {(row.itemsList || []).map((item, index) => (
              <li key={`${row.transactionId}-${index}`}>
                {item.itemType || item.materialCode} · {item.weightKg} kg · ₹{item.amount}
              </li>
            ))}
          </ul>
          <p className="muted">Batch hash: {String(row.batchHash || "").slice(0, 18)}…</p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busyId === row.transactionId || user?.role !== "recycler"}
              onClick={() => verify(row.transactionId, "verified")}
            >
              <CheckCircle2 size={16} />
              Verify
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busyId === row.transactionId || user?.role !== "recycler"}
              onClick={() => verify(row.transactionId, "rejected")}
            >
              Reject
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input
              type="number"
              min="0.001"
              step="0.1"
              placeholder="Batch weight kg"
              value={weightDrafts[row.transactionId] || ""}
              onChange={(event) =>
                setWeightDrafts((prev) => ({
                  ...prev,
                  [row.transactionId]: event.target.value,
                }))
              }
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busyId === row.transactionId || user?.role !== "recycler"}
              onClick={() => logWeight(row.transactionId)}
            >
              Log weight
            </button>
          </div>
        </div>
      ))}

      {!incoming.length ? <p className="muted">No incoming requests yet.</p> : null}

      <div className="h2">Batch weight logs</div>
      {(batchWeightLogs || []).slice().reverse().slice(0, 12).map((log, index) => (
        <div className="row between card" key={`${log.transactionId}-${index}`}>
          <span>{log.transactionId}</span>
          <strong>{log.weightKg} kg</strong>
        </div>
      ))}
    </div>
  );
}
