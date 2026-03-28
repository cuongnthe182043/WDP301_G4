import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardBody, Button, Input, Chip,
  Select, SelectItem, Modal, ModalContent, ModalHeader,
  ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import PaginationBar from "../../components/ui/PaginationBar";
import { Plus, Search, Eye, Pencil, Trash2, X, ChevronDown, ChevronRight } from "lucide-react";
import { shopFlashsaleApi } from "../../services/flashsaleService";
import { useToast } from "../../components/common/ToastProvider";
import apiClient from "../../services/apiClient";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  scheduled: "warning",
  active:    "success",
  ended:     "default",
  cancelled: "danger",
};

const STATUS_LABEL = {
  scheduled: "Sắp diễn ra",
  active:    "Đang diễn ra",
  ended:     "Đã kết thúc",
  cancelled: "Đã huỷ",
};

function toLocalInput(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK_FORM = {
  title: "",
  description: "",
  start_time: "",
  end_time: "",
  discount_type: "percentage",
  discount_value: "",
  max_per_user: 1,
  products: [],
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ManageFlashsale() {
  const toast = useToast();

  // List state
  const [list, setList]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit]           = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal state
  const [mode, setMode]       = useState(null); // "create" | "edit" | "detail"
  const [form, setForm]       = useState(BLANK_FORM);
  const [saving, setSaving]   = useState(false);

  // Product picker state
  const [shopProducts, setShopProducts]         = useState([]);
  const [productLoading, setProductLoading]     = useState(false);
  const [productSearch, setProductSearch]       = useState("");
  const [expandedProduct, setExpandedProduct]   = useState(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadList = useCallback(async (pg, kw, status) => {
    setLoading(true);
    try {
      const params = { page: pg, limit };
      if (kw)     params.title  = kw;
      if (status) params.status = status;
      const res = await shopFlashsaleApi.getAll(params);
      setList(res.data || []);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadList(page, searchTerm, statusFilter); }, [page, searchTerm, statusFilter]); // eslint-disable-line

  const loadShopProducts = async (q = "") => {
    setProductLoading(true);
    try {
      const res = await apiClient.get("/shop/products", { params: { q, limit: 50 } });
      setShopProducts(res.data?.data || []);
    } catch {
      toast.error("Không thể tải sản phẩm của shop");
    } finally {
      setProductLoading(false);
    }
  };

  // ── Modal open/close ───────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setMode("create");
    setProductSearch("");
    setExpandedProduct(null);
    loadShopProducts();
  };

  const openEdit = async (fs) => {
    setMode("edit");
    setProductSearch("");
    setExpandedProduct(null);

    // Load shop products first so we can populate names for existing items
    setProductLoading(true);
    let allProducts = [];
    try {
      const res = await apiClient.get("/shop/products", { params: { limit: 50 } });
      allProducts = res.data?.data || [];
      setShopProducts(allProducts);
    } catch {
      toast.error("Không thể tải sản phẩm của shop");
    } finally {
      setProductLoading(false);
    }

    // Build lookup maps from loaded products
    const productMap = new Map(allProducts.map((p) => [String(p._id), p]));
    const variantMap = new Map();
    for (const p of allProducts) {
      for (const v of p.variants || []) {
        variantMap.set(String(v._id), { product: p, variant: v });
      }
    }

    setForm({
      _id: fs._id,
      title:          fs.title          || "",
      description:    fs.description    || "",
      start_time:     toLocalInput(fs.start_time),
      end_time:       toLocalInput(fs.end_time),
      discount_type:  fs.discount_type  || "percentage",
      discount_value: fs.discount_value || "",
      max_per_user:   fs.max_per_user   || 1,
      products: (fs.products || []).map((p) => {
        const found = variantMap.get(String(p.variant_id));
        return {
          product_id:     p.product_id,
          variant_id:     p.variant_id,
          name:           found?.product?.name || productMap.get(String(p.product_id))?.name || "",
          variant_name:   found?.variant?.name || found?.variant?.sku || "",
          original_price: p.original_price || 0,
          flash_price:    p.flash_price    || 0,
          quantity_total: p.quantity_total || 1,
          quantity_sold:  p.quantity_sold  || 0,
        };
      }),
    });
  };

  const openDetail = (fs) => { setForm(fs); setMode("detail"); };
  const closeModal = () => { setMode(null); setForm(BLANK_FORM); setExpandedProduct(null); };

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const recalcFlashPrices = (discountType, discountValue) => {
    const dv = Number(discountValue);
    setForm((f) => ({
      ...f,
      discount_type:  discountType,
      discount_value: discountValue,
      products: f.products.map((p) => {
        let fp = p.original_price;
        if (discountType === "percentage" && dv > 0) fp = Math.round(p.original_price * (1 - dv / 100));
        else if (discountType === "fixed"      && dv > 0) fp = Math.max(0, p.original_price - dv);
        return { ...p, flash_price: fp };
      }),
    }));
  };

  const addVariant = (product, variant) => {
    if (form.products.some((p) => p.variant_id === String(variant._id))) {
      toast.error("Biến thể này đã được thêm");
      return;
    }
    const originalPrice = variant.price || 0;
    const dv = Number(form.discount_value);
    let flashPrice = originalPrice;
    if (form.discount_type === "percentage" && dv > 0) flashPrice = Math.round(originalPrice * (1 - dv / 100));
    else if (form.discount_type === "fixed" && dv > 0) flashPrice = Math.max(0, originalPrice - dv);

    setForm((f) => ({
      ...f,
      products: [
        ...f.products,
        {
          product_id:     String(product._id),
          variant_id:     String(variant._id),
          name:           product.name,
          variant_name:   variant.name || variant.sku || "",
          original_price: originalPrice,
          flash_price:    flashPrice,
          quantity_total: Math.min(variant.stock || 1, 100),
          quantity_sold:  0,
        },
      ],
    }));
  };

  const removeVariant = (variantId) =>
    setForm((f) => ({ ...f, products: f.products.filter((p) => p.variant_id !== variantId) }));

  const updateProductField = (variantId, key, val) =>
    setForm((f) => ({
      ...f,
      products: f.products.map((p) => p.variant_id === variantId ? { ...p, [key]: val } : p),
    }));

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title?.trim())              { toast.error("Vui lòng nhập tiêu đề"); return; }
    if (!form.start_time || !form.end_time) { toast.error("Vui lòng chọn thời gian"); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0)
      { toast.error("Giá trị giảm phải lớn hơn 0"); return; }
    if (!form.products.length)
      { toast.error("Vui lòng thêm ít nhất một sản phẩm"); return; }

    for (const p of form.products) {
      if (Number(p.flash_price) <= 0)
        { toast.error(`Giá flash sale của "${p.name}" phải lớn hơn 0`); return; }
      if (Number(p.flash_price) >= Number(p.original_price))
        { toast.error(`Giá flash sale của "${p.name}" phải nhỏ hơn giá gốc`); return; }
      if (Number(p.quantity_total) < 1)
        { toast.error(`Số lượng của "${p.name}" phải ít nhất là 1`); return; }
    }

    setSaving(true);
    try {
      const payload = {
        title:          form.title.trim(),
        description:    form.description || "",
        start_time:     new Date(form.start_time).toISOString(),
        end_time:       new Date(form.end_time).toISOString(),
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value),
        max_per_user:   Math.max(1, Number(form.max_per_user) || 1),
        products:       form.products.map((p) => ({
          product_id:     p.product_id,
          variant_id:     p.variant_id,
          name:           p.name          || "",
          variant_name:   p.variant_name  || "",
          original_price: Number(p.original_price),
          flash_price:    Number(p.flash_price),
          quantity_total: Number(p.quantity_total),
          quantity_sold:  Number(p.quantity_sold) || 0,
        })),
      };

      if (mode === "create") await shopFlashsaleApi.create(payload);
      else                   await shopFlashsaleApi.update(form._id, payload);

      toast.success(mode === "create" ? "Tạo Flash Sale thành công" : "Cập nhật thành công");
      closeModal();
      loadList(page, searchTerm, statusFilter);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Huỷ Flash Sale này?")) return;
    try {
      await shopFlashsaleApi.cancel(id);
      toast.success("Đã huỷ Flash Sale");
      loadList(page, searchTerm, statusFilter);
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá Flash Sale này? Hành động này không thể hoàn tác.")) return;
    try {
      await shopFlashsaleApi.delete(id);
      toast.success("Đã xoá Flash Sale");
      loadList(page, searchTerm, statusFilter);
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const isEditable = mode === "create" || mode === "edit";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-default-900">Flash Sale</h1>
        <div className="flex gap-2 flex-wrap">
          <form
            onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }}
            className="flex gap-2"
          >
            <Input
              size="sm" placeholder="Tìm tiêu đề..." value={searchInput}
              onValueChange={setSearchInput} radius="lg" className="w-44"
              startContent={<Search size={14} />}
            />
            <Button size="sm" type="submit" variant="bordered" radius="lg">Tìm</Button>
          </form>
          <Select
            size="sm" placeholder="Trạng thái" className="w-36" radius="lg"
            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
            onSelectionChange={(k) => { setStatusFilter(Array.from(k)[0] || ""); setPage(1); }}
          >
            <SelectItem key="">Tất cả</SelectItem>
            <SelectItem key="scheduled">Sắp diễn ra</SelectItem>
            <SelectItem key="active">Đang diễn ra</SelectItem>
            <SelectItem key="ended">Đã kết thúc</SelectItem>
            <SelectItem key="cancelled">Đã huỷ</SelectItem>
          </Select>
          <Button size="sm" color="primary" radius="lg" startContent={<Plus size={14} />} onPress={openCreate}>
            Tạo Flash Sale
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Tiêu đề", "Giảm giá", "Bắt đầu", "Kết thúc", "Biến thể", "Trạng thái", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-default-400">Chưa có Flash Sale nào</td>
                  </tr>
                ) : list.map((fs) => (
                  <tr key={fs._id} className="hover:bg-default-50">
                    <td className="px-4 py-3 font-semibold text-default-900 max-w-[160px] truncate">{fs.title}</td>
                    <td className="px-4 py-3 text-danger font-medium">
                      {fs.discount_type === "percentage"
                        ? `-${fs.discount_value}%`
                        : `-${(fs.discount_value || 0).toLocaleString("vi-VN")}₫`}
                    </td>
                    <td className="px-4 py-3 text-default-600 whitespace-nowrap">
                      {new Date(fs.start_time).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-default-600 whitespace-nowrap">
                      {new Date(fs.end_time).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-default-600">{fs.products?.length || 0}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" variant="flat" color={STATUS_COLOR[fs.status] || "default"}>
                        {STATUS_LABEL[fs.status] || fs.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(fs)} title="Xem chi tiết">
                          <Eye size={14} />
                        </Button>
                        {fs.status !== "ended" && fs.status !== "cancelled" && (
                          <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(fs)} title="Chỉnh sửa">
                            <Pencil size={14} />
                          </Button>
                        )}
                        {fs.status !== "ended" && fs.status !== "cancelled" && (
                          <Button isIconOnly size="sm" variant="light" color="warning" onPress={() => handleCancel(fs._id)} title="Huỷ">
                            <X size={14} />
                          </Button>
                        )}
                        {fs.status !== "active" && (
                          <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(fs._id)} title="Xoá">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <PaginationBar total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />

      {/* Modal */}
      <Modal
        isOpen={!!mode} onOpenChange={(o) => !o && closeModal()}
        radius="xl" size="4xl" scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {mode === "detail" ? "Chi tiết Flash Sale"
                  : mode === "create" ? "Tạo Flash Sale mới"
                  : "Chỉnh sửa Flash Sale"}
              </ModalHeader>

              <ModalBody className="space-y-4">
                {mode === "detail" ? (
                  <DetailView fs={form} />
                ) : (
                  <EditForm
                    form={form}
                    setField={setField}
                    recalcFlashPrices={recalcFlashPrices}
                    shopProducts={shopProducts}
                    productLoading={productLoading}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    loadShopProducts={loadShopProducts}
                    expandedProduct={expandedProduct}
                    setExpandedProduct={setExpandedProduct}
                    addVariant={addVariant}
                    removeVariant={removeVariant}
                    updateProductField={updateProductField}
                  />
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant="light" onPress={onClose}>Đóng</Button>
                {isEditable && (
                  <Button color="primary" isLoading={saving} onPress={handleSave}>
                    {mode === "create" ? "Tạo Flash Sale" : "Lưu thay đổi"}
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// ── Detail view (read-only) ───────────────────────────────────────────────────

function DetailView({ fs }) {
  return (
    <div className="space-y-5 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-default-500 text-xs uppercase mb-1">Tiêu đề</p>
          <p className="font-semibold">{fs.title}</p>
        </div>
        <div>
          <p className="text-default-500 text-xs uppercase mb-1">Trạng thái</p>
          <Chip size="sm" variant="flat" color={STATUS_COLOR[fs.status] || "default"}>
            {STATUS_LABEL[fs.status] || fs.status}
          </Chip>
        </div>
        <div>
          <p className="text-default-500 text-xs uppercase mb-1">Bắt đầu</p>
          <p>{new Date(fs.start_time).toLocaleString("vi-VN")}</p>
        </div>
        <div>
          <p className="text-default-500 text-xs uppercase mb-1">Kết thúc</p>
          <p>{new Date(fs.end_time).toLocaleString("vi-VN")}</p>
        </div>
        <div>
          <p className="text-default-500 text-xs uppercase mb-1">Giảm giá</p>
          <p className="text-danger font-medium">
            {fs.discount_type === "percentage"
              ? `${fs.discount_value}%`
              : `${(fs.discount_value || 0).toLocaleString("vi-VN")}₫`}
          </p>
        </div>
        <div>
          <p className="text-default-500 text-xs uppercase mb-1">Giới hạn / người</p>
          <p>{fs.max_per_user || 1} sản phẩm</p>
        </div>
      </div>

      {fs.description && (
        <p className="text-default-600 bg-default-50 rounded-xl px-4 py-3">{fs.description}</p>
      )}

      {fs.products?.length > 0 && (
        <div>
          <p className="text-default-500 text-xs uppercase mb-2 font-semibold">
            Sản phẩm trong Flash Sale ({fs.products.length})
          </p>
          <div className="border border-default-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-default-50">
                <tr>
                  {["Sản phẩm", "Giá gốc", "Giá Flash", "Đã bán / Tổng"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-default-500 uppercase text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {fs.products.map((p, i) => (
                  <tr key={i} className="hover:bg-default-50">
                    <td className="px-3 py-2">
                      <p className="font-medium">{p.name || p.product_id}</p>
                      {p.variant_name && <p className="text-default-400">{p.variant_name}</p>}
                    </td>
                    <td className="px-3 py-2 text-default-500 line-through">
                      {(p.original_price || 0).toLocaleString("vi-VN")}₫
                    </td>
                    <td className="px-3 py-2 text-danger font-semibold">
                      {(p.flash_price || 0).toLocaleString("vi-VN")}₫
                      <span className="text-[10px] text-default-400 ml-1">
                        (-{Math.round((1 - (p.flash_price || 0) / (p.original_price || 1)) * 100)}%)
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={p.quantity_sold >= p.quantity_total ? "text-danger" : "text-default-600"}>
                        {p.quantity_sold || 0}
                      </span>
                      <span className="text-default-400"> / {p.quantity_total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit / create form ────────────────────────────────────────────────────────

function EditForm({
  form, setField, recalcFlashPrices,
  shopProducts, productLoading, productSearch, setProductSearch, loadShopProducts,
  expandedProduct, setExpandedProduct,
  addVariant, removeVariant, updateProductField,
}) {
  const filteredProducts = productSearch.trim()
    ? shopProducts.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : shopProducts;

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <Input
        label="Tiêu đề *" value={form.title}
        onValueChange={(v) => setField("title", v)} radius="lg"
      />
      <Input
        label="Mô tả" value={form.description || ""}
        onValueChange={(v) => setField("description", v)} radius="lg"
      />

      {/* Time range */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Thời gian bắt đầu *" type="datetime-local"
          value={form.start_time} onValueChange={(v) => setField("start_time", v)} radius="lg"
        />
        <Input
          label="Thời gian kết thúc *" type="datetime-local"
          value={form.end_time} onValueChange={(v) => setField("end_time", v)} radius="lg"
        />
      </div>

      {/* Discount config */}
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Loại giảm giá *" radius="lg"
          selectedKeys={new Set([form.discount_type || "percentage"])}
          onSelectionChange={(k) => recalcFlashPrices(Array.from(k)[0] || "percentage", form.discount_value)}
        >
          <SelectItem key="percentage">Phần trăm (%)</SelectItem>
          <SelectItem key="fixed">Số tiền cố định (₫)</SelectItem>
        </Select>
        <Input
          label={form.discount_type === "percentage" ? "Mức giảm (%) *" : "Mức giảm (₫) *"}
          type="number" min="0"
          value={String(form.discount_value || "")}
          onValueChange={(v) => recalcFlashPrices(form.discount_type, v)}
          radius="lg"
          endContent={
            <span className="text-default-400 text-xs">
              {form.discount_type === "percentage" ? "%" : "₫"}
            </span>
          }
        />
        <Input
          label="Giới hạn / người" type="number" min="1"
          value={String(form.max_per_user || 1)}
          onValueChange={(v) => setField("max_per_user", v)} radius="lg"
        />
      </div>

      {/* Product picker */}
      <div className="border border-default-200 rounded-xl p-3 space-y-3">
        <p className="font-semibold text-default-700 text-sm">Thêm sản phẩm vào Flash Sale</p>
        <Input
          size="sm" placeholder="Tìm sản phẩm theo tên..."
          value={productSearch}
          onValueChange={(v) => { setProductSearch(v); loadShopProducts(v); }}
          radius="lg" startContent={<Search size={13} />}
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {productLoading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-default-400 text-xs py-4">Không tìm thấy sản phẩm nào</p>
          ) : filteredProducts.map((product) => (
            <div key={product._id} className="border border-default-100 rounded-lg overflow-hidden">
              {/* Product row */}
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-default-50 text-left"
                onClick={() => setExpandedProduct(expandedProduct === product._id ? null : product._id)}
              >
                {expandedProduct === product._id
                  ? <ChevronDown size={13} className="shrink-0 text-default-400" />
                  : <ChevronRight size={13} className="shrink-0 text-default-400" />}
                {product.images?.[0] && (
                  <img src={product.images[0]} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                )}
                <span className="text-sm font-medium flex-1 truncate">{product.name}</span>
                <span className="text-xs text-default-400 shrink-0">
                  {product.variants?.length || 0} biến thể
                </span>
              </button>

              {/* Variant rows */}
              {expandedProduct === product._id && (
                <div className="border-t border-default-100">
                  {!product.variants?.length ? (
                    <p className="px-4 py-2 text-xs text-default-400">Không có biến thể nào</p>
                  ) : product.variants.map((variant) => {
                    const added = form.products.some((p) => p.variant_id === String(variant._id));
                    return (
                      <div key={variant._id}
                        className="flex items-center gap-2 px-4 py-2 border-t border-default-50 bg-default-50/40 hover:bg-default-50"
                      >
                        <div className="flex-1 text-xs">
                          <span className="font-medium">
                            {variant.name || variant.sku || `SKU ${String(variant._id).slice(-6)}`}
                          </span>
                          <span className="text-default-500 ml-2">
                            {(variant.price || 0).toLocaleString("vi-VN")}₫
                          </span>
                          <span className="text-default-400 ml-2">Tồn: {variant.stock ?? 0}</span>
                        </div>
                        <Button
                          size="sm" radius="lg"
                          variant={added ? "flat" : "solid"}
                          color={added ? "default" : "primary"}
                          isDisabled={added}
                          onPress={() => addVariant(product, variant)}
                        >
                          {added ? "Đã thêm" : "+ Thêm"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected products table */}
      {form.products.length > 0 && (
        <div className="border border-default-200 rounded-xl overflow-hidden">
          <div className="bg-default-50 px-4 py-2 border-b border-default-100">
            <p className="font-semibold text-default-700 text-sm">
              Sản phẩm đã chọn ({form.products.length})
            </p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-default-50/50">
              <tr>
                {["Sản phẩm", "Giá gốc", "Giá Flash *", "Số lượng *", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-default-500 uppercase text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {form.products.map((p) => {
                const discountPct = p.original_price > 0
                  ? Math.round((1 - Number(p.flash_price) / Number(p.original_price)) * 100)
                  : 0;
                const valid = Number(p.flash_price) > 0 && Number(p.flash_price) < Number(p.original_price);
                return (
                  <tr key={p.variant_id} className="hover:bg-default-50">
                    <td className="px-3 py-2">
                      <p className="font-medium">{p.name}</p>
                      {p.variant_name && <p className="text-default-400">{p.variant_name}</p>}
                    </td>
                    <td className="px-3 py-2 text-default-500">
                      {(p.original_price || 0).toLocaleString("vi-VN")}₫
                    </td>
                    <td className="px-3 py-2 w-32">
                      <input
                        type="number" min="1"
                        value={p.flash_price}
                        onChange={(e) => updateProductField(p.variant_id, "flash_price", Number(e.target.value))}
                        className="w-full border border-default-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                      />
                      {valid ? (
                        <p className="text-success text-[10px] mt-0.5">-{discountPct}% so với giá gốc</p>
                      ) : Number(p.flash_price) >= Number(p.original_price) ? (
                        <p className="text-danger text-[10px] mt-0.5">Phải nhỏ hơn giá gốc</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 w-24">
                      <input
                        type="number" min="1"
                        value={p.quantity_total}
                        onChange={(e) => updateProductField(p.variant_id, "quantity_total", Number(e.target.value))}
                        className="w-full border border-default-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeVariant(p.variant_id)}
                        className="text-danger hover:opacity-70 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
