import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import LocationBanner from "./components/LocationBanner";
import Home from "./pages/Home";
import Capture from "./pages/Capture";
import Recyclers from "./pages/Recyclers";
import Ledger from "./pages/Ledger";
import Assistant from "./pages/Assistant";
import VoiceAssistant from "./components/VoiceAssistant";
import Scanner from "./components/Scanner";
import LivePrices from "./components/LivePrices";
import RecyclerDashboard from "./components/RecyclerDashboard";
import ReceiptModal from "./components/ReceiptModal";
import { getRecyclerMatch } from "./lib/api";
import { queueTransaction, saveReceipt } from "./db/offlineDb";
import { pendingSyncCount } from "./db/offlineDb";

const PAGES = {
  home: Home,
  capture: Capture,
  recyclers: Recyclers,
  ledger: Ledger,
  assistant: Assistant,
};

function LoginScreen() {
  const { login, register, error, setError } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "collector",
    city: "Delhi",
  });
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function demo(role) {
    const emails = {
      user: "user@safaaiwala.in",
      collector: "collector@safaaiwala.in",
      recycler: "recycler@safaaiwala.in",
    };
    setBusy(true);
    try {
      await login(emails[role], "demo1234");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="screen">
        <div className="h1">Safaaiwala</div>
        <p className="muted">Waste & e-waste management for collectors, households, and recyclers.</p>
        <form className="stack card" onSubmit={submit}>
          {mode === "register" ? (
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          ) : null}
          <input
            type="text"
            placeholder="Email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            required
            autoComplete="current-password"
          />
          {mode === "register" ? (
            <>
              <select
                value={form.role}
                onChange={(event) => update("role", event.target.value)}
              >
                <option value="user">Household user</option>
                <option value="collector">Collector</option>
                <option value="recycler">Recycler</option>
              </select>
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
              />
            </>
          ) : null}
          {error ? <p className="muted">{error}</p> : null}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {mode === "login" ? "Log in" : "Create account"}
          </button>
          <button
            className="btn btn-secondary btn-block"
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Need an account?" : "Have an account?"}
          </button>
        </form>
        <div className="stack" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" type="button" onClick={() => demo("collector")}>
            Demo collector
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => demo("recycler")}>
            Demo recycler
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => demo("user")}>
            Demo household
          </button>
        </div>
      </div>
    </div>
  );
}

function ScanPage({ onReceipt }) {
  const { authFetch, user } = useAuth();
  const { collector, online } = useApp();
  const [classification, setClassification] = useState(null);
  const [weight, setWeight] = useState("1");
  const [address, setAddress] = useState(collector.location || "Delhi");
  const [message, setMessage] = useState("");

  async function createFromScan() {
    if (!classification) return;
    const weightKg = Number(weight || 1);
    const itemsList = [
      {
        materialCode: classification.materialCode,
        itemType: classification.itemType,
        category: classification.category,
        weightKg,
        ratePerKg: classification.estimatedValuePerKg,
        amount: Number((weightKg * classification.estimatedValuePerKg).toFixed(2)),
        hazardLevel: classification.hazardLevel,
        recyclability: classification.recyclability,
      },
    ];

    let recyclerId = null;
    try {
      const match = await getRecyclerMatch(
        classification.materialCode,
        collector.lat,
        collector.lng
      );
      recyclerId = Array.isArray(match) ? match[0]?.id : match?.recommendedRecyclers?.[0]?.id;
    } catch {
      recyclerId = null;
    }

    if (!recyclerId) {
      try {
        const list = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/recyclers`
        );
        const json = await list.json();
        recyclerId = json?.[0]?._id || json?.[0]?.id;
      } catch {
        /* continue to queue */
      }
    }

    const payload = {
      recyclerId,
      collectorId: user?.linkedCollectorId || collector.id,
      itemsList,
      originNotes: `Classified via ${classification.source}`,
      address,
      lat: collector.lat,
      lng: collector.lng,
    };

    if (!online || !recyclerId) {
      const queued = await queueTransaction(payload);
      setMessage("Saved offline. It will sync with a receipt when you are back online.");
      onReceipt?.({
        transactionId: queued.transactionId,
        status: "pending_sync",
        collectorId: payload.collectorId,
        items: itemsList,
        subtotal: itemsList[0].amount,
        taxAmount: 0,
        totalAmount: itemsList[0].amount,
        environmentalImpactScore: 40,
        referenceHash: queued.id,
        dynamicQrCode: JSON.stringify({ pending: true, id: queued.id }),
      });
      return;
    }

    const response = await authFetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Could not create transaction");
      return;
    }
    if (data.receipt) await saveReceipt(data.receipt);
    onReceipt?.(data.receipt);
    setMessage("Receipt issued.");
  }

  async function schedulePickup() {
    const response = await authFetch("/api/waste/pickup", {
      method: "POST",
      body: JSON.stringify({
        address,
        preferredTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        notes: classification
          ? `Voice/scan pickup for ${classification.itemType}`
          : "Voice scheduled pickup",
        items: classification
          ? [
              {
                materialCode: classification.materialCode,
                itemType: classification.itemType,
                weightKg: Number(weight || 1),
                estimatedValuePerKg: classification.estimatedValuePerKg,
                hazardLevel: classification.hazardLevel,
              },
            ]
          : [],
        lat: collector.lat,
        lng: collector.lng,
      }),
    });
    const data = await response.json();
    setMessage(data.message || data.error || "Pickup requested");
  }

  return (
    <div className="stack">
      <Scanner onClassified={(result) => setClassification(result)} />
      <div className="card stack">
        <label className="muted">Estimated weight (kg)</label>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />
        <label className="muted">Pickup address</label>
        <input
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <button className="btn btn-primary" type="button" onClick={createFromScan}>
          Issue digital receipt
        </button>
        <button className="btn btn-secondary" type="button" onClick={schedulePickup}>
          Schedule pickup
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { online } = useApp();
  const [active, setActive] = useState(user?.role === "recycler" ? "portal" : "home");
  const [receipt, setReceipt] = useState(null);
  const [queued, setQueued] = useState(0);

  useMemo(() => {
    pendingSyncCount().then(setQueued).catch(() => setQueued(0));
  }, [online, receipt]);

  const Page = PAGES[active];

  return (
    <div className="app-shell">
      <TopBar />
      <div className="row between" style={{ padding: "0 16px" }}>
        <span className="muted">
          {user.name} · {user.role}
        </span>
        <button type="button" className="btn btn-secondary" onClick={logout}>
          Log out
        </button>
      </div>
      <OfflineBanner />
      {!online || queued > 0 ? (
        <div className="offline-banner">
          {online
            ? `${queued} item(s) waiting to sync`
            : "Offline mode · IndexedDB queue is active"}
        </div>
      ) : null}
      <LocationBanner />
      <div className="screen">
        {active === "home" ? (
          <div className="stack">
            <Home onNavigate={setActive} />
            <LivePrices />
          </div>
        ) : null}
        {active === "scan" ? <ScanPage onReceipt={setReceipt} /> : null}
        {active === "portal" ? <RecyclerDashboard /> : null}
        {Page ? <Page onNavigate={setActive} /> : null}
      </div>
      <VoiceAssistant
        onNavigate={setActive}
        onSchedulePickup={() => setActive("scan")}
      />
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      <BottomNav active={active} onChange={setActive} role={user.role} />
    </div>
  );
}

function Gate() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="app-shell">
        <div className="screen">Loading Safaaiwala…</div>
      </div>
    );
  }
  return isAuthenticated ? <Shell /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Gate />
      </AppProvider>
    </AuthProvider>
  );
}
