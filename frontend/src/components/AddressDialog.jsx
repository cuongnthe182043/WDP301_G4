import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Select, SelectItem, Tabs, Tab,
} from "@heroui/react";
import { useToast } from "./common/ToastProvider";
import { MapPin, User, Phone, Home, AlertCircle, Info, Wand2 } from "lucide-react";

/* ── Helpers ── */
const prettyJoin = (parts = []) => {
  const cleaned = parts.map(x => String(x || "").trim()).filter(x => x && x !== "-" && x !== "—");
  return cleaned.join(", ").replace(/\s*-\s*/g, "").replace(/,\s*,/g, ", ").replace(/^\s*,\s*|\s*,\s*$/g, "").trim();
};
const strip = (s = "") => s.normalize?.("NFD").replace(/\p{Diacritic}/gu, "").replace(/\./g, "").trim().toLowerCase() || s;
const rmPrefix = (s = "") => s.replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|xa|phuong)\s+/i, "").trim();

/** Normalize: strip diacritics first, then remove admin-unit prefix */
const normalize = (s = "") => rmPrefix(strip(s));

/**
 * Fuzzy-match a user segment against a list of names.
 * Tries exact normalized match first, then "includes" fallback for short input.
 * Returns the matched item or null.
 */
function fuzzyFind(segment, list, getName) {
  const norm = normalize(segment);
  if (!norm) return null;
  // 1. Exact match after normalization (e.g. "ha noi" === "ha noi")
  const exact = list.find(item => normalize(getName(item)) === norm);
  if (exact) return exact;
  // 2. The item's normalized name ends with the user input (e.g. "thanh pho ha noi" ends with "ha noi")
  //    — but only if the user input is at least 2 chars to avoid false positives
  if (norm.length >= 2) {
    const suffix = list.find(item => {
      const n = normalize(getName(item));
      return n.endsWith(norm) || n.endsWith(" " + norm);
    });
    if (suffix) return suffix;
  }
  // 3. Contains match — user input contains the core name or vice versa
  if (norm.length >= 3) {
    const partial = list.find(item => {
      const n = normalize(getName(item));
      return n.includes(norm) || norm.includes(n);
    });
    if (partial) return partial;
  }
  return null;
}

