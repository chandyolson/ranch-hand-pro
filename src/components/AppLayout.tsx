import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import NavDrawer from "./NavDrawer";
import ToastContainer from "./ToastContainer";
import { useOperation } from "@/contexts/OperationContext";
import { useAnimalCounts } from "@/hooks/useAnimals";

interface RouteConfig { title: string; subtitle: string; back?: string }

const routeConfig: Record<string, RouteConfig> = {
  "/":                        { title: "",                       subtitle: "" },
  "/animals":                 { title: "Animals",                subtitle: "",                               back: "/" },
  "/animals/new":             { title: "Add Animal",             subtitle: "New Record",                    back: "/animals" },
  "/bulls":                   { title: "Bulls",                  subtitle: "Herd Sires",                    back: "/" },
  "/calving":                 { title: "Calving",                subtitle: "",                               back: "/" },
  "/calving/new":             { title: "Calving",                subtitle: "",                               back: "/calving" },
  "/cow-work":                { title: "Cow Work",               subtitle: "",                               back: "/" },
  "/cow-work/new":            { title: "New Project",            subtitle: "Create Work Project",           back: "/cow-work" },
  "/protocols":               { title: "Protocols",              subtitle: "Vaccination Programs",          back: "/" },
  "/protocols/new":           { title: "New Protocol",           subtitle: "Create Protocol",               back: "/protocols" },
  "/red-book":                { title: "Red Book",               subtitle: "Ranch Notes & Records",         back: "/" },
  "/red-book/new":            { title: "New Note",               subtitle: "Red Book Entry",                back: "/red-book" },
  "/reference":               { title: "Reference",              subtitle: "Settings & Lookups",            back: "/" },
  "/reference/groups":        { title: "Groups",                 subtitle: "Animal Groupings",              back: "/reference" },
  "/reference/locations":     { title: "Locations",              subtitle: "Pastures & Facilities",         back: "/reference" },
  "/reference/quick-notes":   { title: "Quick Notes",            subtitle: "Reusable Phrases",              back: "/reference" },
  "/reference/preg-stages":   { title: "Preg Stages",            subtitle: "Pregnancy Stages",              back: "/reference" },
  "/reference/treatments":    { title: "Products",               subtitle: "Product Library",               back: "/reference" },
  "/reference/team":          { title: "Team",                   subtitle: "Members & Roles",               back: "/reference" },
  "/reference/settings":      { title: "Settings",               subtitle: "Operation Config",              back: "/reference" },
  "/reference/breeds":        { title: "Breeds",                 subtitle: "Breed Library",                 back: "/reference" },
  "/reference/templates":     { title: "Templates",              subtitle: "Work Templates",                back: "/reference" },
  "/cow-cleaner":             { title: "Cow Cleaner",            subtitle: "Import & Clean Data",           back: "/" },
  "/ai-reports":              { title: "AI Reports",             subtitle: "",                               back: "/" },
  "/data-quality":            { title: "Data Quality",           subtitle: "Automated data integrity checks", back: "/" },
  "/import":                  { title: "Import Data",            subtitle: "CSV & Excel Import",            back: "/" },
  "/registration":            { title: "Registration Assistant", subtitle: "Pre-fill breed association forms", back: "/" },
  "/customers":               { title: "Customers",              subtitle: "Practice Clients",              back: "/" },
};

/** Resolve the back destination for dynamic routes not in routeConfig. */
function getDynamicBackPath(path: string): string | null {
  if (/^\/animals\/[^/]+$/.test(path))                          return "/animals";
  if (/^\/cow-work\/[^/]+\/close-out$/.test(path))             return path.replace(/\/close-out$/, "");
  if (/^\/cow-work\/[^/]+$/.test(path))                        return "/cow-work";
  if (/^\/calving\/[^/]+$/.test(path))                         return "/calving";
  if (/^\/red-book\/[^/]+$/.test(path))                        return "/red-book";
  if (/^\/protocols\/[^/]+$/.test(path))                       return "/protocols";
  if (/^\/reference\/[^/]+$/.test(path))                       return "/reference";
  if (/^\/sale-barn\/[^/]+\/work-order/.test(path))            return `/sale-barn/${path.split("/")[2]}`;
  if (/^\/sale-barn\/[^/]+/.test(path))                        return "/sale-barn";
  if (/^\/customers\/[^/]+$/.test(path))                       return "/customers";
  return null;
}

