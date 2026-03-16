import React, { useEffect, useState } from "react";
import {
  Input, Button, Select, SelectItem, Textarea, Checkbox, CheckboxGroup, Chip,
} from "@heroui/react";
import { X, Plus, Upload, AlertCircle } from "lucide-react";
import CategoryCascader from "./CategoryCascader";

const SEASONS = [
  { key: "spring",     label: "Xuân" },
  { key: "summer",     label: "Hè" },
  { key: "autumn",     label: "Thu" },
  { key: "winter",     label: "Đông" },
  { key: "all-season", label: "4 mùa" },
];

const VARIANT_DIMS = [
  { key: "color",            label: "Màu sắc",   placeholder: "VD: Đỏ, Xanh, Đen" },
  { key: "size",             label: "Kích cỡ",   placeholder: "VD: S, M, L, XL" },
  { key: "material_variant", label: "Chất liệu", placeholder: "VD: Cotton, Polyester" },
  { key: "pattern",          label: "Họa tiết",  placeholder: "VD: Trơn, Kẻ sọc" },
  { key: "fit",              label: "Kiểu dáng", placeholder: "VD: Slim fit, Regular" },
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
  const [form,      setForm]      = useState({ ...EMPTY, ...(initial || {}) });
  const [brands,    setBrands]    = useState([]);
  const [tagInput,  setTagInput]  = useState("");
  const [matInput,  setMatInput]  = useState("");
  const [kw,        setKw]        = useState("");
  const [uploading, setUploading] = useState(false);
  const [errors,    setErrors]    = useState({});
  // per-dimension input buffer
  const [dimInputs, setDimInputs] = useState({});

  useEffect(() => {
    svc.listBrands().then((data) => setBrands(Array.isArray(data) ? data : data?.items || []));
  }, []);

  // Sync initial (edit mode)
  useEffect(() => {
    if (initial) {
      const variantValues = {};
      if (initial.variant_values) {
        // variant_values may come back as a plain object or Map-like
        for (const dim of VARIANT_DIMS.map(d => d.key)) {
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
    const v = (dimInputs[dim] || "").trim();
    if (!v) return;
    setForm((f) => {
      const existing = f.variant_values?.[dim] || [];
      if (existing.includes(v)) return f;
      return { ...f, variant_values: { ...f.variant_values, [dim]: [...existing, v] } };
    });
    setDimInputs((p) => ({ ...p, [dim]: "" }));
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

  // ── Tags ──────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };
  const removeTag = (t) => set("tags", form.tags.filter((x) => x !== t));

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
      e.name = "Tên sản phẩm là bắt buộc";
    else if (form.name.trim().length < 5)
      e.name = "Tên sản phẩm phải có ít nhất 5 ký tự";

    if (!form.description.trim())
      e.description = "Mô tả sản phẩm là bắt buộc";
    else if (form.description.trim().length < 20)
      e.description = "Mô tả cần ít nhất 20 ký tự";

    const price = Number(form.base_price);
    if (!form.base_price || isNaN(price) || price <= 0)
      e.base_price = "Giá bán phải lớn hơn 0";
    else if (price < 1000)
      e.base_price = "Giá bán tối thiểu là 1.000₫";

    if (!form.category_id)
      e.category_id = "Vui lòng chọn danh mục";

    if (!form.images?.length)
      e.images = "Cần ít nhất 1 ảnh sản phẩm";

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
      stock_total: Number(form.stock_total || 0),
    };
    onSubmit(payload);
  };

  const isEdit = !!initial?._id;
  const hasVariantValues = form.variant_dimensions.some(
    (d) => (form.variant_values?.[d] || []).length > 0
  );

  return (
    <div className="space-y-6">
      {/* ── Basic Info ──────────────────────────────────────────── */}
      <Section title="Thông tin cơ bản">
        <div>
          <Input
            isRequired label="Tên sản phẩm" placeholder="Nhập tên sản phẩm..."
            value={form.name} onValueChange={(v) => { set("name", v); setErrors(p => { const n = {...p}; delete n.name; return n; }); }}
            radius="lg"
            isInvalid={!!errors.name}
            errorMessage={errors.name}
          />
        </div>
        <div>
          <Textarea
            isRequired label="Mô tả sản phẩm" placeholder="Mô tả chi tiết sản phẩm (ít nhất 20 ký tự)..."
            value={form.description} onValueChange={(v) => { set("description", v); setErrors(p => { const n = {...p}; delete n.description; return n; }); }}
            radius="lg" minRows={4}
            isInvalid={!!errors.description}
            errorMessage={errors.description}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            isRequired label="Giá bán (VND)" placeholder="VD: 299000"
            type="number" min="1000"
            value={String(form.base_price)}
            onValueChange={(v) => { set("base_price", v); setErrors(p => { const n = {...p}; delete n.base_price; return n; }); }}
            radius="lg"
            description="Đơn vị: VND — tối thiểu 1.000₫"
            isInvalid={!!errors.base_price}
            errorMessage={errors.base_price}
          />
          <Input
            label="Tồn kho ban đầu" placeholder="0" type="number" min="0"
            value={String(form.stock_total)} onValueChange={(v) => set("stock_total", v)}
            radius="lg"
            description={hasVariantValues ? "Tự động tính khi biến thể được tạo" : "Số lượng tồn kho"}
          />
        </div>
      </Section>

      {/* ── Classification ──────────────────────────────────────── */}
      <Section title="Phân loại">
        <div>
          <p className="text-sm font-medium text-default-700 mb-2">
            Danh mục <span className="text-danger">*</span>
          </p>
          <CategoryCascader value={form.category_id} onChange={(v) => { set("category_id", v); setErrors(p => { const n = {...p}; delete n.category_id; return n; }); }} svc={svc} />
          {errors.category_id && (
            <p className="form-error text-xs text-danger mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors.category_id}
            </p>
          )}
        </div>
        <Select
          label="Thương hiệu" placeholder="Chọn thương hiệu"
          selectedKeys={form.brand_id ? new Set([form.brand_id]) : new Set()}
          onSelectionChange={(k) => set("brand_id", Array.from(k)[0] || "")}
          radius="lg"
        >
          {brands.map((b) => <SelectItem key={b._id}>{b.name}</SelectItem>)}
        </Select>
        {/* Tags */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">Tags</p>
          <div className="flex gap-2">
            <Input
              placeholder="Nhập tag và nhấn Enter..." value={tagInput} onValueChange={setTagInput}
              radius="lg" size="sm" className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
            <Button size="sm" variant="bordered" radius="lg" onPress={addTag} isIconOnly><Plus size={14} /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.tags.map((t) => (
              <Chip key={t} size="sm" variant="flat" onClose={() => removeTag(t)}>{t}</Chip>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Variant Dimensions ──────────────────────────────────── */}
      <Section
        title="Thuộc tính biến thể"
        description="Chọn thuộc tính → ngay lập tức thêm các giá trị cho thuộc tính đó"
      >
        <div className="space-y-4">
          {VARIANT_DIMS.map((d) => {
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
                    <span className="font-medium text-sm text-default-800">{d.label}</span>
                  </Checkbox>
                </div>

                {/* Value entry — shown immediately when checked */}
                {checked && (
                  <div className="px-4 pb-4 space-y-2 border-t border-primary-100">
                    <p className="text-xs text-default-500 pt-3">
                      Thêm các giá trị {d.label.toLowerCase()} (nhấn Enter hoặc nút +)
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={d.placeholder}
                        value={dimInputs[d.key] || ""}
                        onValueChange={(v) => setDimInputs((p) => ({ ...p, [d.key]: v }))}
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
                        <span className="text-xs text-default-300 italic">Chưa có giá trị nào</span>
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

        {hasVariantValues && (
          <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
            <div className="text-primary-500 mt-0.5"><Plus size={14} /></div>
            <p className="text-xs text-primary-700">
              Hệ thống sẽ tự động tạo tất cả tổ hợp biến thể từ các giá trị bạn đã nhập sau khi tạo sản phẩm.
            </p>
          </div>
        )}
      </Section>

      {/* ── Detail Info ─────────────────────────────────────────── */}
      <Section title="Thông tin chi tiết">
        <Input
          label="Xuất xứ" placeholder="Việt Nam, Trung Quốc..."
          value={form.detail_info.origin_country}
          onValueChange={(v) => setDetail("origin_country", v)}
          radius="lg"
        />
        {/* Materials */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">Chất liệu</p>
          <div className="flex gap-2">
            <Input
              placeholder="VD: Cotton, Polyester..." value={matInput}
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
          <p className="text-sm font-medium text-default-700">Mùa phù hợp</p>
          <CheckboxGroup
            value={form.detail_info.seasons}
            onValueChange={(v) => setDetail("seasons", v)}
            orientation="horizontal"
          >
            {SEASONS.map((s) => (
              <Checkbox key={s.key} value={s.key} radius="lg">{s.label}</Checkbox>
            ))}
          </CheckboxGroup>
        </div>
        <Textarea
          label="Hướng dẫn bảo quản" placeholder="Giặt máy ở 30°C, không sấy..."
          value={form.detail_info.care_instructions}
          onValueChange={(v) => setDetail("care_instructions", v)}
          radius="lg" minRows={2}
        />
      </Section>

      {/* ── Images & Video ──────────────────────────────────────── */}
      <Section title="Hình ảnh & Video">
        <div className="space-y-3">
          <p className="text-sm font-medium text-default-700">
            Ảnh sản phẩm <span className="text-danger">*</span>
          </p>
          <Button
            as="label" variant="bordered" radius="lg" startContent={<Upload size={14} />}
            className="cursor-pointer" isLoading={uploading}
            color={errors.images ? "danger" : "default"}
          >
            Tải ảnh lên (Cloudinary)
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
                      Ảnh chính
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">Video (tùy chọn)</p>
          <Button
            as="label" variant="bordered" radius="lg" startContent={<Upload size={14} />}
            className="cursor-pointer" isLoading={uploading}
          >
            Tải video lên (Cloudinary)
            <input hidden accept="video/*" type="file" onChange={handleVideo} />
          </Button>
          {(form.videos || [])[0] && (
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="flat" color="success">Video đã tải lên</Chip>
              <Button size="sm" variant="light" color="danger" isIconOnly
                onPress={() => set("videos", [])}>
                <X size={14} />
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* ── SEO ────────────────────────────────────────────────── */}
      <Section title="SEO (tùy chọn)">
        <Input
          label="Tiêu đề SEO" placeholder="Để trống sẽ dùng tên sản phẩm"
          value={form.seo.title} onValueChange={(v) => setSeo("title", v)} radius="lg"
        />
        <Textarea
          label="Mô tả SEO" placeholder="Mô tả ngắn cho công cụ tìm kiếm..."
          value={form.seo.description} onValueChange={(v) => setSeo("description", v)}
          radius="lg" minRows={2}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-700">Từ khóa SEO</p>
          <div className="flex gap-2">
            <Input
              placeholder="Nhập từ khóa và nhấn Enter..." value={kw} onValueChange={setKw}
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
            <AlertCircle size={15} /> Vui lòng kiểm tra lại các trường sau:
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
          {isEdit ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
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
