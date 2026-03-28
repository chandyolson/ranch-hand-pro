import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOperation } from "@/contexts/OperationContext";
import { ChevronDown } from "lucide-react";

const RANCH_NAV_ITEMS = [
  "Operation Dashboard",
  "Animals",
  "Bulls",
  "Cow Work",
  "Protocols",
  "Calving",
  "Red Book",
  "AI Reports",
  "Data Quality",
  "Import Data",
  "Cow Cleaner",
  "Reference",
];

const VET_NAV_ITEMS = [
  "Operation Dashboard",
  "Customers",
  "Cow Work",
  "Sale Barn",
  "Protocols",
  "Red Book",
  "AI Reports",
  "Data Quality",
  "Import Data",
  "Products",
  "Reference",
];

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  activeItem?: string;
  operationName?: string;
  onItemSelect?: (item: string) => void;
  onSignOut?: () => void;
  onSwitchOperation?: () => void;
}

const NavDrawer: React.FC<NavDrawerProps> = ({ open, onClose, activeItem, operationName, onItemSelect }) => {
  const { operationType, userRole } = useOperation();
  const { operations, signOut } = useAuth();
  const navigate = useNavigate();
  const isVet = operationType === 'vet_practice';
  const showSaleBarn = isVet;
  const hasMultipleOps = operations.length > 1;

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

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const handleSwitchOperation = () => {
    onClose();
    navigate('/operation-picker');
  };

  const capitalizeRole = (role: string) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: open ? "rgba(0,0,0,0.52)" : "transparent",
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col font-inter"
        style={{
          width: 280,
          background: "linear-gradient(180deg, #153566 0%, #081020 100%)",
          transform: open ? "translateX(0)" : "translateX(-280px)",
          transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "6px 0 32px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {/* Brand */}
        <div className="px-6 pt-10 pb-4">
          <div style={{
            color: "#F3D12A",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "0.18em",
            fontFamily: "'Inter', sans-serif",
            textShadow: "0 0 8px rgba(243,209,42,0.50), 0 0 20px rgba(243,209,42,0.30), 0 0 40px rgba(243,209,42,0.15)",
          }}>
            HERD WORK
          </div>
        </div>

        {/* Operation Switcher */}
        <div className="px-6 pb-4">
          {hasMultipleOps ? (
            <button
              onClick={handleSwitchOperation}
              className="w-full flex items-center justify-between"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }} className="truncate">
                  {operationName || "My Operation"}
                </span>
                {userRole && (
                  <span
                    className="flex-shrink-0 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: 'rgba(85,186,170,0.2)', color: '#55BAAA', fontSize: 11, fontWeight: 600 }}
                  >
                    {capitalizeRole(userRole)}
                  </span>
                )}
              </div>
              <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span style={{ color: 'rgba(85,186,170,0.7)', fontSize: 13, fontWeight: 500 }} className="truncate">
                {operationName || "My Operation"}
              </span>
              {userRole && (
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5"
                  style={{ backgroundColor: 'rgba(85,186,170,0.2)', color: '#55BAAA', fontSize: 11, fontWeight: 600 }}
                >
                  {capitalizeRole(userRole)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mx-5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

        {/* Nav Items */}
        <div className="flex-1 py-4 overflow-y-auto">
          {(isVet ? VET_NAV_ITEMS : RANCH_NAV_ITEMS).map((item) => {
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
                    style={{ width: 3, height: 24, backgroundColor: "#F3D12A", top: "50%", transform: "translateY(-50%)" }}
                  />
                )}
                {item}
              </button>
            );
          })}

          {/* Sale Barn sub-nav — only if Sale Barn isn't already in the main nav list */}
          {showSaleBarn && !isVet && (
            <>
              {(() => {
                const isSBActive = activeItem === "Sale Barn";
                return (
                  <button
                    key="Sale Barn"
                    className="w-full text-left relative block"
                    style={{
                      padding: "12px 24px",
                      marginTop: 8,
                      fontSize: 15,
                      fontWeight: isSBActive ? 600 : 400,
                      color: isSBActive ? "#F3D12A" : "rgba(240,240,240,0.6)",
                      backgroundColor: isSBActive ? "rgba(243,209,42,0.06)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => onItemSelect?.("Sale Days")}
                  >
                    {isSBActive && (
                      <span className="absolute left-0 rounded-r-sm" style={{ width: 3, height: 24, backgroundColor: "#F3D12A", top: "50%", transform: "translateY(-50%)" }} />
                    )}
                    Sale Barn
                  </button>
                );
              })()}
              {["Sale Days", "SB Customers", "Buyers"].map((item) => {
                const isActive = activeItem === item;
                const displayLabel = item === "SB Customers" ? "Customers" : item;
                return (
                  <button
                    key={item}
                    className="w-full text-left relative block"
                    style={{
                      padding: "10px 40px",
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#F3D12A" : "rgba(240,240,240,0.45)",
                      backgroundColor: isActive ? "rgba(243,209,42,0.06)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => onItemSelect?.(item)}
                  >
                    {isActive && (
                      <span className="absolute left-0 rounded-r-sm" style={{ width: 3, height: 24, backgroundColor: "#F3D12A", top: "50%", transform: "translateY(-50%)" }} />
                    )}
                    {displayLabel}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="mx-5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

        {/* Bottom */}
        {hasMultipleOps && (
          <button
            className="w-full text-left"
            style={{ padding: "16px 24px", fontSize: 13, fontWeight: 500, color: "rgba(240,240,240,0.3)", border: "none", background: "none", cursor: "pointer" }}
            onClick={handleSwitchOperation}
          >
            Switch Operation
          </button>
        )}
        <button
          className="w-full text-left"
          style={{ padding: hasMultipleOps ? "4px 24px 16px 24px" : "16px 24px 16px 24px", fontSize: 13, fontWeight: 500, color: "#E74C3C", opacity: 0.6, border: "none", background: "none", cursor: "pointer" }}
          onClick={handleSignOut}
        >
          Sign Out
        </button>
        <div className="h-6" />
      </div>
    </>
  );
};

export default NavDrawer;
