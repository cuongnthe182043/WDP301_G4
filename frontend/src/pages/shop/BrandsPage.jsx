import React, { useEffect, useState, useCallback } from "react";
import { productAdminService as svc } from "../../services/productAdminService";
import {
  Card, CardBody, Spinner, Chip,
} from "@heroui/react";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function BrandsPage() {
  const { t } = useTranslation();

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await svc.listBrands()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-default-900">{t("shop.brands")}</h1>
          <p className="text-sm text-default-400">{rows.length} {t("shop.brands").toLowerCase()}</p>
        </div>
        <Chip size="sm" variant="flat" color="warning" startContent={<Lock size={11} />}>
          {t("common.view_only")}
        </Chip>
      </div>

      <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-xl">
        <Lock size={14} className="text-warning-600 flex-shrink-0" />
        <p className="text-xs text-warning-700">{t("common.admin_only")}</p>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-default-400">{t("common.no_data")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {[t("common.image"), t("common.name"), t("common.type"), t("common.gender")].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {rows.map(r => (
                  <tr key={r._id} className="hover:bg-default-50 transition-colors">
                    <td className="px-4 py-3">
                      {r.logo_url
                        ? <img src={r.logo_url} alt={r.name} className="w-10 h-10 object-contain rounded-lg border border-default-100" />
                        : <div className="w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center text-default-400 text-xs font-bold">{r.name[0]}</div>
                      }
                    </td>
                    <td className="px-4 py-3 font-semibold text-default-900">{r.name}</td>
                    <td className="px-4 py-3 text-default-500">{r.country || "—"}</td>
                    <td className="px-4 py-3 text-default-500 capitalize">{r.gender_focus || "mixed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
