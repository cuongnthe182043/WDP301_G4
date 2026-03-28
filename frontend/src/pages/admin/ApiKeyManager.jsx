import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Chip, Input, Select, SelectItem, Spinner, Switch,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Textarea, Tooltip, Tabs, Tab, Divider,
} from "@heroui/react";
import {
  Key, Eye, EyeOff, RefreshCw, Plus, Pencil, Trash2,
  AlertCircle, Copy, Check, Save, Server, Database, Shield,
  Mail, CreditCard, Truck, Cloud, Search, ChevronDown, ChevronUp,
  Globe, Lock, RotateCcw, Info, CheckCircle2, AlertTriangle,
} from "lucide-react";
import apiClient from "../../services/apiClient";
import { useToast } from "../../components/common/ToastProvider";
import { useConfirm } from "../../components/common/Confirm";

// ─── API helpers ──────────────────────────────────────────────────────────────
const envApi = {
  list:   ()        => apiClient.get("/admin/env-config").then((r) => r.data.data),
  reveal: (key)     => apiClient.get(`/admin/env-config/reveal/${key}`).then((r) => r.data.data.value),
  update: (updates) => apiClient.patch("/admin/env-config", { updates }).then((r) => r.data),
};

const apiKeyApi = {
  list:   (p)     => apiClient.get("/admin/api-keys",      { params: p }).then((r) => r.data.data),
  reveal: (id)    => apiClient.get(`/admin/api-keys/${id}/reveal`).then((r) => r.data.data.api_key),
  create: (d)     => apiClient.post("/admin/api-keys",      d).then((r) => r.data.data),
  update: (id, d) => apiClient.patch(`/admin/api-keys/${id}`, d).then((r) => r.data.data),
  delete: (id)    => apiClient.delete(`/admin/api-keys/${id}`),
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICES = ["GHN", "GHTK", "VNPay", "MoMo", "ZaloPay", "PayPal", "Stripe", "Twilio", "AWS", "Cloudinary", "Custom"];
const ENVS     = ["sandbox", "production"];

const ENV_COLOR = { sandbox: "warning", production: "success" };

const GROUP_ICONS = {
  app:        <Server   size={15} />,
  database:   <Database size={15} />,
  auth:       <Shield   size={15} />,
  google:     <Globe    size={15} />,
  smtp:       <Mail     size={15} />,
  paypal:     <CreditCard size={15} />,
  vnpay:      <CreditCard size={15} />,
  ghn:        <Truck    size={15} />,
  cloudinary: <Cloud    size={15} />,
};

const SERVICE_ICONS = {
  GHN:        <Truck      size={14} />,
  GHTK:       <Truck      size={14} />,
  VNPay:      <CreditCard size={14} />,
  MoMo:       <CreditCard size={14} />,
  ZaloPay:    <CreditCard size={14} />,
  PayPal:     <CreditCard size={14} />,
  Stripe:     <CreditCard size={14} />,
  Cloudinary: <Cloud      size={14} />,
  Custom:     <Key        size={14} />,
};

const RESTART_REQUIRED_GROUPS = ["database", "auth"];

function isExpiringSoon(date) {
  if (!date) return false;
  return new Date(date) - new Date() > 0 && new Date(date) - new Date() < 7 * 86400000;
}
function isExpired(date) {
  return date && new Date(date) < new Date();
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ value, disabled }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value || disabled) return;
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Tooltip content={copied ? "Đã sao chép!" : "Sao chép"}>
      <Button isIconOnly size="sm" variant="light" onPress={copy} isDisabled={disabled || !value}>
        {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      </Button>
    </Tooltip>
  );
}

