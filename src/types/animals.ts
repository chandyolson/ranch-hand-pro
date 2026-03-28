export type AnimalSex = "Bull" | "Cow" | "Heifer" | "Steer";
export type AnimalType = "Cow" | "Bull" | "Calf" | "Feeder" | "Replacement";
export type AnimalStatus = "Active" | "Sold" | "Dead" | "Culled";
export type TagColor =
  | "Red" | "Yellow" | "Green" | "White"
  | "Orange" | "Blue" | "Purple" | "Pink" | "None";

export interface Animal {
  id: string;
  operation_id: string;
  tag: string;
  tag_color: TagColor | null;
  eid: string | null;
  sex: AnimalSex;
  type: AnimalType | null;
  breed: string | null;
  year_born: number | null;
  status: AnimalStatus;
  lifetime_id: string | null;
  reg_name: string | null;
  reg_number: string | null;
  memo: string | null;
}

export interface AnimalCounts {
  total: number;
  active: number;
  cows: number;
  bulls: number;
}
