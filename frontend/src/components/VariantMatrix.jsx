import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, Button } from "@heroui/react";

export default function VariantMatrix({ onGenerate }) {
  const { t } = useTranslation();
  const [opt1Name, setOpt1Name] = useState(t("shop.default_color"));
  const [opt1Values, setOpt1Values] = useState(t("shop.default_color_values"));
  const [opt2Name, setOpt2Name] = useState(t("shop.default_size"));
  const [opt2Values, setOpt2Values] = useState("S,M,L");
  const [apply, setApply] = useState({ price: "", stock: "" });

  const o1 = useMemo(() => opt1Values.split(",").map(s => s.trim()).filter(Boolean), [opt1Values]);
  const o2 = useMemo(() => opt2Values.split(",").map(s => s.trim()).filter(Boolean), [opt2Values]);

  const grid = useMemo(() => {
    const rows = [];
    for (const v1 of o1) for (const v2 of o2) rows.push({
      attrs: { [opt1Name]: v1, [opt2Name]: v2 },
      sku: "", price: apply.price || "", stock: apply.stock || "",
    });
    return rows;
  }, [o1, o2, opt1Name, opt2Name, apply]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row gap-2">
        <Input size="sm" label={t("shop.variant_type_1")} value={opt1Name} onValueChange={setOpt1Name} />
        <Input size="sm" label={t("shop.options_comma_separated")} value={opt1Values} onValueChange={setOpt1Values} />
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <Input size="sm" label={t("shop.variant_type_2")} value={opt2Name} onValueChange={setOpt2Name} />
        <Input size="sm" label={t("shop.options_comma_separated")} value={opt2Values} onValueChange={setOpt2Values} />
      </div>
      <div className="flex flex-col md:flex-row gap-2 items-end">
        <Input size="sm" label={t("shop.apply_price_all")} value={apply.price} onValueChange={(v) => setApply(a => ({ ...a, price: v }))} />
        <Input size="sm" label={t("shop.apply_stock_all")} value={apply.stock} onValueChange={(v) => setApply(a => ({ ...a, stock: v }))} />
        <Button
          color="primary"
          size="sm"
          onPress={() => onGenerate?.(grid.map(r => ({
            sku: r.sku,
            price: Number(r.price || 0),
            stock: Number(r.stock || 0),
            variant_attributes: r.attrs
          })))}
        >
          {t("shop.generate_variants")}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default-100 text-default-500 text-left">
              <th className="pb-2 pr-3">{opt1Name}</th>
              <th className="pb-2 pr-3">{opt2Name}</th>
              <th className="pb-2 pr-3">* {t("shop.price_col")}</th>
              <th className="pb-2 pr-3">* {t("shop.stock_col")}</th>
              <th className="pb-2">SKU</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            {grid.map((r, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-3">{r.attrs[opt1Name]}</td>
                <td className="py-1.5 pr-3">{r.attrs[opt2Name]}</td>
                <td className="py-1.5 pr-3">{apply.price || "-"}</td>
                <td className="py-1.5 pr-3">{apply.stock || "-"}</td>
                <td className="py-1.5">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
