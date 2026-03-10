import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CalvingRecord {
  id: string;
  damTag: string;
  damColor: string;
  damColorHex: string;
  calfTag: string;
  calfSex: "Bull" | "Heifer";
  calfStatus: "Alive" | "Dead";
  date: string;
  birthWeight?: string;
  assistance: string;
  note?: string;
}

const recentRecords: CalvingRecord[] = [
  { id: "c1", damTag: "3309", damColor: "Pink",   damColorHex: "#E8A0BF", calfTag: "8841", calfSex: "Bull",   calfStatus: "Alive", date: "Mar 8, 2026",  birthWeight: "85 lbs",  assistance: "None",       note: "Normal birth — strong calf" },
  { id: "c2", damTag: "4782", damColor: "Yellow", damColorHex: "#F3D12A", calfTag: "8842", calfSex: "Heifer", calfStatus: "Alive", date: "Mar 7, 2026",  birthWeight: "72 lbs",  assistance: "None",       note: "" },
  { id: "c3", damTag: "5520", damColor: "Green",  damColorHex: "#55BAAA", calfTag: "8843", calfSex: "Bull",   calfStatus: "Alive", date: "Mar 7, 2026",  birthWeight: "90 lbs",  assistance: "Easy pull",  note: "Large calf" },
  { id: "c4", damTag: "2218", damColor: "Orange", damColorHex: "#E8863A", calfTag: "8844", calfSex: "Heifer", calfStatus: "Dead",  date: "Mar 6, 2026",  birthWeight: "68 lbs",  assistance: "Hard pull",  note: "Stillborn" },
  { id: "c5", damTag: "6610", damColor: "Blue",   damColorHex: "#5B8DEF", calfTag: "8845", calfSex: "Bull",   calfStatus: "Alive", date: "Mar 5, 2026",  birthWeight: "88 lbs",  assistance: "None",       note: "" },
  { id: "c6", damTag: "7801", damColor: "Pink",   damColorHex: "#E8A0BF", calfTag: "8846", calfSex: "Heifer", calfStatus: "Alive", date: "Mar 4, 2026",  birthWeight: "76 lbs",  assistance: "None",       note: "First calf heifer" },
];

export default function CalvingScreen() {
  const navigate = useNavigate();

  const aliveCount = recentRecords.filter(r => r.calfStatus === "Alive").length;
  const deadCount = recentRecords.filter(r => r.calfStatus === "Dead").length;

  return (
    <div className="px-3 pt-4 pb-10 space-y-3 font-['Inter']">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Calving</span>
        <button
          onClick={() => navigate("/calving/new")}
          className="rounded-full flex items-center gap-1.5 cursor-pointer active:scale-[0.97] transition-all"
          style={{ height: 36, padding: "0 16px", backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
        >
          + New Entry
        </button>
      </div>

      {/* Season stat cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { value: recentRecords.length, label: "TOTAL" },
          { value: aliveCount, label: "ALIVE" },
          { value: deadCount, label: "DEAD" },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-3 py-3 font-['Inter']"
            style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(168,230,218,0.70)", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>
        RECENT RECORDS
      </div>

      {/* Record list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {recentRecords.map(r => (
          <div
            key={r.id}
            className="bg-[#0E2646] rounded-xl px-4 py-3.5 font-['Inter'] cursor-pointer active:scale-[0.98] transition-all duration-150"
            onClick={() => navigate("/calving/" + r.id)}
          >
            {/* Row 1 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{r.damTag}</span>
                <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: r.damColorHex, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "rgba(240,240,240,0.30)" }}>→</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#55BAAA" }}>{r.calfTag}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full"
                  style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.06em",
                    backgroundColor: r.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                    color: r.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                  }}
                >
                  {r.calfSex.toUpperCase()}
                </span>
                {r.calfStatus === "Dead" && (
                  <span
                    className="rounded-full"
                    style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(155,35,53,0.20)", color: "#D4606E" }}
                  >
                    DEAD
                  </span>
                )}
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-2 mt-1.5">
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.35)" }}>{r.date}</span>
              {r.birthWeight && (
                <>
                  <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,240,240,0.50)" }}>{r.birthWeight}</span>
                </>
              )}
              {r.assistance !== "None" && (
                <>
                  <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(243,209,42,0.70)" }}>{r.assistance}</span>
                </>
              )}
            </div>

            {/* Note */}
            {r.note && (
              <div style={{ fontSize: 12, color: "rgba(240,240,240,0.40)", marginTop: 4, lineHeight: 1.4 }}>{r.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
