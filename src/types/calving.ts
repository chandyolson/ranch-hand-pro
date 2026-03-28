export type CalfSex = "Bull" | "Heifer" | "Unknown";
export type CalfStatus = "Alive" | "Dead";
export type AssistanceLevel = "None" | "Easy Pull" | "Hard Pull" | "C-Section";

export interface CalvingRecord {
  id: string;
  operation_id: string;
  dam_id: string | null;
  calf_id: string | null;
  calf_tag: string | null;
  calving_date: string;
  calf_sex: CalfSex | null;
  calf_status: CalfStatus | null;
  birth_weight: number | null;
  /** 1 = None, 2 = Easy Pull, 3 = Hard Pull, 4 = C-Section */
  assistance: 1 | 2 | 3 | 4 | null;
  memo: string | null;
}

export interface CalvingCounts {
  total: number;
  alive: number;
  dead: number;
}