// ─── ENV VARIABLES TAB ───────────────────────────────────────────────────────
function EnvVarsTab() {
  const toast   = useToast();
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [edits,      setEdits]      = useState({});     // { KEY: newValue }
  const [revealed,   setRevealed]   = useState({});     // { KEY: plaintext }
  const [revealing,  setRevealing]  = useState({});     // { KEY: true }
  const [saving,     setSaving]     = useState(false);
  const [collapsed,  setCollapsed]  = useState({});
  const [search,     setSearch]     = useState("");
  const [showPass,   setShowPass]   = useState({});     // { KEY: true } — input type visible

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await envApi.list();
      setGroups(data.groups || []);
      setEdits({});
    } catch {
      toast.error("Không thể tải cấu hình môi trường");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key, value) => setEdits((p) => ({ ...p, [key]: value }));

  const handleReveal = async (key) => {
    if (revealed[key]) {
      setRevealed((p) => { const n = { ...p }; delete n[key]; return n; });
      return;
    }
    setRevealing((p) => ({ ...p, [key]: true }));
    try {
      const plain = await envApi.reveal(key);
      setRevealed((p) => ({ ...p, [key]: plain }));
    } catch {
      toast.error("Không thể hiện giá trị");
    } finally {
      setRevealing((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const handleSave = async () => {
    const updates = Object.entries(edits)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([key, value]) => ({ key, value }));

    if (!updates.length) { toast.error("Không có thay đổi nào để lưu"); return; }

    setSaving(true);
    try {
      const result = await envApi.update(updates);
      toast.success(`Đã lưu ${updates.length} biến môi trường`);
      if (result.changedKeys?.some((k) => {
        const schema = groups.flatMap((g) => g.vars).find((v) => v.key === k);
        return RESTART_REQUIRED_GROUPS.includes(schema?.group);
      })) {
        toast.error("⚠ Một số thay đổi cần khởi động lại server để có hiệu lực");
      }
      setEdits({});
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Lưu thất bại");
    } finally { setSaving(false); }
  };

  const handleDiscard = () => { setEdits({}); };

  const hasEdits = Object.keys(edits).length > 0;

  // Filter by search
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      vars: g.vars.filter((v) =>
        !search ||
        v.key.toLowerCase().includes(search.toLowerCase()) ||
        v.label.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((g) => g.vars.length > 0);

  const toggleGroup = (key) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Tìm biến môi trường..."
          value={search}
          onValueChange={setSearch}
          size="sm"
          radius="xl"
          variant="bordered"
          className="flex-1 min-w-[200px]"
          startContent={<Search size={14} className="text-default-400" />}
          isClearable
          onClear={() => setSearch("")}
        />
        <Button
          size="sm" variant="flat"
          startContent={<RotateCcw size={13} />}
          onPress={load}
        >
          Tải lại
        </Button>
        {hasEdits && (
          <>
            <Button
              size="sm" variant="flat"
              startContent={<RefreshCw size={13} />}
              onPress={handleDiscard}
            >
              Hủy thay đổi ({Object.keys(edits).length})
            </Button>
            <Button
              size="sm" color="primary"
              startContent={<Save size={13} />}
              isLoading={saving}
              onPress={handleSave}
              className="font-bold"
            >
              Lưu thay đổi ({Object.keys(edits).length})
            </Button>
          </>
        )}
      </div>

      {/* Restart warning */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
        <AlertTriangle size={14} className="text-warning-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-warning-700 dark:text-warning-400">
          Thay đổi biến <strong>Database, Redis, JWT</strong> cần khởi động lại server để có hiệu lực. Các biến khác (URL, token) áp dụng ngay.
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const isCollapsed  = collapsed[group.key];
          const needsRestart = RESTART_REQUIRED_GROUPS.includes(group.key);
          const editCount    = group.vars.filter((v) => edits[v.key] !== undefined).length;

          return (
            <div
              key={group.key}
              className="border border-default-200 dark:border-[#2e3347] rounded-2xl overflow-hidden"
            >
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-default-50 dark:bg-[#1a1e2e] hover:bg-default-100 dark:hover:bg-[#1e2238] transition-colors text-left"
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                  style={{ background: group.color }}
                >
                  {GROUP_ICONS[group.key] || <Key size={14} />}
                </span>
                <span className="font-bold text-sm text-default-800 flex-1">{group.label}</span>
                <span className="text-xs text-default-400 mr-1">{group.vars.length} biến</span>
                {editCount > 0 && (
                  <Chip size="sm" color="warning" variant="flat" className="text-xs mr-1">
                    {editCount} thay đổi
                  </Chip>
                )}
                {needsRestart && (
                  <Chip size="sm" color="danger" variant="flat" className="text-xs mr-1">
                    Cần restart
                  </Chip>
                )}
                {isCollapsed ? <ChevronDown size={14} className="text-default-400" /> : <ChevronUp size={14} className="text-default-400" />}
              </button>

              {/* Vars */}
              {!isCollapsed && (
                <div className="divide-y divide-default-100 dark:divide-[#222738]">
                  {group.vars.map((v) => {
                    const isEditing    = edits[v.key] !== undefined;
                    const displayValue = isEditing
                      ? edits[v.key]
                      : (revealed[v.key] || v.value);
                    const isSecret     = v.secret;
                    const showClear    = showPass[v.key];

                    return (
                      <div
                        key={v.key}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                          isEditing ? "bg-primary-50/40 dark:bg-primary-900/10" : ""
                        }`}
                      >
                        {/* Left: key info */}
                        <div className="w-56 flex-shrink-0 pt-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-default-700 font-mono">{v.key}</p>
                            {isSecret && (
                              <Lock size={10} className="text-warning-500 flex-shrink-0" />
                            )}
                            {!v.is_set && (
                              <Chip size="sm" color="danger" variant="flat" className="text-[10px] h-4">Chưa cài</Chip>
                            )}
                          </div>
                          <p className="text-xs text-default-500 mt-0.5">{v.label}</p>
                          {v.description && (
                            <p className="text-[11px] text-default-400 mt-0.5 leading-snug">{v.description}</p>
                          )}
                        </div>

                        {/* Right: value input */}
                        <div className="flex-1 flex items-center gap-1.5">
                          <div className="flex-1 relative">
                            <Input
                              value={isEditing ? edits[v.key] : (revealed[v.key] || (isSecret && v.value ? v.value : v.value))}
                              onValueChange={(val) => handleChange(v.key, val)}
                              type={isSecret && !showClear && !revealed[v.key] ? "password" : "text"}
                              placeholder={!v.is_set ? "Chưa được cài đặt..." : ""}
                              size="sm"
                              radius="lg"
                              variant="bordered"
                              classNames={{
                                input: "font-mono text-xs",
                                inputWrapper: isEditing
                                  ? "border-primary-300 dark:border-primary-700"
                                  : "",
                              }}
                            />
                          </div>

                          {/* Actions */}
                          {isSecret && (
                            <Tooltip content={showClear ? "Ẩn" : "Xem rõ giá trị"}>
                              <Button
                                isIconOnly size="sm" variant="light"
                                onPress={() => setShowPass((p) => ({ ...p, [v.key]: !p[v.key] }))}
                              >
                                {showClear ? <EyeOff size={14} /> : <Eye size={14} />}
                              </Button>
                            </Tooltip>
                          )}
                          {isSecret && v.is_set && (
                            <Tooltip content={revealed[v.key] ? "Ẩn giá trị gốc" : "Hiện giá trị gốc từ server"}>
                              <Button
                                isIconOnly size="sm" variant="light"
                                color={revealed[v.key] ? "success" : "default"}
                                isLoading={revealing[v.key]}
                                onPress={() => handleReveal(v.key)}
                              >
                                {revealed[v.key]
                                  ? <CheckCircle2 size={14} className="text-success" />
                                  : <Key size={14} />}
                              </Button>
                            </Tooltip>
                          )}
                          <CopyBtn
                            value={revealed[v.key] || (isEditing ? edits[v.key] : (!isSecret ? v.value : ""))}
                            disabled={isSecret && !revealed[v.key] && !isEditing}
                          />
                          {isEditing && (
                            <Tooltip content="Hủy thay đổi">
                              <Button
                                isIconOnly size="sm" variant="light" color="danger"
                                onPress={() => setEdits((p) => { const n = { ...p }; delete n[v.key]; return n; })}
                              >
                                <RotateCcw size={13} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom save bar */}
      {hasEdits && (
        <div
          className="sticky bottom-0 left-0 right-0 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-lg"
          style={{ background: "var(--heroui-background)", borderColor: "var(--heroui-primary)" }}
        >
          <p className="text-sm font-semibold text-default-700">
            {Object.keys(edits).length} biến môi trường đang chờ lưu
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={handleDiscard}>Hủy</Button>
            <Button size="sm" color="primary" isLoading={saving} onPress={handleSave} className="font-bold">
              <Save size={13} /> Lưu tất cả
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── API KEYS TAB ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { service: "Custom", key_name: "", api_key: "", environment: "sandbox", expires_at: "", note: "" };

function ApiKeysTab() {
  const toast   = useToast();
  const confirm = useConfirm();

  const [loading,    setLoading]    = useState(true);
  const [keys,       setKeys]       = useState([]);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [revealed,   setRevealed]   = useState({});
  const [revealing,  setRevealing]  = useState({});
  const [search,     setSearch]     = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiKeyApi.list();
      setKeys(Array.isArray(data) ? data : []);
    } catch { toast.error("Không thể tải API keys"); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setShowApiKey(false); setEditTarget({}); };
  const openEdit   = (k) => {
    setForm({ service: k.service, key_name: k.key_name, api_key: "", environment: k.environment, expires_at: k.expires_at ? k.expires_at.slice(0, 10) : "", note: k.note || "" });
    setShowApiKey(false);
    setEditTarget(k);
  };
  const closeModal = () => setEditTarget(null);

  const handleSave = async () => {
    if (!form.service || !form.key_name) { toast.error("Dịch vụ và tên key là bắt buộc"); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.api_key) delete payload.api_key;
      if (!payload.expires_at) payload.expires_at = null;

      if (editTarget?._id) {
        await apiKeyApi.update(editTarget._id, payload);
        toast.success("Đã cập nhật API key");
      } else {
        if (!payload.api_key) { toast.error("Giá trị key là bắt buộc khi tạo mới"); setSaving(false); return; }
        await apiKeyApi.create(payload);
        toast.success("Đã tạo API key mới");
      }
      closeModal();
      load();
    } catch { toast.error("Lưu thất bại"); }
    finally   { setSaving(false); }
  };

  const handleToggle = async (k) => {
    try {
      await apiKeyApi.update(k._id, { is_active: !k.is_active });
      setKeys((prev) => prev.map((x) => x._id === k._id ? { ...x, is_active: !x.is_active } : x));
    } catch { toast.error("Cập nhật thất bại"); }
  };

  const handleDelete = async (k) => {
    const ok = await confirm({
      title:        "Xóa API Key",
      description:  `Xóa "${k.key_name}" (${k.service})? Hành động này không thể hoàn tác.`,
      confirmLabel: "Xóa",
      confirmColor: "danger",
    });
    if (!ok) return;
    try {
      await apiKeyApi.delete(k._id);
      toast.success("Đã xóa API key");
      load();
    } catch { toast.error("Xóa thất bại"); }
  };

  const handleReveal = async (k) => {
    if (revealed[k._id]) { setRevealed((p) => { const n = { ...p }; delete n[k._id]; return n; }); return; }
    setRevealing((p) => ({ ...p, [k._id]: true }));
    try {
      const plain = await apiKeyApi.reveal(k._id);
      setRevealed((p) => ({ ...p, [k._id]: plain }));
    } catch { toast.error("Không thể hiện key"); }
    finally   { setRevealing((p) => { const n = { ...p }; delete n[k._id]; return n; }); }
  };

  // Group + filter
  const filtered = keys.filter((k) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return k.key_name.toLowerCase().includes(q) || k.service.toLowerCase().includes(q);
  });

  const grouped = filtered.reduce((acc, k) => {
    if (!acc[k.service]) acc[k.service] = [];
    acc[k.service].push(k);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Tìm theo tên, dịch vụ..."
          value={search}
          onValueChange={setSearch}
          size="sm"
          radius="xl"
          variant="bordered"
          className="flex-1 min-w-[200px]"
          startContent={<Search size={14} className="text-default-400" />}
          isClearable
          onClear={() => setSearch("")}
        />
        <Button size="sm" variant="flat" startContent={<RotateCcw size={13} />} onPress={load}>
          Tải lại
        </Button>
        <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openCreate} className="font-bold">
          Thêm API Key
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-default-200 rounded-2xl">
          <Key size={40} className="mx-auto mb-3 text-default-300" />
          <p className="font-bold text-default-500 mb-1">
            {search ? "Không tìm thấy API key nào" : "Chưa có API key nào"}
          </p>
          {!search && (
            <Button color="primary" size="sm" className="mt-3" onPress={openCreate}>
              Thêm key đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([service, serviceKeys]) => (
            <div key={service}>
              {/* Service header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-6 h-6 rounded-lg bg-default-100 flex items-center justify-center text-default-500">
                  {SERVICE_ICONS[service] || <Key size={13} />}
                </span>
                <h2 className="text-sm font-bold text-default-800">{service}</h2>
                <span className="text-xs text-default-400">({serviceKeys.length})</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {serviceKeys.map((k) => {
                  const expired    = isExpired(k.expires_at);
                  const expireSoon = !expired && isExpiringSoon(k.expires_at);
                  const isRevealed = !!revealed[k._id];

                  return (
                    <div
                      key={k._id}
                      className={`border rounded-2xl overflow-hidden transition-all ${
                        expired    ? "border-danger-200  bg-danger-50/20  dark:border-danger-800"
                        : expireSoon ? "border-warning-200 bg-warning-50/20 dark:border-warning-800"
                        : "border-default-200 dark:border-[#2e3347]"
                      } bg-white dark:bg-[#131620]`}
                    >
                      {/* Top stripe */}
                      <div
                        className="h-1"
                        style={{
                          background: expired ? "#ef4444"
                            : expireSoon ? "#f97316"
                            : k.is_active ? "#22c55e" : "#94a3b8",
                        }}
                      />

                      <div className="p-4 space-y-3">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-default-900 truncate">{k.key_name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Chip size="sm" color={ENV_COLOR[k.environment]} variant="flat" className="text-xs">
                                {k.environment === "sandbox" ? "Sandbox" : "Production"}
                              </Chip>
                              {expired && (
                                <Chip size="sm" color="danger" variant="flat" startContent={<AlertCircle size={10} />} className="text-xs">
                                  Hết hạn
                                </Chip>
                              )}
                              {expireSoon && (
                                <Chip size="sm" color="warning" variant="flat" startContent={<AlertCircle size={10} />} className="text-xs">
                                  Sắp hết hạn
                                </Chip>
                              )}
                              {!k.is_active && (
                                <Chip size="sm" color="default" variant="flat" className="text-xs">Tắt</Chip>
                              )}
                            </div>
                          </div>
                          <Switch
                            size="sm"
                            isSelected={k.is_active}
                            onValueChange={() => handleToggle(k)}
                            color="success"
                          />
                        </div>

                        {/* Masked key value */}
                        <div className="flex items-center gap-1.5 bg-default-50 dark:bg-[#1a1e2e] rounded-xl px-3 py-2">
                          <code className="text-xs font-mono text-default-700 flex-1 truncate">
                            {isRevealed ? revealed[k._id] : (k.api_key_masked || "••••••••")}
                          </code>
                          <Tooltip content={isRevealed ? "Ẩn" : "Xem giá trị đầy đủ"}>
                            <Button
                              isIconOnly size="sm" variant="light"
                              isLoading={revealing[k._id]}
                              onPress={() => handleReveal(k)}
                            >
                              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                            </Button>
                          </Tooltip>
                          <CopyBtn value={isRevealed ? revealed[k._id] : null} disabled={!isRevealed} />
                        </div>

                        {/* Note */}
                        {k.note && (
                          <p className="text-xs text-default-400 italic line-clamp-2">💬 {k.note}</p>
                        )}

                        {/* Expiry + updated by */}
                        <div className="flex items-center justify-between text-xs text-default-400">
                          {k.expires_at ? (
                            <span>Hết hạn: {new Date(k.expires_at).toLocaleDateString("vi-VN")}</span>
                          ) : <span />}
                          {k.updated_by && (
                            <span>Sửa bởi: {k.updated_by.full_name || k.updated_by.email}</span>
                          )}
                        </div>

                        {/* Actions */}
                        <Divider className="my-1" />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm" variant="flat"
                            startContent={<Pencil size={12} />}
                            onPress={() => openEdit(k)}
                          >
                            Sửa
                          </Button>
                          <Button
                            size="sm" variant="flat" color="danger"
                            startContent={<Trash2 size={12} />}
                            onPress={() => handleDelete(k)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={!!editTarget} onOpenChange={(o) => !o && closeModal()} size="lg" radius="2xl">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Key size={17} className="text-primary" />
            {editTarget?._id ? "Chỉnh sửa API Key" : "Thêm API Key mới"}
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Dịch vụ *"
                size="sm" radius="xl" variant="bordered"
                selectedKeys={new Set([form.service])}
                onSelectionChange={(k) => setForm((f) => ({ ...f, service: Array.from(k)[0] || "Custom" }))}
              >
                {SERVICES.map((s) => (
                  <SelectItem key={s} startContent={SERVICE_ICONS[s] || <Key size={13} />}>{s}</SelectItem>
                ))}
              </Select>
              <Select
                label="Môi trường *"
                size="sm" radius="xl" variant="bordered"
                selectedKeys={new Set([form.environment])}
                onSelectionChange={(k) => setForm((f) => ({ ...f, environment: Array.from(k)[0] || "sandbox" }))}
              >
                <SelectItem key="sandbox">Sandbox (thử nghiệm)</SelectItem>
                <SelectItem key="production">Production (thật)</SelectItem>
              </Select>
            </div>
            <Input
              label="Tên key *"
              placeholder="VD: VNPay TMN Code, GHN Token..."
              size="sm" radius="xl" variant="bordered"
              value={form.key_name}
              onValueChange={(v) => setForm((f) => ({ ...f, key_name: v }))}
            />
            <div className="relative">
              <Input
                label={editTarget?._id ? "Giá trị mới (để trống = giữ nguyên)" : "Giá trị key *"}
                placeholder={editTarget?._id ? "Chỉ nhập nếu muốn thay đổi..." : "Nhập giá trị API key..."}
                type={showApiKey ? "text" : "password"}
                size="sm" radius="xl" variant="bordered"
                value={form.api_key}
                onValueChange={(v) => setForm((f) => ({ ...f, api_key: v }))}
                endContent={
                  <button type="button" onClick={() => setShowApiKey((p) => !p)} className="text-default-400 hover:text-default-600">
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </div>
            <Input
              label="Ngày hết hạn (tùy chọn)"
              type="date"
              size="sm" radius="xl" variant="bordered"
              value={form.expires_at}
              onValueChange={(v) => setForm((f) => ({ ...f, expires_at: v }))}
            />
            <Textarea
              label="Ghi chú (tùy chọn)"
              placeholder="Thêm ghi chú về mục đích sử dụng, ai cung cấp..."
              size="sm" radius="xl" variant="bordered"
              value={form.note}
              onValueChange={(v) => setForm((f) => ({ ...f, note: v }))}
              minRows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" radius="xl" onPress={closeModal}>Hủy</Button>
            <Button color="primary" radius="xl" isLoading={saving} onPress={handleSave} className="font-bold">
              {editTarget?._id ? "Lưu thay đổi" : "Tạo API Key"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ApiKeyManager() {
  const [tab, setTab] = useState("env");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/30">
              <Key size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-default-900">Cấu hình & API Keys</h1>
              <p className="text-xs text-default-400">Quản lý biến môi trường và API keys của hệ thống</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
        <Shield size={15} className="text-danger-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-danger-700 dark:text-danger-400">
          <strong>Khu vực bảo mật cao.</strong> Mọi thao tác xem/sửa đều được ghi vào Audit Log. Không chia sẻ giá trị của các key bí mật.
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={tab}
        onSelectionChange={(k) => setTab(String(k))}
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "border-b border-divider gap-4 w-full rounded-none pb-0",
          tab:     "text-sm font-semibold",
          cursor:  "bg-primary",
        }}
      >
        <Tab
          key="env"
          title={
            <span className="flex items-center gap-1.5">
              <Server size={14} />
              Biến môi trường (.env)
            </span>
          }
        >
          <div className="pt-4">
            <EnvVarsTab />
          </div>
        </Tab>
        <Tab
          key="apikeys"
          title={
            <span className="flex items-center gap-1.5">
              <Key size={14} />
              API Keys (MongoDB)
            </span>
          }
        >
          <div className="pt-4">
            <ApiKeysTab />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
