import React, { useEffect, useMemo, useState } from "react";
import { Select, SelectItem } from "@heroui/react";

export default function CategoryCascader({ value, onChange, svc }) {
  const [tree, setTree] = useState([]);
  const [lv1, setLv1] = useState("");
  const [lv2, setLv2] = useState("");
  const [lv3, setLv3] = useState("");

  useEffect(() => { svc.categoryTree().then(setTree); }, []);
  useEffect(() => { onChange?.(lv3 || lv2 || lv1 || ""); }, [lv1, lv2, lv3]);

  const L2 = useMemo(() => (tree.find(x => x._id === lv1)?.children || []), [tree, lv1]);
  const L3 = useMemo(() => (L2.find(x => x._id === lv2)?.children || []), [L2, lv2]);

  useEffect(() => { if (value) { setLv3(value); } }, [value]);

  return (
    <div className="flex flex-col md:flex-row gap-2">
      <Select
        label="Danh mục 1"
        selectedKeys={lv1 ? new Set([lv1]) : new Set()}
        onSelectionChange={(k) => { const v = Array.from(k)[0] || ""; setLv1(v); setLv2(""); setLv3(""); }}
      >
        {tree.map(c => <SelectItem key={c._id}>{c.name}</SelectItem>)}
      </Select>

      <Select
        label="Danh mục 2"
        selectedKeys={lv2 ? new Set([lv2]) : new Set()}
        onSelectionChange={(k) => { const v = Array.from(k)[0] || ""; setLv2(v); setLv3(""); }}
        isDisabled={!lv1}
      >
        {L2.map(c => <SelectItem key={c._id}>{c.name}</SelectItem>)}
      </Select>

      <Select
        label="Danh mục 3"
        selectedKeys={lv3 ? new Set([lv3]) : new Set()}
        onSelectionChange={(k) => setLv3(Array.from(k)[0] || "")}
        isDisabled={!lv2}
      >
        {L3.map(c => <SelectItem key={c._id}>{c.name}</SelectItem>)}
      </Select>
    </div>
  );
}
