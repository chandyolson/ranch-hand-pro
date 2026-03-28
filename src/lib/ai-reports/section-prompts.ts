export interface ReportSection {
  id: string;
  label: string;
  description: string;
  promptBuilder: (config: ReportConfig) => string;
}

export interface ReportConfig {
  title: string;
  dateStart: string;
  dateEnd: string;
  groupFilter: string; // 'all' or group id
  groupName: string;
  includeCharts: boolean;
  includeTables: boolean;
  operationId: string;
  operationName: string;
}

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'herd_inventory',
    label: 'Herd Inventory Summary',
    description: 'Active head count by type, breed, status, and sex',
    promptBuilder: (c) =>
      `Give me a herd inventory summary for operation ${c.operationId}. Show active head count broken down by type (Cow, Bull, Heifer, Calf, Replacement), by breed, by status, and by sex. ${c.groupFilter !== 'all' ? `Filter to group ${c.groupName}.` : ''} Return a stacked bar chart of head count by type with sex as the stack. Also return a table with columns: Type, Breed, Count.`,
  },
  {
    id: 'preg_check',
    label: 'Pregnancy Check Results',
    description: 'Preg stage breakdown, open cow list, conception rates',
    promptBuilder: (c) =>
      `Show pregnancy check results for operation ${c.operationId} from ${c.dateStart} to ${c.dateEnd}. Show preg stage breakdown from the most recent PREG project. ${c.groupFilter !== 'all' ? `Filter to group ${c.groupName}.` : ''} Return a pie chart of preg stages and a table of all Open animals with columns: Tag, Tag Color, Year Born, Group.`,
  },
  {
    id: 'calving_summary',
    label: 'Calving Season Summary',
    description: 'Total born, death loss, birth weights, calving ease, sire breakdown',
    promptBuilder: (c) =>
      `Give me a calving season summary for operation ${c.operationId} from ${c.dateStart} to ${c.dateEnd}. ${c.groupFilter !== 'all' ? `Filter to group ${c.groupName}.` : ''} Include total born, death loss count and %, average birth weight, average assistance score, and sire breakdown. Return a bar chart of average birth weight by sire tag. Return a table of death loss details: Dam Tag, Calving Date, Death Explanation.`,
  },
  {
    id: 'sire_performance',
    label: 'Sire Performance Comparison',
    description: 'Birth weight, calving ease, and calf count by sire',
    promptBuilder: (c) =>
      `Compare sire performance for operation ${c.operationId} from ${c.dateStart} to ${c.dateEnd}. ${c.groupFilter !== 'all' ? `Filter to group ${c.groupName}.` : ''} Group calving records by sire. Return a bar chart comparing sires on avg birth weight and assistance rate. Return a table: Sire Tag, Total Calves, Avg Weight, Assist %, Dead Count.`,
  },
  {
    id: 'bse_results',
    label: 'Bull BSE Results',
    description: 'Pass/fail summary, individual bull results',
    promptBuilder: (c) =>
      `Show bull BSE results for operation ${c.operationId} from ${c.dateStart} to ${c.dateEnd}. Return a pie chart of pass/fail/marginal counts. Return a table: Tag, Year Born, Scrotal, Motility, Morphology, Pass/Fail.`,
  },
  {
    id: 'treatment_summary',
    label: 'Treatment Summary',
    description: 'Treatments by disease, by animal, by month',
    promptBuilder: (c) =>
      `Show treatment summary for operation ${c.operationId} from ${c.dateStart} to ${c.dateEnd}. ${c.groupFilter !== 'all' ? `Filter to group ${c.groupName}.` : ''} Return a bar chart of treatment count by disease. Return a table of animals with 2+ treatments: Tag, Disease, Treatment Count.`,
  },
  {
    id: 'active_flags',
    label: 'Active Flags Report',
    description: 'All active flags by tier with animal details',
    promptBuilder: (c) =>
      `Show all active flags for operation ${c.operationId}. Return a pie chart by flag tier. Return a table: Tag, Tag Color, Breed, Year Born, Flag Tier, Flag Name, Flag Note, Date Created.`,
  },
  {
    id: 'age_distribution',
    label: 'Herd Age Distribution',
    description: 'Age breakdown of active cows and bulls',
    promptBuilder: (c) =>
      `Show age distribution of active cows and bulls for operation ${c.operationId}. Calculate age from year_born. Return a bar chart of head count by age. ${c.groupFilter !== 'all' ? `Filter to group ${c.groupName}.` : ''}`,
  },
  {
    id: 'breeding_summary',
    label: 'Breeding Summary',
    description: 'AI breeding results, sire usage, estrus status',
    promptBuilder: (c) =>
      `Show breeding summary for operation ${c.operationId} from ${c.dateStart} to ${c.dateEnd}. Show cow count by breeding sire from BREED or AI projects. Return a bar chart of cow count by breeding sire tag. Return a table: Breeding Sire, Count Bred, Estrus Status Breakdown.`,
  },
  {
    id: 'cull_candidates',
    label: 'Cull Candidate List',
    description: 'Animals flagged for cull plus AI-recommended cull candidates',
    promptBuilder: (c) =>
      `Show cull candidates for operation ${c.operationId}. Include animals with active cull flags, repeat open cows, and chronic treatment animals. Return a table: Tag, Breed, Year Born, Reason, Supporting Data.`,
  },
];

export const QUICK_REPORTS: { label: string; sectionIds: string[] }[] = [
  { label: 'Annual Herd Report', sectionIds: ['herd_inventory', 'preg_check', 'calving_summary', 'sire_performance', 'age_distribution'] },
  { label: 'Calving Season Report', sectionIds: ['calving_summary', 'sire_performance', 'treatment_summary'] },
  { label: 'Bull Report', sectionIds: ['bse_results', 'breeding_summary', 'sire_performance'] },
];
