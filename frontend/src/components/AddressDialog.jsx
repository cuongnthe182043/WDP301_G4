import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Select, SelectItem, Spinner,
} from "@heroui/react";
import { useToast } from "./common/ToastProvider";
import { MapPin, User, Phone, Home, AlertCircle, Info, Wand2 } from "lucide-react";
import { ghnGetProvinces, ghnGetDistricts, ghnGetWards } from "../services/addressService";

/* ── Helpers ── */
const strip = (s = "") =>
  s.normalize?.("NFD").replace(/\p{Diacritic}/gu, "").replace(/\./g, "").trim().toLowerCase() || s;
const rmPrefix = (s = "") =>
  s.replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|xa|phuong)\s+/i, "").trim();
const normalize = (s = "") => rmPrefix(strip(s));

function fuzzyFind(segment, list, getName) {
  const norm = normalize(segment);
  if (!norm) return null;
  const exact = list.find(item => normalize(getName(item)) === norm);
  if (exact) return exact;
  if (norm.length >= 2) {
    const suffix = list.find(item => {
      const n = normalize(getName(item));
      return n.endsWith(norm) || n.endsWith(" " + norm);
    });
    if (suffix) return suffix;
  }
  if (norm.length >= 3) {
    const partial = list.find(item => {
      const n = normalize(getName(item));
      return n.includes(norm) || norm.includes(n);
    });
    if (partial) return partial;
  }
  return null;
}

/* ── Styled input ── */
const inputCls = (hasError) =>
  `w-full h-10 px-3.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none border-2
  ${hasError
    ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-red-800 dark:bg-red-950 dark:border-red-700 dark:text-red-300"
    : "border-blue-100 bg-blue-50/50 text-gray-800 dark:text-[#d1d5db] placeholder-blue-200 focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-100 dark:border-[#2e3347] dark:bg-[#1a1e2e]"
  }`;

function FieldLabel({ icon: Icon, children }) {
  return (
    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
      {Icon && <Icon size={11} className="text-blue-400" />}
      {children}
    </span>
  );
}

const selectCls = {
  trigger: "border-2 border-blue-100 bg-blue-50/50 data-[hover=true]:border-blue-300 data-[focus=true]:border-blue-400 data-[focus=true]:bg-white rounded-xl h-10",
  value: "text-sm font-medium",
  label: "text-xs font-bold text-blue-700 uppercase tracking-wider",
};

const prettyJoin = (parts = []) =>
  parts.map(x => String(x || "").trim()).filter(x => x && x !== "-" && x !== "—").join(", ");

