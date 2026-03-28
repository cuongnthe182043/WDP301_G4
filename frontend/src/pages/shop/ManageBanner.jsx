import React, { useState, useEffect } from "react";
import {
  Card, CardBody, Button, Input, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import PaginationBar from "../../components/ui/PaginationBar";
import { Plus, Search, Eye, Pencil, Trash2, Upload } from "lucide-react";
import { bannerApi } from "../../services/bannerService";
import { useToast } from "../../components/common/ToastProvider";
import { useTranslation } from "react-i18next";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "-";
const POSITIONS = ["homepage_top", "homepage_mid", "homepage_bottom", "category_page"];

const BLANK = {
  title: "", image_url: "", imagePreview: "", image_file: null,
  link: "#", position: "homepage_top", is_active: true, start_date: "", end_date: "",
};

export default function ManageBanner() {
  const { t } = useTranslation();
  const toast = useToast();
  const [banners,     setBanners]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [limit,       setLimit]       = useState(10);
  const [selected,    setSelected]    = useState(null);
  const [mode,        setMode]        = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");

  const fetch = async (pg = page, kw = searchTerm) => {
    setLoading(true);
    try {
      const res = await bannerApi.getAll(pg, limit, kw);
      setBanners(res.data || []); setTotal(res.pagination?.total || 0); setTotalPages(res.pagination?.totalPages || 1);
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, searchTerm]);

  const openDetail = async (id) => {
    try { const res = await bannerApi.getDetail(id); setSelected({ ...res, imagePreview: res.image_url }); setMode("detail"); }
    catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };
  const openEdit = (b) => { setSelected({ ...b, imagePreview: b.image_url, image_file: null }); setMode("edit"); };
  const openCreate = () => { setSelected({ ...BLANK }); setMode("create"); };
  const closeDialog = () => { setSelected(null); setMode(null); };

  const handleSave = async () => {
    try {
      const payload = { ...selected };
      if (selected.image_file) {
        const uploadRes = await bannerApi.uploadImage(selected.image_file);
        payload.image_url = uploadRes.upload.url;
        payload.image_public_id = uploadRes.upload.public_id;
        delete payload.image_file; delete payload.imagePreview;
      }
      if (mode === "create") await bannerApi.create(payload);
      else await bannerApi.update(selected._id, payload);
      toast.success(mode === "create" ? t("shop.banner_create") : t("shop.banner_edit"));
      closeDialog(); fetch();
    } catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("common.confirm_delete"))) return;
    try { await bannerApi.delete(id); toast.success(t("common.delete")); fetch(); }
    catch (e) { toast.error(e?.response?.data?.message || e.message); }
  };

  const set = (key, val) => setSelected((s) => ({ ...s, [key]: val }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-default-900">{t("shop.banner")}</h1>
        <div className="flex gap-2">
          <form onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }} className="flex gap-2">
            <Input size="sm" placeholder={t("shop.search_banner")} value={searchInput} onValueChange={setSearchInput}
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
                  {[t("common.title"), t("common.image"), "Link", t("shop.banner_position"), t("common.from"), t("common.to"), t("shop.banner_active"), ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {banners.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-default-400">{t("shop.no_banners")}</td></tr>
                ) : banners.map((b) => (
                  <tr key={b._id} className="hover:bg-default-50">
                    <td className="px-4 py-3 font-semibold text-default-900">{b.title}</td>
                    <td className="px-4 py-3">{b.image_url && <img src={b.image_url} alt={b.title} className="w-20 h-12 object-cover rounded-lg" />}</td>
                    <td className="px-4 py-3 text-xs text-default-400 max-w-[120px] truncate">{b.link}</td>
                    <td className="px-4 py-3"><Chip size="sm" variant="flat">{b.position}</Chip></td>
                    <td className="px-4 py-3">{formatDate(b.start_date)}</td>
                    <td className="px-4 py-3">{formatDate(b.end_date)}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={b.is_active ? "success" : "default"} variant="flat">{b.is_active ? "Yes" : "No"}</Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openDetail(b._id)}><Eye size={14} /></Button>
                        <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(b)}><Pencil size={14} /></Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(b._id)}><Trash2 size={14} /></Button>
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

      <Modal isOpen={!!selected && !!mode} onOpenChange={(o) => !o && closeDialog()} radius="xl" size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {mode === "detail" ? t("shop.banner_detail") : mode === "create" ? t("shop.banner_create") : t("shop.banner_edit")}
              </ModalHeader>
              <ModalBody className="space-y-3">
                {selected && (
                  <>
                    <Input label={t("common.title")} value={selected.title || ""} onValueChange={(v) => set("title", v)} radius="lg" isReadOnly={mode === "detail"} />
                    {selected.imagePreview && (
                      <img src={selected.imagePreview} alt="Preview" className="w-full rounded-xl border border-default-200" />
                    )}
                    {mode !== "detail" && (
                      <Button as="label" variant="bordered" radius="lg" startContent={<Upload size={14} />} className="cursor-pointer">
                        {selected.image_file ? t("shop.change_image") : t("shop.upload_image")}
                        <input type="file" accept="image/*" hidden onChange={(e) => {
                          const f = e.target.files[0];
                          if (f) set("image_file", f) || setSelected((s) => ({ ...s, image_file: f, imagePreview: URL.createObjectURL(f) }));
                        }} />
                      </Button>
                    )}
                    <Input label="Link" value={selected.link || ""} onValueChange={(v) => set("link", v)} radius="lg" isReadOnly={mode === "detail"} />
                    <Select label={t("shop.banner_position")} selectedKeys={new Set([selected.position])}
                      onSelectionChange={(k) => set("position", Array.from(k)[0])} radius="lg" isDisabled={mode === "detail"}>
                      {POSITIONS.map((p) => <SelectItem key={p}>{p}</SelectItem>)}
                    </Select>
                    <Input label={t("shop.from_date")} type="date" value={selected.start_date?.split("T")[0] || ""}
                      onValueChange={(v) => set("start_date", v)} radius="lg" isReadOnly={mode === "detail"} />
                    <Input label={t("shop.to_date")} type="date" value={selected.end_date?.split("T")[0] || ""}
                      onValueChange={(v) => set("end_date", v)} radius="lg" isReadOnly={mode === "detail"} />
                    <Select label={t("shop.banner_active")} selectedKeys={new Set([String(selected.is_active)])}
                      onSelectionChange={(k) => set("is_active", Array.from(k)[0] === "true")} radius="lg" isDisabled={mode === "detail"}>
                      <SelectItem key="true">Yes</SelectItem>
                      <SelectItem key="false">No</SelectItem>
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
