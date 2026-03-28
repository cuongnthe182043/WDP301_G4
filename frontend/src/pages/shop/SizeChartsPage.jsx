import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Chip, Divider, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Skeleton, Switch, Tooltip,
} from "@heroui/react";
import {
  Plus, Pencil, Trash2, Ruler, ChevronDown, ChevronUp,
  Bot, Search, Tag, Package, Users, ToggleLeft,
} from "lucide-react";
import { sizeChartService } from "../../services/sizeChartService";
import { brandApi } from "../../services/brandService";
import { categoryApi } from "../../services/categoryService";
import { useConfirm } from "../../components/common/Confirm";
import { useToast } from "../../components/common/ToastProvider";

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDERS = [
  { key: "unisex", labelVI: "Unisex",    labelEN: "Unisex"   },
  { key: "men",    labelVI: "Nam",        labelEN: "Men"      },
  { key: "women",  labelVI: "Nữ",         labelEN: "Women"    },
];

const UNITS   = ["cm", "in"];
const W_UNITS = ["kg", "lb"];

const MEAS_FIELDS = [
  { key: "height_min",    labelVI: "Chiều cao min",    labelEN: "Height min",     group: "body"    },
  { key: "height_max",    labelVI: "Chiều cao max",    labelEN: "Height max",     group: "body"    },
  { key: "weight_min",    labelVI: "Cân nặng min",     labelEN: "Weight min",     group: "body"    },
  { key: "weight_max",    labelVI: "Cân nặng max",     labelEN: "Weight max",     group: "body"    },
  { key: "chest",         labelVI: "Ngực",             labelEN: "Chest",          group: "upper"   },
  { key: "shoulder",      labelVI: "Vai",              labelEN: "Shoulder",       group: "upper"   },
  { key: "sleeve_length", labelVI: "Dài tay",          labelEN: "Sleeve",         group: "upper"   },
  { key: "shirt_length",  labelVI: "Dài áo",           labelEN: "Shirt length",   group: "upper"   },
  { key: "neck",          labelVI: "Cổ",               labelEN: "Neck",           group: "upper"   },
  { key: "waist",         labelVI: "Eo",               labelEN: "Waist",          group: "lower"   },
  { key: "hip",           labelVI: "Hông",             labelEN: "Hip",            group: "lower"   },
  { key: "pant_length",   labelVI: "Dài quần",         labelEN: "Pant length",    group: "lower"   },
];

const EMPTY_CHART = {
  name: "", brand_id: "", category_id: "", gender: "unisex",
  unit: "cm", weight_unit: "kg", height_unit: "cm",
  rows: [], notes: "", is_active: true,
};

