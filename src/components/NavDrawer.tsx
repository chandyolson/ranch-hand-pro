import React, { useEffect } from "react";

const NAV_ITEMS = [
  "Operation Dashboard",
  "Animals",
  "Cow Work",
  "Calving",
  "Red Book",
  "Reference",
];

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  activeItem?: string;
  onItemSelect?: (item: string) => void;
  onSignOut?: () => void;
  onSwitchOperation?: () => void;
}

const NavDrawer: React.FC<NavDrawerProps> = ({ open, onClose, activeItem, onItemSelect, onSignOut, onSwitchOperation }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300 lg:hidden"
        style={{
          backgroundColor: open ? "rgba(0,0,0,0.52)" : "transparent",
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col font-inter lg:hidden"
        style={{
          width: 280,
          background: "linear-gradient(180deg, #153566 0%, #081020 100%)",
          transform: open ? "translateX(0)" : "translateX(-280px)",
          transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "6px 0 32px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {/* Brand — intentional decorative font */}
        <div className="px-6 pt-10 pb-6">
          <div style={{
            color: "#F3D12A",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "0.18em",
            fontFamily: "'Inter', sans-serif",
            textShadow: "0 0 8px rgba(243,209,42,0.50), 0 0 20px rgba(243,209,42,0.30), 0 0 40px rgba(243,209,42,0.15)",
          }}>
            CHUTESIDE
          </div>
          <div style={{ color: "#55BAAA", fontSize: 13, fontWeight: 500, opacity: 0.7, marginTop: 6 }}>
            Saddle Butte Ranch
          </div>
        </div>

        <div className="mx-5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

        {/* Nav Items */}
        <div className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeItem === item;
            return (
              <button
                key={item}
                className="w-full text-left relative block"
                style={{
                  padding: "12px 24px",
                  fontSize: 15,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#F3D12A" : "rgba(240,240,240,0.6)",
                  backgroundColor: isActive ? "rgba(243,209,42,0.06)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => onItemSelect?.(item)}
              >
                {isActive && (
                  <span
                    className="absolute left-0 rounded-r-sm"
                    style={{
                      width: 3,
                      height: 24,
                      backgroundColor: "#F3D12A",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                )}
                {item}
              </button>
            );
          })}
        </div>

        <div className="mx-5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

        {/* Bottom */}
        <button
          className="w-full text-left"
          style={{ padding: "16px 24px", fontSize: 13, fontWeight: 500, color: "rgba(240,240,240,0.3)", border: "none", background: "none", cursor: "pointer" }}
          onClick={onSwitchOperation}
        >
          Switch Operation
        </button>
        <button
          className="w-full text-left"
          style={{ padding: "4px 24px 16px 24px", fontSize: 13, fontWeight: 500, color: "#E74C3C", opacity: 0.6, border: "none", background: "none", cursor: "pointer" }}
          onClick={onSignOut}
        >
          Sign Out
        </button>
        <div className="h-6" />
      </div>
    </>
  );
};

export default NavDrawer;