import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card, CardBody, Button, Input, Select, SelectItem, Spinner, Chip, Tooltip,
} from "@heroui/react";
import { Search, RefreshCw, Download, Clock, User, Database, Globe } from "lucide-react";
import apiClient from "../../services/apiClient";

const LIMIT = 50;

const api = {
  list: (p) => apiClient.get("/admin/audit-logs", { params: p }).then((r) => r.data),
  actions: () => apiClient.get("/admin/audit-logs/actions").then((r) => r.data.data),
  collections: () => apiClient.get("/admin/audit-logs/collections").then((r) => r.data.data),
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", { hour12: false });
}

function ActionChip({ action = "" }) {
  const colorMap = {
    create: "success",
    update: "primary",
    delete: "danger",
    approve: "success",
    reject: "warning",
    ban: "danger",
    warn: "warning",
    unban: "success",
    reveal: "secondary",
    test: "secondary",
    login: "primary",
    logout: "default",
  };
  const prefix = action.split(".")[1] || action.split(".")[0];
  const color = colorMap[prefix] || "default";
  return (
    <Chip size="sm" color={color} variant="flat" className="font-mono text-xs">
      {action}
    </Chip>
  );
}

export default function AuditLogs() {
  const { t } = useTranslation();

  const [loading,  setLoading]  = useState(true);
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);

  const [actor,      setActor]      = useState("");
  const [actionQ,    setActionQ]    = useState("");
  const [collection, setCollection] = useState("");
  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");

  const [actions,     setActions]     = useState([]);
  const [collections, setCollections] = useState([]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (actor)      params.actor      = actor;
      if (actionQ)    params.action     = actionQ;
      if (collection) params.collection = collection;
      if (from)       params.from       = from;
      if (to)         params.to         = to;

      const res = await api.list(params);
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [actor, actionQ, collection, from, to, page]);

  useEffect(() => {
    api.actions().then(setActions).catch(() => {});
    api.collections().then(setCollections).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, actionQ, collection, from, to]);

  useEffect(() => {
    load(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function exportCSV() {
    if (!logs.length) return;
    const header = ["ID", "Actor", "Action", "Collection", "Target ID", "IP", "Date"];
    const rows = logs.map((l) => [
      l._id,
      l.actor_id?.full_name || l.actor_id || "—",
      l.action,
      l.target_collection || "—",
      l.target_id || "—",
      l.ip_address || "—",
      formatDate(l.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `audit_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("admin.audit_logs")}</h1>
          <p className="text-sm text-default-500 mt-0.5">{t("admin.audit_logs_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" startContent={<RefreshCw size={14} />} onPress={() => load(page)}>
            {t("common.reset")}
          </Button>
          <Button size="sm" variant="flat" color="primary" startContent={<Download size={14} />} onPress={exportCSV}>
            {t("common.export_excel")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Input
            size="sm" placeholder={t("admin.audit_actor_placeholder")}
            startContent={<User size={14} className="text-default-400" />}
            value={actor} onValueChange={setActor}
          />
          <Select
            size="sm" placeholder={t("admin.audit_action_placeholder")}
            selectedKeys={actionQ ? new Set([actionQ]) : new Set()}
            onSelectionChange={(k) => setActionQ(Array.from(k)[0] || "")}
          >
            {["", ...actions].map((a) => (
              <SelectItem key={a} value={a}>{a || t("common.all")}</SelectItem>
            ))}
          </Select>
          <Select
            size="sm" placeholder={t("admin.audit_collection_placeholder")}
            selectedKeys={collection ? new Set([collection]) : new Set()}
            onSelectionChange={(k) => setCollection(Array.from(k)[0] || "")}
          >
            {["", ...collections].map((c) => (
              <SelectItem key={c} value={c}>{c || t("common.all")}</SelectItem>
            ))}
          </Select>
          <Input
            size="sm" type="date" label={t("common.date_from")}
            value={from} onValueChange={setFrom}
          />
          <Input
            size="sm" type="date" label={t("common.date_to")}
            value={to} onValueChange={setTo}
          />
        </CardBody>
      </Card>

      {/* Table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
            <span className="text-sm font-semibold text-default-700">
              {t("admin.audit_total", { count: total })}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-default-400">
              <Search size={36} />
              <p className="text-sm">{t("common.no_data")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-default-50 border-b border-divider">
                  <tr>
                    {[
                      t("admin.audit_col_actor"),
                      t("admin.audit_col_action"),
                      t("admin.audit_col_target"),
                      t("admin.audit_col_ip"),
                      t("admin.audit_col_date"),
                      t("admin.audit_col_detail"),
                    ].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log._id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? "" : "bg-default-50/40"}`}>
                      {/* Actor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-default-400 shrink-0" />
                          <div>
                            <p className="font-medium text-default-800 text-xs">
                              {log.actor_id?.full_name || "System"}
                            </p>
                            {log.actor_id?.email && (
                              <p className="text-default-400 text-[11px]">{log.actor_id.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Action */}
                      <td className="px-4 py-3">
                        <ActionChip action={log.action} />
                      </td>
                      {/* Target */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-default-600 text-xs">
                          <Database size={12} className="text-default-400" />
                          <span className="font-medium">{log.target_collection || "—"}</span>
                          {log.target_id && (
                            <Tooltip content={log.target_id}>
                              <span className="text-default-400 font-mono truncate max-w-[80px]">
                                #{log.target_id.slice(-6)}
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      {/* IP */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-default-500 text-xs font-mono">
                          <Globe size={12} className="shrink-0" />
                          {log.ip_address || "—"}
                        </div>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-default-500 text-xs">
                          <Clock size={12} className="shrink-0" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      {/* Metadata */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {log.metadata ? (
                          <Tooltip
                            content={
                              <pre className="text-xs max-w-[300px] whitespace-pre-wrap">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            }
                          >
                            <span className="text-xs text-primary-500 cursor-pointer underline-offset-2 hover:underline">
                              {t("common.details")}
                            </span>
                          </Tooltip>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-divider">
              <span className="text-xs text-default-500">
                {t("common.page")} {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="flat" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
                  ‹
                </Button>
                <Button size="sm" variant="flat" isDisabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
