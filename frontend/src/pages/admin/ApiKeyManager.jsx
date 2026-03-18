import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner, Chip, Switch,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Tooltip,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Key, AlertCircle } from "lucide-react";
import apiClient from "../../services/apiClient";
import { toast } from "sonner";

const SERVICES = ["GHTK", "GHN", "VNPay", "MoMo", "ZaloPay", "Stripe", "Twilio", "AWS", "Cloudinary", "Custom"];
const ENVS = ["sandbox", "production"];

const api = {
  list:   (p) => apiClient.get("/admin/api-keys", { params: p }).then((r) => r.data.data),
  reveal: (id) => apiClient.get(`/admin/api-keys/${id}/reveal`).then((r) => r.data.data.api_key),
  create: (d) => apiClient.post("/admin/api-keys", d).then((r) => r.data.data),
  update: (id, d) => apiClient.patch(`/admin/api-keys/${id}`, d).then((r) => r.data.data),
  delete: (id) => apiClient.delete(`/admin/api-keys/${id}`),
};

const ENV_COLOR = { sandbox: "warning", production: "success" };

function isExpiringSoon(date) {
  if (!date) return false;
  const diff = new Date(date) - new Date();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}
function isExpired(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

const EMPTY_FORM = { service: "Custom", key_name: "", api_key: "", environment: "sandbox", expires_at: "", note: "" };

export default function ApiKeyManager() {
  const { t } = useTranslation();

  const [loading,    setLoading]    = useState(true);
  const [keys,       setKeys]       = useState([]);
  const [editTarget, setEditTarget] = useState(null); // null=closed, {}=create, {_id}=edit
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [delTarget,  setDelTarget]  = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [revealed,   setRevealed]   = useState({}); // id → plaintext key
  const [revealing,  setRevealing]  = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.list();
      setKeys(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditTarget({});
  }
  function openEdit(key) {
    setForm({
      service:     key.service,
      key_name:    key.key_name,
      api_key:     "", // don't pre-fill secret
      environment: key.environment,
      expires_at:  key.expires_at ? key.expires_at.slice(0, 10) : "",
      note:        key.note || "",
    });
    setEditTarget(key);
  }
  function closeModal() { setEditTarget(null); }

  async function handleSave() {
    if (!form.service || !form.key_name) {
      toast.error(t("admin.apikey_required_fields"));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.api_key) delete payload.api_key; // don't update key if blank in edit
      if (!payload.expires_at) payload.expires_at = null;

      if (editTarget?._id) {
        await api.update(editTarget._id, payload);
        toast.success(t("admin.apikey_updated"));
      } else {
        if (!payload.api_key) {
          toast.error(t("admin.apikey_required_fields"));
          setSaving(false);
          return;
        }
        await api.create(payload);
        toast.success(t("admin.apikey_created"));
      }
      closeModal();
      load();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(key) {
    try {
      await api.update(key._id, { is_active: !key.is_active });
      setKeys((prev) => prev.map((k) => k._id === key._id ? { ...k, is_active: !k.is_active } : k));
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleDelete() {
    setDelLoading(true);
    try {
      await api.delete(delTarget._id);
      toast.success(t("admin.apikey_deleted"));
      setDelTarget(null);
      load();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDelLoading(false);
    }
  }

  async function handleReveal(key) {
    if (revealed[key._id]) {
      setRevealed((prev) => { const n = { ...prev }; delete n[key._id]; return n; });
      return;
    }
    setRevealing((prev) => ({ ...prev, [key._id]: true }));
    try {
      const plain = await api.reveal(key._id);
      setRevealed((prev) => ({ ...prev, [key._id]: plain }));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setRevealing((prev) => { const n = { ...prev }; delete n[key._id]; return n; });
    }
  }

  // Group by service
  const grouped = keys.reduce((acc, k) => {
    if (!acc[k.service]) acc[k.service] = [];
    acc[k.service].push(k);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("admin.api_keys")}</h1>
          <p className="text-sm text-default-500 mt-0.5">{t("admin.apikey_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" startContent={<RefreshCw size={14} />} onPress={load}>
            {t("common.reset")}
          </Button>
          <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openCreate}>
            {t("admin.apikey_add")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : keys.length === 0 ? (
        <Card radius="xl" shadow="sm">
          <CardBody className="p-12 flex flex-col items-center gap-3 text-center">
            <Key size={48} className="text-default-300" />
            <p className="text-default-500">{t("admin.apikey_empty")}</p>
            <Button color="primary" size="sm" onPress={openCreate}>{t("admin.apikey_add")}</Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([service, serviceKeys]) => (
            <div key={service}>
              <div className="flex items-center gap-2 mb-3">
                <Key size={16} className="text-primary-500" />
                <h2 className="text-sm font-bold text-default-800">{service}</h2>
                <span className="text-xs text-default-400">({serviceKeys.length})</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {serviceKeys.map((key) => {
                  const expired    = isExpired(key.expires_at);
                  const expireSoon = !expired && isExpiringSoon(key.expires_at);
                  return (
                    <Card
                      key={key._id}
                      radius="xl"
                      shadow="sm"
                      className={`border ${expired ? "border-danger-200 bg-danger-50/30" : expireSoon ? "border-warning-200 bg-warning-50/30" : "border-divider"}`}
                    >
                      <CardBody className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-default-800 text-sm truncate">{key.key_name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Chip size="sm" color={ENV_COLOR[key.environment]} variant="flat">
                                {key.environment}
                              </Chip>
                              {expired && (
                                <Chip size="sm" color="danger" variant="flat" startContent={<AlertCircle size={10} />}>
                                  {t("admin.apikey_expired")}
                                </Chip>
                              )}
                              {expireSoon && (
                                <Chip size="sm" color="warning" variant="flat" startContent={<AlertCircle size={10} />}>
                                  {t("admin.apikey_expiring_soon")}
                                </Chip>
                              )}
                            </div>
                          </div>
                          <Switch
                            size="sm"
                            isSelected={key.is_active}
                            onValueChange={() => handleToggle(key)}
                            color="success"
                          />
                        </div>

                        {/* Masked key */}
                        <div className="flex items-center gap-2 bg-default-100 rounded-lg px-3 py-2">
                          <code className="text-xs font-mono text-default-700 flex-1 truncate">
                            {revealed[key._id] || key.api_key_masked}
                          </code>
                          <Tooltip content={revealed[key._id] ? t("admin.apikey_hide") : t("admin.apikey_reveal")}>
                            <Button
                              isIconOnly size="sm" variant="light"
                              isLoading={revealing[key._id]}
                              onPress={() => handleReveal(key)}
                            >
                              {revealed[key._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </Button>
                          </Tooltip>
                        </div>

                        {key.note && (
                          <p className="text-xs text-default-500 italic">{key.note}</p>
                        )}

                        {key.expires_at && (
                          <p className="text-xs text-default-400">
                            {t("admin.apikey_expires")}: {new Date(key.expires_at).toLocaleDateString("vi-VN")}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm" variant="flat" startContent={<Pencil size={12} />}
                            onPress={() => openEdit(key)}
                          >
                            {t("common.edit")}
                          </Button>
                          <Button
                            size="sm" variant="flat" color="danger" startContent={<Trash2 size={12} />}
                            onPress={() => setDelTarget(key)}
                          >
                            {t("common.delete")}
                          </Button>
                          {key.updated_by && (
                            <span className="text-[11px] text-default-400 ml-auto">
                              {t("admin.apikey_updated_by")}: {key.updated_by.full_name || key.updated_by.email}
                            </span>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={closeModal} size="lg">
        <ModalContent>
          <ModalHeader>
            {editTarget?._id ? t("admin.apikey_edit_title") : t("admin.apikey_create_title")}
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t("admin.apikey_service")}
                selectedKeys={new Set([form.service])}
                onSelectionChange={(k) => setForm((f) => ({ ...f, service: Array.from(k)[0] || "Custom" }))}
              >
                {SERVICES.map((s) => <SelectItem key={s}>{s}</SelectItem>)}
              </Select>
              <Select
                label={t("admin.apikey_environment")}
                selectedKeys={new Set([form.environment])}
                onSelectionChange={(k) => setForm((f) => ({ ...f, environment: Array.from(k)[0] || "sandbox" }))}
              >
                {ENVS.map((e) => <SelectItem key={e}>{e}</SelectItem>)}
              </Select>
            </div>
            <Input
              label={t("admin.apikey_name")}
              value={form.key_name}
              onValueChange={(v) => setForm((f) => ({ ...f, key_name: v }))}
              isRequired
            />
            <Input
              label={t("admin.apikey_value")}
              placeholder={editTarget?._id ? t("admin.apikey_value_edit_hint") : ""}
              type="password"
              value={form.api_key}
              onValueChange={(v) => setForm((f) => ({ ...f, api_key: v }))}
              isRequired={!editTarget?._id}
            />
            <Input
              label={t("admin.apikey_expires_label")}
              type="date"
              value={form.expires_at}
              onValueChange={(v) => setForm((f) => ({ ...f, expires_at: v }))}
            />
            <Textarea
              label={t("common.note")}
              placeholder={t("admin.apikey_note_placeholder")}
              value={form.note}
              onValueChange={(v) => setForm((f) => ({ ...f, note: v }))}
              minRows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={closeModal}>{t("common.cancel")}</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>{t("common.save")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!delTarget} onClose={() => setDelTarget(null)} size="sm">
        <ModalContent>
          <ModalHeader>{t("admin.apikey_delete_title")}</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              {t("admin.apikey_delete_confirm", { name: delTarget?.key_name })}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setDelTarget(null)}>{t("common.cancel")}</Button>
            <Button color="danger" isLoading={delLoading} onPress={handleDelete}>{t("common.delete")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
