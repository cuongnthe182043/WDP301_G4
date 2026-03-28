import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Chip, Divider, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Skeleton, Tooltip,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Ruler, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { toast } from "sonner";
import { sizeChartService } from "../../services/sizeChartService";
import { useConfirm } from "../../components/common/Confirm";

const GENDERS   = ["unisex", "men", "women"];
const UNITS     = ["cm", "in"];
const W_UNITS   = ["kg", "lb"];
const MEAS_FIELDS = [
  { key: "height_min", label: "Height min" },
  { key: "height_max", label: "Height max" },
  { key: "weight_min", label: "Weight min" },
  { key: "weight_max", label: "Weight max" },
  { key: "chest",      label: "Chest"      },
  { key: "waist",      label: "Waist"      },
  { key: "hip",        label: "Hip"        },
  { key: "shoulder",   label: "Shoulder"   },
  { key: "sleeve_length", label: "Sleeve"  },
  { key: "shirt_length",  label: "Shirt L" },
  { key: "pant_length",   label: "Pant L"  },
  { key: "neck",          label: "Neck"    },
];

const EMPTY_CHART = {
  brand_id: "", category_id: "", gender: "unisex",
  unit: "cm", weight_unit: "kg", height_unit: "cm",
  rows: [], notes: "",
};

const EMPTY_ROW = () => ({
  label: "",
  measurements: { height_min: "", height_max: "", weight_min: "", weight_max: "",
    chest: "", waist: "", hip: "", shoulder: "", sleeve_length: "", shirt_length: "",
    pant_length: "", neck: "" },
});

function numOrUndef(v) {
  const n = Number(v);
  return v === "" || v === null || v === undefined ? undefined : n;
}

