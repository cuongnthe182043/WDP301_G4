import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Input, Button, Select, SelectItem, Textarea, Checkbox, CheckboxGroup, Chip, Switch,
} from "@heroui/react";
import { X, Plus, Upload, AlertCircle, Shuffle } from "lucide-react";
import CategoryCascader from "./CategoryCascader";

// Cartesian product helper
function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
    [[]]
  );
}

const SEASON_KEYS = [
  { key: "spring",     labelKey: "product.season_spring" },
  { key: "summer",     labelKey: "product.season_summer" },
  { key: "autumn",     labelKey: "product.season_autumn" },
  { key: "winter",     labelKey: "product.season_winter" },
  { key: "all-season", labelKey: "product.season_all" },
];

const VARIANT_DIM_KEYS = [
  { key: "color",            labelKey: "product.variant_color",    placeholderKey: "product.variant_color_ph" },
  { key: "size",             labelKey: "product.variant_size",     placeholderKey: "product.variant_size_ph" },
  { key: "material_variant", labelKey: "product.variant_material", placeholderKey: "product.variant_material_ph" },
  { key: "pattern",          labelKey: "product.variant_pattern",  placeholderKey: "product.variant_pattern_ph" },
  { key: "fit",              labelKey: "product.variant_fit",      placeholderKey: "product.variant_fit_ph" },
];

const EMPTY = {
  name: "", description: "", base_price: "", stock_total: "0",
  category_id: "", brand_id: "", tags: [],
  variant_dimensions: [],
  variant_values: {},
  detail_info: { origin_country: "", materials: [], seasons: [], care_instructions: "" },
  seo: { title: "", description: "", keywords: [] },
  images: [], videos: [],
};