export default function AddressDialog({ open, onClose, initial, onSubmit }) {
  const { t } = useTranslation();
  const toast = useToast();

  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [street, setStreet] = useState("");

  // GHN location state
  const [provinces,         setProvinces]         = useState([]);
  const [districts,         setDistricts]         = useState([]);
  const [wards,             setWards]             = useState([]);
  const [provinceId,        setProvinceId]        = useState("");   // GHN ProvinceID (number as string)
  const [districtId,        setDistrictId]        = useState("");   // GHN DistrictID (number as string)
  const [wardCode,          setWardCode]          = useState("");   // GHN WardCode (string)
  const [loadingDistricts,  setLoadingDistricts]  = useState(false);
  const [loadingWards,      setLoadingWards]      = useState(false);

  // Auto-fill
  const [autoFillText, setAutoFillText] = useState("");
  const [autoFilling,  setAutoFilling]  = useState(false);
  const autoFillRef = useRef(false);

  // Load provinces once on first open
  useEffect(() => {
    if (!open) return;
    if (provinces.length === 0) {
      ghnGetProvinces().then(setProvinces).catch(() => {});
    }
    setName(initial?.name || "");
    setPhone(initial?.phone || "");
    setStreet(initial?.street || "");
    setAutoFillText("");
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps

  // When editing an existing address, restore selections using saved GHN codes
  useEffect(() => {
    if (!open || !initial) {
      setProvinceId(""); setDistrictId(""); setWardCode("");
      setDistricts([]); setWards([]);
      return;
    }

    const pid = String(initial.province_code || "");
    const did = String(initial.district_code || "");
    const wc  = String(initial.ward_code || "");

    setProvinceId(pid);
    setDistrictId(did);
    setWardCode(wc);

    // Fetch districts + wards for the saved province/district
    if (pid) {
      setLoadingDistricts(true);
      ghnGetDistricts(Number(pid))
        .then(list => {
          setDistricts(list);
          if (did && wc) {
            setLoadingWards(true);
            return ghnGetWards(Number(did)).then(ws => { setWards(ws); }).finally(() => setLoadingWards(false));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDistricts(false));
    } else {
      setDistricts([]); setWards([]);
    }
  }, [open, initial]);

  // Province change (manual selection)
  const handleProvinceChange = (keys) => {
    if (autoFillRef.current) return;
    const pid = [...keys][0] || "";
    setProvinceId(pid); setDistrictId(""); setWardCode(""); setDistricts([]); setWards([]);
    if (!pid) return;
    setLoadingDistricts(true);
    ghnGetDistricts(Number(pid)).then(setDistricts).catch(() => {}).finally(() => setLoadingDistricts(false));
  };

  // District change (manual selection)
  const handleDistrictChange = (keys) => {
    if (autoFillRef.current) return;
    const did = [...keys][0] || "";
    setDistrictId(did); setWardCode(""); setWards([]);
    if (!did) return;
    setLoadingWards(true);
    ghnGetWards(Number(did)).then(setWards).catch(() => {}).finally(() => setLoadingWards(false));
  };

  // Ward change (manual selection)
  const handleWardChange = (keys) => {
    setWardCode([...keys][0] || "");
  };

  // ── Auto-fill ──────────────────────────────────────────────────────────────
  const handleAutoFill = async () => {
    const input = autoFillText.trim();
    if (!input) { toast.error("Vui lòng nhập địa chỉ để tự động điền."); return; }
    if (!provinces.length) { toast.error("Đang tải danh sách tỉnh, vui lòng thử lại."); return; }
    setAutoFilling(true);
    autoFillRef.current = true;
    try {
      const segments = input.split(",").map(s => s.trim()).filter(Boolean);
      const usedIndices = new Set();

      // 1. Match province
      let matchedProvince = null;
      for (let i = segments.length - 1; i >= 0 && !matchedProvince; i--) {
        const found = fuzzyFind(segments[i], provinces, p => p.ProvinceName);
        if (found) { matchedProvince = found; usedIndices.add(i); }
      }

      if (!matchedProvince) {
        toast.error("Không nhận diện được Tỉnh/TP. Vui lòng kiểm tra lại địa chỉ.");
        return;
      }

      const newPid = String(matchedProvince.ProvinceID);
      setProvinceId(newPid);
      setDistrictId(""); setWardCode(""); setWards([]);

      // 2. Fetch districts, match
      setLoadingDistricts(true);
      const distList = await ghnGetDistricts(matchedProvince.ProvinceID);
      setDistricts(distList);
      setLoadingDistricts(false);

      let matchedDistrict = null;
      for (let i = segments.length - 1; i >= 0 && !matchedDistrict; i--) {
        if (usedIndices.has(i)) continue;
        const found = fuzzyFind(segments[i], distList, d => d.DistrictName);
        if (found) { matchedDistrict = found; usedIndices.add(i); }
      }

      if (matchedDistrict) {
        const newDid = String(matchedDistrict.DistrictID);
        setDistrictId(newDid);

        // 3. Fetch wards, match
        setLoadingWards(true);
        const wardList = await ghnGetWards(matchedDistrict.DistrictID);
        setWards(wardList);
        setLoadingWards(false);

        let matchedWard = null;
        for (let i = segments.length - 1; i >= 0 && !matchedWard; i--) {
          if (usedIndices.has(i)) continue;
          const found = fuzzyFind(segments[i], wardList, w => w.WardName);
          if (found) { matchedWard = found; usedIndices.add(i); }
        }
        if (matchedWard) setWardCode(matchedWard.WardCode);
      }

      // 4. Remaining segments → street
      const streetParts = segments.filter((_, i) => !usedIndices.has(i));
      if (streetParts.length) setStreet(streetParts.join(", "));

      toast.success("Đã tự động điền địa chỉ!");
    } catch (e) {
      toast.error("Lỗi khi tự động điền: " + (e.message || "Không xác định"));
    } finally {
      setAutoFilling(false);
      autoFillRef.current = false;
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const prov = provinces.find(p => String(p.ProvinceID) === provinceId);
    const dist = districts.find(d => String(d.DistrictID) === districtId);
    const ward = wards.find(w => w.WardCode === wardCode);

    const clean = (s = "") => String(s).replace(/\s+/g, " ").replace(/,\s*,/g, ", ").replace(/^\s*,\s*|\s*,\s*$/g, "").trim();

    const payload = {
      name:          clean(name),
      phone:         clean(phone),
      street:        clean(street),
      city:          prov?.ProvinceName || "",
      district:      dist?.DistrictName || "",
      ward:          ward?.WardName || "",
      source:        "63",
      province_code: provinceId ? String(provinceId) : null,
      district_code: districtId ? String(districtId) : null,
      ward_code:     wardCode || null,
      country:       "VN",
    };

    if (!payload.name || !payload.phone || !payload.city || !payload.district || !payload.ward || !payload.street) {
      toast.error(t("profile.address_required_fields"));
      return;
    }

    try { await onSubmit?.(payload); }
    catch (e) { toast.error(e?.response?.data?.message || e.message || t("profile.address_save_failed")); }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{ base: "rounded-3xl overflow-hidden", wrapper: "items-center" }}
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
                {initial ? t("profile.update_address") : t("profile.add_new_address")}
              </h3>
              <p className="text-blue-200 text-xs mt-0.5">{t("profile.shipping_info")}</p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="px-6 py-5 space-y-4">
          {/* Auto-fill */}
          <div
            className="p-4 rounded-xl space-y-2"
            style={{ background: "linear-gradient(135deg, #F0FDF4, #ECFDF5)", border: "1.5px solid #BBF7D0" }}
          >
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 size={12} className="text-emerald-500" />
              Tự động điền địa chỉ
            </span>
            <p className="text-xs text-emerald-600 leading-relaxed">
              Nhập địa chỉ vào ô bên dưới, hệ thống sẽ tự nhận diện Tỉnh/TP, Quận/Huyện, Phường/Xã.
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
              <FieldLabel icon={User}>{t("profile.full_name_label")}</FieldLabel>
              <input className={inputCls(false)} value={name} onChange={e => setName(e.target.value)} placeholder={t("profile.full_name_placeholder")} />
            </div>
            <div>
              <FieldLabel icon={Phone}>{t("common.phone")}</FieldLabel>
              <input className={inputCls(false)} value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("profile.phone_placeholder")} />
            </div>
          </div>

          {/* Province / District / Ward */}
          <div>
            <FieldLabel icon={MapPin}>{t("profile.admin_region")}</FieldLabel>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {/* Province */}
              <Select
                label={t("profile.province_city")}
                selectedKeys={provinceId ? new Set([String(provinceId)]) : new Set()}
                onSelectionChange={handleProvinceChange}
                classNames={selectCls}
                size="sm"
                isDisabled={provinces.length === 0}
              >
                {provinces.map(p => (
                  <SelectItem key={String(p.ProvinceID)}>{p.ProvinceName}</SelectItem>
                ))}
              </Select>

              {/* District */}
              <Select
                label={t("profile.district")}
                selectedKeys={districtId ? new Set([String(districtId)]) : new Set()}
                onSelectionChange={handleDistrictChange}
                classNames={selectCls}
                size="sm"
                isDisabled={!provinceId || loadingDistricts}
                startContent={loadingDistricts ? <Spinner size="sm" /> : null}
              >
                {districts.map(d => (
                  <SelectItem key={String(d.DistrictID)}>{d.DistrictName}</SelectItem>
                ))}
              </Select>

              {/* Ward */}
              <Select
                label={t("profile.ward")}
                selectedKeys={wardCode ? new Set([wardCode]) : new Set()}
                onSelectionChange={handleWardChange}
                classNames={selectCls}
                size="sm"
                isDisabled={!districtId || loadingWards}
                startContent={loadingWards ? <Spinner size="sm" /> : null}
              >
                {wards.map(w => (
                  <SelectItem key={w.WardCode}>{w.WardName}</SelectItem>
                ))}
              </Select>
            </motion.div>
          </div>

          {/* Street detail */}
          <div>
            <FieldLabel icon={Home}>{t("profile.street_detail")}</FieldLabel>
            <input
              className={inputCls(false)}
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder={t("profile.street_placeholder")}
            />
          </div>

          {/* Current address hint */}
          {initial && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-[#1a1e2e] border border-blue-200 dark:border-[#2e3347]">
              <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 dark:text-[#c8cbd4] leading-relaxed">
                <span className="font-bold">{t("profile.current_address_label")} </span>
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
              Địa chỉ sẽ được dùng để tính phí vận chuyển và tạo đơn giao hàng GHN. Vui lòng chọn đúng tỉnh/huyện/xã từ danh sách.
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
            {t("common.cancel")}
          </Button>
          <Button
            onPress={handleSave}
            className="font-black text-white rounded-xl px-8"
            style={{
              background: "linear-gradient(135deg, #1E40AF, #2563EB)",
              boxShadow: "0 4px 14px rgba(29,78,216,0.3)",
            }}
          >
            {initial ? t("common.update") : t("profile.add_address_btn")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