/* ─── Row Editor ─── */
function RowEditor({ rows, onChange }) {
  const addRow    = () => onChange([...rows, EMPTY_ROW()]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const setLabel  = (i, v) => onChange(rows.map((r, idx) => idx === i ? { ...r, label: v } : r));
  const setMeas   = (i, k, v) => onChange(rows.map((r, idx) =>
    idx === i ? { ...r, measurements: { ...r.measurements, [k]: v } } : r));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-default-700">Size Rows</span>
        <Button size="sm" color="primary" variant="flat" startContent={<Plus size={13} />} onPress={addRow}>
          Add Row
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-center text-default-400 py-4 border border-dashed border-default-200 rounded-xl">
          No rows yet — click "Add Row" to start
        </p>
      )}

      {rows.map((row, i) => (
        <div key={i} className="border border-default-200 rounded-xl p-3 space-y-2 bg-default-50/50">
          <div className="flex items-center gap-2">
            <Input
              label="Label"
              placeholder="S / M / L / 38 …"
              value={row.label}
              onValueChange={(v) => setLabel(i, v)}
              size="sm"
              radius="lg"
              variant="bordered"
              className="w-28 flex-shrink-0"
            />
            <Button
              isIconOnly size="sm" variant="light" color="danger"
              onPress={() => removeRow(i)}
              className="ml-auto flex-shrink-0"
            >
              <Trash2 size={14} />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MEAS_FIELDS.map(({ key, label }) => (
              <Input
                key={key}
                label={label}
                placeholder="–"
                type="number"
                min="0"
                value={row.measurements?.[key] ?? ""}
                onValueChange={(v) => setMeas(i, key, v)}
                size="sm"
                radius="lg"
                variant="bordered"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Chart Modal ─── */
function ChartModal({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(EMPTY_CHART);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        // Stringify measurement values so inputs show them
        const rows = (initial.rows || []).map((r) => ({
          label: r.label,
          measurements: Object.fromEntries(
            MEAS_FIELDS.map(({ key }) => [key, r.measurements?.[key] ?? ""])
          ),
        }));
        setForm({ ...EMPTY_CHART, ...initial, rows });
      } else {
        setForm(EMPTY_CHART);
      }
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.gender) return toast.error("Gender is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        rows: form.rows
          .filter((r) => r.label.trim())
          .map((r) => ({
            label: r.label.trim().toUpperCase(),
            measurements: Object.fromEntries(
              Object.entries(r.measurements)
                .filter(([, v]) => v !== "" && v !== null)
                .map(([k, v]) => [k, Number(v)])
            ),
          })),
      };
      if (initial?._id) {
        await sizeChartService.update(initial._id, payload);
      } else {
        await sizeChartService.create(payload);
      }
      toast.success(initial ? "Size chart updated" : "Size chart created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={open} onOpenChange={(o) => !o && onClose()} size="3xl" radius="2xl" backdrop="blur" scrollBehavior="inside">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Ruler size={18} className="text-primary" />
              {initial ? "Edit Size Chart" : "New Size Chart"}
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Brand ID" placeholder="brand-xxx (leave blank for all)" size="sm" radius="lg" variant="bordered"
                  value={form.brand_id} onValueChange={(v) => set("brand_id", v)} />
                <Input label="Category ID" placeholder="cat-xxx (leave blank for all)" size="sm" radius="lg" variant="bordered"
                  value={form.category_id} onValueChange={(v) => set("category_id", v)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Select label="Gender" size="sm" radius="lg" variant="bordered"
                  selectedKeys={new Set([form.gender])}
                  onSelectionChange={(k) => set("gender", Array.from(k)[0])}>
                  {GENDERS.map((g) => <SelectItem key={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>)}
                </Select>
                <Select label="Body unit" size="sm" radius="lg" variant="bordered"
                  selectedKeys={new Set([form.unit])}
                  onSelectionChange={(k) => set("unit", Array.from(k)[0])}>
                  {UNITS.map((u) => <SelectItem key={u}>{u}</SelectItem>)}
                </Select>
                <Select label="Weight unit" size="sm" radius="lg" variant="bordered"
                  selectedKeys={new Set([form.weight_unit])}
                  onSelectionChange={(k) => set("weight_unit", Array.from(k)[0])}>
                  {W_UNITS.map((u) => <SelectItem key={u}>{u}</SelectItem>)}
                </Select>
              </div>

              <Input label="Notes (optional)" size="sm" radius="lg" variant="bordered"
                value={form.notes} onValueChange={(v) => set("notes", v)} />

              <Divider />

              <RowEditor rows={form.rows} onChange={(rows) => set("rows", rows)} />
            </ModalBody>

            <ModalFooter>
              <Button variant="light" radius="lg" onPress={close}>Cancel</Button>
              <Button color="primary" radius="lg" isLoading={saving} onPress={save} className="font-bold">
                {initial ? "Save Changes" : "Create"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

/* ─── Chart Card ─── */
function ChartCard({ chart, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const genderColor = { men: "primary", women: "secondary", unisex: "default" };

  return (
    <div className="bg-white dark:bg-[#131620] border border-default-200 dark:border-[#2e3347] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Ruler size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-default-800 truncate">
            {chart.brand_id || "All Brands"} — {chart.category_id || "All Categories"}
          </p>
          <p className="text-xs text-default-400">
            {chart.rows?.length || 0} sizes · {chart.unit} / {chart.weight_unit}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Chip size="sm" color={genderColor[chart.gender]} variant="flat">{chart.gender}</Chip>
          {!chart.is_active && <Chip size="sm" color="danger" variant="flat">Inactive</Chip>}
          <Tooltip content="Edit">
            <Button isIconOnly size="sm" variant="light" onPress={() => onEdit(chart)}>
              <Pencil size={13} />
            </Button>
          </Tooltip>
          <Tooltip content="Delete">
            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDelete(chart)}>
              <Trash2 size={13} />
            </Button>
          </Tooltip>
          <Button isIconOnly size="sm" variant="light" onPress={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </div>

      {/* Expanded rows table */}
      {expanded && chart.rows?.length > 0 && (
        <div className="border-t border-default-100 dark:border-[#222738] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-default-50 dark:bg-[#1a1e2e]">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-default-600">Size</th>
                {MEAS_FIELDS.filter(({ key }) =>
                  chart.rows.some((r) => r.measurements?.[key] != null)
                ).map(({ key, label }) => (
                  <th key={key} className="px-3 py-2 text-left font-bold text-default-600">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((r, i) => {
                const visibleFields = MEAS_FIELDS.filter(({ key }) =>
                  chart.rows.some((row) => row.measurements?.[key] != null)
                );
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-[#131620]" : "bg-default-50/50 dark:bg-[#1a1e2e]/50"}>
                    <td className="px-3 py-2 font-black text-primary">{r.label || "—"}</td>
                    {visibleFields.map(({ key }) => (
                      <td key={key} className="px-3 py-2 text-default-600">{r.measurements?.[key] ?? "—"}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {expanded && (!chart.rows || chart.rows.length === 0) && (
        <p className="text-xs text-center text-default-400 py-4 border-t border-default-100">No rows</p>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function SizeChartsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const [charts,  setCharts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);   // chart being edited, or null = new

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await sizeChartService.list({ limit: 100 });
      setCharts(items);
    } catch { toast.error("Failed to load size charts"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setModal(true); };
  const openEdit = (c) => { setEditing(c);   setModal(true); };

  const handleDelete = async (chart) => {
    const ok = await confirm({
      title: "Delete Size Chart",
      description: `Delete chart for "${chart.brand_id || "All Brands"} — ${chart.category_id || "All Categories"}"?`,
      confirmLabel: "Delete",
      confirmColor: "danger",
    });
    if (!ok) return;
    try {
      await sizeChartService.remove(chart._id);
      toast.success("Deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-black text-default-900">AI Size Charts</h1>
          </div>
          <p className="text-sm text-default-500">
            Define size charts — XGBoost trains automatically from your rows to give AI-powered fit recommendations.
          </p>
        </div>
        <Button color="primary" radius="lg" startContent={<Plus size={15} />} onPress={openNew} className="font-bold flex-shrink-0">
          New Chart
        </Button>
      </div>

      {/* How it works banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-800 border border-blue-100 dark:border-[#2e3347] rounded-2xl p-4">
        <p className="text-sm font-bold text-default-700 mb-1 flex items-center gap-2">
          <Bot size={14} className="text-primary" /> How XGBoost AI works
        </p>
        <p className="text-xs text-default-500 leading-relaxed">
          Each chart row (S, M, L…) defines the body measurement ranges for that size.
          When a customer enters their measurements, the AI trains a classifier from your rows,
          then predicts probability of fit for each size. The model is cached and auto-invalidated when you update a chart.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : charts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-default-200 rounded-2xl">
          <Ruler size={36} className="mx-auto mb-3 text-default-300" />
          <p className="font-bold text-default-500 mb-1">No size charts yet</p>
          <p className="text-sm text-default-400 mb-4">Create one to enable AI size recommendations for your products</p>
          <Button color="primary" radius="lg" startContent={<Plus size={14} />} onPress={openNew}>Create first chart</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {charts.map((c) => (
            <ChartCard key={c._id} chart={c} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <ChartModal open={modal} onClose={() => setModal(false)} initial={editing} onSaved={load} />
    </div>
  );
}
