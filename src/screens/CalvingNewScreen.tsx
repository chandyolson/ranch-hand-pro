import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChuteSideToast } from "@/components/ToastContext";
import {
  TRAIT_LABELS,
  QUICK_NOTES as ALL_QUICK_NOTES,
  TAG_COLOR_OPTIONS,
  TAG_COLOR_HEX,
  GRAFT_REASONS,
  DEATH_REASONS,
} from "@/lib/constants";
import { LABEL_STYLE, INPUT_BASE } from "@/lib/styles";

// ── Local pill colors with selected states (extends shared QUICK_NOTE_PILL_COLORS) ──
const PC: Record<string, { bg: string; border: string; text: string; bgSel: string; borderSel: string }> = {
  red:  { bg: 'rgba(155,35,53,0.12)',  border: 'rgba(155,35,53,0.25)',  text: '#9B2335', bgSel: 'rgba(155,35,53,0.25)', borderSel: '#9B2335' },
  gold: { bg: 'rgba(243,209,42,0.12)', border: 'rgba(243,209,42,0.30)', text: '#B8860B', bgSel: 'rgba(243,209,42,0.25)', borderSel: '#B8860B' },
  teal: { bg: 'rgba(85,186,170,0.12)', border: 'rgba(85,186,170,0.25)', text: '#55BAAA', bgSel: 'rgba(85,186,170,0.25)', borderSel: '#55BAAA' },
  none: { bg: '#F5F5F0',               border: '#D4D4D0',               text: 'rgba(26,26,26,0.55)', bgSel: '#E8E8E4', borderSel: '#AAAAAA' },
};

const QUICK_NOTES = ALL_QUICK_NOTES.map(n => ({ label: n.label, flag: n.flag }));
const IS: React.CSSProperties = { ...INPUT_BASE, boxSizing: 'border-box' as const };
const LS = LABEL_STYLE;

// ── Sub-components ──

