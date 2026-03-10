import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChuteSideToast } from "@/components/ToastContext";
import {
  TRAIT_LABELS,
  NINE_SCALE_GROUPS,
  QUICK_NOTES as ALL_QUICK_NOTES,
  QUICK_NOTE_PILL_COLORS,
  TAG_COLOR_OPTIONS,
  TAG_COLOR_HEX,
  GRAFT_REASONS,
  DEATH_REASONS,
} from "@/lib/constants";
import { LABEL_STYLE, INPUT_BASE, SUB_LABEL } from "@/lib/styles";

// ── Local quick-note pill colors with selected states ──
const PC: Record<string, { bg: string; border: string; text: string; bgSel: string; borderSel: string }> = {
  red:  { bg: 'rgba(155,35,53,0.12)',  border: 'rgba(155,35,53,0.25)',  text: '#9B2335', bgSel: 'rgba(155,35,53,0.25)', borderSel: '#9B2335' },
  gold: { bg: 'rgba(243,209,42,0.12)', border: 'rgba(243,209,42,0.30)', text: '#B8860B', bgSel: 'rgba(243,209,42,0.25)', borderSel: '#B8860B' },
  teal: { bg: 'rgba(85,186,170,0.12)', border: 'rgba(85,186,170,0.25)', text: '#55BAAA', bgSel: 'rgba(85,186,170,0.25)', borderSel: '#55BAAA' },
  none: { bg: '#F5F5F0',               border: '#D4D4D0',               text: 'rgba(26,26,26,0.55)', bgSel: '#E8E8E4', borderSel: '#AAAAAA' },
};

const QUICK_NOTES = ALL_QUICK_NOTES.map(n => ({ label: n.label, flag: n.flag }));

const IS: React.CSSProperties = { ...INPUT_BASE, boxSizing: 'border-box' as const };
const LS = LABEL_STYLE;

// ── Shared sub-components ──

