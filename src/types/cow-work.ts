export type ProjectStatus = "pending" | "in-progress" | "completed";

export interface Project {
  id: string;
  operation_id: string;
  name: string;
  date: string;
  project_status: string;
  estimated_head: number | null;
  head_count: number | null;
}

export interface MappedProject {
  id: string;
  name: string;
  date: string;
  rawDate: string;
  status: ProjectStatus;
  type: string;
  typeCode: string;
  group: string;
  headCount: number;
  workedCount: number;
}