function FR({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span style={LS}>{label}{req && <span style={{ color: '#9B2335' }}> *</span>}</span>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function Toggle({ options, value, onChange, colors }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colors?: Record<string, { bg: string; text: string }>;
}) {
  return (
    <div style={{ display: 'flex', gap: 0, flex: 1, minWidth: 0 }}>
      {options.map((opt, i) => {
        const active = value === opt.value;
        const col = active && colors?.[opt.value] ? colors[opt.value] : null;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} type="button" style={{
            flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            borderRadius: i === 0 ? '8px 0 0 8px' : i === options.length - 1 ? '0 8px 8px 0' : 0,
            backgroundColor: active ? (col?.bg || '#0E2646') : 'transparent',
            color: active ? (col?.text || 'white') : 'rgba(26,26,26,0.40)',
            border: `1px solid ${active ? 'transparent' : '#D4D4D0'}`,
            borderRight: i < options.length - 1 ? 'none' : undefined,
            minWidth: 0, whiteSpace: 'nowrap',
          }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

function PillScore({ label, value, onChange, labels }: {
  label: string; value: string; onChange: (v: string) => void; labels: readonly string[];
}) {
  const opts = labels.slice(1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
      <span style={{ ...LS, paddingTop: 6 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 5, minWidth: 0 }}>
        {opts.map((opt, i) => {
          const score = String(i + 1);
          const active = value === score;
          return (
            <button key={score} onClick={() => onChange(active ? '' : score)} type="button" style={{
              borderRadius: 9999, padding: '5px 10px', fontSize: 11, fontWeight: 600,
              border: active ? '2px solid #0E2646' : '1px solid #D4D4D0',
              backgroundColor: active ? '#0E2646' : 'white', color: active ? 'white' : 'rgba(26,26,26,0.55)',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 100ms',
            }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

function DropScore({ label, value, onChange, labels }: {
  label: string; value: string; onChange: (v: string) => void; labels: readonly string[];
}) {
  return (
    <FR label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...IS, appearance: 'auto' as const }}>
        <option value="">Select…</option>
        {labels.slice(1).map((opt, i) => <option key={i + 1} value={String(i + 1)}>{opt}</option>)}
      </select>
    </FR>
  );
}

function TraitPair({ titleA, titleB, valueA, valueB, onChangeA, onChangeB, labelsA, labelsB }: {
  titleA: string; titleB: string; valueA: string; valueB: string;
  onChangeA: (v: string) => void; onChangeB: (v: string) => void;
  labelsA: readonly string[]; labelsB: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const sA = valueA ? labelsA[parseInt(valueA)] : null;
  const sB = valueB ? labelsB[parseInt(valueB)] : null;
  const both9 = labelsA.length > 7 && labelsB.length > 7;

  return (
    <div style={{ borderRadius: 10, border: '1px solid rgba(212,212,208,0.50)', backgroundColor: 'white', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} type="button" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        padding: '10px 12px', cursor: 'pointer', backgroundColor: 'white', border: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E2646' }}>{titleA}</span>
          <span style={{ fontSize: 11, color: 'rgba(26,26,26,0.20)' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E2646' }}>{titleB}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!open && (sA || sB) && <div style={{ display: 'flex', gap: 4 }}>
            {sA && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, backgroundColor: 'rgba(14,38,70,0.08)', color: '#0E2646' }}>{sA}</span>}
            {sB && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, backgroundColor: 'rgba(14,38,70,0.08)', color: '#0E2646' }}>{sB}</span>}
          </div>}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(212,212,208,0.30)', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
          {both9 ? (
            <><DropScore label={titleA} value={valueA} onChange={onChangeA} labels={labelsA} /><DropScore label={titleB} value={valueB} onChange={onChangeB} labels={labelsB} /></>
          ) : (
            <><PillScore label={titleA} value={valueA} onChange={onChangeA} labels={labelsA} /><PillScore label={titleB} value={valueB} onChange={onChangeB} labels={labelsB} /></>
          )}
        </div>
      )}
    </div>
  );
}

function Collapsible({ title, badge, defaultOpen, collapsedContent, children }: {
  title: string; badge?: string | null; defaultOpen?: boolean;
  collapsedContent?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{ borderRadius: 12, border: '1px solid rgba(212,212,208,0.60)', backgroundColor: 'white', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} type="button" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        padding: '12px', cursor: 'pointer', backgroundColor: 'white', border: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{title}</span>
          {badge != null && <span style={{ fontSize: 11, fontWeight: 700, color: '#55BAAA' }}>{badge}</span>}
        </div>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {!open && collapsedContent && <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(212,212,208,0.40)' }}>{collapsedContent}</div>}
      {open && <div style={{ padding: '4px 12px 12px', borderTop: '1px solid rgba(212,212,208,0.40)' }}>{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Main Screen ──
// ══════════════════════════════════════════════

export default function CalvingNewScreen() {
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();

  const [showDam, setShowDam] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [date, setDate] = useState('2026-03-10');
  const [group, setGroup] = useState('Spring Calvers');
  const [location, setLocation] = useState('Calving Barn');
  const [damTag, setDamTag] = useState('');
  const [calfStatus, setCalfStatus] = useState('Alive');
  const [calfSex, setCalfSex] = useState('');
  const [calfTag, setCalfTag] = useState('');
  const [calfColor, setCalfColor] = useState('Yellow');
  const [birthWeight, setBirthWeight] = useState('');
  const [calfSize, setCalfSize] = useState('3');
  const [isTwin, setIsTwin] = useState(false);
  const [twin, setTwin] = useState({ tag: '', sex: '', color: 'Yellow', weight: '', size: '3' });
  const [isGraft, setIsGraft] = useState(false);
  const [graftDam, setGraftDam] = useState('');
  const [graftReason, setGraftReason] = useState('');
  const [deathReason, setDeathReason] = useState('');
  const [deathNotes, setDeathNotes] = useState('');
  const [vigor, setVigor] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [cowTraits, setCowTraits] = useState({ assistance: '1', disposition: '', udder: '', teat: '', claw: '', foot: '', mothering: '' });
  const [notes, setNotes] = useState('');
  const [showUdderTeat] = useState(true);
  const [showClawFoot] = useState(true);

  const toggleNote = (label: string) => {
    const note = QUICK_NOTES.find(n => n.label === label);
    if (!note) return;
    const isSel = selectedNotes.includes(label);
    if (isSel) {
      const remaining = selectedNotes.filter(n => n !== label);
      if (note.flag) {
        const others = remaining.some(n => QUICK_NOTES.find(q => q.label === n)?.flag === note.flag);
        if (!others) showToast("info", `${note.flag === 'red' ? 'Cull' : note.flag === 'gold' ? 'Production' : 'Management'} flag removed`);
      }
      setSelectedNotes(remaining);
    } else {
      setSelectedNotes([...selectedNotes, label]);
      if (note.flag) showToast("info", `Flag: ${note.flag === 'red' ? 'Cull' : note.flag === 'gold' ? 'Production' : 'Management'} applied`);
      if (label === 'Twin' && !isTwin) setIsTwin(true);
    }
  };

  const renderNotes = (collapsed = false) => {
    const list = collapsed ? QUICK_NOTES.filter(n => selectedNotes.includes(n.label)) : QUICK_NOTES;
    if (collapsed && list.length === 0) return <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.40)' }}>None</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: collapsed ? 4 : 0 }}>
        {list.map(n => {
          const active = selectedNotes.includes(n.label);
          const c = PC[n.flag || 'none'];
          return (
            <button key={n.label} onClick={collapsed ? undefined : () => toggleNote(n.label)} type="button" style={{
              borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 600,
              backgroundColor: active ? c.bgSel : c.bg, border: `${active ? 2 : 1}px solid ${active ? c.borderSel : c.border}`,
              color: c.text, cursor: collapsed ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 100ms',
            }}>
              {active && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke={c.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {n.label}
            </button>
          );
        })}
      </div>
    );
  };

  const cowTraitCount = Object.values(cowTraits).filter(v => v).length;
  const fmtDate = date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  const detailBits: string[] = [];
  if (vigor) detailBits.push(`Vigor: ${TRAIT_LABELS.calfVigor[parseInt(vigor)]}`);
  if (selectedNotes.length > 0) detailBits.push(`${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''}`);
  if (isTwin) detailBits.push('Twin');
  if (isGraft) detailBits.push('Graft');
  if (notes) detailBits.push('Memo');

  const handleReset = () => {
    setDamTag(''); setCalfStatus('Alive'); setCalfSex(''); setCalfTag(''); setCalfColor('Yellow');
    setBirthWeight(''); setCalfSize('3'); setIsTwin(false); setTwin({ tag: '', sex: '', color: 'Yellow', weight: '', size: '3' });
    setIsGraft(false); setGraftDam(''); setGraftReason(''); setDeathReason(''); setDeathNotes('');
    setVigor(''); setSelectedNotes([]); setCowTraits({ assistance: '1', disposition: '', udder: '', teat: '', claw: '', foot: '', mothering: '' });
    setNotes(''); setShowDam(false);
  };

  const handleSave = () => {
    if (!damTag.trim()) { showToast("error", "Dam tag required"); return; }
    if (!calfSex) { showToast("error", "Calf sex required"); return; }
    const msg = calfStatus === 'Dead'
      ? `Calving record saved — calf ${calfTag || 'untagged'} marked Dead`
      : `Calving record saved — calf ${calfTag || 'untagged'} added to herd`;
    showToast("success", msg);
    handleReset();
  };

  return (
    <div style={{ padding: '10px 16px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* ═══ 1. CONTEXT BAR ═══ */}
      {!contextOpen ? (
        <button onClick={() => setContextOpen(true)} type="button" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '10px 14px', cursor: 'pointer', border: 'none', borderRadius: 10,
          background: 'linear-gradient(135deg, #0E2646 0%, #163A5E 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{fmtDate}</span>
            <span style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(240,240,240,0.60)' }}>{group}</span>
            <span style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(240,240,240,0.60)' }}>{location}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div style={{ borderRadius: 10, backgroundColor: 'white', border: '1px solid rgba(212,212,208,0.50)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(26,26,26,0.35)', textTransform: 'uppercase' }}>Calving Info</span>
            <button onClick={() => setContextOpen(false)} type="button" style={{ fontSize: 11, fontWeight: 700, color: '#55BAAA', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>Done</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FR label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={IS} /></FR>
            <FR label="Group"><select value={group} onChange={e => setGroup(e.target.value)} style={{ ...IS, appearance: 'auto' as const }}><option>Spring Calvers</option><option>Fall Calvers</option><option>First Calf Heifers</option></select></FR>
            <FR label="Location"><select value={location} onChange={e => setLocation(e.target.value)} style={{ ...IS, appearance: 'auto' as const }}><option>Calving Barn</option><option>Home Place</option><option>East Pasture</option></select></FR>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(26,26,26,0.30)', fontStyle: 'italic', marginTop: 6 }}>Carries forward between entries</div>
        </div>
      )}

      {/* ═══ 2. DAM TAG ═══ */}
      <div style={{ borderRadius: 12, backgroundColor: 'white', border: '1px solid rgba(212,212,208,0.60)', padding: '12px' }}>
        <FR label="Dam Tag">
          <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
            <input type="text" value={damTag} onChange={e => setDamTag(e.target.value)} placeholder="Type dam tag…" style={IS} />
            <button onClick={() => setShowDam(!showDam)} type="button" style={{
              height: 40, padding: '0 14px', borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
              backgroundColor: showDam ? '#E8C820' : '#F3D12A',
              fontSize: 12, fontWeight: 700, color: '#1A1A1A',
              boxShadow: showDam ? 'inset 0 1px 3px rgba(0,0,0,0.15)' : '0 1px 4px rgba(243,209,42,0.30)',
            }}>History</button>
          </div>
        </FR>
      </div>

      {/* Dam panel */}
      {showDam && (
        <div style={{ borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)', padding: '16px' }}>
          {damTag ? (<>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'white', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{damTag}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: '#E8A0BF' }} />
                  <span style={{ fontSize: 12, color: 'rgba(240,240,240,0.45)' }}>Pink · Cow · 2020</span>
                </div>
                <div style={{ fontSize: 11, color: '#A8E6DA', marginTop: 3 }}>Active · 1,187 lbs</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <svg width="18" height="16" viewBox="0 0 32 28" fill="none"><line x1="3" y1="2" x2="3" y2="26" stroke="#55BAAA" strokeWidth="2" strokeLinecap="round" /><path d="M3 3H27L23 9.5L27 16H3V3Z" fill="#55BAAA" /></svg>
                <span style={{ fontSize: 9, fontWeight: 600, color: '#55BAAA' }}>Mgmt</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', marginTop: 10, paddingTop: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(240,240,240,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Recent Calvings</div>
              {[{ tag: '8841', sex: 'Bull', date: 'Mar 2025', wt: '85 lbs' }, { tag: '7503', sex: 'Heifer', date: 'Apr 2024', wt: '72 lbs' }].map(c => (
                <div key={c.tag} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{c.tag}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, borderRadius: 9999, padding: '1px 6px',
                    backgroundColor: c.sex === 'Bull' ? 'rgba(85,186,170,0.15)' : 'rgba(232,160,191,0.20)',
                    color: c.sex === 'Bull' ? '#55BAAA' : '#E8A0BF' }}>{c.sex}</span>
                  <span style={{ fontSize: 11, color: 'rgba(240,240,240,0.35)' }}>{c.date} · {c.wt}</span>
                </div>
              ))}
            </div>
          </>) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}><span style={{ fontSize: 13, color: 'rgba(240,240,240,0.40)' }}>Type a dam tag to load history</span></div>
          )}
        </div>
      )}

      {/* ═══ 3. CALF ═══ */}
      <div style={{ borderRadius: 12, backgroundColor: 'white', border: '1px solid rgba(212,212,208,0.60)', padding: '12px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(26,26,26,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>Calf</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FR label="Calf Tag"><input type="text" value={calfTag} onChange={e => setCalfTag(e.target.value)} placeholder="Tag number" style={IS} /></FR>

          <FR label="Status">
            <Toggle value={calfStatus} onChange={setCalfStatus}
              options={[{ value: 'Alive', label: 'Alive' }, { value: 'Dead', label: 'Dead' }]}
              colors={{ Alive: { bg: '#55BAAA', text: 'white' }, Dead: { bg: '#9B2335', text: 'white' } }} />
          </FR>

          {calfStatus === 'Dead' && (
            <div style={{ backgroundColor: 'rgba(155,35,53,0.06)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(155,35,53,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9B2335', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Death Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <FR label="Cause"><select value={deathReason} onChange={e => setDeathReason(e.target.value)} style={{ ...IS, appearance: 'auto' as const, fontSize: 14, color: deathReason ? '#1A1A1A' : 'rgba(26,26,26,0.35)' }}><option value="">Select cause…</option>{DEATH_REASONS.map(r => <option key={r}>{r}</option>)}</select></FR>
                <FR label="Notes"><input type="text" value={deathNotes} onChange={e => setDeathNotes(e.target.value)} placeholder="Optional…" style={{ ...IS, fontSize: 14 }} /></FR>
              </div>
            </div>
          )}

          <FR label="Sex" req>
            <Toggle value={calfSex} onChange={setCalfSex}
              options={[{ value: 'Bull', label: 'Bull' }, { value: 'Heifer', label: 'Heifer' }]}
              colors={{ Bull: { bg: '#55BAAA', text: 'white' }, Heifer: { bg: '#E8A0BF', text: 'white' } }} />
          </FR>

          <FR label="Tag Color">
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: 9999, backgroundColor: TAG_COLOR_HEX[calfColor] || '#999' }} />
              <select value={calfColor} onChange={e => setCalfColor(e.target.value)} style={{ ...IS, paddingLeft: 30, appearance: 'auto' as const }}>
                {TAG_COLOR_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </FR>

          <FR label="Wt / Size">
            <div style={{ display: 'flex', gap: 0, minWidth: 0 }}>
              <input type="number" value={birthWeight} onChange={e => setBirthWeight(e.target.value)} placeholder="lbs"
                style={{ ...IS, flex: '0 0 72px', borderRadius: '8px 0 0 8px', borderRight: 'none' }} />
              <select value={calfSize} onChange={e => setCalfSize(e.target.value)}
                style={{ ...IS, flex: 1, minWidth: 0, appearance: 'auto' as const, borderRadius: '0 8px 8px 0', color: '#1A1A1A' }}>
                {TRAIT_LABELS.calfSize.slice(1).map((l, i) => <option key={i + 1} value={String(i + 1)}>{l}</option>)}
              </select>
            </div>
          </FR>
        </div>
      </div>

      {/* ═══ 4. DETAILS ═══ */}
      <Collapsible title="Details" badge={detailBits.length > 0 ? detailBits.length.toString() : null}
        collapsedContent={
          detailBits.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {detailBits.map(b => (
                  <span key={b} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999, backgroundColor: 'rgba(14,38,70,0.08)', color: '#0E2646' }}>{b}</span>
                ))}
              </div>
              {selectedNotes.length > 0 && renderNotes(true)}
            </div>
          ) : <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.40)' }}>Vigor, notes, twin, graft</span>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
          <PillScore label="Calf Vigor" value={vigor} onChange={setVigor} labels={TRAIT_LABELS.calfVigor} />
          <div style={{ height: 1, backgroundColor: 'rgba(26,26,26,0.06)' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0E2646', marginBottom: 6 }}>Quick Notes</div>
            {renderNotes(false)}
          </div>
          <div style={{ height: 1, backgroundColor: 'rgba(26,26,26,0.06)' }} />
          <div>
            <FR label="Twin">
              <Toggle value={isTwin ? 'yes' : 'no'} onChange={v => setIsTwin(v === 'yes')} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
            </FR>
            {isTwin && (
              <div style={{ backgroundColor: 'rgba(85,186,170,0.06)', borderRadius: 8, padding: '10px 12px', marginTop: 8, border: '1px solid rgba(85,186,170,0.15)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#55BAAA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Twin Calf</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <FR label="Sex">
                    <Toggle value={twin.sex} onChange={v => setTwin(p => ({ ...p, sex: v }))}
                      options={[{ value: 'Bull', label: 'Bull' }, { value: 'Heifer', label: 'Heifer' }]}
                      colors={{ Bull: { bg: '#55BAAA', text: 'white' }, Heifer: { bg: '#E8A0BF', text: 'white' } }} />
                  </FR>
                  <FR label="Tag"><input type="text" value={twin.tag} onChange={e => setTwin(p => ({ ...p, tag: e.target.value }))} placeholder="Twin tag" style={IS} /></FR>
                  <FR label="Wt / Size">
                    <div style={{ display: 'flex', gap: 0, minWidth: 0 }}>
                      <input type="number" value={twin.weight} onChange={e => setTwin(p => ({ ...p, weight: e.target.value }))} placeholder="lbs" style={{ ...IS, flex: '0 0 72px', borderRadius: '8px 0 0 8px', borderRight: 'none' }} />
                      <select value={twin.size} onChange={e => setTwin(p => ({ ...p, size: e.target.value }))}
                        style={{ ...IS, flex: 1, minWidth: 0, appearance: 'auto' as const, borderRadius: '0 8px 8px 0', color: '#1A1A1A' }}>
                        {TRAIT_LABELS.calfSize.slice(1).map((l, i) => <option key={i + 1} value={String(i + 1)}>{l}</option>)}
                      </select>
                    </div>
                  </FR>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(26,26,26,0.30)', fontStyle: 'italic', marginTop: 6 }}>Saves as second calving record</div>
              </div>
            )}
          </div>
          <div style={{ height: 1, backgroundColor: 'rgba(26,26,26,0.06)' }} />
          <div>
            <FR label="Graft">
              <Toggle value={isGraft ? 'yes' : 'no'} onChange={v => setIsGraft(v === 'yes')} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
            </FR>
            {isGraft && (
              <div style={{ backgroundColor: 'rgba(243,209,42,0.06)', borderRadius: 8, padding: '10px 12px', marginTop: 8, border: '1px solid rgba(243,209,42,0.15)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#B8860B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Graft</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <FR label="Foster Dam"><input type="text" value={graftDam} onChange={e => setGraftDam(e.target.value)} placeholder="Foster dam tag" style={IS} /></FR>
                  <FR label="Reason"><select value={graftReason} onChange={e => setGraftReason(e.target.value)} style={{ ...IS, appearance: 'auto' as const, color: graftReason ? '#1A1A1A' : 'rgba(26,26,26,0.35)' }}><option value="">Select…</option>{GRAFT_REASONS.map(r => <option key={r}>{r}</option>)}</select></FR>
                </div>
              </div>
            )}
          </div>
          <div style={{ height: 1, backgroundColor: 'rgba(26,26,26,0.06)' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0E2646', marginBottom: 6 }}>Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…"
              style={{ width: '100%', minHeight: 56, resize: 'none', borderRadius: 8, padding: '10px 12px', fontSize: 16, border: '1px solid #D4D4D0', backgroundColor: '#F5F5F0', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
      </Collapsible>

      {/* ═══ 5. COW TRAITS ═══ */}
      <Collapsible title="Cow Traits" badge={cowTraitCount > 0 ? `${cowTraitCount}/7` : null}
        collapsedContent={
          cowTraitCount > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingTop: 4 }}>
              {Object.entries(cowTraits).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, backgroundColor: 'rgba(14,38,70,0.08)', color: '#0E2646' }}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}: {TRAIT_LABELS[k as keyof typeof TRAIT_LABELS]?.[parseInt(v)] || v}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4, paddingTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, backgroundColor: 'rgba(14,38,70,0.08)', color: '#0E2646' }}>Assistance: No Assistance</span>
            </div>
          )
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <PillScore label="Assistance" value={cowTraits.assistance} onChange={v => setCowTraits(p => ({ ...p, assistance: v }))} labels={TRAIT_LABELS.assistance} />
          <div style={{ height: 1, backgroundColor: 'rgba(26,26,26,0.06)' }} />
          <TraitPair titleA="Disposition" titleB="Mothering"
            valueA={cowTraits.disposition} valueB={cowTraits.mothering}
            onChangeA={v => setCowTraits(p => ({ ...p, disposition: v }))} onChangeB={v => setCowTraits(p => ({ ...p, mothering: v }))}
            labelsA={TRAIT_LABELS.disposition} labelsB={TRAIT_LABELS.mothering} />
          {showUdderTeat && <TraitPair titleA="Udder" titleB="Teat"
            valueA={cowTraits.udder} valueB={cowTraits.teat}
            onChangeA={v => setCowTraits(p => ({ ...p, udder: v }))} onChangeB={v => setCowTraits(p => ({ ...p, teat: v }))}
            labelsA={TRAIT_LABELS.udder} labelsB={TRAIT_LABELS.teat} />}
          {showClawFoot && <TraitPair titleA="Claw" titleB="Foot"
            valueA={cowTraits.claw} valueB={cowTraits.foot}
            onChangeA={v => setCowTraits(p => ({ ...p, claw: v }))} onChangeB={v => setCowTraits(p => ({ ...p, foot: v }))}
            labelsA={TRAIT_LABELS.claw} labelsB={TRAIT_LABELS.foot} />}
          {(!showUdderTeat || !showClawFoot) && (
            <div style={{ fontSize: 10, color: 'rgba(26,26,26,0.30)', fontStyle: 'italic' }}>
              {!showUdderTeat && 'Udder/Teat disabled. '}{!showClawFoot && 'Claw/Foot disabled. '}Reference → Settings
            </div>
          )}
        </div>
      </Collapsible>

      {/* ═══ 6. ACTIONS ═══ */}
      <div style={{ display: 'flex', gap: 12, paddingTop: 2 }}>
        <button onClick={handleReset} type="button" style={{ flex: 1, padding: '10px 24px', borderRadius: 9999, border: '2px solid #F3D12A', backgroundColor: 'transparent', fontSize: 14, fontWeight: 700, color: '#1A1A1A', cursor: 'pointer', transition: 'all 150ms' }}>Reset</button>
        <button onClick={handleSave} type="button" style={{ flex: 2, padding: '10px 24px', borderRadius: 9999, border: 'none', backgroundColor: '#F3D12A', fontSize: 14, fontWeight: 700, color: '#1A1A1A', cursor: 'pointer', boxShadow: '0 2px 10px rgba(243,209,42,0.35)', transition: 'all 150ms' }}>Save & Next</button>
      </div>
    </div>
  );
}
