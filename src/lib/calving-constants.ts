// ═══ Calving Constants (Build Manual) ═══

export const TRAIT_LABELS = {
  assistance: ['', 'No Assistance', 'Easy Pull', 'Hard Pull', 'C-Section', 'Abnormal Presentation'],
  disposition: ['', 'Docile', 'Restless', 'Nervous', 'Flighty/Excitable', 'Aggressive', 'Very Aggressive'],
  udder: ['', 'Very Pendulous', 'Pendulous', 'Moderate Low', 'Moderate', 'Average', 'Above Average', 'Good', 'Very Good', 'Ideal'],
  teat: ['', 'Very Large', 'Large', 'Moderate Large', 'Moderate', 'Average', 'Above Average', 'Good', 'Very Good', 'Ideal Small'],
  claw: ['', 'Extremely Open/Divergent', 'Open/Divergent', 'Moderately Open', 'Slightly Open', 'Ideal', 'Slight Curl Tendency', 'Curl Tendency', 'Moderate Scissor/Screw', 'Extreme Scissor/Screw'],
  foot: ['', 'Extremely Straight Pasterns', 'Straight Pasterns', 'Moderately Straight', 'Slightly Straight', 'Ideal', 'Slightly Shallow Heel', 'Moderately Shallow Heel', 'Shallow Heel/Long Toe', 'Extremely Shallow/Long'],
  mothering: ['', 'Excellent', 'Good', 'Fair', 'Poor', 'Rejects Calf'],
  calfVigor: ['', 'Excellent', 'Good', 'Fair', 'Poor', 'Dead/Stillborn'],
  calfSize: ['', 'Very Small', 'Small', 'Average', 'Large', 'Very Large'],
} as const;

export interface QuickNoteCalving {
  label: string;
  flag: 'red' | 'gold' | 'teal' | null;
}

export const QUICK_NOTES: QuickNoteCalving[] = [
  { label: 'Cull', flag: 'red' },
  { label: 'Bad Bag', flag: 'gold' },
  { label: 'Bad Feet', flag: 'gold' },
  { label: 'Lame', flag: 'gold' },
  { label: 'Lump Jaw', flag: 'gold' },
  { label: 'Bad Disposition', flag: 'gold' },
  { label: 'Bad Mother', flag: 'gold' },
  { label: 'Old', flag: 'gold' },
  { label: 'Poor Calf', flag: 'gold' },
  { label: 'Poor Condition', flag: 'gold' },
  { label: 'Needs Tag', flag: 'teal' },
  { label: 'DNA', flag: 'teal' },
  { label: 'Needs Treated', flag: 'teal' },
  { label: 'Sorted', flag: null },
  { label: 'Treated', flag: null },
  { label: 'Twin', flag: null },
  { label: 'Freemartin', flag: null },
];

export const QUICK_NOTE_PILL_COLORS: Record<string, { bg: string; border: string; text: string; bgSel: string; borderSel: string }> = {
  red:  { bg: 'rgba(155,35,53,0.12)',  border: 'rgba(155,35,53,0.25)',  text: '#9B2335', bgSel: 'rgba(155,35,53,0.25)',  borderSel: '#9B2335' },
  gold: { bg: 'rgba(243,209,42,0.12)', border: 'rgba(243,209,42,0.30)', text: '#B8860B', bgSel: 'rgba(243,209,42,0.25)', borderSel: '#B8860B' },
  teal: { bg: 'rgba(85,186,170,0.12)', border: 'rgba(85,186,170,0.25)', text: '#55BAAA', bgSel: 'rgba(85,186,170,0.25)', borderSel: '#55BAAA' },
  none: { bg: '#F5F5F0',               border: '#D4D4D0',               text: 'rgba(26,26,26,0.55)', bgSel: '#E8E8E4', borderSel: '#AAAAAA' },
};

export const DEATH_REASONS = ['Stillborn', 'Dystocia', 'Scours', 'Pneumonia', 'Exposure/Weather', 'Predator', 'Birth Defect', 'Crushed by Dam', 'Unknown', 'Other'] as const;

export const GRAFT_REASONS = ['Dam Died', 'Rejected Calf', 'No Milk', 'Twin', 'Other'] as const;