const navRouteMap: Record<string, string> = {
  "Operation Dashboard": "/",
  Animals: "/animals",
  Bulls: "/bulls",
  "Cow Work": "/cow-work",
  Protocols: "/protocols",
  Calving: "/calving",
  "Red Book": "/red-book",
  "Cow Cleaner": "/cow-cleaner",
  "AI Reports": "/ai-reports",
  "Data Quality": "/data-quality",
  "Import Data": "/import",
  Registration: "/registration",
  Reference: "/reference",
  Products: "/reference/products",
  Customers: "/customers",
  "Sale Barn": "/sale-barn",
  "Sale Days": "/sale-barn",
  "SB Customers": "/sale-barn/customers",
  Buyers: "/sale-barn/buyers",
};

const reverseNavMap: Record<string, string> = Object.fromEntries(
  Object.entries(navRouteMap).map(([k, v]) => [v, k])
);

const AppLayout: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { operationName } = useOperation();
  const { data: counts } = useAnimalCounts();
  const path = location.pathname;

  const isHome = path === "/" || path === "/sale-barn" || path === "/ai-reports";
  const isAnimalDetail = /^\/animals\/[^/]+$/.test(path) && path !== "/animals/new";

  // Dynamic title overrides for routes whose text depends on runtime data
  const dynamicConfig: RouteConfig | null =
    path === "/"
      ? { title: operationName, subtitle: `Ranch · ${counts?.total ?? "..."} Head · Active` }
    : path === "/sale-barn"
      ? { title: "Sale Barn", subtitle: operationName }
    : path === "/animals"
      ? { title: "Animals", subtitle: `${counts?.total ?? "..."} Total · ${counts?.active ?? "..."} Active` }
    : null;

  // Static fallback for dynamic path segments not in routeConfig
  const dynamicPathConfig: RouteConfig | null =
    isAnimalDetail                                    ? { title: "Animal Record",   subtitle: "Animal Detail" }
    : /^\/cow-work\/[^/]+$/.test(path)               ? { title: "Cow Work",        subtitle: "Project Detail" }
    : /^\/cow-work\/[^/]+\/close-out$/.test(path)    ? { title: "Close Out",       subtitle: "Finalize Project" }
    : /^\/sale-barn\/[^/]+\/consignments$/.test(path)? { title: "Consignments",    subtitle: "Sale Day" }
    : /^\/sale-barn\/[^/]+\/billing$/.test(path)     ? { title: "Day Billing",     subtitle: "Sale Day" }
    : /^\/sale-barn\/[^/]+\/reports$/.test(path)     ? { title: "Reports",         subtitle: "Sale Day" }
    : /^\/sale-barn\/[^/]+\/work-order\/new/.test(path) ? { title: "New Work Order", subtitle: "Work Order" }
    : /^\/sale-barn\/[^/]+\/work-order/.test(path)   ? { title: "Edit Work Order", subtitle: "Work Order" }
    : /^\/sale-barn\/[^/]+/.test(path)               ? { title: "Sale Day",        subtitle: "Sale Day Detail" }
    : /^\/customers\/[^/]+$/.test(path)              ? { title: "Customer",        subtitle: "Client Detail" }
    : null;

  const config: RouteConfig =
    dynamicConfig ?? routeConfig[path] ?? dynamicPathConfig ?? { title: "ChuteSide", subtitle: "" };

  const activeItem = reverseNavMap[path]
    || (path.startsWith("/animals") ? "Animals" : undefined)
    || (path.startsWith("/customers") ? "Customers" : undefined)
    || (path === "/ai-reports" ? "AI Reports" : undefined);

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
            onClick={() => {
              const dest =
                routeConfig[path]?.back ??
                getDynamicBackPath(path) ??
                (window.history.length > 1 ? -1 : "/");
              navigate(dest as string);
            }}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#F0F0F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Title */}
        <div className="flex flex-col items-start text-left flex-1 ml-2">
          <span style={{ color: "#FFFFFF", fontSize: 17, fontWeight: 700 }}>{config.title}</span>
          {config.subtitle && (
            <span style={{ color: "#55BAAA", fontSize: 12, fontWeight: 500 }}>{config.subtitle}</span>
          )}
        </div>

        {/* Right — Herd Work (intentional decorative glow font) */}
        <button
          className="flex items-center justify-center active:scale-[0.97]"
          style={{
            height: 36,
            paddingLeft: 12,
            paddingRight: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#F3D12A",
            textShadow: "0 0 6px rgba(243,209,42,0.50), 0 0 14px rgba(243,209,42,0.30), 0 0 28px rgba(243,209,42,0.15)",
            textTransform: "uppercase",
          }}
          onClick={() => navigate("/")}
        >
          HERD WORK
        </button>
      </header>

      <NavDrawer
        operationName={operationName}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeItem={activeItem}
        onItemSelect={(item) => {
          const route = navRouteMap[item];
          if (route) navigate(route);
          setDrawerOpen(false);
        }}
      />

      <main className="py-5">
        <div className="max-w-xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      <ToastContainer />
    </div>
  );
};

export default AppLayout;