import { useState, useSyncExternalStore } from "react";
import Dashboard from "./Pages/Dashboard.jsx";
import Goals from "./Pages/Goals.jsx";
import NavBar from "./components/NavBar.jsx";
import PwaStatus from "./components/PwaStatus.jsx";
import ToastProvider from "./components/Toast.jsx";
import "./App.css";

// Hash routing (#/goals) needs no server rewrites, so deep links and refreshes
// work on Vercel and inside the installed app without extra configuration.
const PAGES = { dashboard: Dashboard, goals: Goals };

const readPage = () => {
  const name = window.location.hash.replace(/^#\/?/, "");
  return name in PAGES ? name : "dashboard";
};
const subscribe = (cb) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

function App() {
  const page = useSyncExternalStore(subscribe, readPage, () => "dashboard");
  // Bumped after import/erase so pages re-read LocalStorage from scratch.
  const [dataVersion, setDataVersion] = useState(0);
  const Page = PAGES[page];

  const navigate = (id) => {
    if (id !== page) window.location.hash = `#/${id}`;
    window.scrollTo(0, 0);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen w-full relative">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "#0D1B2A",
            backgroundImage: `
              linear-gradient(to right, rgba(224, 225, 221, 0.1) 2px, transparent 1px),
              linear-gradient(to bottom, rgba(65, 90, 119, 0.2) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex flex-col min-h-screen">
          <NavBar page={page} onNavigate={navigate} onDataChanged={() => setDataVersion((v) => v + 1)} />
          <PwaStatus />
          <main key={`${page}-${dataVersion}`} className="flex flex-col flex-1 min-w-0">
            <Page />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
