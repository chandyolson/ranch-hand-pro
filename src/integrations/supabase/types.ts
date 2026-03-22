export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      animal_flags: {
        Row: {
          animal_id: string
          created_at: string | null
          expires_at: string | null
          flag_name: string
          flag_note: string | null
          flag_tier: string
          id: string
          operation_id: string
          resolved_at: string | null
          set_by: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          expires_at?: string | null
          flag_name: string
          flag_note?: string | null
          flag_tier: string
          id?: string
          operation_id: string
          resolved_at?: string | null
          set_by?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          expires_at?: string | null
          flag_name?: string
          flag_note?: string | null
          flag_tier?: string
          id?: string
          operation_id?: string
          resolved_at?: string | null
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_flags_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_flags_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_groups: {
        Row: {
          animal_id: string
          created_at: string | null
          end_date: string | null
          group_id: string
          id: string
          operation_id: string
          source: string | null
          source_ref: string | null
          start_date: string
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          end_date?: string | null
          group_id: string
          id?: string
          operation_id: string
          source?: string | null
          source_ref?: string | null
          start_date?: string
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          end_date?: string | null
          group_id?: string
          id?: string
          operation_id?: string
          source?: string | null
          source_ref?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_groups_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_groups_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_ids: {
        Row: {
          animal_id: string
          created_at: string | null
          id: string
          id_type: string
          id_value: string
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          id?: string
          id_type: string
          id_value: string
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          id?: string
          id_type?: string
          id_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_ids_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          birth_date: string | null
          breed: string | null
          bull_role: string[] | null
          calf_tag: string | null
          characteristics: Json | null
          created_at: string | null
          created_by: string | null
          dam_id: string | null
          eid: string | null
          eid2: string | null
          id: string
          lifetime_id: string | null
          memo: string | null
          modified_by: string | null
          name: string | null
          official_id: string | null
          operation_id: string
          origin: string | null
          quick_notes: string[] | null
          reg_name: string | null
          reg_number: string | null
          registered: boolean | null
          sex: string
          sire_id: string | null
          status: string
          tag: string
          tag_code: string | null
          tag_color: string | null
          type: string | null
          updated_at: string | null
          year_born: number | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          bull_role?: string[] | null
          calf_tag?: string | null
          characteristics?: Json | null
          created_at?: string | null
          created_by?: string | null
          dam_id?: string | null
          eid?: string | null
          eid2?: string | null
          id?: string
          lifetime_id?: string | null
          memo?: string | null
          modified_by?: string | null
          name?: string | null
          official_id?: string | null
          operation_id: string
          origin?: string | null
          quick_notes?: string[] | null
          reg_name?: string | null
          reg_number?: string | null
          registered?: boolean | null
          sex: string
          sire_id?: string | null
          status?: string
          tag: string
          tag_code?: string | null
          tag_color?: string | null
          type?: string | null
          updated_at?: string | null
          year_born?: number | null
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          bull_role?: string[] | null
          calf_tag?: string | null
          characteristics?: Json | null
          created_at?: string | null
          created_by?: string | null
          dam_id?: string | null
          eid?: string | null
          eid2?: string | null
          id?: string
          lifetime_id?: string | null
          memo?: string | null
          modified_by?: string | null
          name?: string | null
          official_id?: string | null
          operation_id?: string
          origin?: string | null
          quick_notes?: string[] | null
          reg_name?: string | null
          reg_number?: string | null
          registered?: boolean | null
          sex?: string
          sire_id?: string | null
          status?: string
          tag?: string
          tag_code?: string | null
          tag_color?: string | null
          type?: string | null
          updated_at?: string | null
          year_born?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_protocol_events: {
        Row: {
          actual_head_count: number | null
          assigned_protocol_id: string
          completed_date: string | null
          completion_notes: string | null
          created_at: string | null
          estimated_cost: number | null
          event_name: string
          event_status: string | null
          id: string
          project_id: string | null
          recommended_products: Json | null
          scheduled_date: string | null
          template_event_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_head_count?: number | null
          assigned_protocol_id: string
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          event_name: string
          event_status?: string | null
          id?: string
          project_id?: string | null
          recommended_products?: Json | null
          scheduled_date?: string | null
          template_event_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_head_count?: number | null
          assigned_protocol_id?: string
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          event_name?: string
          event_status?: string | null
          id?: string
          project_id?: string | null
          recommended_products?: Json | null
          scheduled_date?: string | null
          template_event_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_protocol_events_assigned_protocol_id_fkey"
            columns: ["assigned_protocol_id"]
            isOneToOne: false
            referencedRelation: "assigned_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_protocol_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_protocol_events_template_event_id_fkey"
            columns: ["template_event_id"]
            isOneToOne: false
            referencedRelation: "protocol_template_events"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_protocols: {
        Row: {
          animal_class: string
          client_operation_id: string | null
          created_at: string | null
          created_by: string | null
          estimated_head_count: number | null
          group_id: string | null
          id: string
          notes: string | null
          operation_id: string
          protocol_status: string | null
          protocol_year: number | null
          start_date: string | null
          template_id: string | null
          total_estimated_cost: number | null
          updated_at: string | null
        }
        Insert: {
          animal_class: string
          client_operation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_head_count?: number | null
          group_id?: string | null
          id?: string
          notes?: string | null
          operation_id: string
          protocol_status?: string | null
          protocol_year?: number | null
          start_date?: string | null
          template_id?: string | null
          total_estimated_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          animal_class?: string
          client_operation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_head_count?: number | null
          group_id?: string | null
          id?: string
          notes?: string | null
          operation_id?: string
          protocol_status?: string | null
          protocol_year?: number | null
          start_date?: string | null
          template_id?: string | null
          total_estimated_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_protocols_client_operation_id_fkey"
            columns: ["client_operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_protocols_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_protocols_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_protocols_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vaccination_protocol_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      breeds: {
        Row: {
          breed_type: string | null
          characteristics: string | null
          coat_color: string | null
          created_at: string | null
          frame_size: string | null
          id: string
          name: string
          origin: string | null
        }
        Insert: {
          breed_type?: string | null
          characteristics?: string | null
          coat_color?: string | null
          created_at?: string | null
          frame_size?: string | null
          id?: string
          name: string
          origin?: string | null
        }
        Update: {
          breed_type?: string | null
          characteristics?: string | null
          coat_color?: string | null
          created_at?: string | null
          frame_size?: string | null
          id?: string
          name?: string
          origin?: string | null
        }
        Relationships: []
      }
      buyer_directory: {
        Row: {
          buyer_num: string
          created_at: string
          description: string | null
          id: string
          name: string
          needs: string | null
          notes: string | null
          operation_id: string
          phone: string | null
          state: string | null
          type: string | null
        }
        Insert: {
          buyer_num: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          needs?: string | null
          notes?: string | null
          operation_id: string
          phone?: string | null
          state?: string | null
          type?: string | null
        }
        Update: {
          buyer_num?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          needs?: string | null
          notes?: string | null
          operation_id?: string
          phone?: string | null
          state?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_directory_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      calving_records: {
        Row: {
          assistance: number | null
          birth_weight: number | null
          calf_id: string | null
          calf_sex: string | null
          calf_size: number | null
          calf_status: string | null
          calf_tag: string | null
          calf_tag_color: string | null
          calf_vigor: number | null
          calving_date: string
          claw: number | null
          created_at: string | null
          created_by: string | null
          dam_id: string
          death_explanation: string | null
          disposition: number | null
          embryo_dam_id: string | null
          foot: number | null
          group_id: string | null
          id: string
          is_embryo: boolean | null
          location_id: string | null
          memo: string | null
          mothering: number | null
          operation_id: string
          quick_notes: string[] | null
          sire_id: string | null
          teat: number | null
          udder: number | null
        }
        Insert: {
          assistance?: number | null
          birth_weight?: number | null
          calf_id?: string | null
          calf_sex?: string | null
          calf_size?: number | null
          calf_status?: string | null
          calf_tag?: string | null
          calf_tag_color?: string | null
          calf_vigor?: number | null
          calving_date: string
          claw?: number | null
          created_at?: string | null
          created_by?: string | null
          dam_id: string
          death_explanation?: string | null
          disposition?: number | null
          embryo_dam_id?: string | null
          foot?: number | null
          group_id?: string | null
          id?: string
          is_embryo?: boolean | null
          location_id?: string | null
          memo?: string | null
          mothering?: number | null
          operation_id: string
          quick_notes?: string[] | null
          sire_id?: string | null
          teat?: number | null
          udder?: number | null
        }
        Update: {
          assistance?: number | null
          birth_weight?: number | null
          calf_id?: string | null
          calf_sex?: string | null
          calf_size?: number | null
          calf_status?: string | null
          calf_tag?: string | null
          calf_tag_color?: string | null
          calf_vigor?: number | null
          calving_date?: string
          claw?: number | null
          created_at?: string | null
          created_by?: string | null
          dam_id?: string
          death_explanation?: string | null
          disposition?: number | null
          embryo_dam_id?: string | null
          foot?: number | null
          group_id?: string | null
          id?: string
          is_embryo?: boolean | null
          location_id?: string | null
          memo?: string | null
          mothering?: number | null
          operation_id?: string
          quick_notes?: string[] | null
          sire_id?: string | null
          teat?: number | null
          udder?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calving_records_calf_id_fkey"
            columns: ["calf_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_embryo_dam_id_fkey"
            columns: ["embryo_dam_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      calving_trait_definitions: {
        Row: {
          description: string | null
          id: string
          label: string
          max_score: number
          min_score: number
          score: number
          trait_name: string
        }
        Insert: {
          description?: string | null
          id?: string
          label: string
          max_score: number
          min_score: number
          score: number
          trait_name: string
        }
        Update: {
          description?: string | null
          id?: string
          label?: string
          max_score?: number
          min_score?: number
          score?: number
          trait_name?: string
        }
        Relationships: []
      }
      consignments: {
        Row: {
          animal_type: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          expected_sale_date: string | null
          head_count: number
          id: string
          notes: string | null
          operation_id: string
          sale_day_id: string | null
          status: string
          taken_by: string | null
        }
        Insert: {
          animal_type?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          expected_sale_date?: string | null
          head_count?: number
          id?: string
          notes?: string | null
          operation_id: string
          sale_day_id?: string | null
          status?: string
          taken_by?: string | null
        }
        Update: {
          animal_type?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          expected_sale_date?: string | null
          head_count?: number
          id?: string
          notes?: string | null
          operation_id?: string
          sale_day_id?: string | null
          status?: string
          taken_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "sale_barn_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignments_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignments_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_days"
            referencedColumns: ["id"]
          },
        ]
      }
      cow_work: {
        Row: {
          additional_products: Json | null
          animal_id: string
          breeding_sire_id: string | null
          bse_memo: string | null
          created_at: string | null
          created_by: string | null
          date: string
          days_of_gestation: number | null
          dna: string | null
          embryo_donor_id: string | null
          estrus_status: string | null
          fetal_sex: string | null
          flex_data: Json | null
          id: string
          is_new_animal: boolean | null
          memo: string | null
          morph_desc: string | null
          morphology: number | null
          motility: number | null
          motility_desc: string | null
          operation_id: string
          other_tag: string | null
          pass_fail: string | null
          pen_lot: string | null
          physical_defects: string[] | null
          preg_stage: string | null
          project_id: string | null
          quality: string | null
          quick_notes: string[] | null
          record_order: number | null
          sample_id: string | null
          scrotal: number | null
          semen_defects: string[] | null
          tag_color2: string | null
          technician_id: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          additional_products?: Json | null
          animal_id: string
          breeding_sire_id?: string | null
          bse_memo?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          days_of_gestation?: number | null
          dna?: string | null
          embryo_donor_id?: string | null
          estrus_status?: string | null
          fetal_sex?: string | null
          flex_data?: Json | null
          id?: string
          is_new_animal?: boolean | null
          memo?: string | null
          morph_desc?: string | null
          morphology?: number | null
          motility?: number | null
          motility_desc?: string | null
          operation_id: string
          other_tag?: string | null
          pass_fail?: string | null
          pen_lot?: string | null
          physical_defects?: string[] | null
          preg_stage?: string | null
          project_id?: string | null
          quality?: string | null
          quick_notes?: string[] | null
          record_order?: number | null
          sample_id?: string | null
          scrotal?: number | null
          semen_defects?: string[] | null
          tag_color2?: string | null
          technician_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          additional_products?: Json | null
          animal_id?: string
          breeding_sire_id?: string | null
          bse_memo?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          days_of_gestation?: number | null
          dna?: string | null
          embryo_donor_id?: string | null
          estrus_status?: string | null
          fetal_sex?: string | null
          flex_data?: Json | null
          id?: string
          is_new_animal?: boolean | null
          memo?: string | null
          morph_desc?: string | null
          morphology?: number | null
          motility?: number | null
          motility_desc?: string | null
          operation_id?: string
          other_tag?: string | null
          pass_fail?: string | null
          pen_lot?: string | null
          physical_defects?: string[] | null
          preg_stage?: string | null
          project_id?: string | null
          quality?: string | null
          quick_notes?: string[] | null
          record_order?: number | null
          sample_id?: string | null
          scrotal?: number | null
          semen_defects?: string[] | null
          tag_color2?: string | null
          technician_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cow_work_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cow_work_breeding_sire_id_fkey"
            columns: ["breeding_sire_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cow_work_embryo_donor_id_fkey"
            columns: ["embryo_donor_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cow_work_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cow_work_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cow_work_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      designation_keys: {
        Row: {
          created_at: string
          description: string | null
          hex_color: string
          id: string
          label: string
          operation_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          hex_color: string
          id?: string
          label: string
          operation_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          hex_color?: string
          id?: string
          label?: string
          operation_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "designation_keys_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      diseases: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          cattle_type: string
          created_at: string | null
          description: string | null
          group_type: string
          id: string
          is_active: boolean
          name: string
          operation_id: string
        }
        Insert: {
          cattle_type?: string
          created_at?: string | null
          description?: string | null
          group_type?: string
          id?: string
          is_active?: boolean
          name: string
          operation_id: string
        }
        Update: {
          cattle_type?: string
          created_at?: string | null
          description?: string | null
          group_type?: string
          id?: string
          is_active?: boolean
          name?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      id_history: {
        Row: {
          animal_id: string
          changed_at: string | null
          changed_by: string | null
          field_name: string
          id: string
          new_value: string
          old_value: string | null
          operation_id: string
        }
        Insert: {
          animal_id: string
          changed_at?: string | null
          changed_by?: string | null
          field_name: string
          id?: string
          new_value: string
          old_value?: string | null
          operation_id: string
        }
        Update: {
          animal_id?: string
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string
          old_value?: string | null
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "id_history_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "id_history_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          coordinates: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          location_type: string
          name: string
          operation_id: string
          parent_location_id: string | null
        }
        Insert: {
          coordinates?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          location_type: string
          name: string
          operation_id: string
          parent_location_id?: string | null
        }
        Update: {
          coordinates?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          operation_id?: string
          parent_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          created_at: string | null
          focus: string | null
          id: string
          name: string
          use_status: boolean
        }
        Insert: {
          created_at?: string | null
          focus?: string | null
          id?: string
          name: string
          use_status?: boolean
        }
        Update: {
          created_at?: string | null
          focus?: string | null
          id?: string
          name?: string
          use_status?: boolean
        }
        Relationships: []
      }
      operation_preferences: {
        Row: {
          calf_tag_default_color: string | null
          calf_tag_next_seq: number
          calf_tag_pattern: string | null
          calf_tag_seq_padding: number
          calf_tag_seq_year: number | null
          calf_tag_system: string
          created_at: string | null
          id: string
          lifetime_id_next_seq: number
          lifetime_id_pattern: string | null
          lifetime_id_prefix: string | null
          operation_id: string
          preferred_breeds: string[] | null
          preferred_diseases: string[] | null
          preferred_preg_stages: string[] | null
          updated_at: string | null
          use_year_tag_system: boolean
          year_letter_map: Json
        }
        Insert: {
          calf_tag_default_color?: string | null
          calf_tag_next_seq?: number
          calf_tag_pattern?: string | null
          calf_tag_seq_padding?: number
          calf_tag_seq_year?: number | null
          calf_tag_system?: string
          created_at?: string | null
          id?: string
          lifetime_id_next_seq?: number
          lifetime_id_pattern?: string | null
          lifetime_id_prefix?: string | null
          operation_id: string
          preferred_breeds?: string[] | null
          preferred_diseases?: string[] | null
          preferred_preg_stages?: string[] | null
          updated_at?: string | null
          use_year_tag_system?: boolean
          year_letter_map?: Json
        }
        Update: {
          calf_tag_default_color?: string | null
          calf_tag_next_seq?: number
          calf_tag_pattern?: string | null
          calf_tag_seq_padding?: number
          calf_tag_seq_year?: number | null
          calf_tag_system?: string
          created_at?: string | null
          id?: string
          lifetime_id_next_seq?: number
          lifetime_id_pattern?: string | null
          lifetime_id_prefix?: string | null
          operation_id?: string
          preferred_breeds?: string[] | null
          preferred_diseases?: string[] | null
          preferred_preg_stages?: string[] | null
          updated_at?: string | null
          use_year_tag_system?: boolean
          year_letter_map?: Json
        }
        Relationships: [
          {
            foreignKeyName: "operation_preferences_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: true
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_products: {
        Row: {
          created_at: string | null
          custom_dosage: string | null
          custom_price: number | null
          id: string
          is_favorite: boolean
          operation_id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          custom_dosage?: string | null
          custom_price?: number | null
          id?: string
          is_favorite?: boolean
          operation_id: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          custom_dosage?: string | null
          custom_price?: number | null
          id?: string
          is_favorite?: boolean
          operation_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_products_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_teams: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          operation_id: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          operation_id: string
          user_id: string
          user_type?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          operation_id?: string
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_teams_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          address: Json | null
          claimed: boolean
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          logo_url: string | null
          name: string
          operation_type: string
          owner_name: string | null
          phone: string | null
          premise_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          logo_url?: string | null
          name: string
          operation_type?: string
          owner_name?: string | null
          phone?: string | null
          premise_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          operation_type?: string
          owner_name?: string | null
          phone?: string | null
          premise_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          invitation_type: string
          invited_by: string
          invited_email: string
          operation_id: string
          status: string
          token: string
          user_type: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_type?: string
          invited_by: string
          invited_email: string
          operation_id: string
          status?: string
          token?: string
          user_type?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_type?: string
          invited_by?: string
          invited_email?: string
          operation_id?: string
          status?: string
          token?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      preg_stages: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          operation_id: string
          sort_order: number | null
          stage_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          operation_id: string
          sort_order?: number | null
          stage_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          operation_id?: string
          sort_order?: number | null
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "preg_stages_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          barcode: string | null
          cost_per_dose: number | null
          created_at: string | null
          doses_per_unit: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          ndc: string | null
          product_id: string
          qb_item_name: string | null
          qb_sku: string | null
          size_label: string
          size_unit: string | null
          size_value: number | null
          sort_order: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          cost_per_dose?: number | null
          created_at?: string | null
          doses_per_unit?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          ndc?: string | null
          product_id: string
          qb_item_name?: string | null
          qb_sku?: string | null
          size_label: string
          size_unit?: string | null
          size_value?: number | null
          sort_order?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          cost_per_dose?: number | null
          created_at?: string | null
          doses_per_unit?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          ndc?: string | null
          product_id?: string
          qb_item_name?: string | null
          qb_sku?: string | null
          size_label?: string
          size_unit?: string | null
          size_value?: number | null
          sort_order?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          aliases: string[] | null
          created_at: string | null
          description: string | null
          dosage: string | null
          dosage_by_weight: Json | null
          id: string
          image_url: string | null
          injection_site: string | null
          manufacturer_id: string | null
          milk_withdrawal: string | null
          name: string
          ndc: string | null
          nonprop_name: string | null
          product_info: string | null
          product_type: string
          route: string | null
          slaughter_withdrawal: string | null
          species_approvals: string[] | null
          storage_requirements: string | null
          subcategory: string | null
          unit_of_measure: string | null
          updated_at: string | null
          use_status: boolean
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string | null
          description?: string | null
          dosage?: string | null
          dosage_by_weight?: Json | null
          id?: string
          image_url?: string | null
          injection_site?: string | null
          manufacturer_id?: string | null
          milk_withdrawal?: string | null
          name: string
          ndc?: string | null
          nonprop_name?: string | null
          product_info?: string | null
          product_type: string
          route?: string | null
          slaughter_withdrawal?: string | null
          species_approvals?: string[] | null
          storage_requirements?: string | null
          subcategory?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          use_status?: boolean
        }
        Update: {
          aliases?: string[] | null
          created_at?: string | null
          description?: string | null
          dosage?: string | null
          dosage_by_weight?: Json | null
          id?: string
          image_url?: string | null
          injection_site?: string | null
          manufacturer_id?: string | null
          milk_withdrawal?: string | null
          name?: string
          ndc?: string | null
          nonprop_name?: string | null
          product_info?: string | null
          product_type?: string
          route?: string | null
          slaughter_withdrawal?: string | null
          species_approvals?: string[] | null
          storage_requirements?: string | null
          subcategory?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          use_status?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expected_animals: {
        Row: {
          animal_id: string
          created_at: string | null
          id: string
          project_id: string
          status: string
          worked_record_id: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          id?: string
          project_id: string
          status?: string
          worked_record_id?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          id?: string
          project_id?: string
          status?: string
          worked_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_expected_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expected_animals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expected_animals_worked_record_id_fkey"
            columns: ["worked_record_id"]
            isOneToOne: false
            referencedRelation: "cow_work"
            referencedColumns: ["id"]
          },
        ]
      }
      project_products: {
        Row: {
          created_at: string | null
          dosage: string | null
          id: string
          notes: string | null
          product_id: string
          project_id: string
          route: string | null
          source: string | null
          source_ref: string | null
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          id?: string
          notes?: string | null
          product_id: string
          project_id: string
          route?: string | null
          source?: string | null
          source_ref?: string | null
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          project_id?: string
          route?: string | null
          source?: string | null
          source_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string | null
          default_cattle_type: string | null
          default_field_visibility: Json
          default_products: Json | null
          field_defaults: Json | null
          id: string
          name: string
          operation_id: string
          work_type_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_cattle_type?: string | null
          default_field_visibility: Json
          default_products?: Json | null
          field_defaults?: Json | null
          id?: string
          name: string
          operation_id: string
          work_type_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_cattle_type?: string | null
          default_field_visibility?: Json
          default_products?: Json | null
          field_defaults?: Json | null
          id?: string
          name?: string
          operation_id?: string
          work_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_work_types: {
        Row: {
          added_at: string | null
          id: string
          is_primary: boolean
          project_id: string
          work_type_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          is_primary?: boolean
          project_id: string
          work_type_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          is_primary?: boolean
          project_id?: string
          work_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_work_types_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_work_types_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          estimated_head: number | null
          field_defaults: Json | null
          field_visibility: Json | null
          group_id: string | null
          head_count: number | null
          id: string
          location_id: string | null
          name: string
          operation_id: string
          preload_mode: string | null
          primary_work_type_id: string | null
          project_id_display: string | null
          project_status: string
          record_individual_animals: boolean
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          estimated_head?: number | null
          field_defaults?: Json | null
          field_visibility?: Json | null
          group_id?: string | null
          head_count?: number | null
          id?: string
          location_id?: string | null
          name: string
          operation_id: string
          preload_mode?: string | null
          primary_work_type_id?: string | null
          project_id_display?: string | null
          project_status?: string
          record_individual_animals?: boolean
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          estimated_head?: number | null
          field_defaults?: Json | null
          field_visibility?: Json | null
          group_id?: string | null
          head_count?: number | null
          id?: string
          location_id?: string | null
          name?: string
          operation_id?: string
          preload_mode?: string | null
          primary_work_type_id?: string | null
          project_id_display?: string | null
          project_status?: string
          record_individual_animals?: boolean
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_primary_work_type_id_fkey"
            columns: ["primary_work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_blocks: {
        Row: {
          animal_class: string
          clinical_notes: string | null
          created_at: string | null
          default_products: Json | null
          description: string | null
          equipment_notes: string | null
          id: string
          is_shared: boolean | null
          name: string
          operation_id: string
          updated_at: string | null
          work_type_code: string
        }
        Insert: {
          animal_class: string
          clinical_notes?: string | null
          created_at?: string | null
          default_products?: Json | null
          description?: string | null
          equipment_notes?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          operation_id: string
          updated_at?: string | null
          work_type_code: string
        }
        Update: {
          animal_class?: string
          clinical_notes?: string | null
          created_at?: string | null
          default_products?: Json | null
          description?: string | null
          equipment_notes?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          operation_id?: string
          updated_at?: string | null
          work_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_blocks_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_event_products: {
        Row: {
          condition_rule: Json | null
          created_at: string | null
          dosage_override: string | null
          event_id: string | null
          id: string
          injection_site: string | null
          is_conditional: boolean | null
          notes: string | null
          product_id: string
          route_override: string | null
          sort_order: number | null
        }
        Insert: {
          condition_rule?: Json | null
          created_at?: string | null
          dosage_override?: string | null
          event_id?: string | null
          id?: string
          injection_site?: string | null
          is_conditional?: boolean | null
          notes?: string | null
          product_id: string
          route_override?: string | null
          sort_order?: number | null
        }
        Update: {
          condition_rule?: Json | null
          created_at?: string | null
          dosage_override?: string | null
          event_id?: string | null
          id?: string
          injection_site?: string | null
          is_conditional?: boolean | null
          notes?: string | null
          product_id?: string
          route_override?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "protocol_template_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_template_events: {
        Row: {
          clinical_notes: string | null
          created_at: string | null
          days_offset: number
          equipment_notes: string | null
          estimated_duration_minutes: number | null
          event_name: string
          event_order: number
          id: string
          source_block_id: string | null
          template_id: string
          timing_description: string | null
          work_type_code: string | null
        }
        Insert: {
          clinical_notes?: string | null
          created_at?: string | null
          days_offset?: number
          equipment_notes?: string | null
          estimated_duration_minutes?: number | null
          event_name: string
          event_order?: number
          id?: string
          source_block_id?: string | null
          template_id: string
          timing_description?: string | null
          work_type_code?: string | null
        }
        Update: {
          clinical_notes?: string | null
          created_at?: string | null
          days_offset?: number
          equipment_notes?: string | null
          estimated_duration_minutes?: number | null
          event_name?: string
          event_order?: number
          id?: string
          source_block_id?: string | null
          template_id?: string
          timing_description?: string | null
          work_type_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_template_events_source_block_id_fkey"
            columns: ["source_block_id"]
            isOneToOne: false
            referencedRelation: "protocol_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_template_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vaccination_protocol_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_notes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          note: string
          note_type: string
          operation_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          note: string
          note_type: string
          operation_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          note?: string
          note_type?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_notes_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      red_book_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          note_id: string
          operation_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string
          id?: string
          note_id: string
          operation_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          note_id?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "red_book_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "red_book_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_book_attachments_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      red_book_notes: {
        Row: {
          action_status: string | null
          assigned_to: string | null
          attachment_count: number
          author_initials: string | null
          body: string | null
          category: string
          created_at: string
          created_by: string | null
          flag_tier: string | null
          has_action: boolean
          id: string
          is_pinned: boolean
          operation_id: string
          title: string
          updated_at: string
        }
        Insert: {
          action_status?: string | null
          assigned_to?: string | null
          attachment_count?: number
          author_initials?: string | null
          body?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          flag_tier?: string | null
          has_action?: boolean
          id?: string
          is_pinned?: boolean
          operation_id: string
          title: string
          updated_at?: string
        }
        Update: {
          action_status?: string | null
          assigned_to?: string | null
          attachment_count?: number
          author_initials?: string | null
          body?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          flag_tier?: string | null
          has_action?: boolean
          id?: string
          is_pinned?: boolean
          operation_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "red_book_notes_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_barn_animals: {
        Row: {
          back_tag: string | null
          breed: string | null
          created_at: string
          designation_key: string | null
          eid: string
          eid_2: string | null
          id: string
          preg_status: string | null
          quick_notes: string[] | null
          sex: string | null
          sort_dest_pen: string | null
          sorted: boolean
          tag_number: string | null
          work_order_id: string
        }
        Insert: {
          back_tag?: string | null
          breed?: string | null
          created_at?: string
          designation_key?: string | null
          eid: string
          eid_2?: string | null
          id?: string
          preg_status?: string | null
          quick_notes?: string[] | null
          sex?: string | null
          sort_dest_pen?: string | null
          sorted?: boolean
          tag_number?: string | null
          work_order_id: string
        }
        Update: {
          back_tag?: string | null
          breed?: string | null
          created_at?: string
          designation_key?: string | null
          eid?: string
          eid_2?: string | null
          id?: string
          preg_status?: string | null
          quick_notes?: string[] | null
          sex?: string | null
          sort_dest_pen?: string | null
          sorted?: boolean
          tag_number?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_barn_animals_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_barn_customers: {
        Row: {
          address: string | null
          id: string
          last_import: string | null
          name: string
          notes: string | null
          operation_id: string
          phone: string | null
          state: string | null
          type: string | null
        }
        Insert: {
          address?: string | null
          id?: string
          last_import?: string | null
          name: string
          notes?: string | null
          operation_id: string
          phone?: string | null
          state?: string | null
          type?: string | null
        }
        Update: {
          address?: string | null
          id?: string
          last_import?: string | null
          name?: string
          notes?: string | null
          operation_id?: string
          phone?: string | null
          state?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_barn_customers_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_barn_prices: {
        Row: {
          admin_pct: number
          created_at: string
          id: string
          is_special: boolean
          operation_id: string
          sol_charge: number
          tax_rate: number
          vet_charge: number
          work_type: string
        }
        Insert: {
          admin_pct?: number
          created_at?: string
          id?: string
          is_special?: boolean
          operation_id: string
          sol_charge?: number
          tax_rate?: number
          vet_charge?: number
          work_type: string
        }
        Update: {
          admin_pct?: number
          created_at?: string
          id?: string
          is_special?: boolean
          operation_id?: string
          sol_charge?: number
          tax_rate?: number
          vet_charge?: number
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_barn_prices_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_days: {
        Row: {
          created_at: string
          date: string
          id: string
          operation_id: string
          status: string
          vet_crew: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          operation_id: string
          status?: string
          vet_crew?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          operation_id?: string
          status?: string
          vet_crew?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_days_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      sire_details: {
        Row: {
          animal_id: string
          created_at: string | null
          id: string
          operation_id: string
          pedigree_dam: string | null
          pedigree_dam_dam: string | null
          pedigree_dam_sire: string | null
          pedigree_data: Json | null
          pedigree_sire: string | null
          pedigree_sire_dam: string | null
          pedigree_sire_sire: string | null
          purchase_history: Json | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          id?: string
          operation_id: string
          pedigree_dam?: string | null
          pedigree_dam_dam?: string | null
          pedigree_dam_sire?: string | null
          pedigree_data?: Json | null
          pedigree_sire?: string | null
          pedigree_sire_dam?: string | null
          pedigree_sire_sire?: string | null
          purchase_history?: Json | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          id?: string
          operation_id?: string
          pedigree_dam?: string | null
          pedigree_dam_dam?: string | null
          pedigree_dam_sire?: string | null
          pedigree_data?: Json | null
          pedigree_sire?: string | null
          pedigree_sire_dam?: string | null
          pedigree_sire_sire?: string | null
          purchase_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sire_details_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: true
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sire_details_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      sort_records: {
        Row: {
          animal_id: string
          created_at: string
          dest_pen: string
          id: string
          source_pen: string
          work_order_id: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string
          dest_pen: string
          id?: string
          source_pen: string
          work_order_id?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string
          dest_pen?: string
          id?: string
          source_pen?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sort_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "sale_barn_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sort_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      status_changes: {
        Row: {
          animal_id: string
          changed_at: string | null
          changed_by: string | null
          death_cause: string | null
          id: string
          new_status: string
          old_status: string
          operation_id: string
          reason: string | null
          sale_buyer: string | null
          sale_price: number | null
        }
        Insert: {
          animal_id: string
          changed_at?: string | null
          changed_by?: string | null
          death_cause?: string | null
          id?: string
          new_status: string
          old_status: string
          operation_id: string
          reason?: string | null
          sale_buyer?: string | null
          sale_price?: number | null
        }
        Update: {
          animal_id?: string
          changed_at?: string | null
          changed_by?: string | null
          death_cause?: string | null
          id?: string
          new_status?: string
          old_status?: string
          operation_id?: string
          reason?: string | null
          sale_buyer?: string | null
          sale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "status_changes_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_changes_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          operation_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          operation_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technicians_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_products: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number | null
          treatment_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number | null
          treatment_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number | null
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_products_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          animal_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          disease_id: string | null
          group_id: string | null
          id: string
          location_id: string | null
          memo: string | null
          operation_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          disease_id?: string | null
          group_id?: string | null
          id?: string
          location_id?: string | null
          memo?: string | null
          operation_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          disease_id?: string | null
          group_id?: string | null
          id?: string
          location_id?: string | null
          memo?: string | null
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_operation_id: string | null
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_operation_id?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_operation_id?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_default_operation_id_fkey"
            columns: ["default_operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_protocol_templates: {
        Row: {
          animal_class: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          operation_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          animal_class: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          operation_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          animal_class?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          operation_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_protocol_templates_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_practice_clients: {
        Row: {
          clinic_client_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          operation_id: string
          premise_id: string | null
          vet_practice_id: string
        }
        Insert: {
          clinic_client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_id: string
          premise_id?: string | null
          vet_practice_id: string
        }
        Update: {
          clinic_client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_id?: string
          premise_id?: string | null
          vet_practice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_practice_clients_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_practice_clients_vet_practice_id_fkey"
            columns: ["vet_practice_id"]
            isOneToOne: false
            referencedRelation: "vet_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_practices: {
        Row: {
          address: Json | null
          created_at: string | null
          email: string | null
          id: string
          license_number: string | null
          name: string
          owner_user_id: string
          phone: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          license_number?: string | null
          name: string
          owner_user_id: string
          phone?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          license_number?: string | null
          name?: string
          owner_user_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      work_order_notes: {
        Row: {
          author: string
          created_at: string
          id: string
          text: string
          work_order_id: string
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          text: string
          work_order_id: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          text?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          admin_charge: number
          animal_type: string | null
          buyer_num: string | null
          created_at: string
          customer_id: string | null
          entity_type: string
          group_notes: string | null
          head_count: number
          health_complete: boolean
          id: string
          pens: string[] | null
          sale_day_id: string
          sol_charge: number
          special_lump_sum: number | null
          tax_charge: number
          total_charge: number
          vet_charge: number
          work_complete: boolean
          work_type: string
        }
        Insert: {
          admin_charge?: number
          animal_type?: string | null
          buyer_num?: string | null
          created_at?: string
          customer_id?: string | null
          entity_type: string
          group_notes?: string | null
          head_count?: number
          health_complete?: boolean
          id?: string
          pens?: string[] | null
          sale_day_id: string
          sol_charge?: number
          special_lump_sum?: number | null
          tax_charge?: number
          total_charge?: number
          vet_charge?: number
          work_complete?: boolean
          work_type: string
        }
        Update: {
          admin_charge?: number
          animal_type?: string | null
          buyer_num?: string | null
          created_at?: string
          customer_id?: string | null
          entity_type?: string
          group_notes?: string | null
          head_count?: number
          health_complete?: boolean
          id?: string
          pens?: string[] | null
          sale_day_id?: string
          sol_charge?: number
          special_lump_sum?: number | null
          tax_charge?: number
          total_charge?: number
          vet_charge?: number
          work_complete?: boolean
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "sale_barn_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_days"
            referencedColumns: ["id"]
          },
        ]
      }
      work_types: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_operation_ids: { Args: never; Returns: string[] }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
