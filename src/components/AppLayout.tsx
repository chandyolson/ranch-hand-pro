import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import NavDrawer from "./NavDrawer";
import ToastContainer from "./ToastContainer";

const routeConfig: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Saddle Butte Ranch", subtitle: "Ranch · 847 Head · Active" },
  "/animals": { title: "Animals", subtitle: "847 Total · 798 Active" },
  "/calving": { title: "Calving", subtitle: "2026 Season · 23 Calves" },
  "/calving/new": { title: "New Calving", subtitle: "Calving Entry" },
  "/cow-work": { title: "Cow Work", subtitle: "5 Active Projects" },
  "/cow-work/new": { title: "New Project", subtitle: "Create Work Project" },
  "/red-book": { title: "Red Book", subtitle: "Ranch Notes & Records" },
  "/red-book/new": { title: "New Note", subtitle: "Red Book Entry" },
  "/reference": { title: "Reference", subtitle: "Settings & Lookups" },
  "/reference/groups": { title: "Groups", subtitle: "Animal Groupings" },
  "/reference/locations": { title: "Locations", subtitle: "Pastures & Facilities" },
  "/reference/quick-notes": { title: "Quick Notes", subtitle: "Reusable Phrases" },
  "/reference/preg-stages": { title: "Preg Stages", subtitle: "Pregnancy Stages" },
  "/reference/treatments": { title: "Products", subtitle: "Product Library" },
  "/reference/team": { title: "Team", subtitle: "Members & Roles" },
  "/reference/settings": { title: "Settings", subtitle: "Operation Config" },
  "/reference/breeds": { title: "Breeds", subtitle: "Breed Library" },
  "/reference/templates": { title: "Templates", subtitle: "Work Templates" },
};

const navRouteMap: Record<string, string> = {
  "Operation Dashboard": "/",
  Animals: "/animals",
  "Cow Work": "/cow-work",
  Calving: "/calving",
  "Red Book": "/red-book",
  Reference: "/reference",
};

const reverseNavMap: Record<string, string> = Object.fromEntries(
  Object.entries(navRouteMap).map(([k, v]) => [v, k])
);

const AppLayout: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const isHome = path === "/";
  const isAnimalDetail = /^\/animals\/[^/]+$/.test(path) && path !== "/animals/new";

  let config = routeConfig[path];
  if (!config) {
    if (isAnimalDetail) {
      config = { title: "Animal Record", subtitle: "Animal Detail" };
    } else if (path === "/animals/new") {
      config = { title: "Add Animal", subtitle: "New Record" };
    } else if (/^\/cow-work\/[^/]+$/.test(path) && path !== "/cow-work/new") {
      config = { title: "Cow Work", subtitle: "Project Detail" };
    } else if (/^\/cow-work\/[^/]+\/close-out$/.test(path)) {
      config = { title: "Close Out", subtitle: "Finalize Project" };
    } else {
      config = { title: "ChuteSide", subtitle: "" };
    }
  }

  const activeItem = reverseNavMap[path] || (path.startsWith("/animals") ? "Animals" : undefined);

  return (
    <div className="min-h-screen font-inter" style={{ backgroundColor: "#F5F5F0" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 pt-3 pb-4 flex items-center justify-between"
        style={{ background: "linear-gradient(180deg, #153566 0%, #081020 100%)" }}
      >
        {/* Left */}
        {isHome ? (
          <button
            className="flex flex-col justify-center items-center active:scale-[0.97]"
            style={{ width: 36, height: 36, gap: 5, background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 20, height: 2, backgroundColor: "#F0F0F0", borderRadius: 9999, display: "block" }} />
            ))}
          </button>
        ) : (
          <button
            className="flex items-center justify-center active:scale-[0.97]"
            style={{ width: 36, height: 36, background: "none", border: "none", cursor: "pointer" }}
            onClick={() => { if (window.history.length > 1) { navigate(-1); } else { navigate("/"); } }}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#F0F0F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Center */}
        <div className="flex flex-col items-center text-center">
          <span style={{ color: "#FFFFFF", fontSize: 17, fontWeight: 700 }}>{config.title}</span>
          {config.subtitle && (
            <span style={{ color: "#55BAAA", fontSize: 12, fontWeight: 500 }}>{config.subtitle}</span>
          )}
        </div>

        {/* Right placeholder */}
        <div style={{ width: 36, height: 36 }} />
      </header>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeItem={activeItem}
        onItemSelect={(item) => {
          const route = navRouteMap[item];
          if (route) navigate(route);
          setDrawerOpen(false);
        }}
        onSignOut={() => setDrawerOpen(false)}
        onSwitchOperation={() => setDrawerOpen(false)}
      />

      <main className="px-5 py-5 md:px-8 lg:px-10">
        <div className="max-w-[480px] mx-auto lg:max-w-none">
          <Outlet />
        </div>
      </main>

      <ToastContainer />
    </div>
  );
};

export default AppLayout;
