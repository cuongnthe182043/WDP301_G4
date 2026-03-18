import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Tabs, Tab, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Switch,
} from "@heroui/react";
import { Save, SendHorizonal, Settings, RefreshCw } from "lucide-react";
import apiClient from "../../services/apiClient";
import { toast } from "sonner";

const api = {
  list:      (cat) => apiClient.get("/admin/system-config", { params: cat ? { category: cat } : {} }).then((r) => r.data.data),
  save:      (updates) => apiClient.patch("/admin/system-config", { updates }),
  testSmtp:  (to) => apiClient.post("/admin/system-config/test-smtp", { to }),
};

const CATEGORIES = [
  { key: "smtp",    label: "SMTP" },
  { key: "sms",     label: "SMS" },
  { key: "cdn",     label: "CDN" },
  { key: "storage", label: "Storage" },
  { key: "policy",  label: "Policy" },
];

function ConfigField({ cfg, value, onChange }) {
  const { t } = useTranslation();
  if (cfg.input_type === "boolean") {
    return (
      <div className="flex items-center justify-between py-3 border-b border-divider last:border-0">
        <div>
          <p className="text-sm font-medium text-default-800">{cfg.label}</p>
          <p className="text-xs text-default-400 font-mono">{cfg.key}</p>
        </div>
        <Switch
          isSelected={value === "true"}
          onValueChange={(v) => onChange(v ? "true" : "false")}
          size="sm"
          color="success"
        />
      </div>
    );
  }
  if (cfg.input_type === "text" && cfg.key.endsWith("_text")) {
    return (
      <div className="py-3 border-b border-divider last:border-0 space-y-1">
        <p className="text-sm font-medium text-default-800">{cfg.label}</p>
        <Textarea
          value={value}
          onValueChange={onChange}
          minRows={4}
          placeholder={cfg._raw_set ? "••••••••" : ""}
          className="text-sm"
        />
      </div>
    );
  }
  return (
    <div className="py-3 border-b border-divider last:border-0 space-y-1">
      <Input
        label={cfg.label}
        description={<span className="font-mono text-[11px]">{cfg.key}</span>}
        type={cfg.input_type === "password" ? "password" : cfg.input_type === "number" ? "number" : "text"}
        value={value}
        onValueChange={onChange}
        placeholder={cfg._raw_set ? "••••••••" : ""}
        size="sm"
      />
    </div>
  );
}

export default function SystemConfig() {
  const { t } = useTranslation();

  const [tab,      setTab]      = useState("smtp");
  const [configs,  setConfigs]  = useState({}); // { category: [cfg, ...] }
  const [values,   setValues]   = useState({}); // { "category.key": value }
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [testModal, setTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing,   setTesting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.list();
      const grouped = {};
      const vals    = {};
      for (const cfg of data) {
        if (!grouped[cfg.category]) grouped[cfg.category] = [];
        grouped[cfg.category].push(cfg);
        vals[`${cfg.category}.${cfg.key}`] = cfg.value || "";
      }
      setConfigs(grouped);
      setValues(vals);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function handleChange(cat, key, val) {
    setValues((prev) => ({ ...prev, [`${cat}.${key}`]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates = Object.entries(values).map(([ck, value]) => {
        const [category, ...rest] = ck.split(".");
        return { category, key: rest.join("."), value };
      });
      await api.save(updates);
      toast.success(t("admin.sysconfig_saved"));
      load();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    if (!testEmail) { toast.error(t("admin.sysconfig_test_email_required")); return; }
    setTesting(true);
    try {
      await api.testSmtp(testEmail);
      toast.success(t("admin.sysconfig_test_smtp_success"));
      setTestModal(false);
      setTestEmail("");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("admin.sysconfig_test_smtp_failed"));
    } finally {
      setTesting(false);
    }
  }

  const currentCfgs = configs[tab] || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("admin.system_config")}</h1>
          <p className="text-sm text-default-500 mt-0.5">{t("admin.sysconfig_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" startContent={<RefreshCw size={14} />} onPress={load}>
            {t("common.reset")}
          </Button>
          <Button size="sm" color="primary" startContent={<Save size={14} />} isLoading={saving} onPress={handleSave}>
            {t("common.save")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <Card radius="xl" shadow="sm">
          <CardBody className="p-0">
            <Tabs
              selectedKey={tab}
              onSelectionChange={(k) => setTab(String(k))}
              classNames={{
                tabList: "px-4 pt-3 gap-2 border-b border-divider w-full rounded-none",
                cursor: "bg-primary",
                tab: "text-sm font-medium",
              }}
            >
              {CATEGORIES.map((cat) => (
                <Tab key={cat.key} title={cat.label}>
                  <div className="p-6">
                    {/* Section header with test button for SMTP */}
                    {tab === "smtp" && (
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-default-600">{t("admin.sysconfig_smtp_desc")}</p>
                        <Button
                          size="sm" variant="flat" color="secondary"
                          startContent={<SendHorizonal size={14} />}
                          onPress={() => setTestModal(true)}
                        >
                          {t("admin.sysconfig_test_smtp")}
                        </Button>
                      </div>
                    )}
                    {tab === "policy" && (
                      <p className="text-sm text-default-600 mb-4">{t("admin.sysconfig_policy_desc")}</p>
                    )}

                    <div className="divide-y divide-divider">
                      {currentCfgs.length === 0 ? (
                        <p className="text-sm text-default-400 py-6 text-center">{t("common.no_data")}</p>
                      ) : (
                        currentCfgs.map((cfg) => (
                          <ConfigField
                            key={cfg.key}
                            cfg={cfg}
                            value={values[`${cfg.category}.${cfg.key}`] || ""}
                            onChange={(v) => handleChange(cfg.category, cfg.key, v)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </Tab>
              ))}
            </Tabs>
          </CardBody>
        </Card>
      )}

      {/* Test SMTP Modal */}
      <Modal isOpen={testModal} onClose={() => setTestModal(false)} size="sm">
        <ModalContent>
          <ModalHeader>{t("admin.sysconfig_test_smtp_title")}</ModalHeader>
          <ModalBody>
            <Input
              label={t("admin.sysconfig_test_email_label")}
              type="email"
              placeholder="admin@example.com"
              value={testEmail}
              onValueChange={setTestEmail}
            />
            <p className="text-xs text-default-400">{t("admin.sysconfig_test_smtp_hint")}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setTestModal(false)}>{t("common.cancel")}</Button>
            <Button color="primary" isLoading={testing} onPress={handleTestSmtp}>
              {t("admin.sysconfig_send_test")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
