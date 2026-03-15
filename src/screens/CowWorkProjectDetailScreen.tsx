import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "../components/ToastContext";
import FlagIcon from "../components/FlagIcon";
import AnimalLookup from "../components/AnimalLookup";
import FormFieldRow from "../components/FormFieldRow";
import { useGroups } from "@/hooks/useGroups";
import { useLocations } from "@/hooks/useLocations";
import { PREG_CALF_SEX_OPTIONS, FLAG_HEX_MAP, TAG_COLOR_OPTIONS, TAG_COLOR_HEX, QUICK_NOTES, QUICK_NOTE_PILL_COLORS, type FlagColor } from "@/lib/constants";
import { getLockedFields, getOptionalFields, resolveFieldConfig, type FieldVisibilityConfig } from "@/lib/field-config";
import { LABEL_STYLE, INPUT_CLS, SUB_LABEL } from "@/lib/styles";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "input" | "worked" | "stats" | "details";

export default function CowWorkProjectDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const tagSectionRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("input");
  const [headerOpen, setHeaderOpen] = useState(false);
  const [tagField, setTagField] = useState("");
  const [isMatched, setIsMatched] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [matchedAnimal, setMatchedAnimal] = useState<any>(null);
  const [historyTab, setHistoryTab] = useState<"info" | "calving" | "history">("info");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNewAnimal, setIsNewAnimal] = useState(false);
  const [newTagColor, setNewTagColor] = useState("");

  const [pregResult, setPregResult] = useState("");
  const [pregDays, setPregDays] = useState("");
  const [calfSex, setCalfSex] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [quickNotesOpen, setQuickNotesOpen] = useState(false);
  const [sampleId, setSampleId] = useState("");
  const [memo, setMemo] = useState("");
  // Phase F: Additional Products state
  const [additionalProductsOpen, setAdditionalProductsOpen] = useState(false);
  const [additionalProducts, setAdditionalProducts] = useState<{ product_id: string; product_name: string; dosage: string; route: string; reason: string }[]>([]);
  const [addProdPickerOpen, setAddProdPickerOpen] = useState(false);

  // Load project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, group:groups(name), location:locations(name), work_types:project_work_types(work_type:work_types(code, name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Default to Project Details tab for completed projects
  useEffect(() => {
    if (project?.project_status === "Completed") {
      setActiveTab("details");
    }
  }, [project?.project_status]);

  // Load worked animals
  const { data: workedAnimals, refetch: refetchWorked } = useQuery({
    queryKey: ["project-animals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cow_work")
        .select("*, animal:animals(id, tag, tag_color, sex, type, breed, year_born)")
        .eq("project_id", id!)
        .eq("operation_id", operationId)
        .order("record_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Load project products
  const { data: projectProducts } = useQuery({
    queryKey: ["project-products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_products")
        .select("*, product:products(id, name, dosage, route)")
        .eq("project_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Load global products (for additional product picker)
  const { data: allProducts } = useQuery({
    queryKey: ["global-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, dosage, route, product_type")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Reference data for edit mode
  const { data: groups } = useGroups();
  const { data: locations } = useLocations();

  // Load technicians for breeding projects
  const { data: technicians } = useQuery({
    queryKey: ["technicians", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("id, name")
        .eq("operation_id", operationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Load preg stages from operation's custom list
  const { data: pregStages } = useQuery({
    queryKey: ["preg-stages", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preg_stages")
        .select("id, stage_name, sort_order")
        .eq("operation_id", operationId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Edit mode state for Project Details tab
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editGroupId, setEditGroupId] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editHeadCount, setEditHeadCount] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editProducts, setEditProducts] = useState<{ id: string; name: string; dosage: string; route: string }[]>([]);
  const [editProductPickerOpen, setEditProductPickerOpen] = useState(false);
  const [editProductSearch, setEditProductSearch] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const startEditingProject = () => {
    setEditDate(project?.date || "");
    setEditGroupId(project?.group_id || "");
    setEditLocationId(project?.location_id || "");
    setEditStatus(project?.project_status || "Pending");
    setEditHeadCount(project?.estimated_head ? String(project.estimated_head) : "");
    setEditMemo(project?.description || "");
    // Load current products into edit state
    setEditProducts((projectProducts || []).map((pp: any) => ({
      id: (pp.product as any)?.id || pp.product_id,
      name: (pp.product as any)?.name || pp.product_name || "Unknown",
      dosage: (pp.product as any)?.dosage || "",
      route: (pp.product as any)?.route || "",
    })));
    setEditProductPickerOpen(false);
    setEditProductSearch("");
    setIsEditingProject(true);
  };

  const saveProjectEdits = async () => {
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          date: editDate,
          group_id: editGroupId || null,
          location_id: editLocationId || null,
          project_status: editStatus,
          estimated_head: editHeadCount ? parseInt(editHeadCount) : null,
          description: editMemo.trim() || null,
        })
        .eq("id", id!);
      if (error) throw error;

      // Sync products: delete existing, insert new set
      const { error: delErr } = await supabase.from("project_products").delete().eq("project_id", id!);
      if (delErr) console.error("Failed to delete old products:", delErr);
      if (editProducts.length > 0) {
        const { error: insErr } = await supabase.from("project_products").insert(
          editProducts.map(p => ({
            project_id: id!,
            product_id: p.id,
            dosage: p.dosage || null,
            route: p.route || null,
            source: "manual",
          }))
        );
        if (insErr) {
          console.error("Failed to save products:", insErr);
          showToast("error", "Products failed to save: " + insErr.message);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["project", id] });
      await queryClient.refetchQueries({ queryKey: ["project-products", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      showToast("success", "Project updated");
      setIsEditingProject(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update");
    } finally {
      setEditSaving(false);
    }
  };

  // Load expected animals (Phase D)
  const { data: expectedAnimals, refetch: refetchExpected } = useQuery({
    queryKey: ["project-expected", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_expected_animals")
        .select("*, animal:animals(id, tag, tag_color, sex, type, breed, year_born)")
        .eq("project_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const expected = expectedAnimals || [];
  const stillExpected = expected.filter(e => e.status === "Expected");

  // Animal history queries
  const { data: animalCalvings } = useQuery({
    queryKey: ["animal-calvings-cw", matchedAnimal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("calving_records")
        .select("*, calf:animals!calving_records_calf_id_fkey(tag)")
        .eq("dam_id", matchedAnimal.id)
        .eq("operation_id", operationId)
        .order("calving_date", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!matchedAnimal?.id,
  });

  const { data: animalWork } = useQuery({
    queryKey: ["animal-work-cw", matchedAnimal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cow_work")
        .select("*, project:projects(name)")
        .eq("animal_id", matchedAnimal.id)
        .eq("operation_id", operationId)
        .order("date", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!matchedAnimal?.id,
  });

  // Load active flags for matched animal
  const { data: animalActiveFlags, refetch: refetchAnimalFlags } = useQuery({
    queryKey: ["animal-flags-cw", matchedAnimal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("animal_flags")
        .select("id, flag_tier, flag_name, flag_note, created_at")
        .eq("animal_id", matchedAnimal.id)
        .eq("operation_id", operationId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!matchedAnimal?.id,
  });

  const projectType = (project?.work_types as any)?.[0]?.work_type?.code || "";
  const projectName = project?.name || "";
  const projectDate = project ? new Date(project.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const projectGroup = (project?.group as any)?.name || "";
  const projectLocation = (project?.location as any)?.name || "";
  const projectStatus = project?.project_status || "Pending";
  const headCount = project?.estimated_head || project?.head_count || 0;
  const worked = workedAnimals || [];

  // Dynamic field configuration — read from project, fall back to defaults
  const fieldConfig = resolveFieldConfig(project?.field_visibility as FieldVisibilityConfig | null);
  const lockedFields = getLockedFields(projectType);
  const enabledOptionalKeys = fieldConfig.optionalFields;
  const isFieldVisible = (key: string) => enabledOptionalKeys.includes(key);

  // Additional field states for dynamic fields
  const [data1, setData1] = useState("");
  const [data2, setData2] = useState("");
  const [lot, setLot] = useState("");
  const [sampleField, setSampleField] = useState("");
  const [pen, setPen] = useState("");
  // BSE fields
  const [bseResult, setBseResult] = useState("");
  const [scrotal, setScrotal] = useState("");
  const [motility, setMotility] = useState("");
  const [morphology, setMorphology] = useState("");
  const [semenDefects, setSemenDefects] = useState("");
  const [physicalDefects, setPhysicalDefects] = useState("");
  // Breeding fields
  const [breedingSire, setBreedingSire] = useState("");
  const [breedingDate, setBreedingDate] = useState(new Date().toISOString().split("T")[0]);
  const [breedingType, setBreedingType] = useState("");
  const [estrusStatus, setEstrusStatus] = useState("");
  const [technician, setTechnician] = useState("");
  // Sale fields
  const [cullReason, setCullReason] = useState("");
  const [dispositionField, setDispositionField] = useState("");
  const [saleWeight, setSaleWeight] = useState("");
  // Treatment field
  const [disease, setDisease] = useState("");

  const [isExpectedMatch, setIsExpectedMatch] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const lookupTag = async (tag: string) => {
    if (!tag.trim()) { setMatchedAnimal(null); setIsMatched(false); setIsDuplicate(false); setIsNewAnimal(false); setIsExpectedMatch(false); setEditingRecord(null); return; }
    const { data } = await supabase
      .from("animals")
      .select("*")
      .eq("operation_id", operationId)
      .eq("tag", tag.trim())
      .maybeSingle();
    if (data) {
      setIsMatched(true);
      setMatchedAnimal(data);
      setIsNewAnimal(false);

      // Phase D: Check if this animal was Expected
      const expectedMatch = stillExpected.find(e => e.animal_id === data.id);
      setIsExpectedMatch(!!expectedMatch);

      // Phase D: If already worked, load existing record for editing (replaces duplicate warning)
      const existingRecord = worked.find(w => w.animal_id === data.id);
      if (existingRecord) {
        setIsDuplicate(false);
        setEditingRecord(existingRecord);
        // Populate form fields from existing record
        setWeight(existingRecord.weight ? String(existingRecord.weight) : "");
        setPregResult(existingRecord.preg_stage || "");
        setPregDays(existingRecord.days_of_gestation ? String(existingRecord.days_of_gestation) : "");
        setCalfSex(existingRecord.fetal_sex || "");
        setSelectedNotes(existingRecord.quick_notes || []);
        setSampleId(existingRecord.dna || "");
        setMemo(existingRecord.memo || "");
        // Phase F: Load existing additional products
        if (existingRecord.additional_products && Array.isArray(existingRecord.additional_products)) {
          setAdditionalProducts(existingRecord.additional_products as any[]);
          if ((existingRecord.additional_products as any[]).length > 0) setAdditionalProductsOpen(true);
        } else {
          setAdditionalProducts([]);
        }
      } else {
        setIsDuplicate(false);
        setEditingRecord(null);
      }
    } else {
      setIsMatched(false);
      setMatchedAnimal(null);
      setIsDuplicate(false);
      setIsNewAnimal(true);
      setIsExpectedMatch(false);
      setEditingRecord(null);
    }
  };

  // Handler for AnimalLookup — runs cow-work-specific logic on selection
  const onAnimalSelect = (animal: any) => {
    setTagField(animal.tag);
    setIsMatched(true);
    setMatchedAnimal(animal);
    setIsNewAnimal(false);

    // Check if this animal was Expected
    const expectedMatch = stillExpected.find(e => e.animal_id === animal.id);
    setIsExpectedMatch(!!expectedMatch);

    // If already worked, load existing record for editing
    const existingRecord = worked.find(w => w.animal_id === animal.id);
    if (existingRecord) {
      setIsDuplicate(false);
      setEditingRecord(existingRecord);
      setWeight(existingRecord.weight ? String(existingRecord.weight) : "");
      setPregResult(existingRecord.preg_stage || "");
      setPregDays(existingRecord.days_of_gestation ? String(existingRecord.days_of_gestation) : "");
      setCalfSex(existingRecord.fetal_sex || "");
      setSelectedNotes(existingRecord.quick_notes || []);
      setSampleId(existingRecord.dna || "");
      setMemo(existingRecord.memo || "");
      if (existingRecord.additional_products && Array.isArray(existingRecord.additional_products)) {
        setAdditionalProducts(existingRecord.additional_products as any[]);
        if ((existingRecord.additional_products as any[]).length > 0) setAdditionalProductsOpen(true);
      } else {
        setAdditionalProducts([]);
      }
    } else {
      setIsDuplicate(false);
      setEditingRecord(null);
    }
  };

  const clearForm = () => {
    setTagField("");
    setIsMatched(false);
    setIsDuplicate(false);
    setMatchedAnimal(null);
    setIsNewAnimal(false);
    setIsExpectedMatch(false);
    setEditingRecord(null);
    setNewTagColor("");
    setHistoryOpen(false);
    setPregResult("");
    setPregDays("");
    setCalfSex("");
    setWeight("");
    setSelectedNotes([]);
    setQuickNotesOpen(false);
    setSampleId("");
    setMemo("");
    setAdditionalProducts([]);
    setAdditionalProductsOpen(false);
    setAddProdPickerOpen(false);
    // Dynamic field resets
    setData1("");
    setData2("");
    setLot("");
    setSampleField("");
    setPen("");
    setBseResult("");
    setScrotal("");
    setMotility("");
    setMorphology("");
    setSemenDefects("");
    setPhysicalDefects("");
    setBreedingSire("");
    setBreedingDate(new Date().toISOString().split("T")[0]);
    setBreedingType("");
    setEstrusStatus("");
    setTechnician("");
    setCullReason("");
    setDispositionField("");
    setSaleWeight("");
    setDisease("");
    // Scroll to top and focus tag input
    setTimeout(() => {
      tagSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const input = tagSectionRef.current?.querySelector("input");
      if (input) input.focus();
    }, 100);
  };

  const saveAndNext = async () => {
    if (!tagField.trim()) { showToast("error", "Tag required to save"); return; }
    if (!matchedAnimal && !isNewAnimal) { showToast("error", "Tag not found in herd"); return; }
    setSaving(true);
    try {
      let animalId = matchedAnimal?.id;
      let createdNew = false;

      // Phase C: Auto-create animal if not found
      if (!animalId && isNewAnimal) {
        const { data: newAnimal, error: createErr } = await supabase
          .from("animals")
          .insert({
            operation_id: operationId,
            tag: tagField.trim(),
            tag_color: newTagColor || null,
            sex: "F",
            status: "Active",
          } as any)
          .select()
          .single();
        if (createErr) throw createErr;
        animalId = newAnimal.id;
        createdNew = true;
      }

      const recordData = {
        weight: weight ? parseFloat(weight) : null,
        preg_stage: pregResult || null,
        days_of_gestation: pregDays ? parseInt(pregDays) : null,
        fetal_sex: calfSex || null,
        quick_notes: selectedNotes.length > 0 ? selectedNotes : null,
        memo: memo.trim() || null,
        dna: sampleId.trim() || null,
        additional_products: additionalProducts.length > 0 ? additionalProducts : null,
      };

      // Phase D: Update existing record (edit mode) vs insert new
      if (editingRecord) {
        const { error } = await supabase
          .from("cow_work")
          .update(recordData)
          .eq("id", editingRecord.id);
        if (error) throw error;
      } else {
        const recordOrder = worked.length + 1;
        const { error } = await supabase
          .from("cow_work")
          .insert({
            operation_id: operationId,
            project_id: id,
            animal_id: animalId,
            date: project?.date || new Date().toISOString().split("T")[0],
            record_order: recordOrder,
            ...recordData,
            is_new_animal: createdNew,
          });
        if (error) throw error;

        // Auto-flip project status to In Progress on first animal added
        if (projectStatus === "Pending") {
          await supabase
            .from("projects")
            .update({ project_status: "In Progress" })
            .eq("id", id!);
          queryClient.invalidateQueries({ queryKey: ["project", id] });
        }
      }

      // Phase D: Flip Expected → Worked in project_expected_animals
      if (isExpectedMatch && animalId) {
        await supabase
          .from("project_expected_animals")
          .update({ status: "Worked" })
          .eq("project_id", id)
          .eq("animal_id", animalId)
          .eq("status", "Expected");
        refetchExpected();
      }

      await refetchWorked();
      queryClient.invalidateQueries({ queryKey: ["project-work-counts"] });

      // Auto-apply flags from selected quick notes
      if (animalId && selectedNotes.length > 0) {
        const flagTierMap: Record<string, string> = { red: "cull", gold: "production", teal: "management" };
        const flagNotes = QUICK_NOTES.filter(n => n.flag && selectedNotes.includes(n.label));
        for (const note of flagNotes) {
          const tier = flagTierMap[note.flag!] || note.flag!;
          await supabase.from("animal_flags").insert({
            operation_id: operationId,
            animal_id: animalId,
            flag_tier: tier,
            flag_name: note.label,
            flag_note: `Auto-applied from quick note "${note.label}" during ${projectName}`,
          });
        }
        if (flagNotes.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["animal-flags"] });
          queryClient.invalidateQueries({ queryKey: ["animal-flags-cw", animalId] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-flag-samples"] });
        }

        // Sync quick notes to the animal record (merge with existing)
        const { data: currentAnimal } = await supabase
          .from("animals")
          .select("quick_notes")
          .eq("id", animalId)
          .single();
        const existingNotes: string[] = (currentAnimal?.quick_notes as string[]) || [];
        const merged = [...new Set([...existingNotes, ...selectedNotes])];
        await supabase
          .from("animals")
          .update({ quick_notes: merged })
          .eq("id", animalId);
        queryClient.invalidateQueries({ queryKey: ["animal", animalId] });
        queryClient.invalidateQueries({ queryKey: ["animals"] });
      }

      const msg = editingRecord
        ? `Tag ${tagField} updated`
        : createdNew
          ? `New animal ${tagField} created & saved`
          : `Tag ${tagField} saved`;
      showToast("success", msg);
      clearForm();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const confirmedCount = worked.filter(a => a.preg_stage === "Confirmed").length;
  const openCount = worked.filter(a => a.preg_stage === "Open").length;
  const suspectCount = worked.filter(a => a.preg_stage === "Suspect").length;
  const weighedAnimals = worked.filter(a => a.weight);
  const avgWeight =
    weighedAnimals.length > 0
      ? Math.round(weighedAnimals.reduce((s, a) => s + Number(a.weight), 0) / weighedAnimals.length)
      : 0;

  const tabLabels: Record<Tab, string> = { input: "Add", worked: "List", stats: "Stats", details: "Project Details" };

  if (projectLoading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-0 pb-10">
      {/* COLLAPSIBLE HEADER */}
      <div
        className="rounded-xl overflow-hidden mb-3 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #0E2646 0%, #153566 100%)" }}
      >
        {/* Collapsed row */}
        <div
          className="px-3.5 py-2.5"
          onClick={() => setHeaderOpen(!headerOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {worked.length}
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.50)" }}>worked</span>
              <span className="shrink-0" style={{ width: 1, height: 16, backgroundColor: "rgba(255,255,255,0.15)" }} />
              <span className="truncate" style={{ fontSize: 11, fontWeight: 600, color: "#A8E6DA" }}>{projectName}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 ml-2"
              style={{ transform: headerOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(255,255,255,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {headerOpen && (
          <>
            <div className="px-3.5 pt-3 pb-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(168,230,218,0.50)", marginBottom: 8 }}>{projectStatus}</div>
              <div className="flex gap-5">
                {[
                  { label: "HEAD", value: headCount },
                  { label: "WORKED", value: worked.length },
                  { label: "REMAINING", value: Math.max(0, headCount - worked.length) },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex px-3.5 mt-3" style={{ backgroundColor: "rgba(0,0,0,0.15)", borderRadius: "0 0 12px 12px" }}>
              {(["input", "worked", "stats", "details"] as Tab[]).map(tab => (
                <button
                  key={tab}
                  className="flex-1 py-2.5 cursor-pointer relative"
                  style={{
                    fontSize: 12,
                    fontWeight: activeTab === tab ? 700 : 500,
                    color: activeTab === tab ? "#F3D12A" : "rgba(255,255,255,0.40)",
                    background: "none", border: "none",
                  }}
                  onClick={() => { setActiveTab(tab); setHeaderOpen(false); }}
                >
                  {tabLabels[tab]}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 36, height: 2, backgroundColor: "#F3D12A" }} />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* TAB CONTENT */}
      <div className="pt-0 space-y-3">
        {/* =================== INPUT TAB =================== */}
        {activeTab === "input" && (
          <>
            {/* Tag / EID field */}
            <div ref={tagSectionRef} className="rounded-xl bg-white px-3 py-3.5 space-y-3" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <AnimalLookup
                  value={tagField}
                  onChange={(v) => {
                    setTagField(v);
                    if (!v) { setIsMatched(false); setMatchedAnimal(null); setIsDuplicate(false); setIsNewAnimal(false); setIsExpectedMatch(false); setEditingRecord(null); }
                  }}
                  onSelect={onAnimalSelect}
                  onNoMatch={(search) => {
                    setIsMatched(false);
                    setMatchedAnimal(null);
                    setIsDuplicate(false);
                    setIsNewAnimal(true);
                    setIsExpectedMatch(false);
                    setEditingRecord(null);
                  }}
                  noMatchLabel="Add New Animal"
                  placeholder="Tag or EID…"
                  inputStyle={{ flex: 1, minWidth: 0, height: 48, borderRadius: 8, border: "2px solid #F3D12A", paddingLeft: 12, paddingRight: 12, fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, color: "#0E2646", outline: "none", backgroundColor: "white", boxSizing: "border-box" as const }}
                />
                <button
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer active:scale-[0.97]"
                  style={{ backgroundColor: "#55BAAA", border: "none" }}
                  onClick={() => {
                    setIsMatched(false);
                    setMatchedAnimal(null);
                    setIsDuplicate(false);
                    setIsNewAnimal(true);
                    setIsExpectedMatch(false);
                    setEditingRecord(null);
                  }}
                  title="Add new animal"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 4V14M4 9H14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Match indicators — Expected badge, editing indicator */}
              {isMatched && matchedAnimal && isExpectedMatch && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="rounded-full"
                    style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(85,186,170,0.15)", color: "#55BAAA" }}
                  >
                    ✓ Expected
                  </span>
                </div>
              )}
              {/* Phase D: Editing existing record indicator */}
              {editingRecord && (
                <div className="rounded-lg px-3 py-2 mt-1" style={{ backgroundColor: "rgba(85,186,170,0.08)", border: "1px solid rgba(85,186,170,0.20)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#3D9A8B" }}>Editing existing record — data loaded below</span>
                </div>
              )}
              {/* Phase C: New animal — will be created on save */}
              {tagField.length >= 3 && isNewAnimal && !isMatched && !isDuplicate && (
                <div className="space-y-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="rounded-full px-2.5 py-0.5"
                      style={{ fontSize: 11, fontWeight: 700, backgroundColor: "rgba(243,209,42,0.20)", color: "#B8960F" }}
                    >
                      NEW
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#B8960F" }}>
                      New animal — will be created on save
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,26,0.50)", flexShrink: 0, width: 105 }}>Tag Color</label>
                    <select
                      value={newTagColor}
                      onChange={e => setNewTagColor(e.target.value)}
                      className="flex-1 h-[40px] rounded-lg border px-3 outline-none"
                      style={{
                        fontSize: 16,
                        fontFamily: "Inter, sans-serif",
                        color: newTagColor ? "#1A1A1A" : "rgba(26,26,26,0.40)",
                        borderColor: "#D4D4D0",
                        backgroundColor: "white",
                      }}
                    >
                      <option value="">Select color…</option>
                      {TAG_COLOR_OPTIONS.map(c => (
                        <option key={c} value={c === "None" ? "" : c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Cow History Panel */}
            {isMatched && matchedAnimal && (
              <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
                <button
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer"
                  style={{ background: "none", border: "none" }}
                  onClick={() => setHistoryOpen(!historyOpen)}
                >
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#55BAAA" }}>{matchedAnimal.tag}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.50)" }}>· {matchedAnimal.type || matchedAnimal.sex} · {matchedAnimal.year_born || ""}</span>
                    {/* Active flags */}
                    {(animalActiveFlags || []).length > 0 && (
                      <div className="flex items-center gap-1 ml-1">
                        {(animalActiveFlags || []).some((f: any) => f.flag_tier === "cull") && <FlagIcon color="red" size="sm" />}
                        {(animalActiveFlags || []).some((f: any) => f.flag_tier === "production") && <FlagIcon color="gold" size="sm" />}
                        {(animalActiveFlags || []).some((f: any) => f.flag_tier === "management") && <FlagIcon color="teal" size="sm" />}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>History</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                      style={{ transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
                      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {historyOpen && (
                  <div style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
                    <div className="flex px-3" style={{ borderBottom: "1px solid rgba(212,212,208,0.40)" }}>
                      {(["info", "calving", "history"] as const).map(t => (
                        <button
                          key={t}
                          className="py-2 cursor-pointer relative mr-4"
                          style={{
                            fontSize: 12,
                            fontWeight: historyTab === t ? 700 : 500,
                            color: historyTab === t ? "#0E2646" : "rgba(26,26,26,0.40)",
                            background: "none", border: "none",
                          }}
                          onClick={() => setHistoryTab(t)}
                        >
                          {t === "info" ? "Info" : t === "calving" ? "Calving" : "History"}
                          {historyTab === t && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 36, height: 2, backgroundColor: "#F3D12A" }} />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Info sub-tab */}
                    {historyTab === "info" && (
                      <div className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {[
                            ["TYPE", matchedAnimal.type || "—"],
                            ["BREED", matchedAnimal.breed || "—"],
                            ["YEAR", matchedAnimal.year_born || "—"],
                            ["SEX", matchedAnimal.sex || "—"],
                            ["STATUS", matchedAnimal.status || "—"],
                            ["TAG COLOR", matchedAnimal.tag_color || "—"],
                          ].map(([l, v]) => (
                            <div key={l}>
                              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>{l}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Calving sub-tab */}
                    {historyTab === "calving" && (
                      <div className="px-3 py-3 space-y-2">
                        {(animalCalvings || []).length === 0 ? (
                          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", textAlign: "center", padding: 12 }}>No calving records</div>
                        ) : (
                          (animalCalvings || []).map(c => (
                            <div key={c.id} className="rounded-xl px-3 py-3 bg-[#0E2646]">
                              <div className="flex items-center gap-2 min-w-0">
                                <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Calf {(c.calf as any)?.tag || "—"}</span>
                                <span className="rounded-full" style={{
                                  fontSize: 9, fontWeight: 700, padding: "2px 8px",
                                  backgroundColor: c.calf_sex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                                  color: c.calf_sex === "Bull" ? "#55BAAA" : "#E8A0BF",
                                }}>{c.calf_sex || "—"}</span>
                                <span className="ml-auto" style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>
                                  {new Date(c.calving_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                              {c.birth_weight && (
                                <div className="flex gap-2 mt-1.5">
                                  <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(240,240,240,0.08)", color: "rgba(240,240,240,0.60)" }}>
                                    {c.birth_weight} lbs
                                  </span>
                                </div>
                              )}
                              {c.memo && <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", marginTop: 4 }}>{c.memo}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* History sub-tab */}
                    {historyTab === "history" && (
                      <div className="px-3 py-3 space-y-0">
                        {(animalWork || []).length === 0 ? (
                          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", textAlign: "center", padding: 12 }}>No work history</div>
                        ) : (
                          (animalWork || []).map(w => (
                            <div key={w.id} className="py-2" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{(w.project as any)?.name || "—"}</span>
                                <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                                  {new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-1">
                                {w.weight && (
                                  <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>
                                    {w.weight} lbs
                                  </span>
                                )}
                                {w.preg_stage && <span style={{ fontSize: 12, color: "rgba(26,26,26,0.50)" }}>Preg: {w.preg_stage}</span>}
                              </div>
                              {w.memo && <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic", marginTop: 2 }}>{w.memo}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── LOCKED FIELDS (work-type-specific) ── */}
            {lockedFields.length > 0 && (
              <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#55BAAA", textTransform: "uppercase" }}>
                  {projectType} FIELDS
                </div>
                {lockedFields.map(f => {
                  switch (f.key) {
                    case "preg_stage": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Preg</label>
                        <select value={pregResult} onChange={e => setPregResult(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          {(pregStages || []).map(s => (
                            <option key={s.id} value={s.stage_name}>{s.stage_name}</option>
                          ))}
                        </select>
                      </div>
                    );
                    case "days_of_gestation": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Days Gest.</label>
                        <input type="number" value={pregDays} onChange={e => setPregDays(e.target.value)} placeholder="0" className={INPUT_CLS} />
                      </div>
                    );
                    case "fetal_sex": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Calf Sex</label>
                        <select value={calfSex} onChange={e => setCalfSex(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          {PREG_CALF_SEX_OPTIONS.filter(o => o !== "None").map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                    case "bse_result": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Result</label>
                        <select value={bseResult} onChange={e => setBseResult(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          <option>Pass</option><option>Fail</option><option>Defer</option>
                        </select>
                      </div>
                    );
                    case "scrotal": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Scrotal</label>
                        <input type="number" value={scrotal} onChange={e => setScrotal(e.target.value)} placeholder="cm" className={INPUT_CLS} />
                      </div>
                    );
                    case "motility": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Motility</label>
                        <input type="number" value={motility} onChange={e => setMotility(e.target.value)} placeholder="%" className={INPUT_CLS} />
                      </div>
                    );
                    case "morphology": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Morphology</label>
                        <input type="number" value={morphology} onChange={e => setMorphology(e.target.value)} placeholder="%" className={INPUT_CLS} />
                      </div>
                    );
                    case "semen_defects": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Semen Def.</label>
                        <input type="text" value={semenDefects} onChange={e => setSemenDefects(e.target.value)} placeholder="Defects…" className={INPUT_CLS} />
                      </div>
                    );
                    case "physical_defects": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Physical Def.</label>
                        <input type="text" value={physicalDefects} onChange={e => setPhysicalDefects(e.target.value)} placeholder="Defects…" className={INPUT_CLS} />
                      </div>
                    );
                    case "breeding_sire": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Sire</label>
                        <AnimalLookup
                          value={breedingSire}
                          onChange={(v) => setBreedingSire(v)}
                          onSelect={(animal) => setBreedingSire(animal.tag)}
                          placeholder="Bull tag…"
                          sexFilter={["Bull"]}
                        />
                      </div>
                    );
                    case "breeding_date": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Breed Date</label>
                        <input type="date" value={breedingDate} onChange={e => setBreedingDate(e.target.value)} className={INPUT_CLS} />
                      </div>
                    );
                    case "breeding_type": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Method</label>
                        <select value={breedingType} onChange={e => setBreedingType(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          <option>AI</option><option>IVF</option><option>Natural</option>
                        </select>
                      </div>
                    );
                    case "estrus_status": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Estrus Status</label>
                        <select value={estrusStatus} onChange={e => setEstrusStatus(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          <option>Heat</option>
                          <option>Estrus</option>
                          <option>FTAI</option>
                          <option>Unknown</option>
                        </select>
                      </div>
                    );
                    case "technician": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Technician</label>
                        <select value={technician} onChange={e => setTechnician(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          {(technicians || []).map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                    case "cull_reason": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Cull Reason</label>
                        <select value={cullReason} onChange={e => setCullReason(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          <option>Age</option><option>Udder</option><option>Feet</option><option>Disposition</option><option>Open</option><option>Health</option><option>Body Condition</option><option>Other</option>
                        </select>
                      </div>
                    );
                    case "disposition": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Disposition</label>
                        <select value={dispositionField} onChange={e => setDispositionField(e.target.value)} className={INPUT_CLS}>
                          <option value="" disabled>Select…</option>
                          <option>Sold</option><option>Kept</option><option>Dead</option><option>Shipped</option>
                        </select>
                      </div>
                    );
                    case "sale_weight": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Sale Wt</label>
                        <input type="number" value={saleWeight} onChange={e => setSaleWeight(e.target.value)} placeholder="lbs" className={INPUT_CLS} />
                      </div>
                    );
                    case "disease": return (
                      <div key={f.key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Disease</label>
                        <input type="text" value={disease} onChange={e => setDisease(e.target.value)} placeholder="Disease…" className={INPUT_CLS} />
                      </div>
                    );
                    default: return null;
                  }
                })}
              </div>
            )}

            {/* ── OPTIONAL FIELDS (from field_visibility config, in order) ── */}
            {enabledOptionalKeys.length > 0 && (
              <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
                {enabledOptionalKeys.map(key => {
                  switch (key) {
                    case "weight": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Weight</label>
                        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="lbs" className={INPUT_CLS} />
                      </div>
                    );
                    case "quick_notes": return (
                      <div key={key} className="pt-1">
                        <button
                          type="button"
                          className="flex items-center justify-between w-full cursor-pointer"
                          style={{ background: "none", border: "none", padding: 0 }}
                          onClick={() => setQuickNotesOpen(!quickNotesOpen)}
                        >
                          <div className="flex items-center gap-2">
                            <span style={{ ...SUB_LABEL, marginBottom: 0 }}>QUICK NOTES</span>
                            {selectedNotes.length > 0 && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#55BAAA" }}>{selectedNotes.length}</span>
                            )}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                            style={{ transform: quickNotesOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
                            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {/* Collapsed: show only selected pills */}
                        {!quickNotesOpen && selectedNotes.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                            {selectedNotes.map(label => {
                              const n = QUICK_NOTES.find(q => q.label === label);
                              const tier = n?.flag || "none";
                              const solidActive: Record<string, { bg: string; border: string; text: string }> = {
                                red: { bg: "#9B2335", border: "#9B2335", text: "#FFFFFF" },
                                gold: { bg: "#B8860B", border: "#B8860B", text: "#FFFFFF" },
                                teal: { bg: "#55BAAA", border: "#3D9A8B", text: "#FFFFFF" },
                                none: { bg: "#717182", border: "#5A5A6A", text: "#FFFFFF" },
                              };
                              const s = solidActive[tier];
                              return (
                                <span key={label} style={{
                                  borderRadius: 9999, padding: "3px 9px", fontSize: 10, fontWeight: 700,
                                  backgroundColor: s.bg, border: `1.5px solid ${s.border}`, color: s.text,
                                  display: "flex", alignItems: "center", gap: 3,
                                }}>
                                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5L4 7L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {!quickNotesOpen && selectedNotes.length === 0 && (
                          <div style={{ fontSize: 11, color: "rgba(26,26,26,0.30)", marginTop: 4 }}>None selected</div>
                        )}

                        {/* Expanded: show all pills for toggling */}
                        {quickNotesOpen && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                            {QUICK_NOTES.filter(n => n.context === "all").map(n => {
                              const active = selectedNotes.includes(n.label);
                              const c = QUICK_NOTE_PILL_COLORS[n.flag || "none"];
                              const solidActive: Record<string, { bg: string; border: string; text: string }> = {
                                red: { bg: "#9B2335", border: "#9B2335", text: "#FFFFFF" },
                                gold: { bg: "#B8860B", border: "#B8860B", text: "#FFFFFF" },
                                teal: { bg: "#55BAAA", border: "#3D9A8B", text: "#FFFFFF" },
                                none: { bg: "#717182", border: "#5A5A6A", text: "#FFFFFF" },
                              };
                              const tier = n.flag || "none";
                              const s = active ? solidActive[tier] : null;
                              return (
                                <button
                                  key={n.label}
                                  type="button"
                                  onClick={() => {
                                    if (active) setSelectedNotes(selectedNotes.filter(x => x !== n.label));
                                    else setSelectedNotes([...selectedNotes, n.label]);
                                  }}
                                  style={{
                                    borderRadius: 9999, padding: "4px 10px", fontSize: 11,
                                    fontWeight: active ? 700 : 600,
                                    backgroundColor: active ? s!.bg : c.bg,
                                    border: `${active ? 2 : 1}px solid ${active ? s!.border : c.border}`,
                                    color: active ? s!.text : c.text,
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 3, transition: "all 100ms",
                                  }}
                                >
                                  {active && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                      <path d="M2 5L4 7L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                  {n.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                    case "dna": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>DNA</label>
                        <input type="text" value={sampleId} onChange={e => setSampleId(e.target.value)} placeholder="DNA/sample ID" className={INPUT_CLS} />
                      </div>
                    );
                    case "memo": return (
                      <div key={key} className="pt-2">
                        <div style={{ ...SUB_LABEL, marginBottom: 6 }}>NOTES</div>
                        <textarea
                          value={memo} onChange={e => setMemo(e.target.value)}
                          className="w-full resize-none rounded-lg px-3 py-2.5 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
                          style={{ minHeight: 56, backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
                        />
                      </div>
                    );
                    case "tag_color": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Tag Color</label>
                        <select value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className={INPUT_CLS}>
                          <option value="">Select…</option>
                          {TAG_COLOR_OPTIONS.map(c => <option key={c} value={c === "None" ? "" : c}>{c}</option>)}
                        </select>
                      </div>
                    );
                    case "data1": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Data 1</label>
                        <input type="text" value={data1} onChange={e => setData1(e.target.value)} placeholder="Custom…" className={INPUT_CLS} />
                      </div>
                    );
                    case "data2": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Data 2</label>
                        <input type="text" value={data2} onChange={e => setData2(e.target.value)} placeholder="Custom…" className={INPUT_CLS} />
                      </div>
                    );
                    case "lot": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Lot</label>
                        <input type="text" value={lot} onChange={e => setLot(e.target.value)} placeholder="Lot #" className={INPUT_CLS} />
                      </div>
                    );
                    case "sample": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Sample</label>
                        <input type="text" value={sampleField} onChange={e => setSampleField(e.target.value)} placeholder="Sample ID" className={INPUT_CLS} />
                      </div>
                    );
                    case "pen": return (
                      <div key={key} className="flex items-center gap-2 min-w-0">
                        <label style={LABEL_STYLE}>Pen</label>
                        <input type="text" value={pen} onChange={e => setPen(e.target.value)} placeholder="Pen #" className={INPUT_CLS} />
                      </div>
                    );
                    default: return null;
                  }
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
                style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
                onClick={clearForm}
              >
                Reset
              </button>
              <button
                className="rounded-full py-3.5 bg-[#F3D12A] cursor-pointer active:scale-[0.97]"
                style={{ flex: 2, fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none", opacity: saving ? 0.5 : 1 }}
                disabled={saving}
                onClick={saveAndNext}
              >
                {saving ? "Saving..." : editingRecord ? "Update" : "Save & Next"}
              </button>
            </div>
          </>
        )}

        {/* =================== ANIMALS WORKED TAB =================== */}
        {activeTab === "worked" && (
          <>
            <div className="flex items-center gap-2">
              <div style={SUB_LABEL}>
                ANIMALS WORKED · {worked.length}
              </div>
              {worked.filter(a => a.is_new_animal).length > 0 && (
                <span
                  className="rounded-full"
                  style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.20)", color: "#B8960F" }}
                >
                  {worked.filter(a => a.is_new_animal).length} new
                </span>
              )}
            </div>
            <div className="space-y-2">
              {worked.map((a, i) => {
                const preg = a.preg_stage || "—";
                const pregColor = preg === "Confirmed" ? { bg: "rgba(85,186,170,0.15)", color: "#55BAAA" }
                  : preg === "Open" ? { bg: "rgba(232,116,97,0.15)", color: "#E87461" }
                    : { bg: "rgba(240,240,240,0.10)", color: "rgba(240,240,240,0.50)" };
                const animalTag = (a.animal as any)?.tag || "Unknown";
                return (
                  <div key={a.id || i} className="rounded-xl px-3 py-3.5 bg-[#0E2646] cursor-pointer active:scale-[0.98] transition-all"
                    onClick={() => (a.animal as any)?.id && navigate("/animals/" + (a.animal as any).id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(240,240,240,0.90)" }}>{animalTag}</span>
                        {a.is_new_animal && (
                          <span
                            className="rounded-full"
                            style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.20)", color: "#F3D12A" }}
                          >
                            NEW
                          </span>
                        )}
                      </div>
                      <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: pregColor.bg, color: pregColor.color }}>
                        {preg}
                      </span>
                    </div>
                    {(a.weight || a.memo) && (
                      <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", marginTop: 4 }}>
                        {a.weight && `${a.weight} lbs`}{a.weight && a.memo ? " · " : ""}{a.memo || ""}
                      </div>
                    )}
                    {/* Phase F: Show additional products if any */}
                    {a.additional_products && Array.isArray(a.additional_products) && (a.additional_products as any[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(a.additional_products as any[]).map((ap: any, j: number) => (
                          <span
                            key={j}
                            className="rounded-full"
                            style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", backgroundColor: "rgba(85,186,170,0.15)", color: "#A8E6DA" }}
                          >
                            + {ap.product_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {worked.length === 0 && (
                <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", textAlign: "center", padding: 24 }}>No animals worked yet</div>
              )}
            </div>

            {/* Phase D: Expected animals section */}
            {stillExpected.length > 0 && (
              <>
                <div style={{ ...SUB_LABEL, marginTop: 16 }}>
                  EXPECTED · {stillExpected.length}
                </div>
                <div className="space-y-1">
                  {stillExpected.map(e => {
                    const animal = e.animal as any;
                    if (!animal) return null;
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer active:bg-[rgba(26,26,26,0.02)]"
                        style={{ border: "1px solid rgba(212,212,208,0.40)" }}
                        onClick={() => {
                          setTagField(animal.tag);
                          lookupTag(animal.tag);
                          setActiveTab("input");
                        }}
                      >
                        {animal.tag_color && (
                          <span
                            className="shrink-0 rounded-full"
                            style={{ width: 8, height: 8, backgroundColor: TAG_COLOR_HEX[animal.tag_color] || "#999" }}
                          />
                        )}
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{animal.tag}</span>
                        <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>
                          {[animal.type, animal.breed].filter(Boolean).join(" · ")}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto shrink-0">
                          <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="rgba(26,26,26,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* =================== STATS TAB =================== */}
        {activeTab === "stats" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: worked.length, label: "WORKED" },
                { value: confirmedCount, label: "CONFIRMED" },
                { value: openCount, label: "OPEN" },
                { value: `${avgWeight} lbs`, label: "AVG WEIGHT" },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-4 py-3.5" style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(168,230,218,0.70)", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Preg breakdown */}
            <div className="rounded-xl bg-white px-3 py-3.5" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0E2646", marginBottom: 12 }}>Preg Results</div>
              {[
                { label: "Confirmed", count: confirmedCount, color: "#55BAAA" },
                { label: "Open", count: openCount, color: "#E87461" },
                { label: "Suspect", count: suspectCount, color: "#F3D12A" },
              ].map(r => {
                const total = worked.length || 1;
                return (
                  <div key={r.label} className="flex items-center gap-3 mb-2">
                    <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: r.color }} />
                    <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{r.label}</span>
                    <div className="rounded-full" style={{ flex: 2, height: 6, backgroundColor: "rgba(26,26,26,0.06)" }}>
                      <div className="rounded-full" style={{ height: 6, backgroundColor: r.color, width: `${(r.count / total) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", minWidth: 20, textAlign: "right" }}>{r.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================== DETAILS TAB =================== */}
        {activeTab === "details" && (
          <div className="rounded-xl bg-white px-3 py-3.5 space-y-3" style={{ border: isEditingProject ? "2px solid #F3D12A" : "1px solid rgba(212,212,208,0.60)" }}>
            <div className="flex items-center justify-between">
              <div style={SUB_LABEL}>{isEditingProject ? "EDITING PROJECT" : "PROJECT DETAILS"}</div>
              <div className="flex items-center gap-2">
                {!isEditingProject ? (
                  <>
                    <button
                      className="rounded-lg px-3 py-1.5 cursor-pointer active:scale-[0.97]"
                      style={{ fontSize: 12, fontWeight: 600, color: "#0E2646", backgroundColor: "rgba(14,38,70,0.06)", border: "none" }}
                      onClick={startEditingProject}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg px-3 py-1.5 cursor-pointer active:scale-[0.97]"
                      style={{ fontSize: 12, fontWeight: 600, color: "#D4183D", backgroundColor: "rgba(212,24,61,0.06)", border: "none" }}
                      onClick={async () => {
                        if (!confirm("Delete this project? This cannot be undone.")) return;
                        const { error } = await supabase.from("projects").delete().eq("id", id!);
                        if (error) { showToast("error", error.message); return; }
                        showToast("success", "Project deleted");
                        navigate("/cow-work");
                      }}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="rounded-lg px-3 py-1.5 cursor-pointer active:scale-[0.97]"
                      style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.50)", backgroundColor: "rgba(26,26,26,0.06)", border: "none" }}
                      onClick={() => setIsEditingProject(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-lg px-3 py-1.5 cursor-pointer active:scale-[0.97]"
                      style={{ fontSize: 12, fontWeight: 700, color: "#1A1A1A", backgroundColor: "#F3D12A", border: "none", opacity: editSaving ? 0.5 : 1 }}
                      disabled={editSaving}
                      onClick={saveProjectEdits}
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* VIEW MODE */}
            {!isEditingProject && (
              <>
                {[
                  ["Date", projectDate],
                  ["Type", projectType],
                  ["Group", projectGroup],
                  ["Location", projectLocation],
                  ["Status", projectStatus],
                  ["Head Expected", String(headCount)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2 min-w-0">
                    <span style={LABEL_STYLE}>{label}</span>
                    <span style={{ fontSize: 14, color: "rgba(26,26,26,0.70)" }}>{value || "—"}</span>
                  </div>
                ))}
                {project?.description && (
                  <div className="pt-1">
                    <div style={{ ...SUB_LABEL, marginBottom: 4 }}>MEMO</div>
                    <div style={{ fontSize: 13, color: "rgba(26,26,26,0.60)", lineHeight: 1.5 }}>{project.description}</div>
                  </div>
                )}
              </>
            )}

            {/* EDIT MODE */}
            {isEditingProject && (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <label style={LABEL_STYLE}>Date</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className={INPUT_CLS} />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <label style={LABEL_STYLE}>Type</label>
                  <span style={{ fontSize: 14, color: "rgba(26,26,26,0.40)" }}>{projectType} (locked)</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <label style={LABEL_STYLE}>Group</label>
                  <select value={editGroupId} onChange={e => setEditGroupId(e.target.value)} className={INPUT_CLS}>
                    <option value="">None</option>
                    {(groups || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <label style={LABEL_STYLE}>Location</label>
                  <select value={editLocationId} onChange={e => setEditLocationId(e.target.value)} className={INPUT_CLS}>
                    <option value="">None</option>
                    {(locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <label style={LABEL_STYLE}>Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className={INPUT_CLS}>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <label style={LABEL_STYLE}>Head Expected</label>
                  <input type="number" value={editHeadCount} onChange={e => setEditHeadCount(e.target.value)} placeholder="Optional" className={INPUT_CLS} />
                </div>
                <div className="pt-1">
                  <div style={{ ...SUB_LABEL, marginBottom: 4 }}>MEMO</div>
                  <textarea
                    value={editMemo} onChange={e => setEditMemo(e.target.value)}
                    className="w-full resize-none rounded-lg px-3 py-2.5 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
                    style={{ minHeight: 56, backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
                  />
                </div>
              </>
            )}

            <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", margin: "8px 0" }} />

            <div style={SUB_LABEL}>PRODUCTS GIVEN</div>

            {/* VIEW MODE products */}
            {!isEditingProject && (
              <>
                {(projectProducts || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No products configured</div>
                ) : (
                  <div className="space-y-1">
                    {(projectProducts || []).map((pp: any, i: number) => (
                      <div key={pp.id || i} className="flex items-center gap-2">
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{(pp.product as any)?.name || pp.product_name || "Unknown"}</span>
                        <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>
                          {[(pp.product as any)?.dosage, (pp.product as any)?.route].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* EDIT MODE products — searchable multi-select */}
            {isEditingProject && (
              <div className="space-y-2">
                {/* Current selections as removable pills */}
                <div className="flex flex-wrap gap-1.5">
                  {editProducts.map((p, i) => (
                    <span key={p.id} className="flex items-center gap-1 rounded-full" style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px 3px 10px", backgroundColor: "rgba(85,186,170,0.12)", color: "#1A1A1A" }}>
                      {p.name}
                      <button
                        className="cursor-pointer"
                        style={{ background: "none", border: "none", fontSize: 13, color: "rgba(26,26,26,0.40)", lineHeight: 1, padding: 0 }}
                        onClick={() => setEditProducts(prev => prev.filter((_, idx) => idx !== i))}
                      >×</button>
                    </span>
                  ))}
                  {editProducts.length === 0 && (
                    <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)" }}>No products — tap below to add</span>
                  )}
                </div>

                {!editProductPickerOpen ? (
                  <button
                    className="rounded-full px-4 py-2 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
                    style={{ fontSize: 13, fontWeight: 600, color: "#0E2646" }}
                    onClick={() => setEditProductPickerOpen(true)}
                  >
                    + Add Products
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 h-10" style={{ border: "1px solid #D4D4D0" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.30)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        value={editProductSearch}
                        onChange={e => setEditProductSearch(e.target.value)}
                        placeholder="Search products…"
                        className="flex-1 outline-none bg-transparent"
                        style={{ fontSize: 16, color: "#1A1A1A" }}
                      />
                      {editProductSearch && (
                        <button className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer" style={{ backgroundColor: "rgba(26,26,26,0.08)", fontSize: 11, color: "rgba(26,26,26,0.50)", border: "none" }} onClick={() => setEditProductSearch("")}>×</button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg" style={{ border: "1px solid #D4D4D0" }}>
                      {(allProducts || [])
                        .filter(p => !editProductSearch || p.name.toLowerCase().includes(editProductSearch.toLowerCase()))
                        .map(prod => {
                          const isSelected = editProducts.some(p => p.id === prod.id);
                          return (
                            <button
                              key={prod.id}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 cursor-pointer"
                              style={{ background: isSelected ? "rgba(85,186,170,0.08)" : "white", border: "none", borderBottom: "1px solid rgba(26,26,26,0.06)", textAlign: "left" as const }}
                              onClick={() => {
                                if (isSelected) {
                                  setEditProducts(prev => prev.filter(p => p.id !== prod.id));
                                } else {
                                  setEditProducts(prev => [...prev, { id: prod.id, name: prod.name, dosage: prod.dosage || "", route: prod.route || "" }]);
                                }
                              }}
                            >
                              <div className="shrink-0 rounded flex items-center justify-center" style={{ width: 20, height: 20, border: isSelected ? "none" : "2px solid #D4D4D0", backgroundColor: isSelected ? "#55BAAA" : "white" }}>
                                {isSelected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              </div>
                              <span className="truncate" style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: "#1A1A1A" }}>{prod.name}</span>
                            </button>
                          );
                        })}
                    </div>
                    <button
                      className="rounded-full px-4 py-1.5 bg-[#0E2646] cursor-pointer active:scale-[0.97]"
                      style={{ fontSize: 12, fontWeight: 700, color: "white", border: "none" }}
                      onClick={() => { setEditProductPickerOpen(false); setEditProductSearch(""); }}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", margin: "8px 0" }} />

            {projectStatus !== "Completed" && !isEditingProject && (
              <button
                className="w-full rounded-full py-3.5 mb-3 cursor-pointer active:scale-[0.98] transition-all"
                style={{ fontSize: 14, fontWeight: 700, backgroundColor: "#F3D12A", color: "#1A1A1A", border: "none" }}
                onClick={() => navigate("/cow-work/" + id + "/close-out")}
              >
                Complete Project
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