function FR({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span style={LS}>{label}{req && <span className="text-[#9B2335] ml-0.5">*</span>}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Tog({ options, value, onChange, colors }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colors?: Record<string, { bg: string; text: string }>;
}) {
  return (
    <div className="flex flex-1">
      {options.map((o, i) => {
        const a = value === o.value;
        const c = a && colors?.[o.value] ? colors[o.value] : null;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} type="button"
            className="flex-1 py-2 text-[13px] font-semibold cursor-pointer transition-colors"
            style={{
              borderRadius: i === 0 ? '8px 0 0 8px' : i === options.length - 1 ? '0 8px 8px 0' : 0,
              backgroundColor: a ? (c?.bg || '#0E2646') : 'transparent',
              color: a ? (c?.text || 'white') : 'rgba(26,26,26,0.40)',
              border: `1px solid ${a ? 'transparent' : '#D4D4D0'}`,
              borderRight: i < options.length - 1 ? 'none' : undefined,
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

function Pill({ label, value, onChange, labels }: {
  label: string; value: string; onChange: (v: string) => void; labels: readonly string[];
}) {
  return (
    <div className="flex items-start gap-2">
      <span style={{ ...LS, paddingTop: 6 }}>{label}</span>
      <div className="flex-1 flex flex-wrap gap-[5px]">
        {labels.slice(1).map((o, i) => {
          const s = String(i + 1);
          const a = value === s;
          return (
            <button key={s} onClick={() => onChange(a ? '' : s)} type="button"
              className="rounded-full px-2.5 py-[5px] text-[11px] font-semibold cursor-pointer whitespace-nowrap"
              style={{
                border: a ? '2px solid #0E2646' : '1px solid #D4D4D0',
                backgroundColor: a ? '#0E2646' : 'white',
                color: a ? 'white' : 'rgba(26,26,26,0.55)',
              }}
            >{o}</button>
          );
        })}
      </div>
    </div>
  );
}

function GDrop({ label, value, onChange, labels, groups }: {
  label: string; value: string; onChange: (v: string) => void;
  labels: readonly string[]; groups: typeof NINE_SCALE_GROUPS.udder;
}) {
  return (
    <FR label={label}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...IS, appearance: 'auto' as const }}>
        <option value="">Select…</option>
        {groups.map(g => (
          <optgroup key={g.range} label={`── ${g.label} (${g.range}) ──`}>
            {Array.from({ length: g.end - g.start + 1 }, (_, j) => g.start + j).map(i => (
              <option key={i} value={String(i)}>{labels[i]}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </FR>
  );
}

function Pair({ tA, tB, vA, vB, oA, oB, lA, lB, gA, gB }: {
  tA: string; tB: string; vA: string; vB: string;
  oA: (v: string) => void; oB: (v: string) => void;
  lA: readonly string[]; lB: readonly string[];
  gA?: typeof NINE_SCALE_GROUPS.udder; gB?: typeof NINE_SCALE_GROUPS.teat;
}) {
  const [open, setOpen] = useState(false);
  const sA = vA ? lA[parseInt(vA)] : null;
  const sB = vB ? lB[parseInt(vB)] : null;

  return (
    <div className="rounded-[10px] border border-border/50 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} type="button"
        className="flex items-center justify-between w-full px-3 py-2.5 cursor-pointer bg-white border-none">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-[#0E2646]">{tA}</span>
          <span className="text-[11px] text-[rgba(26,26,26,0.20)]">/</span>
          <span className="text-[13px] font-bold text-[#0E2646]">{tB}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!open && (sA || sB) && (
            <div className="flex gap-1">
              {sA && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(14,38,70,0.08)] text-[#0E2646]">{sA}</span>}
              {sB && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(14,38,70,0.08)] text-[#0E2646]">{sB}</span>}
            </div>
          )}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2.5 border-t border-border/30 flex flex-col gap-2.5">
          {gA ? (
            <>
              <GDrop label={tA} value={vA} onChange={oA} labels={lA} groups={gA} />
              <GDrop label={tB} value={vB} onChange={oB} labels={lB} groups={gB!} />
            </>
          ) : lA.length > 7 ? (
            <>
              <FR label={tA}><select value={vA} onChange={e => oA(e.target.value)} style={{ ...IS, appearance: 'auto' as const }}><option value="">Select…</option>{lA.slice(1).map((o, i) => <option key={i + 1} value={String(i + 1)}>{o}</option>)}</select></FR>
              <FR label={tB}><select value={vB} onChange={e => oB(e.target.value)} style={{ ...IS, appearance: 'auto' as const }}><option value="">Select…</option>{lB.slice(1).map((o, i) => <option key={i + 1} value={String(i + 1)}>{o}</option>)}</select></FR>
            </>
          ) : (
            <>
              <Pill label={tA} value={vA} onChange={oA} labels={lA} />
              <Pill label={tB} value={vB} onChange={oB} labels={lB} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Coll({ title, badge, defaultOpen, collapsedContent, children }: {
  title: string; badge?: string | null; defaultOpen?: boolean;
  collapsedContent?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="rounded-xl border border-border/60 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} type="button"
        className="flex items-center justify-between w-full px-3 py-3 cursor-pointer bg-white border-none">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground">{title}</span>
          {badge && <span className="text-[11px] font-bold text-[#55BAAA]">{badge}</span>}
        </div>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!open && collapsedContent && (
        <div className="px-3 pb-3 border-t border-border/40">{collapsedContent}</div>
      )}
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border/40">{children}</div>
      )}
    </div>
  );
}

function Div() {
  return <div className="h-px bg-foreground/[0.06]" />;
}

// ══════════════════════════════════════════════
// ── Main Screen ──
// ══════════════════════════════════════════════

export default function CalvingNewScreen() {
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();

  const [showDam, setShowDam] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [date, setDate] = useState('2026-03-10');
  const [group, setGroup] = useState('Spring Calvers');
  const [loc, setLoc] = useState('Calving Barn');
  const [damTag, setDamTag] = useState('');
  const [status, setStatus] = useState('Alive');
  const [sex, setSex] = useState('');
  const [cTag, setCTag] = useState('');
  const [cColor, setCColor] = useState('Yellow');
  const [bw, setBw] = useState('');
  const [cSize, setCSize] = useState('3');
  const [isTwin, setIsTwin] = useState(false);
  const [tw, setTw] = useState({ tag: '', sex: '', wt: '', size: '3' });
  const [isGraft, setIsGraft] = useState(false);
  const [gDam, setGDam] = useState('');
  const [gReason, setGReason] = useState('');
  const [dReason, setDReason] = useState('');
  const [dNotes, setDNotes] = useState('');
  const [vigor, setVigor] = useState('');
  const [selNotes, setSelNotes] = useState<string[]>([]);
  const [ct, setCt] = useState({ assistance: '1', disposition: '', udder: '', teat: '', claw: '', foot: '', mothering: '' });
  const [memo, setMemo] = useState('');
  const [showStructural] = useState(true);

  const togNote = (label: string) => {
    const n = QUICK_NOTES.find(q => q.label === label);
    if (!n) return;
    const sel = selNotes.includes(label);
    if (sel) {
      const rem = selNotes.filter(x => x !== label);
      if (n.flag && !rem.some(x => QUICK_NOTES.find(q => q.label === x)?.flag === n.flag))
        showToast("info", `${n.flag === 'red' ? 'Cull' : n.flag === 'gold' ? 'Production' : 'Management'} flag removed`);
      setSelNotes(rem);
    } else {
      setSelNotes([...selNotes, label]);
      if (n.flag) showToast("info", `Flag: ${n.flag === 'red' ? 'Cull' : n.flag === 'gold' ? 'Production' : 'Management'} applied`);
      if (label === 'Twin' && !isTwin) setIsTwin(true);
    }
  };

  const notesPills = (collapsed = false) => {
    const list = collapsed ? QUICK_NOTES.filter(n => selNotes.includes(n.label)) : QUICK_NOTES;
    if (collapsed && !list.length) return <span className="text-xs text-foreground/40">None</span>;
    return (
      <div className="flex flex-wrap gap-[5px]" style={{ paddingTop: collapsed ? 4 : 0 }}>
        {list.map(n => {
          const a = selNotes.includes(n.label);
          const c = PC[n.flag || 'none'];
          return (
            <button key={n.label} onClick={collapsed ? undefined : () => togNote(n.label)} type="button"
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-[3px]"
              style={{
                backgroundColor: a ? c.bgSel : c.bg,
                border: `${a ? 2 : 1}px solid ${a ? c.borderSel : c.border}`,
                color: c.text,
                cursor: collapsed ? 'default' : 'pointer',
              }}
            >
              {a && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke={c.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {n.label}
            </button>
          );
        })}
      </div>
    );
  };

  const ctCount = Object.values(ct).filter(v => v).length;
  const fd = date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  const detSum: string[] = [];
  if (vigor) detSum.push(`Vigor: ${TRAIT_LABELS.calfVigor[parseInt(vigor)]}`);
  if (selNotes.length) detSum.push(`${selNotes.length} note${selNotes.length > 1 ? 's' : ''}`);
  if (isTwin) detSum.push('Twin');
  if (isGraft) detSum.push('Graft');
  if (memo) detSum.push('Memo');

  const handleReset = () => {
    setDamTag(''); setStatus('Alive'); setSex(''); setCTag(''); setCColor('Yellow');
    setBw(''); setCSize('3'); setIsTwin(false); setTw({ tag: '', sex: '', wt: '', size: '3' });
    setIsGraft(false); setGDam(''); setGReason(''); setDReason(''); setDNotes('');
    setVigor(''); setSelNotes([]); setCt({ assistance: '1', disposition: '', udder: '', teat: '', claw: '', foot: '', mothering: '' });
    setMemo(''); setShowDam(false);
  };

  const handleSave = () => {
    if (!damTag.trim()) { showToast("error", "Dam tag required"); return; }
    if (!sex) { showToast("error", "Calf sex required"); return; }
    const msg = status === 'Dead'
      ? `Calving record saved — calf ${cTag || 'untagged'} marked Dead`
      : `Calving record saved — calf ${cTag || 'untagged'} added to herd`;
    showToast("success", msg);
    handleReset();
  };

  return (
    <div className="px-4 pb-10 flex flex-col gap-2.5">
      {/* ═══ CONTEXT BAR ═══ */}
      <div className="rounded-[10px] bg-white border border-border/50 overflow-hidden">
        {!ctxOpen ? (
          <button onClick={() => setCtxOpen(true)} type="button"
            className="flex items-center justify-between w-full px-3 py-2.5 cursor-pointer bg-white border-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-semibold text-[#0E2646]">{fd}</span>
              <span className="text-foreground/[0.18]">·</span>
              <span className="text-[13px] font-semibold text-[#0E2646]">{group}</span>
              <span className="text-foreground/[0.18]">·</span>
              <span className="text-[13px] font-semibold text-[#0E2646]">{loc}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" stroke="rgba(26,26,26,0.25)" strokeWidth="1.2" fill="none" />
              <path d="M5 4V2.5" stroke="rgba(26,26,26,0.25)" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9 4V2.5" stroke="rgba(26,26,26,0.25)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <div className="p-3">
            <div className="flex justify-between mb-2.5">
              <span style={SUB_LABEL}>Calving Info</span>
              <button onClick={() => setCtxOpen(false)} type="button"
                className="text-[11px] font-bold text-[#55BAAA] bg-transparent border-none cursor-pointer">Done</button>
            </div>
            <div className="flex flex-col gap-2">
              <FR label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={IS} /></FR>
              <FR label="Group">
                <select value={group} onChange={e => setGroup(e.target.value)} style={{ ...IS, appearance: 'auto' as const }}>
                  <option>Spring Calvers</option><option>Fall Calvers</option><option>First Calf Heifers</option>
                </select>
              </FR>
              <FR label="Location">
                <select value={loc} onChange={e => setLoc(e.target.value)} style={{ ...IS, appearance: 'auto' as const }}>
                  <option>Calving Barn</option><option>Home Place</option><option>East Pasture</option>
                </select>
              </FR>
            </div>
            <div className="text-[10px] text-foreground/30 italic mt-1.5">Carries forward between entries</div>
          </div>
        )}
      </div>

      {/* ═══ DAM + HISTORY BUTTON ═══ */}
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 rounded-[10px] border-2 border-[#F3D12A] bg-[#FFFEF5] flex items-center px-3">
          <span className="text-xs font-bold text-foreground/30 mr-2 shrink-0">DAM</span>
          <input type="text" value={damTag} onChange={e => setDamTag(e.target.value)} placeholder="Tag…"
            className="flex-1 border-none outline-none bg-transparent text-xl font-extrabold text-[#0E2646] h-[46px] min-w-0" />
        </div>
        <button onClick={() => setShowDam(!showDam)} type="button"
          className="w-[46px] h-[46px] rounded-[10px] flex items-center justify-center shrink-0 cursor-pointer"
          style={{
            border: showDam ? '2px solid #55BAAA' : '1px solid #D4D4D0',
            backgroundColor: showDam ? 'rgba(85,186,170,0.10)' : 'white',
          }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="8" r="3" stroke={showDam ? '#55BAAA' : 'rgba(26,26,26,0.35)'} strokeWidth="1.5" fill="none" />
            <path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke={showDam ? '#55BAAA' : 'rgba(26,26,26,0.35)'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>

      {/* ═══ DAM HISTORY CARD ═══ */}
      {showDam && (
        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)' }}>
          {damTag ? (
            <>
              <div className="flex justify-between">
                <div>
                  <div className="text-white text-[28px] font-extrabold leading-none">{damTag}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#E8A0BF]" />
                    <span className="text-xs text-white/45">Pink · Cow · 2020</span>
                  </div>
                  <div className="text-[11px] text-[#A8E6DA] mt-0.5">Active · 1,187 lbs</div>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <svg width="18" height="16" viewBox="0 0 32 28" fill="none">
                    <line x1="3" y1="2" x2="3" y2="26" stroke="#55BAAA" strokeWidth="2" strokeLinecap="round" />
                    <path d="M3 3H27L23 9.5L27 16H3V3Z" fill="#55BAAA" />
                  </svg>
                  <span className="text-[9px] font-semibold text-[#55BAAA]">Mgmt</span>
                </div>
              </div>
              <div className="border-t border-white/10 mt-2.5 pt-2.5">
                <div className="text-[9px] font-bold text-white/30 tracking-wider uppercase mb-1.5">Recent Calvings</div>
                {[
                  { t: '8841', s: 'Bull', d: 'Mar 2025', w: '85 lbs' },
                  { t: '7503', s: 'Heifer', d: 'Apr 2024', w: '72 lbs' },
                ].map(c => (
                  <div key={c.t} className="flex items-center gap-2 py-[5px]">
                    <span className="text-[13px] font-bold text-white">{c.t}</span>
                    <span className="text-[9px] font-semibold rounded-full px-1.5 py-px"
                      style={{
                        backgroundColor: c.s === 'Bull' ? 'rgba(85,186,170,0.15)' : 'rgba(232,160,191,0.20)',
                        color: c.s === 'Bull' ? '#55BAAA' : '#E8A0BF',
                      }}>{c.s}</span>
                    <span className="text-[11px] text-white/35">{c.d} · {c.w}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-2 text-[13px] text-white/40">Type a dam tag to load history</div>
          )}
        </div>
      )}

      {/* ═══ CALF ═══ */}
      <div className="rounded-xl bg-white border border-border/60 p-3">
        <div style={SUB_LABEL} className="mb-2">CALF</div>

        {/* Status toggle */}
        <div className="flex items-center gap-2 mb-2.5">
          <span style={LS}>Status</span>
          <Tog value={status} onChange={setStatus}
            options={[{ value: 'Alive', label: 'Alive' }, { value: 'Dead', label: 'Dead' }]}
            colors={{ Alive: { bg: '#55BAAA', text: 'white' }, Dead: { bg: '#9B2335', text: 'white' } }} />
        </div>

        {/* Death details */}
        {status === 'Dead' && (
          <div className="rounded-lg p-2.5 mb-2.5" style={{ backgroundColor: 'rgba(155,35,53,0.06)', border: '1px solid rgba(155,35,53,0.15)' }}>
            <div className="text-[10px] font-bold text-[#9B2335] tracking-wider uppercase mb-1.5">Death Details</div>
            <FR label="Cause">
              <select value={dReason} onChange={e => setDReason(e.target.value)}
                style={{ ...IS, appearance: 'auto' as const, fontSize: 14, color: dReason ? '#1A1A1A' : 'rgba(26,26,26,0.35)' }}>
                <option value="">Select…</option>
                {DEATH_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </FR>
            <div className="mt-1.5">
              <FR label="Notes">
                <input type="text" value={dNotes} onChange={e => setDNotes(e.target.value)}
                  placeholder="Optional…" style={{ ...IS, fontSize: 14 }} />
              </FR>
            </div>
          </div>
        )}

        {/* Sex toggle */}
        <div className="flex items-center gap-2 mb-2.5">
          <span style={LS}>Sex *</span>
          <Tog value={sex} onChange={setSex}
            options={[{ value: 'Bull', label: 'Bull' }, { value: 'Heifer', label: 'Heifer' }]}
            colors={{
              Bull: { bg: 'rgba(85,186,170,0.15)', text: '#0E2646' },
              Heifer: { bg: 'rgba(232,160,191,0.20)', text: '#0E2646' },
            }} />
        </div>

        {/* Calf fields */}
        <div className="flex flex-col gap-2">
          <FR label="Calf Tag">
            <input type="text" value={cTag} onChange={e => setCTag(e.target.value)}
              placeholder="Tag number" style={IS} />
          </FR>
          <FR label="Tag Color">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: TAG_COLOR_HEX[cColor] || '#999' }} />
              <select value={cColor} onChange={e => setCColor(e.target.value)}
                style={{ ...IS, paddingLeft: 30, appearance: 'auto' as const }}>
                {TAG_COLOR_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </FR>

          {/* Weight / Size combined */}
          <div className="flex items-center gap-2">
            <span style={LS}>Wt / Size</span>
            <div className="flex-1 flex">
              <input type="number" value={bw} onChange={e => setBw(e.target.value)} placeholder="lbs"
                style={{ ...IS, flex: 1, borderRadius: '8px 0 0 8px', borderRight: 'none' }} />
              <select value={cSize} onChange={e => setCSize(e.target.value)}
                style={{ ...IS, flex: 1.2, appearance: 'auto' as const, borderRadius: '0 8px 8px 0' }}>
                <option value="">Size…</option>
                {TRAIT_LABELS.calfSize.slice(1).map((l, i) => (
                  <option key={i + 1} value={String(i + 1)}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ DETAILS ═══ */}
      <Coll title="Details"
        collapsedContent={
          detSum.length ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {detSum.map(s => (
                <span key={s} className="text-[10px] font-semibold px-[7px] py-0.5 rounded-full bg-[rgba(14,38,70,0.08)] text-[#0E2646]">{s}</span>
              ))}
            </div>
          ) : <span className="text-xs text-foreground/40">Vigor, twins, grafts, notes</span>
        }>
        <div className="flex flex-col gap-2.5 pt-1">
          <Pill label="Calf Vigor" value={vigor} onChange={setVigor} labels={TRAIT_LABELS.calfVigor} />
          <Div />

          {/* Twin toggle */}
          <div className="flex items-center gap-2">
            <span style={LS}>Twin?</span>
            <Tog value={isTwin ? 'yes' : 'no'} onChange={v => setIsTwin(v === 'yes')}
              options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
          </div>
          {isTwin && (
            <div className="rounded-lg p-2.5" style={{ backgroundColor: 'rgba(85,186,170,0.06)', border: '1px solid rgba(85,186,170,0.15)' }}>
              <div className="text-[10px] font-bold text-[#55BAAA] tracking-wider uppercase mb-1.5">Twin Calf</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span style={LS}>Sex</span>
                  <Tog value={tw.sex} onChange={v => setTw(p => ({ ...p, sex: v }))}
                    options={[{ value: 'Bull', label: 'Bull' }, { value: 'Heifer', label: 'Heifer' }]}
                    colors={{
                      Bull: { bg: 'rgba(85,186,170,0.15)', text: '#0E2646' },
                      Heifer: { bg: 'rgba(232,160,191,0.20)', text: '#0E2646' },
                    }} />
                </div>
                <FR label="Tag">
                  <input type="text" value={tw.tag} onChange={e => setTw(p => ({ ...p, tag: e.target.value }))}
                    placeholder="Twin tag" style={IS} />
                </FR>
                <div className="flex items-center gap-2">
                  <span style={LS}>Wt / Size</span>
                  <div className="flex-1 flex">
                    <input type="number" value={tw.wt} onChange={e => setTw(p => ({ ...p, wt: e.target.value }))}
                      placeholder="lbs" style={{ ...IS, flex: 1, borderRadius: '8px 0 0 8px', borderRight: 'none' }} />
                    <select value={tw.size} onChange={e => setTw(p => ({ ...p, size: e.target.value }))}
                      style={{ ...IS, flex: 1.2, appearance: 'auto' as const, borderRadius: '0 8px 8px 0' }}>
                      <option value="">Size…</option>
                      {TRAIT_LABELS.calfSize.slice(1).map((l, i) => (
                        <option key={i + 1} value={String(i + 1)}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-foreground/30 italic mt-1.5">Saves as second record — same dam, same date</div>
            </div>
          )}

          <Div />

          {/* Graft toggle */}
          <div className="flex items-center gap-2">
            <span style={LS}>Graft?</span>
            <Tog value={isGraft ? 'yes' : 'no'} onChange={v => setIsGraft(v === 'yes')}
              options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
          </div>
          {isGraft && (
            <div className="rounded-lg p-2.5" style={{ backgroundColor: 'rgba(243,209,42,0.06)', border: '1px solid rgba(243,209,42,0.15)' }}>
              <div className="text-[10px] font-bold text-[#B8860B] tracking-wider uppercase mb-1.5">Graft</div>
              <div className="flex flex-col gap-2">
                <FR label="Foster Dam">
                  <input type="text" value={gDam} onChange={e => setGDam(e.target.value)}
                    placeholder="Foster dam tag" style={IS} />
                </FR>
                <FR label="Reason">
                  <select value={gReason} onChange={e => setGReason(e.target.value)}
                    style={{ ...IS, appearance: 'auto' as const, color: gReason ? '#1A1A1A' : 'rgba(26,26,26,0.35)' }}>
                    <option value="">Select…</option>
                    {GRAFT_REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </FR>
              </div>
            </div>
          )}

          <Div />

          {/* Quick Notes */}
          <div>
            <div className="text-[11px] font-bold text-[#0E2646] mb-1.5">Quick Notes</div>
            {notesPills(false)}
          </div>

          <Div />

          {/* Memo */}
          <div>
            <div className="text-[11px] font-bold text-[#0E2646] mb-1">Memo</div>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="Notes…"
              className="w-full min-h-[52px] resize-none rounded-lg px-3 py-2.5 text-base border border-border bg-page-bg outline-none" />
          </div>
        </div>
      </Coll>

      {/* ═══ COW TRAITS ═══ */}
      <Coll title="Cow Traits" badge={ctCount > 0 ? `${ctCount}/7` : null}
        collapsedContent={
          ctCount ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {Object.entries(ct).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(14,38,70,0.08)] text-[#0E2646]">
                  {k.charAt(0).toUpperCase() + k.slice(1)}: {TRAIT_LABELS[k as keyof typeof TRAIT_LABELS]?.[parseInt(v)] || v}
                </span>
              ))}
            </div>
          ) : <span className="text-xs text-foreground/40">Assistance: No Assistance (default)</span>
        }>
        <div className="flex flex-col gap-2 pt-1">
          <Pill label="Assistance" value={ct.assistance} onChange={v => setCt(p => ({ ...p, assistance: v }))} labels={TRAIT_LABELS.assistance} />
          <Div />
          <Pair tA="Disposition" tB="Mothering" vA={ct.disposition} vB={ct.mothering}
            oA={v => setCt(p => ({ ...p, disposition: v }))} oB={v => setCt(p => ({ ...p, mothering: v }))}
            lA={TRAIT_LABELS.disposition} lB={TRAIT_LABELS.mothering} />
          {showStructural && (
            <>
              <Pair tA="Udder" tB="Teat" vA={ct.udder} vB={ct.teat}
                oA={v => setCt(p => ({ ...p, udder: v }))} oB={v => setCt(p => ({ ...p, teat: v }))}
                lA={TRAIT_LABELS.udder} lB={TRAIT_LABELS.teat}
                gA={NINE_SCALE_GROUPS.udder} gB={NINE_SCALE_GROUPS.teat} />
              <Pair tA="Claw" tB="Foot" vA={ct.claw} vB={ct.foot}
                oA={v => setCt(p => ({ ...p, claw: v }))} oB={v => setCt(p => ({ ...p, foot: v }))}
                lA={TRAIT_LABELS.claw} lB={TRAIT_LABELS.foot} />
            </>
          )}
          {!showStructural && (
            <div className="text-[11px] text-foreground/30 italic py-1">
              Structural scores (Udder/Teat, Claw/Foot) disabled in operation settings
            </div>
          )}
        </div>
      </Coll>

      {/* ═══ ACTIONS ═══ */}
      <div className="flex gap-3 pt-0.5">
        <button onClick={handleReset} type="button"
          className="flex-1 py-3.5 rounded-full border border-border bg-white text-sm font-semibold text-[#0E2646] cursor-pointer">
          Reset
        </button>
        <button onClick={handleSave} type="button"
          className="flex-[2] py-3.5 rounded-full border-none text-sm font-bold text-foreground cursor-pointer"
          style={{ backgroundColor: '#F3D12A', boxShadow: '0 2px 10px rgba(243,209,42,0.35)' }}>
          Save & Next
        </button>
      </div>
    </div>
  );
}
