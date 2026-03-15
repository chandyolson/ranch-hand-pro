// src/components/BlockLibraryPanel.tsx
// Reusable block library panel with full CRUD.
// Used in ProtocolTemplateBuilderScreen (and anywhere blocks are needed).
// Self-contained: own queries, mutations, inline editor form.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { COLORS } from "@/lib/constants";
import { INPUT_CLS } from "@/lib/styles";
import { WORK_TYPES } from "@/lib/constants";
import { PROTOCOL_ANIMAL_TYPES, CLASS_BADGE_COLORS } from "@/lib/protocol-constants";
import {
  Layers, Plus, X, Pencil, Trash2, ChevronDown, ChevronUp,
  Check, Package,
} from "lucide-react";
import ProductSearchModal, { type SelectedProduct } from "@/components/ProductSearchModal";

// ── Types ──

export interface BlockData {
  id: string;
  name: string;
  work_type_code: string;
  animal_class: string;
  description: string | null;
  default_products: BlockProduct[];
  clinical_notes: string | null;
  equipment_notes: string | null;
}

export interface BlockProduct {
  product_id: string;
  product_name: string;
  dosage: string | null;
  route: string | null;
  injection_site: string | null;
  notes: string | null;
}

interface BlockLibraryPanelProps {
  /** Filter blocks to this animal class. Required. */
  animalClass: string;
  /** Block IDs already used in the current template (shown as "ADDED"). */
  usedBlockIds?: Set<string>;
  /** Callback when user taps a block to add it as a stage. */
  onAddBlock?: (block: BlockData) => void;
  /** Whether the panel starts open or collapsed. Default: false (collapsed). */
  defaultOpen?: boolean;
}

// ── Editor form state ──

interface EditorState {
  mode: "create" | "edit";
  blockId: string | null;
  name: string;
  animalClass: string;
  workTypeCode: string;
  description: string;
  clinicalNotes: string;
  equipmentNotes: string;
  products: BlockProduct[];
}

const EMPTY_EDITOR: EditorState = {
  mode: "create",
  blockId: null,
  name: "",
  animalClass: "",
  workTypeCode: "",
  description: "",
  clinicalNotes: "",
  equipmentNotes: "",
  products: [],
};

// ── Component ──