async function fetchTinh() {
  const r = await fetch("https://esgoo.net/api-tinhthanh/1/0.htm");
  const j = await r.json();
  return j?.error === 0 ? j.data : [];
}
async function fetchQuan(tinhId) {
  if (!tinhId) return [];
  const r = await fetch(`https://esgoo.net/api-tinhthanh/2/${tinhId}.htm`);
  const j = await r.json();
  return j?.error === 0 ? j.data : [];
}
async function fetchPhuong(quanId) {
  if (!quanId) return [];
  const r = await fetch(`https://esgoo.net/api-tinhthanh/3/${quanId}.htm`);
  const j = await r.json();
  return j?.error === 0 ? j.data : [];
}
async function fetch34All() {
  const r = await fetch("https://cdn.jsdelivr.net/gh/giaodienblog/cdn@master/provinces-database.json");
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

/* ── Styled input ── */
const inputCls = (hasError) =>
  `w-full h-10 px-3.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none border-2
  ${hasError
    ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-red-800"
    : "border-blue-100 bg-blue-50/50 text-gray-800 placeholder-blue-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
  }`;

function FieldLabel({ icon: Icon, children }) {
  return (
    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
      {Icon && <Icon size={11} className="text-blue-400" />}
      {children}
    </span>
  );
}

export default function AddressDialog({ open, onClose, initial, onSubmit }) {
  const toast = useToast();
  const [tab, setTab] = useState("0");

  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");

  // 63 tỉnh
  const [tinhList,   setTinhList]   = useState([]);
  const [quanList,   setQuanList]   = useState([]);
  const [phuongList, setPhuongList] = useState([]);
  const [tinhId,     setTinhId]     = useState("");
  const [quanId,     setQuanId]     = useState("");
  const [phuongId,   setPhuongId]   = useState("");

  // 34 tỉnh
  const [db34,      setDb34]      = useState([]);
  const [provCode,  setProvCode]  = useState("");
  const [wardCode,  setWardCode]  = useState("");

  // Auto-fill
  const [autoFillText, setAutoFillText] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const autoFillRef = React.useRef(false);

  const handleAutoFill = async () => {
    const input = autoFillText.trim();
    if (!input) {
      toast.error("Vui lòng nhập địa chỉ để tự động điền.");
      return;
    }
    setAutoFilling(true);
    autoFillRef.current = true;
    try {
      const segments = input.split(",").map(s => s.trim()).filter(Boolean);
      const usedIndices = new Set();
      let filled63 = false;
      let filled34 = false;

      /* ── Step 1: Find province (scan from right) ── */
      let matchedTinh = null;
      for (let i = segments.length - 1; i >= 0 && !matchedTinh; i--) {
        const found = fuzzyFind(segments[i], tinhList, t => t.full_name);
        if (found) { matchedTinh = found; usedIndices.add(i); }
      }

      if (matchedTinh) {
        /* ── 63-province flow ── */
        setTab("0");
        setProvCode(""); setWardCode("");
        setTinhId(matchedTinh.id);

        // Step 2: Fetch districts, try to match a segment
        const quans = await fetchQuan(matchedTinh.id);
        setQuanList(quans);
        let matchedQuan = null;
        for (let i = segments.length - 1; i >= 0 && !matchedQuan; i--) {
          if (usedIndices.has(i)) continue;
          const found = fuzzyFind(segments[i], quans, q => q.full_name);
          if (found) { matchedQuan = found; usedIndices.add(i); }
        }

        if (matchedQuan) {
          setQuanId(matchedQuan.id);

          // Step 3: Fetch wards, try to match a segment
          const phuongs = await fetchPhuong(matchedQuan.id);
          setPhuongList(phuongs);
          let matchedPhuong = null;
          for (let i = segments.length - 1; i >= 0 && !matchedPhuong; i--) {
            if (usedIndices.has(i)) continue;
            const found = fuzzyFind(segments[i], phuongs, p => p.full_name);
            if (found) { matchedPhuong = found; usedIndices.add(i); }
          }
          if (matchedPhuong) setPhuongId(matchedPhuong.id);
        }
        filled63 = true;
      }

      if (!filled63) {
        /* ── 34-province flow ── */
        let matchedProv = null;
        for (let i = segments.length - 1; i >= 0 && !matchedProv; i--) {
          const found = fuzzyFind(segments[i], db34, p => p.FullName || p.Name || p.name || "");
          if (found) { matchedProv = found; usedIndices.add(i); }
        }

        if (matchedProv) {
          setTab("1");
          setTinhId(""); setQuanId(""); setPhuongId("");
          setProvCode(String(matchedProv.Code || matchedProv.code));

          const wards = matchedProv.Wards || [];
          let matchedWard = null;
          for (let i = segments.length - 1; i >= 0 && !matchedWard; i--) {
            if (usedIndices.has(i)) continue;
            const found = fuzzyFind(segments[i], wards, w => w.FullName || w.Name || w.name || "");
            if (found) { matchedWard = found; usedIndices.add(i); }
          }
          if (matchedWard) setWardCode(String(matchedWard.Code || matchedWard.code));
          filled34 = true;
        }
      }

      if (!filled63 && !filled34) {
        toast.error("Không nhận diện được Tỉnh/TP. Vui lòng kiểm tra lại địa chỉ.");
        return;
      }

      /* ── Step 4: Remaining segments → street ── */
      const streetParts = segments.filter((_, i) => !usedIndices.has(i));
      if (streetParts.length) setStreet(streetParts.join(", "));

      const parts = [];
      if (usedIndices.size < segments.length) parts.push("địa chỉ chi tiết");
      toast.success(`Đã tự động điền ${filled63 ? "(63 tỉnh)" : "(34 tỉnh)"}!`);
    } catch (e) {
      toast.error("Lỗi khi tự động điền: " + (e.message || "Không xác định"));
    } finally {
      setAutoFilling(false);
      autoFillRef.current = false;
    }
  };

  useEffect(() => {
    if (!open) return;
    setTab(initial?.source === "34" ? "1" : "0");
    setName(initial?.name || "");
    setPhone(initial?.phone || "");
    setStreet(initial?.street || "");
    (async () => {
      try { const [tinh] = await Promise.all([fetchTinh()]); setTinhList(tinh); } catch {}
      try { const data34 = await fetch34All(); setDb34(data34); } catch {}
    })();
    setTinhId(""); setQuanId(""); setPhuongId(""); setProvCode(""); setWardCode("");
    setAutoFillText("");
  }, [open, initial]);

  useEffect(() => {
    if (!open || !initial) return;
    (async () => {
      try {
        if (!tinhList.length && !db34.length) return;
        const cityName = rmPrefix(initial.city || "");
        const districtName = rmPrefix(initial.district || "");
        const wardName = rmPrefix(initial.ward || "");
        if (initial?.source === "34" && db34.length) {
          const fp = db34.find(p => strip(rmPrefix(p.FullName || p.Name || p.name)) === strip(cityName));
          if (fp) {
            setTab("1"); const code = String(fp.Code || fp.code); setProvCode(code);
            const fw = (fp.Wards || []).find(w => strip(rmPrefix(w.FullName || w.Name || w.name)) === strip(wardName));
            if (fw) setWardCode(String(fw.Code || fw.code));
            return;
          }
        }
        if (tinhList.length) {
          const ft = tinhList.find(t => strip(rmPrefix(t.full_name)) === strip(cityName));
          if (ft) {
            setTab("0"); setTinhId(ft.id);
            const quans = await fetchQuan(ft.id); setQuanList(quans);
            const fq = quans.find(q => strip(rmPrefix(q.full_name)) === strip(districtName));
            if (fq) {
              setQuanId(fq.id);
              const phuongs = await fetchPhuong(fq.id); setPhuongList(phuongs);
              const fp2 = phuongs.find(p => strip(rmPrefix(p.full_name)) === strip(wardName));
              if (fp2) setPhuongId(fp2.id);
            }
            return;
          }
        }
        if (db34.length) {
          const fp = db34.find(p => strip(rmPrefix(p.FullName || p.Name || p.name)) === strip(cityName));
          if (fp) {
            setTab("1"); setProvCode(String(fp.Code || fp.code));
            const fw = (fp.Wards || []).find(w => strip(rmPrefix(w.FullName || w.Name || w.name)) === strip(wardName));
            if (fw) setWardCode(String(fw.Code || fw.code));
          }
        }
      } catch {}
    })();
  }, [open, initial, tinhList, db34]);

  useEffect(() => {
    if (autoFillRef.current) return;
    if (!tinhId) { setQuanList([]); setQuanId(""); setPhuongList([]); setPhuongId(""); return; }
    (async () => {
      const quans = await fetchQuan(tinhId); setQuanList(quans); setQuanId(""); setPhuongList([]); setPhuongId("");
    })();
  }, [tinhId]);

  useEffect(() => {
    if (autoFillRef.current) return;
    if (!quanId) { setPhuongList([]); setPhuongId(""); return; }
    (async () => { const phuongs = await fetchPhuong(quanId); setPhuongList(phuongs); setPhuongId(""); })();
  }, [quanId]);

  const wards34 = useMemo(() => {
    const p = db34.find(x => (x.Code || x.code || "") === provCode);
    return p?.Wards || [];
  }, [db34, provCode]);

  const handleChangeTab = (key) => {
    setTab(key);
    if (key === "0") { setProvCode(""); setWardCode(""); }
    else { setTinhId(""); setQuanId(""); setPhuongId(""); }
  };

  const handleSave = async () => {
    let city = "", district = "", ward = "", province_code = "", ward_code = "";
    const source = tab === "0" ? "63" : "34";
    if (tab === "0") {
      const t = tinhList.find(x => x.id === tinhId);
      const q = quanList.find(x => x.id === quanId);
      const p = phuongList.find(x => x.id === phuongId);
      city = t?.full_name || ""; district = q?.full_name || ""; ward = p?.full_name || "";
    } else {
      const p = db34.find(x => (x.Code || x.code || "") === provCode);
      const w = wards34.find(x => (x.Code || x.code || "") === wardCode);
      const baseProv = p ? (p.FullName || p.Name || p.name) : "";
      const baseWard = w ? (w.FullName || w.Name || w.name) : "";
      const short = String(w?.AdministrativeUnitShortName || w?.AdministrativeUnitShort || "").trim();
      const wardText = short && baseWard.toLowerCase().startsWith(short.toLowerCase() + " ") ? baseWard : (short ? `${short} ${baseWard}` : baseWard);
      city = baseProv; district = ""; ward = wardText;
      province_code = String(p?.Code || p?.code || "");
      ward_code = String(w?.Code || w?.code || "");
    }
    const clean = (s = "") => String(s).replace(/\s*-\s*/g, "").replace(/\s+/g, " ").replace(/,\s*,/g, ", ").replace(/^\s*,\s*|\s*,\s*$/g, "").trim();
    const payload = { name: clean(name), phone: clean(phone), city: clean(city), ward: clean(ward), street: clean(street), province_code, ward_code, country: "VN", source };
    if (tab === "0") { const d = clean(district); if (d) payload.district = d; }
    Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] == null) delete payload[k]; });
    if (!payload.name || !payload.phone || !payload.city || !payload.ward || !payload.street) {
      toast.error("Vui lòng nhập đủ Họ tên, SĐT, Tỉnh/TP, Phường/Xã và Địa chỉ chi tiết.");
      return;
    }
    try { await onSubmit?.(payload); }
    catch (e) { toast.error(e?.response?.data?.message || e.message || "Lưu địa chỉ thất bại"); }
  };

  /* ── Shared select classNames ── */
  const selectCls = {
    trigger: "border-2 border-blue-100 bg-blue-50/50 data-[hover=true]:border-blue-300 data-[focus=true]:border-blue-400 data-[focus=true]:bg-white rounded-xl h-10",
    value: "text-sm font-medium",
    label: "text-xs font-bold text-blue-700 uppercase tracking-wider",
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "rounded-3xl overflow-hidden",
        wrapper: "items-center",
      }}
    >
      <ModalContent>
        {/* Header */}
        <ModalHeader className="p-0">
          <div
            className="w-full px-6 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-base leading-tight">
                {initial ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
              </h3>
              <p className="text-blue-200 text-xs mt-0.5">Thông tin giao hàng của bạn</p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="px-6 py-5 space-y-4">
          {/* Auto-fill from full address */}
          <div
            className="p-4 rounded-xl space-y-2"
            style={{ background: "linear-gradient(135deg, #F0FDF4, #ECFDF5)", border: "1.5px solid #BBF7D0" }}
          >
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 size={12} className="text-emerald-500" />
              Tự động điền địa chỉ
            </span>
            <p className="text-xs text-emerald-600 leading-relaxed">
              Nhập địa chỉ vào ô bên dưới, hệ thống sẽ tự nhận diện Tỉnh/TP, Quận/Huyện, Phường/Xã — không cần gõ đầy đủ "Thành phố", "Quận", "Phường".
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 h-10 px-3.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none border-2 border-emerald-200 bg-white text-gray-800 placeholder-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                value={autoFillText}
                onChange={e => setAutoFillText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAutoFill(); }}
                placeholder="VD: 123 Nguyễn Huệ, Bến Nghé, Quận 1, Hồ Chí Minh"
              />
              <Button
                isLoading={autoFilling}
                onPress={handleAutoFill}
                size="sm"
                className="font-bold text-white rounded-xl px-4 h-10 min-w-fit"
                style={{ background: "linear-gradient(135deg, #059669, #10B981)", boxShadow: "0 2px 8px rgba(5,150,105,0.3)" }}
              >
                <Wand2 size={14} />
                Tự động điền
              </Button>
            </div>
          </div>

          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel icon={User}>Họ và tên</FieldLabel>
              <input className={inputCls(false)} value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <FieldLabel icon={Phone}>Số điện thoại</FieldLabel>
              <input className={inputCls(false)} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912 345 678" />
            </div>
          </div>

          {/* Tabs */}
          <div>
            <FieldLabel icon={MapPin}>Phân vùng hành chính</FieldLabel>
            <Tabs
              selectedKey={tab}
              onSelectionChange={handleChangeTab}
              size="sm"
              classNames={{
                tabList: "bg-blue-50 border border-blue-100 rounded-xl p-1",
                tab: "rounded-lg text-xs font-bold data-[selected=true]:bg-white data-[selected=true]:text-blue-700 data-[selected=true]:shadow-sm text-blue-400",
                cursor: "hidden",
              }}
            >
              <Tab key="0" title="63 Tỉnh/TP (T → Q → P)" />
              <Tab key="1" title="34 Tỉnh/TP sau sáp nhập (T → P)" />
            </Tabs>
          </div>

          {/* 63 tỉnh */}
          <AnimatePresence mode="wait">
            {tab === "0" && (
              <motion.div
                key="tab63"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <Select
                  label="Tỉnh / Thành phố"
                  selectedKeys={tinhId ? new Set([tinhId]) : new Set()}
                  onSelectionChange={k => setTinhId(Array.from(k)[0] || "")}
                  classNames={selectCls}
                  size="sm"
                >
                  {tinhList.map(t => <SelectItem key={t.id}>{t.full_name}</SelectItem>)}
                </Select>
                <Select
                  label="Quận / Huyện"
                  selectedKeys={quanId ? new Set([quanId]) : new Set()}
                  onSelectionChange={k => setQuanId(Array.from(k)[0] || "")}
                  isDisabled={!tinhId}
                  classNames={selectCls}
                  size="sm"
                >
                  {quanList.map(q => <SelectItem key={q.id}>{q.full_name}</SelectItem>)}
                </Select>
                <Select
                  label="Phường / Xã"
                  selectedKeys={phuongId ? new Set([phuongId]) : new Set()}
                  onSelectionChange={k => setPhuongId(Array.from(k)[0] || "")}
                  isDisabled={!quanId}
                  classNames={selectCls}
                  size="sm"
                >
                  {phuongList.map(p => <SelectItem key={p.id}>{p.full_name}</SelectItem>)}
                </Select>
              </motion.div>
            )}

            {tab === "1" && (
              <motion.div
                key="tab34"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <Select
                  label="Tỉnh / Thành phố"
                  selectedKeys={provCode ? new Set([provCode]) : new Set()}
                  onSelectionChange={k => setProvCode(Array.from(k)[0] || "")}
                  classNames={selectCls}
                  size="sm"
                >
                  {db34.map(p => {
                    const code = String(p.Code || p.code);
                    return <SelectItem key={code}>{p.FullName || p.Name || p.name}</SelectItem>;
                  })}
                </Select>
                <Select
                  label="Phường / Xã"
                  selectedKeys={wardCode ? new Set([wardCode]) : new Set()}
                  onSelectionChange={k => setWardCode(Array.from(k)[0] || "")}
                  isDisabled={!provCode}
                  classNames={selectCls}
                  size="sm"
                >
                  {wards34.map(w => {
                    const code = String(w.Code || w.code || "");
                    const base = String(w.FullName || w.Name || w.name || "").trim();
                    const short = String(w.AdministrativeUnitShortName || w.AdministrativeUnitShort || "").trim();
                    const already = short && base.toLowerCase().startsWith(short.toLowerCase() + " ");
                    const text = already ? base : (short ? `${short} ${base}` : base);
                    return <SelectItem key={code}>{text}</SelectItem>;
                  })}
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Street detail */}
          <div>
            <FieldLabel icon={Home}>Địa chỉ chi tiết</FieldLabel>
            <input
              className={inputCls(false)}
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder="Số nhà, tên đường, tòa nhà…"
            />
          </div>

          {/* Current address hint */}
          {initial && (
            <div
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
              style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
            >
              <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 leading-relaxed">
                <span className="font-bold">Địa chỉ hiện tại: </span>
                {initial?.street ? `${initial.street}, ` : ""}
                {prettyJoin([initial?.ward, initial?.district, initial?.city])}
              </p>
            </div>
          )}

          {/* Info note */}
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
            style={{ background: "#F0F9FF", border: "1.5px solid #BAE6FD" }}
          >
            <AlertCircle size={14} className="text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-sky-700 leading-relaxed">
              Bộ <strong>34 tỉnh</strong> (sau sáp nhập) không có Quận/Huyện — hệ thống sẽ bỏ trống field này.
              Chọn <strong>63 tỉnh</strong> nếu bạn cần điền đầy đủ 3 cấp.
            </p>
          </div>
        </ModalBody>

        <ModalFooter
          className="px-6 py-4 gap-2"
          style={{ borderTop: "1.5px solid #EFF6FF" }}
        >
          <Button
            variant="light"
            onPress={onClose}
            className="font-bold text-blue-500 border-2 border-blue-100 hover:border-blue-300 bg-blue-50 rounded-xl"
          >
            Huỷ
          </Button>
          <Button
            onPress={handleSave}
            className="font-black text-white rounded-xl px-8"
            style={{
              background: "linear-gradient(135deg, #1E40AF, #2563EB)",
              boxShadow: "0 4px 14px rgba(29,78,216,0.3)",
            }}
          >
            {initial ? "Cập nhật" : "Thêm địa chỉ"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}