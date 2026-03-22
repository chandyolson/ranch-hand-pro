export interface SaleDay {
  id: string;
  operation_id: string;
  date: string;
  status: 'scheduled' | 'active' | 'completed';
  vet_crew: string | null;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  sale_day_id: string;
  customer_id: string | null;
  entity_type: 'seller' | 'buyer';
  buyer_num: string | null;
  work_type: string;
  animal_type: string | null;
  pens: string[];
  head_count: number;
  vet_charge: number;
  admin_charge: number;
  sol_charge: number;
  tax_charge: number;
  total_charge: number;
  special_lump_sum: number;
  work_complete: boolean;
  health_complete: boolean;
  group_notes: string | null;
  created_at: string;
}

export interface WorkOrderNote {
  id: string;
  work_order_id: string;
  author: string;
  text: string;
  is_flagged: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface SaleBarnAnimal {
  id: string;
  work_order_id: string;
  eid: string;
  back_tag: string | null;
  eid_2: string | null;
  tag_number: string | null;
  designation_key: string | null;
  preg_status: string | null;
  sex: string | null;
  breed: string | null;
  quick_notes: string[];
  sorted: boolean;
  sort_dest_pen: string | null;
  created_at: string;
}

export interface SaleBarnCustomer {
  id: string;
  operation_id: string;
  name: string;
  state: string | null;
  phone: string | null;
  address: string | null;
  type: 'Seller' | 'Buyer' | 'Both' | null;
  notes: string | null;
  last_import: string | null;
}

export interface BuyerDirectoryEntry {
  id: string;
  operation_id: string;
  buyer_num: string;
  name: string;
  state: string | null;
  phone: string | null;
  type: string | null;
  description: string | null;
  needs: string | null;
  notes: string | null;
  created_at: string;
}

export interface SaleBarnPrice {
  id: string;
  operation_id: string;
  work_type: string;
  sol_charge: number;
  vet_charge: number;
  admin_pct: number;
  tax_rate: number;
  is_special: boolean;
  created_at: string;
}

export interface DesignationKey {
  id: string;
  operation_id: string;
  label: string;
  hex_color: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Consignment {
  id: string;
  operation_id: string;
  sale_day_id: string | null;
  customer_id: string | null;
  customer_name: string;
  head_count: number;
  animal_type: string | null;
  notes: string | null;
  taken_by: string | null;
  status: 'pending' | 'arrived' | 'converted' | 'cancelled';
  expected_sale_date: string | null;
  created_at: string;
}

export interface SortRecord {
  id: string;
  animal_id: string;
  source_pen: string;
  dest_pen: string;
  work_order_id: string | null;
  created_at: string;
}
