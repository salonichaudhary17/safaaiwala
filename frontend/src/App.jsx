import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import Home from "./pages/Home";
import Capture from "./pages/Capture";
import Recyclers from "./pages/Recyclers";
import Ledger from "./pages/Ledger";
import Assistant from "./pages/Assistant";
import LocationBanner from "./components/LocationBanner";

const PAGES = {
  home: Home,
  capture: Capture,
  recyclers: Recyclers,
  ledger: Ledger,
  assistant: Assistant,
};

function Shell() {
  const [active, setActive] = useState("home");
  const Page = PAGES[active];

  return (
    <div className="app-shell">
      <TopBar />
      <OfflineBanner />
      <LocationBanner />
      <div className="screen">
        <Page onNavigate={setActive} />
      </div>
      <BottomNav active={active} onChange={setActive} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
