import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

interface ProtocolProduct {
  product_id: string;
  product_name: string;
  dosage: string | null;
  route: string | null;
  notes: string | null;
}

interface ProtocolEvent {
  id: string;
  event_name: string;
  scheduled_date: string | null;
  event_status: string | null;
  recommended_products: ProtocolProduct[] | null;
}

interface AssignedProtocol {
  id: string;
  animal_class: string;
  protocol_status: string | null;
  protocol_year: number | null;
  events: ProtocolEvent[];
}

interface ExtendedProtocolEvent extends ProtocolEvent {
  recommended_products: ProtocolProduct[];
  animal_class: string;
  protocol_year: number | null;
  protocol_status: string | null;
}

interface LoadFromProtocolDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadProducts: (products: {
    id: string;
    name: string;
    dosage: string;
    route: string;
    source: "protocol";
    source_ref: string;
  }[]) => void;
}

export default function LoadFromProtocolDrawer({
  open,
  onOpenChange,
  onLoadProducts,
}: LoadFromProtocolDrawerProps) {
  const { operationId } = useOperation();
  const [selectedEvent, setSelectedEvent] = useState<ExtendedProtocolEvent | null>(null);
  const [step, setStep] = useState<"pick" | "confirm">("pick");

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["assigned-protocols", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assigned_protocols")
        .select(`
          id, animal_class, protocol_status, protocol_year,
          events:assigned_protocol_events(
            id, event_name, scheduled_date, event_status, recommended_products
          )
        `)
        .eq("client_operation_id", operationId)
        .order("protocol_year", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AssignedProtocol[];
    },
    enabled: open,
  });

  // Flatten into event rows with protocol context
  const eventRows: ExtendedProtocolEvent[] = (protocols || []).flatMap(p =>
    (p.events || [])
      .filter(e => e.recommended_products && e.recommended_products.length > 0)
      .map(e => ({
        ...e,
        recommended_products: e.recommended_products as ProtocolProduct[],
        animal_class: p.animal_class,
        protocol_year: p.protocol_year,
        protocol_status: p.protocol_status,
      }))
  );

  // Sort: upcoming first, then by date
  const sortedEvents = [...eventRows].sort((a, b) => {
    const aUp = a.event_status === "upcoming" ? 0 : 1;
    const bUp = b.event_status === "upcoming" ? 0 : 1;
    if (aUp !== bUp) return aUp - bUp;
    return (a.scheduled_date || "").localeCompare(b.scheduled_date || "");
  });

  const handleSelectEvent = (event: typeof sortedEvents[0]) => {
    setSelectedEvent(event);
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selectedEvent?.recommended_products) return;
    const mapped = selectedEvent.recommended_products.map(p => ({
      id: p.product_id,
      name: p.product_name,
      dosage: p.dosage || "",
      route: p.route || "",
      source: "protocol" as const,
      source_ref: selectedEvent.id,
    }));
    onLoadProducts(mapped);
    handleClose();
  };

  const handleClose = () => {
    setSelectedEvent(null);
    setStep("pick");
    onOpenChange(false);
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setStep("pick");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent style={{ maxHeight: "80vh", fontFamily: "'Inter', sans-serif" }}>
        <DrawerHeader>
          <DrawerTitle style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>
            {step === "pick" ? "Load from Protocol" : "Confirm Products"}
          </DrawerTitle>
          <DrawerDescription style={{ fontSize: 13, color: "rgba(26,26,26,0.50)" }}>
            {step === "pick"
              ? "Pick a protocol event to load its products"
              : `${selectedEvent?.recommended_products?.length || 0} products from this event`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {step === "pick" && (
            <>
              {isLoading ? (
                <div className="text-center py-6" style={{ fontSize: 14, color: "rgba(26,26,26,0.40)" }}>
                  Loading protocols...
                </div>
              ) : sortedEvents.length === 0 ? (
                <div className="text-center py-6 space-y-1">
                  <div style={{ fontSize: 14, color: "rgba(26,26,26,0.50)" }}>
                    No protocols assigned.
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)" }}>
                    Protocols are set up by your vet.
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {sortedEvents.map(event => (
                    <button
                      key={event.id}
                      className="flex items-center justify-between w-full py-3 cursor-pointer active:bg-[rgba(26,26,26,0.02)]"
                      style={{
                        background: "none",
                        border: "none",
                        borderBottom: "1px solid rgba(26,26,26,0.08)",
                      }}
                      onClick={() => handleSelectEvent(event)}
                    >
                      <div className="text-left min-w-0 flex-1">
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
                          {event.event_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span
                            className="rounded-full shrink-0"
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              padding: "2px 8px",
                              backgroundColor: "rgba(85,186,170,0.12)",
                              color: "#3D9A8B",
                            }}
                          >
                            {event.animal_class}
                          </span>
                          {event.scheduled_date && (
                            <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>
                              {formatDate(event.scheduled_date)}
                            </span>
                          )}
                          {event.protocol_year && (
                            <span style={{ fontSize: 11, color: "rgba(26,26,26,0.35)" }}>
                              {event.protocol_year}
                            </span>
                          )}
                          {event.event_status === "upcoming" && (
                            <span
                              className="rounded-full"
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 6px",
                                backgroundColor: "rgba(243,209,42,0.15)",
                                color: "#C4A600",
                              }}
                            >
                              UPCOMING
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 ml-2 flex items-center gap-1">
                        <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>
                          {event.recommended_products.length} product{event.recommended_products.length !== 1 ? "s" : ""}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "confirm" && selectedEvent?.recommended_products && (
            <div className="space-y-0">
              {/* Back link */}
              <button
                className="flex items-center gap-1 mb-3 cursor-pointer"
                style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#55BAAA" }}
                onClick={handleBack}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M8.75 10.5L5.25 7L8.75 3.5" stroke="#55BAAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to events
              </button>

              {/* Event context */}
              <div
                className="rounded-lg px-3 py-2.5 mb-3"
                style={{ backgroundColor: "rgba(85,186,170,0.06)", border: "1px solid rgba(85,186,170,0.15)" }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                  {selectedEvent.event_name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>
                    {selectedEvent.animal_class}
                  </span>
                  {selectedEvent.scheduled_date && (
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>
                      {formatDate(selectedEvent.scheduled_date)}
                    </span>
                  )}
                </div>
              </div>

              {/* Product list */}
              {selectedEvent.recommended_products.map((p, i) => (
                <div
                  key={`${p.product_id}-${i}`}
                  className="flex items-center gap-2 py-2.5"
                  style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <circle cx="8" cy="8" r="7" stroke="#55BAAA" strokeWidth="1.5" />
                    <path d="M5 8L7 10L11 6" stroke="#55BAAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
                    {p.product_name}
                  </span>
                  <span className="shrink-0" style={{ fontSize: 12, color: "rgba(26,26,26,0.45)" }}>
                    {[p.dosage, p.route].filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DrawerFooter>
          {step === "confirm" ? (
            <button
              className="w-full rounded-full py-3.5 bg-[#F3D12A] cursor-pointer active:scale-[0.97]"
              style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none" }}
              onClick={handleConfirm}
            >
              Load {selectedEvent?.recommended_products?.length || 0} Product{(selectedEvent?.recommended_products?.length || 0) !== 1 ? "s" : ""}
            </button>
          ) : (
            <button
              className="w-full rounded-full py-3 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
              style={{ fontSize: 14, fontWeight: 600, color: "rgba(26,26,26,0.50)" }}
              onClick={handleClose}
            >
              Cancel
            </button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