export default function ProductForm({ initial, onSubmit, svc, loading = false }) {
  const { t } = useTranslation();
  const [form,      setForm]      = useState({ ...EMPTY, ...(initial || {}) });
  const [brands,    setBrands]    = useState([]);
  const [tagInput,  setTagInput]  = useState("");
  const [matInput,  setMatInput]  = useState("");
  const [kw,        setKw]        = useState("");
  const [uploading, setUploading] = useState(false);
  const [errors,    setErrors]    = useState({});
  // per-dimension input buffer
  const [dimInputs, setDimInputs] = useState({});
  // per-variant-combo stock & price overrides (create mode only)
  const [variantRows,     setVariantRows]     = useState({});
  // input for "distribute evenly" total
  const [distributeTotal, setDistributeTotal] = useState("");

  useEffect(() => {
    svc.listBrands().then((data) => setBrands(Array.isArray(data) ? data : data?.items || []));
  }, []);

  // Sync initial (edit mode)
  useEffect(() => {
    if (initial) {
      const variantValues = {};
      if (initial.variant_values) {
        // variant_values may come back as a plain object or Map-like
        for (const dim of VARIANT_DIM_KEYS.map(d => d.key)) {
          const vals = initial.variant_values?.[dim] || initial.variant_values?.get?.(dim);
          if (vals?.length) variantValues[dim] = vals;
        }
      }
      setForm({ ...EMPTY, ...initial, variant_values: variantValues });
      setTagInput("");
      setMatInput("");
      setDimInputs({});
    }
  }, [initial?._id]);

  // Derived flags (needed before hooks below)
  const isEdit = !!initial?._id;

  // Dimensions that have at least one value entered
  const activeDims = useMemo(
    () => form.variant_dimensions.filter((d) => (form.variant_values?.[d] || []).length > 0),
    [form.variant_dimensions, form.variant_values]
  );

  // All cartesian-product combinations across active dims
  const variantCombos = useMemo(() => {
    if (activeDims.length === 0) return [];
    const arrays = activeDims.map((d) => form.variant_values[d] || []);
    return cartesian(arrays).map((combo) => {
      const key = combo.join("\x00");
      const attrs = {};
      activeDims.forEach((d, j) => { attrs[d] = combo[j]; });
      return { key, attrs };
    });
  }, [activeDims, form.variant_values]);

  // Keep variantRows in sync with combos: preserve existing, add defaults for new, drop removed
  useEffect(() => {
    if (isEdit) return;
    const basePrice = Number(form.base_price) || 0;
    setVariantRows((prev) => {
      const next = {};
      for (const c of variantCombos) {
        next[c.key] = prev[c.key] ?? { stock: 0, price: basePrice };
      }
      return next;
    });
  }, [variantCombos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute total stock from per-variant rows (used in submit payload)
  const variantStockTotal = variantCombos.length > 0
    ? Object.values(variantRows).reduce((s, r) => s + (Number(r?.stock) || 0), 0)
    : null;

  const set       = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setDetail = (key, val) => setForm((f) => ({ ...f, detail_info: { ...f.detail_info, [key]: val } }));
  const setSeo    = (key, val) => setForm((f) => ({ ...f, seo: { ...f.seo, [key]: val } }));

  // ── Variant dimensions ────────────────────────────────────────────
  const handleDimChange = (newDims) => {
    set("variant_dimensions", newDims);
    // Keep values for existing dims; drop removed dims
    setForm((f) => {
      const next = {};
      for (const d of newDims) next[d] = f.variant_values?.[d] || [];
      return { ...f, variant_dimensions: newDims, variant_values: next };
    });
  };

  const addDimValue = (dim) => {
    const parts = (dimInputs[dim] || "").split(",").map((v) => v.trim()).filter(Boolean);
    if (!parts.length) return;
    setForm((f) => {
      const existing = f.variant_values?.[dim] || [];
      const newVals = parts.filter((v) => !existing.includes(v));
      if (!newVals.length) return f;
      return { ...f, variant_values: { ...f.variant_values, [dim]: [...existing, ...newVals] } };
    });
    setDimInputs((p) => ({ ...p, [dim]: "" }));
  };

  // Auto-split on comma: immediately add completed values, keep the trailing part in input
  const handleDimInputChange = (dim, value) => {
    if (!value.includes(",")) {
      setDimInputs((p) => ({ ...p, [dim]: value }));
      return;
    }
    const parts = value.split(",").map((v) => v.trim());
    const toAdd = parts.slice(0, -1).filter(Boolean);
    const remaining = parts[parts.length - 1];
    if (toAdd.length) {
      setForm((f) => {
        const existing = f.variant_values?.[dim] || [];
        const newVals = toAdd.filter((v) => !existing.includes(v));
        if (!newVals.length) return f;
        return { ...f, variant_values: { ...f.variant_values, [dim]: [...existing, ...newVals] } };
      });
    }
    setDimInputs((p) => ({ ...p, [dim]: remaining }));
  };

  const removeDimValue = (dim, val) => {
    setForm((f) => ({
      ...f,
      variant_values: {
        ...f.variant_values,
        [dim]: (f.variant_values?.[dim] || []).filter((x) => x !== val),
      },
    }));
  };

  // Distribute a given total evenly across all variant combos
  const distributeEvenly = () => {
    const total = Math.max(0, parseInt(distributeTotal) || 0);
    const n = variantCombos.length;
    if (n === 0) return;
    const per = Math.floor(total / n);
    const rem = total - per * n;
    setVariantRows((prev) => {
      const next = {};
      variantCombos.forEach((c, i) => {
        next[c.key] = {
          stock: per + (i === 0 ? rem : 0),
          price: (prev[c.key]?.price ?? Number(form.base_price)) || 0,
        };
      });
      return next;
    });
  };

  // ── Tags ──────────────────────────────────────────────────────────
  const addTag = () => {
    const tg = tagInput.trim();
    if (tg && !form.tags.includes(tg)) set("tags", [...form.tags, tg]);
    setTagInput("");
  };
  const removeTag = (tg) => set("tags", form.tags.filter((x) => x !== tg));

  // ── Materials ─────────────────────────────────────────────────────
  const addMaterial = () => {
    const m = matInput.trim();
    if (m && !form.detail_info.materials.includes(m))
      setDetail("materials", [...form.detail_info.materials, m]);
    setMatInput("");
  };
  const removeMaterial = (m) => setDetail("materials", form.detail_info.materials.filter((x) => x !== m));

  // ── Keywords ─────────────────────────────────────────────────────
  const addKeyword = () => {
    const k = kw.trim();
    if (k && !form.seo.keywords.includes(k)) setSeo("keywords", [...form.seo.keywords, k]);
    setKw("");
  };
  const removeKeyword = (k) => setSeo("keywords", form.seo.keywords.filter((x) => x !== k));

  // ── Images upload ─────────────────────────────────────────────────
  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const ups = await svc.uploadImages(files);
      set("images", [...(form.images || []), ...ups.map((u) => u.url)]);
      setErrors((p) => { const n = { ...p }; delete n.images; return n; });
    } finally { setUploading(false); }
  };

  // ── Video upload ──────────────────────────────────────────────────
  const handleVideo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const up = await svc.uploadVideo(f);
      set("videos", [up.url]);
    } finally { setUploading(false); }
  };

  // ── Validation ────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())
      e.name = t("product.err_name_required");
    else if (form.name.trim().length < 5)
      e.name = t("product.err_name_min");

    if (!form.description.trim())
      e.description = t("product.err_desc_required");
    else if (form.description.trim().length < 20)
      e.description = t("product.err_desc_min");

    const price = Number(form.base_price);
    if (!form.base_price || isNaN(price) || price <= 0)
      e.base_price = t("product.err_price_positive");
    else if (price < 1000)
      e.base_price = t("product.err_price_min");

    if (!form.category_id)
      e.category_id = t("product.err_category_required");

    if (!form.images?.length)
      e.images = t("product.err_image_required");

    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // Scroll to first error
      document.querySelector(".form-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const payload = {
      ...form,
      base_price:  Number(form.base_price || 0),
      stock_total: variantStockTotal !== null ? variantStockTotal : Number(form.stock_total || 0),
      ...(!isEdit && variantCombos.length > 0
        ? { variant_overrides: variantRows }
        : {}),
    };
    onSubmit(payload);
  };

  // Product already has saved variants in DB (edit mode only)
  const hasExistingVariants = isEdit && (initial?.variants?.length ?? 0) > 0;
  const hasVariantValues = activeDims.length > 0;
  // Show status toggle only when product is already approved (active or inactive)
  const canToggleStatus = isEdit && (initial?.status === "active" || initial?.status === "inactive");

  return (
    <div className="space-y-6">
      {/* ── Basic Info ──────────────────────────────────────────── */}
      <Section title={t("product.section_basic")}>
        <div>
          <Input
            isRequired label={t("product.name_label")} placeholder={t("product.name_placeholder")}
            value={form.name} onValueChange={(v) => { set("name", v); setErrors(p => { const n = {...p}; delete n.name; return n; }); }}
            radius="lg"
            isInvalid={!!errors.name}
            errorMessage={errors.name}
          />
        </div>
        <div>
          <Textarea
            isRequired label={t("product.desc_label")} placeholder={t("product.desc_placeholder")}
            value={form.description} onValueChange={(v) => { set("description", v); setErrors(p => { const n = {...p}; delete n.description; return n; }); }}
            radius="lg" minRows={4}
            isInvalid={!!errors.description}
            errorMessage={errors.description}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            isRequired label={t("product.price_label")} placeholder={t("product.price_placeholder")}
            type="number" min="1000"
            value={String(form.base_price)}
            onValueChange={(v) => { set("base_price", v); setErrors(p => { const n = {...p}; delete n.base_price; return n; }); }}
            radius="lg"
            description={t("product.price_description")}
            isInvalid={!!errors.base_price}
            errorMessage={errors.base_price}
          />
          {(!isEdit && variantCombos.length > 0) ? null : (
            <Input
              label={t("product.stock_label")} placeholder="0" type="number" min="0"
              value={String(form.stock_total)} onValueChange={(v) => set("stock_total", v)}
              radius="lg"
              isReadOnly={hasExistingVariants}
              description={
                hasExistingVariants
                  ? t("product.stock_from_variants")
                  : t("product.stock_desc")
              }
            />
          )}
        </div>
      </Section>

      {/* ── Status Toggle (edit mode, approved products only) ───── */}
      {canToggleStatus && (
        <Section title={t("product.section_status")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-default-700">{t("product.status_label")}</p>
              <p className="text-xs text-default-400 mt-0.5">
                {form.status === "active"
                  ? t("product.status_desc_active")
                  : t("product.status_desc_inactive")}
              </p>
            </div>
            <Switch
              isSelected={form.status === "active"}
              onValueChange={(v) => set("status", v ? "active" : "inactive")}
              color="success"
            >
              <span className="text-sm font-medium">
                {form.status === "active" ? t("common.status_active") : t("common.status_inactive")}
              </span>
            </Switch>
          </div>
        </Section>
      )}

      {/* ── Classification ──────────────────────────────────────── */}
      <Section title={t("product.section_classify")}>
        <div>
          <p className="text-sm font-medium text-default-700 mb-2">
            {t("product.category_label")} <span className="text-danger">*</span>
          </p>
          <CategoryCascader value={form.category_id} onChange={(v) => { set("category_id", v); setErrors(p => { const n = {...p}; delete n.category_id; return n; }); }} svc={svc} />
          {errors.category_id && (
            <p className="form-error text-xs text-danger mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors.category_id}
            </p>
          )}
        </div>
        <Select
          label={t("product.brand_label")} placeholder={t("product.brand_placeholder")}
          selectedKeys={form.brand_id ? new Set([form.brand_id]) : new Set()}
          onSelectionChange={(k) => set("brand_id", Array.from(k)[0] || "")}
          radius="lg"
        >
          {brands.map((b) => <SelectItem key={b._id}>{b.name}</SelectItem>)}
        </Select>
        {/* Tags */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">{t("product.tags_label")}</p>
          <div className="flex gap-2">
            <Input
              placeholder={t("product.tags_placeholder")} value={tagInput} onValueChange={setTagInput}
              radius="lg" size="sm" className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
            <Button size="sm" variant="bordered" radius="lg" onPress={addTag} isIconOnly><Plus size={14} /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.tags.map((tg) => (
              <Chip key={tg} size="sm" variant="flat" onClose={() => removeTag(tg)}>{tg}</Chip>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Variant Dimensions ──────────────────────────────────── */}
      <Section
        title={t("product.section_variants")}
        description={t("product.variants_desc")}
      >
        <div className="space-y-4">
          {VARIANT_DIM_KEYS.map((d) => {
            const label = t(d.labelKey);
            const placeholder = t(d.placeholderKey);
            const checked = form.variant_dimensions.includes(d.key);
            const values  = form.variant_values?.[d.key] || [];
            return (
              <div
                key={d.key}
                className={`rounded-xl border transition-colors ${
                  checked ? "border-primary-200 bg-primary-50/40" : "border-default-100 bg-default-50"
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <Checkbox
                    isSelected={checked}
                    onValueChange={(v) => {
                      const newDims = v
                        ? [...form.variant_dimensions, d.key]
                        : form.variant_dimensions.filter((x) => x !== d.key);
                      handleDimChange(newDims);
                    }}
                    radius="lg"
                  >
                    <span className="font-medium text-sm text-default-800">{label}</span>
                  </Checkbox>
                </div>

                {/* Value entry — shown immediately when checked */}
                {checked && (
                  <div className="px-4 pb-4 space-y-2 border-t border-primary-100">
                    <p className="text-xs text-default-500 pt-3">
                      {t("product.variant_add_hint", { dim: label.toLowerCase() })}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`${placeholder} — phân cách bằng dấu phẩy`}
                        value={dimInputs[d.key] || ""}
                        onValueChange={(v) => handleDimInputChange(d.key, v)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDimValue(d.key))}
                        radius="lg" size="sm" className="flex-1"
                      />
                      <Button
                        size="sm" color="primary" variant="flat" radius="lg" isIconOnly
                        onPress={() => addDimValue(d.key)}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {values.length === 0 && (
                        <span className="text-xs text-default-300 italic">{t("product.variant_no_values")}</span>
                      )}
                      {values.map((val) => (
                        <Chip
                          key={val} size="sm" color="primary" variant="flat"
                          onClose={() => removeDimValue(d.key, val)}
                        >
                          {val}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasVariantValues && isEdit && (
          <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
            <div className="text-primary-500 mt-0.5"><Plus size={14} /></div>
            <p className="text-xs text-primary-700">
              {t("product.variant_auto_notice")}
            </p>
          </div>
        )}

        {/* Variant combo table — create mode only */}
        {!isEdit && variantCombos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold text-default-800">
                Tồn kho &amp; giá mỗi biến thể
                <span className="ml-1.5 text-xs font-normal text-default-400">
                  ({variantCombos.length} tổ hợp)
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Input
                  size="sm" type="number" min="0" radius="lg" placeholder="Tổng KHo"
                  value={distributeTotal}
                  onValueChange={setDistributeTotal}
                  onKeyDown={(e) => e.key === "Enter" && distributeEvenly()}
                  className="w-28"
                  aria-label="Tổng tồn kho để chia đều"
                />
                <Button
                  size="sm" variant="flat" color="primary" radius="lg"
                  startContent={<Shuffle size={13} />}
                  onPress={distributeEvenly}
                >
                  Chia đều
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-default-100 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-default-50 border-b border-default-100">
                  <tr>
                    {activeDims.map((d) => {
                      const dim = VARIANT_DIM_KEYS.find((x) => x.key === d);
                      return (
                        <th key={d} className="px-3 py-2 text-left text-xs font-semibold text-default-500 uppercase whitespace-nowrap">
                          {dim ? t(dim.labelKey) : d}
                        </th>
                      );
                    })}
                    <th className="px-3 py-2 text-left text-xs font-semibold text-default-500 uppercase whitespace-nowrap">Tồn kho</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-default-500 uppercase whitespace-nowrap">Giá (₫)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {variantCombos.map((c) => {
                    const row = variantRows[c.key] || { stock: 0, price: Number(form.base_price) || 0 };
                    return (
                      <tr key={c.key} className="hover:bg-default-50">
                        {activeDims.map((d) => (
                          <td key={d} className="px-3 py-2 text-xs text-default-700 whitespace-nowrap">{c.attrs[d]}</td>
                        ))}
                        <td className="px-3 py-2">
                          <Input
                            size="sm" type="number" min="0" radius="lg"
                            value={String(row.stock)}
                            onValueChange={(v) =>
                              setVariantRows((prev) => ({
                                ...prev,
                                [c.key]: { ...(prev[c.key] ?? { price: Number(form.base_price) || 0 }), stock: Math.max(0, parseInt(v) || 0) },
                              }))
                            }
                            className="w-24"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            size="sm" type="number" min="0" radius="lg"
                            value={String(row.price)}
                            onValueChange={(v) =>
                              setVariantRows((prev) => ({
                                ...prev,
                                [c.key]: { ...(prev[c.key] ?? { stock: 0 }), price: Math.max(0, parseInt(v) || 0) },
                              }))
                            }
                            className="w-32"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-default-200 bg-default-50">
                  <tr>
                    <td
                      colSpan={activeDims.length}
                      className="px-3 py-2 text-xs font-semibold text-default-600 text-right"
                    >
                      Tổng tồn kho:
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-primary-600">
                      {Object.values(variantRows).reduce((s, r) => s + (Number(r?.stock) || 0), 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* ── Detail Info ─────────────────────────────────────────── */}
      <Section title={t("product.section_detail")}>
        <Input
          label={t("product.origin_label")} placeholder={t("product.origin_placeholder")}
          value={form.detail_info.origin_country}
          onValueChange={(v) => setDetail("origin_country", v)}
          radius="lg"
        />
        {/* Materials */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">{t("product.materials_label")}</p>
          <div className="flex gap-2">
            <Input
              placeholder={t("product.materials_placeholder")} value={matInput}
              onValueChange={setMatInput} radius="lg" size="sm" className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMaterial())}
            />
            <Button size="sm" variant="bordered" radius="lg" onPress={addMaterial} isIconOnly><Plus size={14} /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.detail_info.materials.map((m) => (
              <Chip key={m} size="sm" variant="flat" onClose={() => removeMaterial(m)}>{m}</Chip>
            ))}
          </div>
        </div>
        {/* Seasons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">{t("product.seasons_label")}</p>
          <CheckboxGroup
            value={form.detail_info.seasons}
            onValueChange={(v) => setDetail("seasons", v)}
            orientation="horizontal"
          >
            {SEASON_KEYS.map((s) => (
              <Checkbox key={s.key} value={s.key} radius="lg">{t(s.labelKey)}</Checkbox>
            ))}
          </CheckboxGroup>
        </div>
        <Textarea
          label={t("product.care_label")} placeholder={t("product.care_placeholder")}
          value={form.detail_info.care_instructions}
          onValueChange={(v) => setDetail("care_instructions", v)}
          radius="lg" minRows={2}
        />
      </Section>

      {/* ── Images & Video ──────────────────────────────────────── */}
      <Section title={t("product.section_media")}>
        <div className="space-y-3">
          <p className="text-sm font-medium text-default-700">
            {t("product.images_label")} <span className="text-danger">*</span>
          </p>
          <Button
            as="label" variant="bordered" radius="lg" startContent={<Upload size={14} />}
            className="cursor-pointer" isLoading={uploading}
            color={errors.images ? "danger" : "default"}
          >
            {t("product.upload_images_btn")}
            <input hidden accept="image/*" type="file" multiple onChange={handleImages} />
          </Button>
          {errors.images && (
            <p className="form-error text-xs text-danger flex items-center gap-1">
              <AlertCircle size={11} /> {errors.images}
            </p>
          )}
          {(form.images || []).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {(form.images || []).map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url} alt={`img-${i}`}
                    className="w-24 h-24 object-cover rounded-xl border border-default-200"
                  />
                  <button
                    type="button"
                    onClick={() => set("images", form.images.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">
                      {t("product.main_image_badge")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">{t("product.video_label")}</p>
          <Button
            as="label" variant="bordered" radius="lg" startContent={<Upload size={14} />}
            className="cursor-pointer" isLoading={uploading}
          >
            {t("product.upload_video_btn")}
            <input hidden accept="video/*" type="file" onChange={handleVideo} />
          </Button>
          {(form.videos || [])[0] && (
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="flat" color="success">{t("product.video_uploaded")}</Chip>
              <Button size="sm" variant="light" color="danger" isIconOnly
                onPress={() => set("videos", [])}>
                <X size={14} />
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* ── SEO ────────────────────────────────────────────────── */}
      <Section title={t("product.section_seo")}>
        <Input
          label={t("product.seo_title_label")} placeholder={t("product.seo_title_placeholder")}
          value={form.seo.title} onValueChange={(v) => setSeo("title", v)} radius="lg"
        />
        <Textarea
          label={t("product.seo_desc_label")} placeholder={t("product.seo_desc_placeholder")}
          value={form.seo.description} onValueChange={(v) => setSeo("description", v)}
          radius="lg" minRows={2}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">{t("product.seo_keywords_label")}</p>
          <div className="flex gap-2">
            <Input
              placeholder={t("product.seo_keywords_placeholder")} value={kw} onValueChange={setKw}
              radius="lg" size="sm" className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
            />
            <Button size="sm" variant="bordered" radius="lg" onPress={addKeyword} isIconOnly><Plus size={14} /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(form.seo.keywords || []).map((k) => (
              <Chip key={k} size="sm" variant="flat" onClose={() => removeKeyword(k)}>{k}</Chip>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Validation summary ─────────────────────────────────── */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl">
          <p className="text-sm font-semibold text-danger mb-2 flex items-center gap-1.5">
            <AlertCircle size={15} /> {t("product.validation_summary")}
          </p>
          <ul className="space-y-0.5">
            {Object.values(errors).map((msg, i) => (
              <li key={i} className="text-xs text-danger-600">• {msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Submit ─────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          color="primary" radius="lg" size="lg"
          onPress={handleSubmit} isLoading={loading}
        >
          {isEdit ? t("product.btn_update") : t("product.btn_create")}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div className="space-y-3">
      <div className="pb-1 border-b border-default-100">
        <p className="font-bold text-default-900">{title}</p>
        {description && <p className="text-xs text-default-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}
