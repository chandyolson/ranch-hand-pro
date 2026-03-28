export const HERDWORK_FIELDS = [
  { value: 'tag', label: 'Tag' },
  { value: 'tag_color', label: 'Tag Color' },
  { value: 'eid', label: 'EID' },
  { value: 'sex', label: 'Sex' },
  { value: 'type', label: 'Type' },
  { value: 'breed', label: 'Breed' },
  { value: 'year_born', label: 'Year Born' },
  { value: 'birth_date', label: 'Birth Date' },
  { value: 'weight', label: 'Weight' },
  { value: 'status', label: 'Status' },
  { value: 'sire_tag', label: 'Sire Tag' },
  { value: 'dam_tag', label: 'Dam Tag' },
  { value: 'preg_stage', label: 'Preg Stage' },
  { value: 'memo', label: 'Notes' },
  { value: 'reg_number', label: 'Registration Number' },
  { value: 'reg_name', label: 'Registration Name' },
  { value: '__skip__', label: '— Skip —' },
] as const;

const ALIAS_MAP: Record<string, string> = {
  'tag': 'tag',
  'visual tag': 'tag',
  'visual_tag': 'tag',
  'tag number': 'tag',
  'tag_number': 'tag',
  'animal tag': 'tag',
  'ear tag': 'tag',
  'tag color': 'tag_color',
  'tag_color': 'tag_color',
  'tagcolor': 'tag_color',
  'color': 'tag_color',
  'eid': 'eid',
  'electronic id': 'eid',
  'rfid': 'eid',
  'sex': 'sex',
  'gender': 'sex',
  'type': 'type',
  'animal type': 'type',
  'category': 'type',
  'breed': 'breed',
  'breed name': 'breed',
  'year born': 'year_born',
  'year_born': 'year_born',
  'yearborn': 'year_born',
  'birth year': 'year_born',
  'born': 'year_born',
  'birth date': 'birth_date',
  'birth_date': 'birth_date',
  'birthdate': 'birth_date',
  'dob': 'birth_date',
  'date of birth': 'birth_date',
  'weight': 'weight',
  'wt': 'weight',
  'status': 'status',
  'sire': 'sire_tag',
  'sire tag': 'sire_tag',
  'sire_tag': 'sire_tag',
  'dam': 'dam_tag',
  'dam tag': 'dam_tag',
  'dam_tag': 'dam_tag',
  'preg': 'preg_stage',
  'preg stage': 'preg_stage',
  'preg_stage': 'preg_stage',
  'pregnancy': 'preg_stage',
  'notes': 'memo',
  'memo': 'memo',
  'comments': 'memo',
  'registration number': 'reg_number',
  'reg number': 'reg_number',
  'reg_number': 'reg_number',
  'registration': 'reg_number',
  'reg no': 'reg_number',
  'registration name': 'reg_name',
  'reg name': 'reg_name',
  'reg_name': 'reg_name',
  'registered name': 'reg_name',
};

export function guessMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    const match = ALIAS_MAP[normalized];
    if (match && !usedFields.has(match)) {
      mapping[header] = match;
      usedFields.add(match);
    } else {
      mapping[header] = '__skip__';
    }
  }
  return mapping;
}