const EMPTY_ROW = () => ({
  label: "",
  measurements: Object.fromEntries(MEAS_FIELDS.map(({ key }) => [key, ""])),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useLang() {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith("vi") ? "vi" : "en";
}

function mLabel(field, lang) {
  return lang === "vi" ? field.labelVI : field.labelEN;
}

// ─── Row Editor ───────────────────────────────────────────────────────────────
function RowEditor({ rows, onChange, unit, weightUnit, lang }) {
  const addRow    = () => onChange([...rows, EMPTY_ROW()]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const setLabel  = (i, v) => onChange(rows.map((r, idx) => idx === i ? { ...r, label: v } : r));
  const setMeas   = (i, k, v) => onChange(rows.map((r, idx) =>
    idx === i ? { ...r, measurements: { ...r.measurements, [k]: v } } : r));

  const GROUP_LABELS = {
    body:  { vi: "Vóc dáng", en: "Body" },
    upper: { vi: "Phần trên", en: "Upper body" },
    lower: { vi: "Phần dưới", en: "Lower body" },
  };

  const groups = ["body", "upper", "lower"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-default-700">
          {lang === "vi" ? "Các cỡ size" : "Size rows"}
          {rows.length > 0 && (
            <Chip size="sm" variant="flat" className="ml-2">{rows.length}</Chip>
          )}
        </span>
        <Button size="sm" color="primary" variant="flat" startContent={<Plus size={13} />} onPress={addRow}>
          {lang === "vi" ? "Thêm size" : "Add size"}
        </Button>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-default-200 rounded-xl">
          <Ruler size={24} className="mx-auto mb-2 text-default-300" />
          <p className="text-xs text-default-400">
            {lang === "vi"
              ? 'Chưa có size nào — nhấn "Thêm size" để bắt đầu'
              : 'No sizes yet — click "Add size" to start'}
          </p>
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="border border-default-200 dark:border-[#2e3347] rounded-xl overflow-hidden">
          {/* Size label bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-default-50 dark:bg-[#1a1e2e] border-b border-default-200 dark:border-[#2e3347]">
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            <Input
              placeholder={lang === "vi" ? "Tên size (VD: S, M, L, XL, 36...)" : "Size label (e.g. S, M, L, 36...)"}
              value={row.label}
              onValueChange={(v) => setLabel(i, v)}
              size="sm"
              radius="lg"
              variant="bordered"
              className="flex-1"
              classNames={{ input: "font-black text-sm uppercase" }}
            />
            <span className="text-xs text-default-400 flex-shrink-0">#{i + 1}</span>
            <Button
              isIconOnly size="sm" variant="light" color="danger"
              onPress={() => removeRow(i)}
              className="flex-shrink-0"
            >
              <Trash2 size={14} />
            </Button>
          </div>

          {/* Measurement fields grouped */}
          <div className="p-3 space-y-3">
            {groups.map((group) => {
              const fields = MEAS_FIELDS.filter(f => f.group === group);
              const hasAnyValue = fields.some(f => row.measurements?.[f.key] !== "");
              return (
                <div key={group}>
                  <p className="text-xs font-semibold text-default-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>{GROUP_LABELS[group][lang === "vi" ? "vi" : "en"]}</span>
                    <span className="text-default-300">
                      {" "}({group === "body" ? `${unit} / ${weightUnit}` : unit})
                    </span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {fields.map(({ key, ...f }) => (
                      <Input
                        key={key}
                        label={mLabel({ ...f }, lang)}
                        placeholder="—"
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
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chart Modal ──────────────────────────────────────────────────────────────
function ChartModal({ open, onClose, initial, onSaved, brands, categories }) {
  const lang  = useLang();
  const toast = useToast();
  const [form, setForm]   = useState(EMPTY_CHART);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (open) {
      if (initial) {
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
      setNameError("");
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) {
      setNameError(lang === "vi" ? "Vui lòng đặt tên cho bảng size này" : "Please enter a chart name");
      return;
    }
    if (!form.gender) {
      toast.error(lang === "vi" ? "Vui lòng chọn giới tính" : "Gender is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        rows: form.rows
          .filter((r) => r.label.trim())
          .map((r) => ({
            label: r.label.trim().toUpperCase(),
            measurements: Object.fromEntries(
              Object.entries(r.measurements)
                .filter(([, v]) => v !== "" && v !== null && v !== undefined)
                .map(([k, v]) => [k, Number(v)])
            ),
          })),
      };
      if (initial?._id) {
        await sizeChartService.update(initial._id, payload);
      } else {
        await sizeChartService.create(payload);
      }
      toast.success(
        initial
          ? (lang === "vi" ? "Đã cập nhật bảng size" : "Size chart updated")
          : (lang === "vi" ? "Đã tạo bảng size mới" : "Size chart created")
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || (lang === "vi" ? "Lưu thất bại" : "Save failed"));
    } finally { setSaving(false); }
  };

  const genderLabel = (g) =>
    lang === "vi" ? GENDERS.find(x => x.key === g)?.labelVI : GENDERS.find(x => x.key === g)?.labelEN;

  return (
    <Modal isOpen={open} onOpenChange={(o) => !o && onClose()} size="3xl" radius="2xl" backdrop="blur" scrollBehavior="inside">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex items-center gap-2 pb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ruler size={16} className="text-primary" />
              </div>
              <div>
                <p className="font-black text-default-900">
                  {initial
                    ? (lang === "vi" ? "Chỉnh sửa bảng size" : "Edit size chart")
                    : (lang === "vi" ? "Tạo bảng size mới" : "New size chart")}
                </p>
                {initial?.name && (
                  <p className="text-xs font-normal text-default-500">{initial.name}</p>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="space-y-5 py-4">
              {/* Chart name */}
              <Input
                label={lang === "vi" ? "Tên bảng size *" : "Chart name *"}
                placeholder={lang === "vi" ? "VD: Áo sơ mi nam, Quần jean nữ, Giày thể thao..." : "E.g. Men's shirt, Women's jeans, Sneakers..."}
                value={form.name}
                onValueChange={(v) => { set("name", v); setNameError(""); }}
                radius="xl"
                variant="bordered"
                isInvalid={!!nameError}
                errorMessage={nameError}
                classNames={{ input: "font-semibold" }}
                startContent={<Tag size={14} className="text-default-400 flex-shrink-0" />}
              />

              {/* Brand & Category */}
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label={lang === "vi" ? "Thương hiệu" : "Brand"}
                  placeholder={lang === "vi" ? "Tất cả thương hiệu" : "All brands"}
                  size="sm" radius="xl" variant="bordered"
                  selectedKeys={form.brand_id ? new Set([form.brand_id]) : new Set()}
                  onSelectionChange={(k) => set("brand_id", Array.from(k)[0] || "")}
                >
                  <SelectItem key="">{lang === "vi" ? "— Tất cả —" : "— All brands —"}</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b._id}>{b.name}</SelectItem>
                  ))}
                </Select>
                <Select
                  label={lang === "vi" ? "Danh mục" : "Category"}
                  placeholder={lang === "vi" ? "Tất cả danh mục" : "All categories"}
                  size="sm" radius="xl" variant="bordered"
                  selectedKeys={form.category_id ? new Set([form.category_id]) : new Set()}
                  onSelectionChange={(k) => set("category_id", Array.from(k)[0] || "")}
                >
                  <SelectItem key="">{lang === "vi" ? "— Tất cả —" : "— All categories —"}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id}>{c.name}</SelectItem>
                  ))}
                </Select>
              </div>

              {/* Gender + Units */}
              <div className="grid grid-cols-3 gap-3">
                <Select
                  label={lang === "vi" ? "Giới tính" : "Gender"}
                  size="sm" radius="xl" variant="bordered"
                  selectedKeys={new Set([form.gender])}
                  onSelectionChange={(k) => set("gender", Array.from(k)[0])}
                >
                  {GENDERS.map((g) => (
                    <SelectItem key={g.key}>{lang === "vi" ? g.labelVI : g.labelEN}</SelectItem>
                  ))}
                </Select>
                <Select
                  label={lang === "vi" ? "Đơn vị đo" : "Body unit"}
                  size="sm" radius="xl" variant="bordered"
                  selectedKeys={new Set([form.unit])}
                  onSelectionChange={(k) => set("unit", Array.from(k)[0])}
                >
                  {UNITS.map((u) => <SelectItem key={u}>{u}</SelectItem>)}
                </Select>
                <Select
                  label={lang === "vi" ? "Đơn vị cân" : "Weight unit"}
                  size="sm" radius="xl" variant="bordered"
                  selectedKeys={new Set([form.weight_unit])}
                  onSelectionChange={(k) => set("weight_unit", Array.from(k)[0])}
                >
                  {W_UNITS.map((u) => <SelectItem key={u}>{u}</SelectItem>)}
                </Select>
              </div>

              {/* Notes */}
              <Input
                label={lang === "vi" ? "Ghi chú (tùy chọn)" : "Notes (optional)"}
                placeholder={lang === "vi" ? "VD: Khách hàng nên chọn size lớn hơn 1 bậc..." : "E.g. We recommend sizing up..."}
                size="sm" radius="xl" variant="bordered"
                value={form.notes}
                onValueChange={(v) => set("notes", v)}
              />

              {/* Active toggle */}
              {initial && (
                <div className="flex items-center gap-3 py-1">
                  <Switch
                    size="sm"
                    isSelected={form.is_active}
                    onValueChange={(v) => set("is_active", v)}
                    color="success"
                  >
                    <span className="text-sm text-default-700">
                      {lang === "vi" ? (form.is_active ? "Đang hoạt động" : "Đã tắt") : (form.is_active ? "Active" : "Inactive")}
                    </span>
                  </Switch>
                </div>
              )}

              <Divider />

              {/* Row editor */}
              <RowEditor
                rows={form.rows}
                onChange={(rows) => set("rows", rows)}
                unit={form.unit}
                weightUnit={form.weight_unit}
                lang={lang}
              />
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" radius="xl" onPress={close}>
                {lang === "vi" ? "Hủy" : "Cancel"}
              </Button>
              <Button color="primary" radius="xl" isLoading={saving} onPress={save} className="font-bold">
                {initial
                  ? (lang === "vi" ? "Lưu thay đổi" : "Save changes")
                  : (lang === "vi" ? "Tạo bảng size" : "Create")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// ─── Size Table (preview) ─────────────────────────────────────────────────────
function SizeTable({ chart, lang }) {
  const visibleFields = MEAS_FIELDS.filter(({ key }) =>
    chart.rows.some((r) => r.measurements?.[key] != null)
  );

  if (!chart.rows?.length) {
    return (
      <div className="py-5 text-center text-xs text-default-400 border-t border-default-100 dark:border-[#222738]">
        {lang === "vi" ? "Chưa có dữ liệu size" : "No size data"}
      </div>
    );
  }

  const unitSuffix = (key) => {
    if (key === "weight_min" || key === "weight_max") return chart.weight_unit;
    if (key === "height_min" || key === "height_max") return chart.unit;
    return chart.unit;
  };

  return (
    <div className="border-t border-default-100 dark:border-[#222738] overflow-x-auto">
      <table className="w-full text-xs min-w-max">
        <thead>
          <tr className="bg-default-50 dark:bg-[#1a1e2e]">
            <th className="px-4 py-2.5 text-left font-bold text-default-500 uppercase tracking-wide sticky left-0 bg-default-50 dark:bg-[#1a1e2e]">
              {lang === "vi" ? "Size" : "Size"}
            </th>
            {visibleFields.map(({ key, ...f }) => (
              <th key={key} className="px-3 py-2.5 text-center font-semibold text-default-500 whitespace-nowrap">
                {mLabel({ ...f }, lang)}
                <span className="text-default-300 font-normal ml-0.5">({unitSuffix(key)})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((r, i) => (
            <tr
              key={i}
              className={`transition-colors hover:bg-primary-50/50 dark:hover:bg-primary/5 ${
                i % 2 === 0
                  ? "bg-white dark:bg-[#131620]"
                  : "bg-default-50/40 dark:bg-[#1a1e2e]/40"
              }`}
            >
              <td className="px-4 py-2.5 sticky left-0 bg-inherit">
                <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg bg-primary/10 text-primary font-black text-sm">
                  {r.label || "—"}
                </span>
              </td>
              {visibleFields.map(({ key }) => (
                <td key={key} className="px-3 py-2.5 text-center text-default-600 tabular-nums">
                  {r.measurements?.[key] != null ? r.measurements[key] : (
                    <span className="text-default-300">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────
function ChartCard({ chart, onEdit, onDelete, brands, categories, lang }) {
  const [expanded, setExpanded] = useState(false);

  const genderColors   = { men: "primary", women: "secondary", unisex: "default" };
  const genderLabel    = (g) => GENDERS.find(x => x.key === g)?.[lang === "vi" ? "labelVI" : "labelEN"] || g;

  const brandName    = brands.find(b => b._id === chart.brand_id)?.name;
  const categoryName = categories.find(c => c._id === chart.category_id)?.name;

  const displayName = chart.name || (
    [brandName, categoryName].filter(Boolean).join(" · ") || (lang === "vi" ? "Bảng size chung" : "General size chart")
  );

  return (
    <div className={`bg-white dark:bg-[#131620] border rounded-2xl overflow-hidden transition-all ${
      chart.is_active
        ? "border-default-200 dark:border-[#2e3347]"
        : "border-default-100 dark:border-[#22263a] opacity-60"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <Ruler size={16} className="text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-default-900 truncate">{displayName}</p>
            {!chart.is_active && (
              <Chip size="sm" color="danger" variant="flat" className="text-xs">
                {lang === "vi" ? "Đã tắt" : "Inactive"}
              </Chip>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {brandName && (
              <span className="flex items-center gap-1 text-xs text-default-400">
                <Tag size={10} /> {brandName}
              </span>
            )}
            {categoryName && (
              <span className="flex items-center gap-1 text-xs text-default-400">
                <Package size={10} /> {categoryName}
              </span>
            )}
            {!brandName && !categoryName && (
              <span className="text-xs text-default-400">
                {lang === "vi" ? "Áp dụng cho tất cả sản phẩm" : "Applies to all products"}
              </span>
            )}
            <span className="text-xs text-default-300">·</span>
            <span className="text-xs text-default-400">
              {chart.rows?.length || 0} {lang === "vi" ? "cỡ size" : "sizes"} · {chart.unit} / {chart.weight_unit}
            </span>
          </div>
        </div>

        {/* Badges + actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Chip
            size="sm"
            color={genderColors[chart.gender] || "default"}
            variant="flat"
            startContent={<Users size={10} />}
            className="text-xs"
          >
            {genderLabel(chart.gender)}
          </Chip>

          <Tooltip content={lang === "vi" ? "Chỉnh sửa" : "Edit"}>
            <Button isIconOnly size="sm" variant="light" onPress={() => onEdit(chart)}>
              <Pencil size={13} />
            </Button>
          </Tooltip>
          <Tooltip content={lang === "vi" ? "Xóa" : "Delete"}>
            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDelete(chart)}>
              <Trash2 size={13} />
            </Button>
          </Tooltip>
          <Tooltip content={expanded ? (lang === "vi" ? "Thu gọn" : "Collapse") : (lang === "vi" ? "Xem bảng size" : "View table")}>
            <Button isIconOnly size="sm" variant="light" onPress={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Notes strip */}
      {chart.notes && !expanded && (
        <div className="px-4 pb-2.5">
          <p className="text-xs text-default-400 italic truncate">💬 {chart.notes}</p>
        </div>
      )}

      {/* Expanded size table */}
      {expanded && (
        <>
          {chart.notes && (
            <div className="mx-4 mb-2 px-3 py-2 bg-warning-50 dark:bg-warning-900/20 rounded-xl border border-warning-100 dark:border-warning-800">
              <p className="text-xs text-warning-700 dark:text-warning-400">
                💬 {lang === "vi" ? "Ghi chú: " : "Note: "}{chart.notes}
              </p>
            </div>
          )}
          <SizeTable chart={chart} lang={lang} />
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SizeChartsPage() {
  const lang    = useLang();
  const confirm = useConfirm();
  const toast   = useToast();

  const [charts,     setCharts]     = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [search,     setSearch]     = useState("");
  const [filterGender, setFilterGender] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ items }, brandsData, catsData] = await Promise.all([
        sizeChartService.list({ limit: 200 }),
        brandApi.getAll().catch(() => []),
        categoryApi.getAll().catch(() => []),
      ]);
      setCharts(items || []);
      setBrands(brandsData?.data || brandsData || []);
      setCategories(catsData?.data || catsData || []);
    } catch {
      toast.error("Không thể tải dữ liệu bảng size");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setModal(true); };
  const openEdit = (c) => { setEditing(c);   setModal(true); };

  const handleDelete = async (chart) => {
    const displayName = chart.name
      || brands.find(b => b._id === chart.brand_id)?.name
      || (lang === "vi" ? "bảng size này" : "this chart");
    const ok = await confirm({
      title: lang === "vi" ? "Xóa bảng size" : "Delete size chart",
      description: lang === "vi"
        ? `Bạn có chắc muốn xóa "${displayName}"? Hành động này không thể hoàn tác.`
        : `Delete "${displayName}"? This cannot be undone.`,
      confirmLabel: lang === "vi" ? "Xóa" : "Delete",
      confirmColor: "danger",
    });
    if (!ok) return;
    try {
      await sizeChartService.remove(chart._id);
      toast.success(lang === "vi" ? "Đã xóa bảng size" : "Deleted");
      load();
    } catch {
      toast.error(lang === "vi" ? "Xóa thất bại" : "Delete failed");
    }
  };

  // Filter
  const filtered = charts.filter((c) => {
    const brandName    = brands.find(b => b._id === c.brand_id)?.name || "";
    const categoryName = categories.find(x => x._id === c.category_id)?.name || "";
    const name         = c.name || "";
    const q = search.toLowerCase();
    const matchSearch = !q || name.toLowerCase().includes(q)
      || brandName.toLowerCase().includes(q)
      || categoryName.toLowerCase().includes(q);
    const matchGender = filterGender === "all" || c.gender === filterGender;
    return matchSearch && matchGender;
  });

  const stats = {
    total:    charts.length,
    active:   charts.filter(c => c.is_active).length,
    sizes:    charts.reduce((acc, c) => acc + (c.rows?.length || 0), 0),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md shadow-primary/30">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-default-900">
                {lang === "vi" ? "Bảng size sản phẩm" : "Product size charts"}
              </h1>
              <p className="text-xs text-default-400">
                {lang === "vi" ? "AI XGBoost gợi ý size phù hợp cho khách hàng" : "XGBoost AI-powered fit recommendations"}
              </p>
            </div>
          </div>
        </div>
        <Button
          color="primary" radius="xl"
          startContent={<Plus size={15} />}
          onPress={openNew}
          className="font-bold flex-shrink-0 shadow-md shadow-primary/25"
        >
          {lang === "vi" ? "Thêm bảng size" : "New chart"}
        </Button>
      </div>

      {/* ── Stats strip ── */}
      {!loading && charts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: lang === "vi" ? "Tổng bảng size" : "Total charts",   value: stats.total,  color: "text-default-700" },
            { label: lang === "vi" ? "Đang hoạt động" : "Active",         value: stats.active, color: "text-success-600" },
            { label: lang === "vi" ? "Tổng cỡ size"   : "Total sizes",    value: stats.sizes,  color: "text-primary-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-[#131620] border border-default-100 dark:border-[#2e3347] rounded-xl px-4 py-3 text-center">
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-default-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── AI Banner ── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#1a1e2e] dark:to-[#1e2035] border border-blue-100 dark:border-[#2e3347] rounded-2xl p-4">
        <p className="text-sm font-bold text-default-700 mb-1 flex items-center gap-2">
          <Bot size={14} className="text-primary" />
          {lang === "vi" ? "XGBoost AI hoạt động như thế nào?" : "How XGBoost AI works"}
        </p>
        <p className="text-xs text-default-500 leading-relaxed">
          {lang === "vi"
            ? "Mỗi hàng trong bảng size (S, M, L…) định nghĩa khoảng số đo của cỡ đó. Khi khách hàng nhập số đo của mình, AI sẽ học từ dữ liệu của bạn và dự đoán xác suất phù hợp cho từng cỡ. Model được cache và tự động làm mới khi bạn cập nhật bảng size."
            : "Each row (S, M, L…) defines the body measurement range for that size. When a customer enters their measurements, the AI trains a classifier from your rows and predicts fit probability for each size. The model is cached and auto-invalidated when you update a chart."}
        </p>
      </div>

      {/* ── Search + Filter ── */}
      {charts.length > 0 && (
        <div className="flex gap-3 items-center flex-wrap">
          <Input
            placeholder={lang === "vi" ? "Tìm theo tên, thương hiệu, danh mục..." : "Search by name, brand, category..."}
            value={search}
            onValueChange={setSearch}
            size="sm"
            radius="xl"
            variant="bordered"
            startContent={<Search size={14} className="text-default-400" />}
            className="flex-1 min-w-[200px]"
            isClearable
            onClear={() => setSearch("")}
          />
          <div className="flex gap-1.5">
            {["all", "men", "women", "unisex"].map((g) => {
              const label = g === "all"
                ? (lang === "vi" ? "Tất cả" : "All")
                : (GENDERS.find(x => x.key === g)?.[lang === "vi" ? "labelVI" : "labelEN"] || g);
              return (
                <Chip
                  key={g}
                  size="sm"
                  variant={filterGender === g ? "solid" : "flat"}
                  color={filterGender === g ? "primary" : "default"}
                  className="cursor-pointer select-none"
                  onClick={() => setFilterGender(g)}
                >
                  {label}
                </Chip>
              );
            })}
          </div>
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        charts.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-default-200 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-default-50 flex items-center justify-center mx-auto mb-4">
              <Ruler size={32} className="text-default-300" />
            </div>
            <p className="font-bold text-default-600 mb-1">
              {lang === "vi" ? "Chưa có bảng size nào" : "No size charts yet"}
            </p>
            <p className="text-sm text-default-400 mb-5">
              {lang === "vi"
                ? "Tạo bảng size đầu tiên để bật tính năng gợi ý size AI cho sản phẩm"
                : "Create your first chart to enable AI size recommendations"}
            </p>
            <Button color="primary" radius="xl" startContent={<Plus size={14} />} onPress={openNew} className="font-bold">
              {lang === "vi" ? "Tạo bảng size đầu tiên" : "Create first chart"}
            </Button>
          </div>
        ) : (
          <div className="text-center py-10 text-default-400">
            <Search size={28} className="mx-auto mb-2 text-default-300" />
            <p className="text-sm">
              {lang === "vi" ? "Không tìm thấy bảng size nào phù hợp" : "No charts match your search"}
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ChartCard
              key={c._id}
              chart={c}
              onEdit={openEdit}
              onDelete={handleDelete}
              brands={brands}
              categories={categories}
              lang={lang}
            />
          ))}
          {filtered.length < charts.length && (
            <p className="text-xs text-center text-default-400 pt-1">
              {lang === "vi"
                ? `Hiển thị ${filtered.length} / ${charts.length} bảng size`
                : `Showing ${filtered.length} of ${charts.length} charts`}
            </p>
          )}
        </div>
      )}

      <ChartModal
        open={modal}
        onClose={() => setModal(false)}
        initial={editing}
        onSaved={load}
        brands={brands}
        categories={categories}
      />
    </div>
  );
}
