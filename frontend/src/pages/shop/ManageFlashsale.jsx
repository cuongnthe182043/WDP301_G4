import React, { useState, useEffect } from "react";
import {
  Card, CardBody, Button, Input, Pagination, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { flashsaleApi } from "../../services/flashsaleService";
import { bannerApi } from "../../services/bannerService";
import { productService } from "../../services/productService";
import { productVariantByListIdProduct } from "../../services/productVariantService";
import { useToast } from "../../components/common/ToastProvider";
import { useTranslation } from "react-i18next";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "-";
const BLANK = {
  title: "", description: "", product: [], banner_id: "", banner_image: "",
  discount_type: "percentage", discount_value: 0,
  max_per_user: 0, total_limit: 0, start_time: "", end_time: "", status: "scheduled",
};

export default function ManageFlashsale() {
  const { t } = useTranslation();
  const toast = useToast();
  const [flashsales,  setFlashsales]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [selected,    setSelected]    = useState(null);
  const [mode,        setMode]        = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");
  const [products,    setProducts]    = useState([]);
  const [banners,     setBanners]     = useState([]);

  const fetch = async (pg = page, kw = searchTerm) => {
    setLoading(true);
    try {
      const res = await flashsaleApi.getAll(pg, 10, kw);
      setFlashsales(res.data || res || []); setTotalPages(res.pagination?.totalPages || 1);
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  const loadDropdown = async () => {
    const [pro, ban] = await Promise.allSettled([
      productService.getAllProducts?.() || Promise.resolve([]),
      bannerApi.getAll(1, 100),
    ]);
    setProducts(pro.status === "fulfilled" ? (pro.value || []) : []);
    setBanners(ban.status === "fulfilled" ? (ban.value?.data || []) : []);
  };

  useEffect(() => { fetch(); }, [page, searchTerm]);

  const openCreate = async () => { await loadDropdown(); setSelected({ ...BLANK }); setMode("create"); };
  const openDetail = (fs) => { setSelected(fs); setMode("detail"); };
  const openEdit = async (fs) => {
    await loadDropdown();
    const uniqueIds = Array.from(new Set(fs.products?.map((p) => p.product_id)));
    const mappedProducts = uniqueIds.map((pid) => ({ product_id: pid, name: products.find((p) => p._id === pid)?.name || "" }));
    setSelected({ ...fs, product: mappedProducts }); setMode("edit");
  };
  const closeDialog = () => { setSelected(null); setMode(null); };

  const handleSave = async () => {
    try {
      if (!selected.product?.length) { toast.error(t("shop.select_products")); return; }
      const variantRes = await productVariantByListIdProduct.getByProductIds(selected.product.map((p) => p.product_id));
      if (!variantRes?.length) { toast.error(t("shop.select_products")); return; }
      const productsPayload = variantRes.map((v) => {
        const orig = v.original_price || v.price || 0;
        let flash = orig;
        if (selected.discount_type === "percentage") flash = orig * (1 - (selected.discount_value || 0) / 100);
        else if (selected.discount_type === "fixed") flash = Math.max(0, orig - (selected.discount_value || 0));
        return { product_id: v.product_id, variant_id: v._id, flash_price: Math.round(flash), original_price: orig, quantity_total: v.stock || 0, quantity_sold: 0 };
      });
      const payload = {
        title: selected.title, description: selected.description, banner_id: selected.banner_id,
        banner_image: selected.banner_image, discount_type: selected.discount_type || "percentage",
        discount_value: Number(selected.discount_value) || 0, max_per_user: Number(selected.max_per_user) || 0,
        total_limit: Number(selected.total_limit) || 0,
        start_time: selected.start_time ? new Date(selected.start_time) : new Date(),
        end_time: selected.end_time ? new Date(selected.end_time) : new Date(),
        status: selected.status || "scheduled", products: productsPayload,
      };
      if (mode === "create") await flashsaleApi.create(payload);
      else await flashsaleApi.update(selected._id, payload);
      toast.success(mode === "create" ? t("shop.flashsale_create") : t("common.save"));
      closeDialog(); fetch();
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("common.confirm_delete"))) return;
    try { await flashsaleApi.delete(id); toast.success(t("common.delete")); fetch(); }
    catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const set = (key, val) => setSelected((s) => ({ ...s, [key]: val }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-default-900">{t("shop.flashsales")}</h1>
        <div className="flex gap-2">
          <form onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }} className="flex gap-2">
            <Input size="sm" placeholder={t("shop.search_flashsale")} value={searchInput} onValueChange={setSearchInput}
              radius="lg" className="w-44" startContent={<Search size={14} />} />
            <Button size="sm" type="submit" variant="bordered" radius="lg">{t("common.search")}</Button>
          </form>
          <Button size="sm" color="primary" radius="lg" startContent={<Plus size={14} />} onPress={openCreate}>{t("common.create_new")}</Button>
        </div>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? <div className="flex justify-center py-10"><Spinner /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[t("common.title"), "Banner", t("shop.flashsale_discount"), t("shop.start_date"), t("shop.end_date"), t("common.status"), ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {flashsales.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-default-400">{t("shop.no_flashsales")}</td></tr>
                ) : flashsales.map((fs) => (
                  <tr key={fs._id} className="hover:bg-default-50">
                    <td className="px-4 py-3 font-semibold text-default-900">{fs.title}</td>
                    <td className="px-4 py-3">{fs.banner_image && <img src={fs.banner_image} alt={fs.title} className="w-20 h-12 object-cover rounded-lg" />}</td>
                    <td className="px-4 py-3">{fs.discount_type === "percentage" ? `${fs.discount_value}%` : `${(fs.discount_value || 0).toLocaleString()} ₫`}</td>
                    <td className="px-4 py-3">{formatDate(fs.start_time)}</td>
                    <td className="px-4 py-3">{formatDate(fs.end_time)}</td>
                    <td className="px-4 py-3"><Chip size="sm" variant="flat">{fs.status || "inactive"}</Chip></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(fs)}><Eye size={14} /></Button>
                        <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(fs)}><Pencil size={14} /></Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(fs._id)}><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} color="primary" radius="lg" />
        </div>
      )}

      <Modal isOpen={!!selected && !!mode} onOpenChange={(o) => !o && closeDialog()} radius="xl" size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {mode === "detail" ? t("shop.flashsale_detail") : mode === "create" ? t("shop.flashsale_create") : t("shop.flashsale_edit")}
              </ModalHeader>
              <ModalBody className="space-y-3">
                {selected && mode === "detail" ? (
                  <div className="space-y-2 text-sm">
                    <p><b>{t("common.title")}:</b> {selected.title}</p>
                    <p><b>{t("common.description")}:</b> {selected.description || "-"}</p>
                    <p><b>{t("shop.flashsale_discount")}:</b> {selected.discount_type === "percentage" ? `${selected.discount_value}%` : `${selected.discount_value?.toLocaleString()} ₫`}</p>
                    <p><b>{t("shop.max_per_user")}:</b> {selected.max_per_user || "-"}</p>
                    <p><b>{t("shop.total_limit")}:</b> {selected.total_limit || "-"}</p>
                    <p><b>{t("shop.start_date")}:</b> {formatDate(selected.start_time)}</p>
                    <p><b>{t("shop.end_date")}:</b> {formatDate(selected.end_time)}</p>
                    <p><b>{t("common.status")}:</b> {selected.status}</p>
                    {selected.banner_image && <img src={selected.banner_image} alt={selected.title} className="w-full rounded-xl" />}
                  </div>
                ) : selected && (
                  <>
                    <Input label={t("common.title")} value={selected.title || ""} onValueChange={(v) => set("title", v)} radius="lg" />
                    <Input label={t("common.description")} value={selected.description || ""} onValueChange={(v) => set("description", v)} radius="lg" />
                    <Select label="Banner" selectedKeys={selected.banner_id ? new Set([selected.banner_id]) : new Set()}
                      onSelectionChange={(k) => {
                        const bid = Array.from(k)[0];
                        const ban = banners.find((b) => b._id === bid);
                        setSelected((s) => ({ ...s, banner_id: bid, banner_image: ban?.image_url || "" }));
                      }} radius="lg">
                      {banners.map((b) => <SelectItem key={b._id}>{b.title}</SelectItem>)}
                    </Select>
                    <Select label={t("shop.select_products")} selectionMode="multiple"
                      selectedKeys={new Set(selected.product?.map((p) => p.product_id) || [])}
                      onSelectionChange={(k) => {
                        const ids = Array.from(k);
                        setSelected((s) => ({ ...s, product: ids.map((id) => ({ product_id: id, name: products.find((p) => p._id === id)?.name || "" })) }));
                      }} radius="lg">
                      {products.map((p) => <SelectItem key={p._id}>{p.name}</SelectItem>)}
                    </Select>
                    <Select label={t("shop.discount_type")} selectedKeys={new Set([selected.discount_type || "percentage"])}
                      onSelectionChange={(k) => set("discount_type", Array.from(k)[0])} radius="lg">
                      <SelectItem key="percentage">{t("shop.discount_percentage")}</SelectItem>
                      <SelectItem key="fixed">{t("shop.discount_fixed")}</SelectItem>
                    </Select>
                    <Input label={t("shop.discount_value")} type="number" value={String(selected.discount_value || 0)} onValueChange={(v) => set("discount_value", v)} radius="lg" />
                    <Input label={t("shop.max_per_user")} type="number" value={String(selected.max_per_user || 0)} onValueChange={(v) => set("max_per_user", v)} radius="lg" />
                    <Input label={t("shop.total_limit")} type="number" value={String(selected.total_limit || 0)} onValueChange={(v) => set("total_limit", v)} radius="lg" />
                    <Input label={t("shop.start_date")} type="date" value={selected.start_time?.split("T")[0] || ""} onValueChange={(v) => set("start_time", v)} radius="lg" />
                    <Input label={t("shop.end_date")} type="date" value={selected.end_time?.split("T")[0] || ""} onValueChange={(v) => set("end_time", v)} radius="lg" />
                    <Select label={t("common.status")} selectedKeys={new Set([selected.status || "scheduled"])}
                      onSelectionChange={(k) => set("status", Array.from(k)[0])} radius="lg">
                      <SelectItem key="scheduled">Scheduled</SelectItem>
                      <SelectItem key="active">Active</SelectItem>
                      <SelectItem key="ended">Ended</SelectItem>
                      <SelectItem key="cancelled">Cancelled</SelectItem>
                    </Select>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{t("common.close")}</Button>
                {mode !== "detail" && <Button color="primary" onPress={handleSave}>{t("common.save")}</Button>}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