export default function BlockLibraryPanel({
  animalClass,
  usedBlockIds = new Set(),
  onAddBlock,
  defaultOpen = false,
}: BlockLibraryPanelProps) {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Query blocks ──
  const { data: blocks, isLoading } = useQuery({
    queryKey: ["protocol-blocks", operationId, animalClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_blocks")
        .select("*")
        .eq("operation_id", operationId)
        .eq("animal_class", animalClass)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as BlockData[];
    },
    enabled: !!operationId && !!animalClass,
  });

  // ── Save block (create or update) ──
  const saveMutation = useMutation({
    mutationFn: async (state: EditorState) => {
      if (!state.name.trim()) throw new Error("Block name is required");
      if (!state.workTypeCode) throw new Error("Work type is required");

      const payload = {
        operation_id: operationId,
        name: state.name.trim(),
        animal_class: state.animalClass || animalClass,
        work_type_code: state.workTypeCode,
        description: state.description.trim() || null,
        clinical_notes: state.clinicalNotes.trim() || null,
        equipment_notes: state.equipmentNotes.trim() || null,
        default_products: state.products as any,
      };

      if (state.mode === "edit" && state.blockId) {
        const { error } = await supabase
          .from("protocol_blocks")
          .update(payload)
          .eq("id", state.blockId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("protocol_blocks")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-blocks"] });
      setEditor(null);
    },
  });

  // ── Delete block ──
  const deleteMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from("protocol_blocks")
        .delete()
        .eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-blocks"] });
      setDeleteConfirmId(null);
    },
  });

  // ── Editor helpers ──

  const openCreateEditor = () => {
    setEditor({
      ...EMPTY_EDITOR,
      animalClass,
    });
  };

  const openEditEditor = (block: BlockData) => {
    setEditor({
      mode: "edit",
      blockId: block.id,
      name: block.name,
      animalClass: block.animal_class,
      workTypeCode: block.work_type_code,
      description: block.description || "",
      clinicalNotes: block.clinical_notes || "",
      equipmentNotes: block.equipment_notes || "",
      products: [...(block.default_products || [])],
    });
  };

  const handleProductSelected = (product: SelectedProduct) => {
    if (!editor) return;
    setEditor({
      ...editor,
      products: [
        ...editor.products,
        {
          product_id: product.product_id,
          product_name: product.name,
          dosage: product.dosage,
          route: product.route,
          injection_site: product.injection_site || null,
          notes: null,
        },
      ],
    });
  };

  const removeEditorProduct = (idx: number) => {
    if (!editor) return;
    setEditor({
      ...editor,
      products: editor.products.filter((_, i) => i !== idx),
    });
  };

  // Work types filtered to the current animal class
  const relevantWorkTypes = WORK_TYPES.filter(
    (wt) => wt.appliesTo === "All" || wt.appliesTo.includes(animalClass)
  );

  const blockCount = (blocks || []).length;

  return (
    <div className="space-y-2">
      {/* ── Collapse toggle bar ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 active:scale-[0.98] transition-all"
        style={{
          backgroundColor: "rgba(85,186,170,0.08)",
          border: "1px solid rgba(85,186,170,0.25)",
        }}
      >
        <div className="flex items-center gap-2">
          <Layers size={16} style={{ color: COLORS.teal }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.teal }}>
            Block Library
          </span>
          <span style={{ fontSize: 12, color: COLORS.mutedText }}>
            {blockCount} available
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: COLORS.teal,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms",
          }}
        />
      </button>

      {/* ── Expanded content ── */}
      {isOpen && (
        <div className="space-y-2">
          {/* Empty state */}
          {!isLoading && blockCount === 0 && !editor && (
            <div
              className="py-4 text-center"
              style={{ fontSize: 13, color: COLORS.mutedText }}
            >
              No blocks for {animalClass} yet
            </div>
          )}

          {/* ── Block cards ── */}
          {(blocks || []).map((block) => {
            const isUsed = usedBlockIds.has(block.id);
            const productCount = (block.default_products || []).length;
            const isDeleting = deleteConfirmId === block.id;

            return (
              <div
                key={block.id}
                className="rounded-lg bg-white shadow-sm overflow-hidden"
                style={{
                  border: `1px solid ${COLORS.borderDivider}`,
                  borderLeft: `4px solid ${isUsed ? COLORS.mutedText : COLORS.gold}`,
                }}
              >
                {/* Card content — tappable to add */}
                <button
                  onClick={() => {
                    if (!isUsed && onAddBlock) onAddBlock(block);
                  }}
                  disabled={isUsed || !onAddBlock}
                  className="w-full text-left px-3 py-2.5 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: COLORS.textOnLight,
                      }}
                    >
                      {block.name}
                    </span>
                    {isUsed && (
                      <span
                        className="rounded-full px-2 py-0.5"
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          backgroundColor: "rgba(85,186,170,0.12)",
                          color: COLORS.teal,
                        }}
                      >
                        ADDED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        backgroundColor: "rgba(14,38,70,0.06)",
                        color: COLORS.navy,
                      }}
                    >
                      {block.work_type_code}
                    </span>
                    <span style={{ fontSize: 11, color: COLORS.mutedText }}>
                      {productCount} product{productCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {block.description && (
                    <div
                      className="truncate mt-1"
                      style={{ fontSize: 12, color: COLORS.mutedText }}
                    >
                      {block.description}
                    </div>
                  )}
                </button>

                {/* Edit / Delete row */}
                <div
                  className="flex items-center justify-end gap-1 px-2 py-1.5"
                  style={{
                    borderTop: `1px solid ${COLORS.borderDivider}`,
                    backgroundColor: "#FAFAF8",
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: COLORS.destructiveRed,
                          marginRight: "auto",
                          paddingLeft: 4,
                        }}
                      >
                        Delete this block?
                      </span>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold active:scale-95"
                        style={{
                          color: COLORS.mutedText,
                          border: `1px solid ${COLORS.borderDivider}`,
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(block.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold active:scale-95 disabled:opacity-50"
                        style={{
                          backgroundColor: COLORS.destructiveRed,
                          color: "#FFFFFF",
                        }}
                      >
                        {deleteMutation.isPending ? "…" : "Delete"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEditor(block);
                        }}
                        className="rounded-md p-1.5 hover:bg-gray-100 active:bg-gray-200"
                        title="Edit block"
                      >
                        <Pencil size={14} style={{ color: COLORS.mutedText }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(block.id);
                        }}
                        className="rounded-md p-1.5 hover:bg-gray-100 active:bg-gray-200"
                        title="Delete block"
                      >
                        <Trash2
                          size={14}
                          style={{ color: COLORS.destructiveRed }}
                        />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Block Editor (inline, replaces the + New Block button when open) ── */}
          {editor && (
            <div
              className="rounded-lg bg-white shadow-md overflow-hidden"
              style={{
                border: `2px solid ${COLORS.teal}`,
              }}
            >
              {/* Editor header */}
              <div
                className="px-3 py-2.5 flex items-center justify-between"
                style={{
                  backgroundColor: "rgba(85,186,170,0.08)",
                  borderBottom: `1px solid rgba(85,186,170,0.25)`,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: COLORS.teal,
                  }}
                >
                  {editor.mode === "edit" ? "Edit Block" : "New Block"}
                </span>
                <button
                  onClick={() => setEditor(null)}
                  className="p-1 rounded hover:bg-gray-100 active:bg-gray-200"
                >
                  <X size={16} style={{ color: COLORS.mutedText }} />
                </button>
              </div>

              <div className="px-3 py-3 space-y-3">
                {/* Block name */}
                <div className="space-y-1">
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.mutedText,
                    }}
                  >
                    Block Name *
                  </label>
                  <input
                    className={INPUT_CLS}
                    style={{ width: "100%", fontSize: 16 }}
                    placeholder="e.g., First Working (Branding)"
                    value={editor.name}
                    onChange={(e) =>
                      setEditor({ ...editor, name: e.target.value })
                    }
                  />
                </div>

                {/* Work type code */}
                <div className="space-y-1">
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.mutedText,
                    }}
                  >
                    Work Type *
                  </label>
                  <div className="relative">
                    <select
                      className={INPUT_CLS}
                      style={{
                        width: "100%",
                        appearance: "none",
                        paddingRight: 32,
                        fontSize: 16,
                      }}
                      value={editor.workTypeCode}
                      onChange={(e) =>
                        setEditor({ ...editor, workTypeCode: e.target.value })
                      }
                    >
                      <option value="">Select work type…</option>
                      {relevantWorkTypes.map((wt) => (
                        <option key={wt.code} value={wt.code}>
                          {wt.code} — {wt.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: COLORS.mutedText }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.mutedText,
                    }}
                  >
                    Description
                  </label>
                  <input
                    className={INPUT_CLS}
                    style={{ width: "100%", fontSize: 16 }}
                    placeholder="Brief timing/purpose note"
                    value={editor.description}
                    onChange={(e) =>
                      setEditor({ ...editor, description: e.target.value })
                    }
                  />
                </div>

                {/* Clinical notes */}
                <div className="space-y-1">
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.mutedText,
                    }}
                  >
                    Clinical Notes
                  </label>
                  <textarea
                    className={INPUT_CLS}
                    style={{
                      width: "100%",
                      fontSize: 16,
                      minHeight: 60,
                      resize: "vertical",
                    }}
                    placeholder="MLV handling, cold chain, mixing instructions…"
                    value={editor.clinicalNotes}
                    onChange={(e) =>
                      setEditor({ ...editor, clinicalNotes: e.target.value })
                    }
                  />
                </div>

                {/* Equipment notes */}
                <div className="space-y-1">
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.mutedText,
                    }}
                  >
                    Equipment / Supplies
                  </label>
                  <textarea
                    className={INPUT_CLS}
                    style={{
                      width: "100%",
                      fontSize: 16,
                      minHeight: 60,
                      resize: "vertical",
                    }}
                    placeholder="Syringes, needles, applicators…"
                    value={editor.equipmentNotes}
                    onChange={(e) =>
                      setEditor({ ...editor, equipmentNotes: e.target.value })
                    }
                  />
                </div>

                {/* Products */}
                <div className="space-y-1.5">
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.mutedText,
                    }}
                  >
                    Default Products ({editor.products.length})
                  </label>

                  {editor.products.length > 0 && (
                    <div
                      className="rounded-md overflow-hidden"
                      style={{ border: `1px solid ${COLORS.borderDivider}` }}
                    >
                      {editor.products.map((p, pi) => (
                        <div
                          key={pi}
                          className="flex items-center gap-2 px-2.5 py-2"
                          style={{
                            backgroundColor:
                              pi % 2 === 1 ? "#F5F5F0" : "white",
                            borderTop:
                              pi > 0
                                ? `1px solid ${COLORS.borderDivider}`
                                : undefined,
                          }}
                        >
                          <Package
                            size={13}
                            style={{ color: COLORS.mutedText }}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className="truncate"
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: COLORS.textOnLight,
                              }}
                            >
                              {p.product_name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.route && (
                                <span
                                  className="rounded-full px-2 py-0.5"
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    backgroundColor: "rgba(14,38,70,0.08)",
                                    color: COLORS.navy,
                                  }}
                                >
                                  {p.route}
                                </span>
                              )}
                              {p.dosage && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: COLORS.mutedText,
                                  }}
                                >
                                  {p.dosage}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeEditorProduct(pi)}
                            className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 shrink-0"
                          >
                            <X
                              size={14}
                              style={{ color: COLORS.mutedText }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setProductModalOpen(true)}
                    className="w-full rounded-md px-3 py-2 text-left flex items-center gap-1.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    style={{
                      border: `1px dashed ${COLORS.borderDivider}`,
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.teal,
                      minHeight: 44,
                    }}
                  >
                    <Plus size={14} />
                    Add Product
                  </button>
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditor(null)}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold active:scale-[0.98] transition-all"
                    style={{
                      border: `1px solid ${COLORS.borderDivider}`,
                      color: COLORS.mutedText,
                      backgroundColor: "transparent",
                      minHeight: 44,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveMutation.mutate(editor)}
                    disabled={
                      saveMutation.isPending ||
                      !editor.name.trim() ||
                      !editor.workTypeCode
                    }
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: COLORS.gold,
                      color: COLORS.textOnLight,
                      minHeight: 44,
                    }}
                  >
                    {saveMutation.isPending
                      ? "Saving…"
                      : editor.mode === "edit"
                        ? "Update Block"
                        : "Save Block"}
                  </button>
                </div>

                {saveMutation.isError && (
                  <div
                    className="rounded-md px-3 py-2"
                    style={{
                      backgroundColor: "rgba(212,24,61,0.08)",
                      color: COLORS.destructiveRed,
                      fontSize: 12,
                    }}
                  >
                    {(saveMutation.error as Error).message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── "New Block" button (shown when editor is closed) ── */}
          {!editor && (
            <button
              onClick={openCreateEditor}
              className="w-full text-left rounded-lg px-3 py-2.5 active:scale-[0.98] transition-all"
              style={{
                border: `1px dashed ${COLORS.teal}`,
                backgroundColor: "rgba(85,186,170,0.04)",
              }}
            >
              <div className="flex items-center gap-2">
                <Plus size={14} style={{ color: COLORS.teal }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.teal,
                  }}
                >
                  New Block
                </span>
              </div>
            </button>
          )}

          {/* Product search modal (for editor) */}
          <ProductSearchModal
            open={productModalOpen}
            onClose={() => setProductModalOpen(false)}
            onSelect={handleProductSelected}
            excludeIds={editor?.products.map((p) => p.product_id) || []}
          />
        </div>
      )}
    </div>
  );
}
