import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Button, Select, SelectItem, Checkbox, Pagination,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Skeleton,
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, Star, ChevronDown, ChevronUp,
  Package, TrendingUp, Sparkles,
} from "lucide-react";
import { productApi } from "../../services/productService";
import { homeService } from "../../services/homeService";
import { formatCurrency } from "../../utils/formatCurrency";
import PageContainer from "../../components/ui/PageContainer";

// ─── constants ──────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "created_at", label: "Mới nhất" },
  { key: "popular",    label: "Phổ biến nhất" },
  { key: "rating",     label: "Đánh giá cao" },
  { key: "price_asc",  label: "Giá tăng dần" },
  { key: "price_desc", label: "Giá giảm dần" },
  { key: "sold",       label: "Bán chạy nhất" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const COLORS = [
  { name: "Đen",       value: "black",  hex: "#1a1a1a" },
  { name: "Trắng",     value: "white",  hex: "#f0f0f0", border: "#d1d5db" },
  { name: "Xám",       value: "gray",   hex: "#9ca3af" },
  { name: "Đỏ",        value: "red",    hex: "#ef4444" },
  { name: "Xanh lá",   value: "green",  hex: "#22c55e" },
  { name: "Xanh dương",value: "blue",   hex: "#3b82f6" },
  { name: "Vàng",      value: "yellow", hex: "#eab308" },
  { name: "Hồng",      value: "pink",   hex: "#ec4899" },
  { name: "Nâu",       value: "brown",  hex: "#92400e" },
  { name: "Cam",       value: "orange", hex: "#f97316" },
  { name: "Tím",       value: "purple", hex: "#a855f7" },
  { name: "Xanh lơ",   value: "cyan",   hex: "#06b6d4" },
];
const PRICE_PRESETS = [
  { label: "Dưới 200k",    min: 0,       max: 200_000 },
  { label: "200k – 500k",  min: 200_000, max: 500_000 },
  { label: "500k – 1tr",   min: 500_000, max: 1_000_000 },
  { label: "Trên 1tr",     min: 1_000_000, max: 0 },
];
const RATING_OPTIONS = [5, 4, 3, 2];
const MAX_PRICE = 10_000_000;

// ─── CSS ─────────────────────────────────────────────────────────────
if (!document.getElementById("sp-css")) {
  const s = document.createElement("style");
  s.id = "sp-css";
  s.textContent = `
    /* Product card */
    .sp-card { transition: transform .22s cubic-bezier(.4,0,.2,1), box-shadow .22s; cursor:pointer; }
    .sp-card:hover { transform: translateY(-5px); box-shadow: 0 16px 48px rgba(29,78,216,.13) !important; }
    .sp-card:hover .sp-img { transform: scale(1.06); }
    .sp-img { transition: transform .35s cubic-bezier(.4,0,.2,1); }

    /* Filter sidebar */
    .sp-section { border-bottom: 1px solid #eff6ff; }
    .sp-section:last-child { border-bottom: none; }

    /* Size chip */
    .sp-sz { cursor:pointer; padding:5px 0; min-width:42px; text-align:center;
      border-radius:10px; border:1.5px solid #dbeafe; font-size:12px; font-weight:700;
      transition: all .15s; color:#374151; background:#fff; }
    .sp-sz.on  { background:#1d4ed8; color:#fff; border-color:#1d4ed8; box-shadow:0 2px 8px rgba(29,78,216,.25); }
    .sp-sz:not(.on):hover { border-color:#93c5fd; color:#1d4ed8; background:#eff6ff; }

    /* Color swatch */
    .sp-swatch { transition: transform .15s, box-shadow .15s; }
    .sp-swatch:hover { transform: scale(1.18); }

    /* Active filter tag */
    .sp-tag { display:inline-flex; align-items:center; gap:5px; padding:4px 10px 4px 12px;
      border-radius:20px; background:rgba(219,234,254,.8); border:1.5px solid #bfdbfe;
      font-size:12px; font-weight:700; color:#1d4ed8; }
    .sp-tag button { display:flex; align-items:center; transition:color .12s; }
    .sp-tag button:hover { color:#1e3a8a; }

    /* Suggestion row */
    .sp-sug { padding:9px 14px; cursor:pointer; transition: background .1s; }
    .sp-sug:hover { background:rgba(219,234,254,.55); }

    /* Price inputs */
    .sp-price-input { width:100%; padding:7px 10px; border-radius:10px;
      border:1.5px solid #dbeafe; font-size:13px; font-weight:600; outline:none;
      transition: border .15s, box-shadow .15s; background:#f8faff; color:#1e293b; }
    .sp-price-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); background:#fff; }

    /* Range track */
    .sp-range-wrap { position:relative; height:6px; border-radius:3px; background:#dbeafe; margin: 0 0 6px; }
    .sp-range-fill { position:absolute; height:100%; border-radius:3px;
      background:linear-gradient(90deg,#2563eb,#3b82f6); }
    .sp-range-thumb { position:absolute; top:50%; transform:translate(-50%,-50%);
      width:18px; height:18px; border-radius:50%; background:#1d4ed8;
      border:2.5px solid #fff; box-shadow:0 2px 8px rgba(29,78,216,.35);
      cursor:grab; transition:box-shadow .15s; z-index:2; }
    .sp-range-thumb:active { cursor:grabbing; box-shadow:0 0 0 4px rgba(59,130,246,.2); }
    input[type=range].sp-range { position:absolute; width:100%; height:100%; opacity:0;
      cursor:pointer; z-index:3; margin:0; padding:0; }

    /* Preset btn */
    .sp-preset { padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600;
      border:1.5px solid #dbeafe; color:#374151; background:#f8faff; cursor:pointer; transition:all .15s; }
    .sp-preset.on  { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
    .sp-preset:not(.on):hover { border-color:#93c5fd; color:#1d4ed8; background:#eff6ff; }

    /* Brand search */
    .sp-brand-search { width:100%; padding:6px 10px; border-radius:8px;
      border:1.5px solid #dbeafe; font-size:12px; outline:none; background:#f8faff;
      transition:border .15s; }
    .sp-brand-search:focus { border-color:#3b82f6; background:#fff; }

    /* Section animate */
    @keyframes sp-fade-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
    .sp-section-body { animation: sp-fade-in .18s ease; overflow:hidden; }

    /* Card badge */
    .sp-badge { position:absolute; top:8px; left:8px; padding:2px 8px; border-radius:6px;
      font-size:10px; font-weight:800; letter-spacing:.02em; }
  `;
  document.head.appendChild(s);
}

// ─── Custom dual range slider (no external lib needed) ───────────────
function PriceRangeSlider({ min, max, minVal, maxVal, onChange, onCommit }) {
  const trackRef = useRef(null);

  const pct = (v) => ((v - min) / (max - min)) * 100;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const snap = (v) => Math.round(v / 50_000) * 50_000;

  const dragRef = useRef(null); // { thumb: "min"|"max" }

  const getValFromX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return snap(min + ratio * (max - min));
  }, [min, max]);

  const onPointerDown = (thumb) => (e) => {
    e.preventDefault();
    dragRef.current = thumb;

    const move = (ev) => {
      const val = getValFromX(ev.touches ? ev.touches[0].clientX : ev.clientX);
      if (dragRef.current === "min") {
        onChange(clamp(val, min, maxVal - 50_000), maxVal);
      } else {
        onChange(minVal, clamp(val, minVal + 50_000, max));
      }
    };
    const up = () => {
      onCommit();
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
  };

  const fillLeft  = pct(minVal);
  const fillWidth = pct(maxVal) - fillLeft;

  return (
    <div className="sp-range-wrap" ref={trackRef}>
      {/* filled track */}
      <div className="sp-range-fill" style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }} />
      {/* min thumb */}
      <div className="sp-range-thumb"
        style={{ left: `${pct(minVal)}%` }}
        onMouseDown={onPointerDown("min")}
        onTouchStart={onPointerDown("min")}
      />
      {/* max thumb */}
      <div className="sp-range-thumb"
        style={{ left: `${pct(maxVal)}%` }}
        onMouseDown={onPointerDown("max")}
        onTouchStart={onPointerDown("max")}
      />
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────
function useDebounce(value, ms = 300) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

function Stars({ value = 0, size = 13 }) {
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size}
          fill={i <= Math.round(value) ? "#f59e0b" : "none"}
          stroke={i <= Math.round(value) ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </span>
  );
}

function ProductCard({ product }) {
  const nav  = useNavigate();
  const img  = Array.isArray(product.images) ? product.images[0] : product.images;
  const price = product.base_price || 0;
  const rating = product.rating_avg || 0;
  return (
    <motion.div whileTap={{ scale: .97 }}
      className="sp-card bg-white rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid #eff6ff", boxShadow: "0 2px 12px rgba(29,78,216,.04)" }}
      onClick={() => nav(`/products/${product.slug || product._id}`)}
    >
      {/* image */}
      <div className="relative overflow-hidden bg-slate-50" style={{ paddingBottom: "100%" }}>
        {img
          ? <img src={img} alt={product.name} className="sp-img absolute inset-0 w-full h-full object-cover" loading="lazy" />
          : <div className="absolute inset-0 flex items-center justify-center"><Package size={36} className="text-slate-200" /></div>
        }
        {product.is_featured && (
          <span className="sp-badge" style={{ background: "linear-gradient(90deg,#1d4ed8,#2563eb)", color: "#fff" }}>
            Nổi bật
          </span>
        )}
        {product.sold_count > 100 && !product.is_featured && (
          <span className="sp-badge" style={{ background: "linear-gradient(90deg,#f97316,#ef4444)", color: "#fff" }}>
            Hot
          </span>
        )}
      </div>

      {/* info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="font-semibold text-[13px] text-slate-800 line-clamp-2 leading-snug">{product.name}</p>
        {rating > 0 && (
          <div className="flex items-center gap-1">
            <Stars value={rating} size={10} />
            <span className="text-[10px] text-slate-400">
              {rating.toFixed(1)}{product.rating_count > 0 ? ` (${product.rating_count})` : ""}
            </span>
          </div>
        )}
        <div className="flex items-end justify-between mt-0.5">
          <p className="font-black text-[15px]" style={{ color: "#1d4ed8" }}>{formatCurrency(price)}</p>
          {product.sold_count > 0 && (
            <p className="text-[10px] text-slate-400">Đã bán {product.sold_count > 999 ? (product.sold_count/1000).toFixed(1)+"k" : product.sold_count}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid #eff6ff" }}>
      <Skeleton className="w-full aspect-square" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-full rounded-lg" />
        <Skeleton className="h-3 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Section accordion ───────────────────────────────────────────────
function Section({ title, id, open, onToggle, children, badge }) {
  return (
    <div className="sp-section pb-4 mb-1">
      <button
        className="flex items-center justify-between w-full py-2 text-[13px] font-bold text-slate-700 group"
        onClick={() => onToggle(id)}
      >
        <span className="flex items-center gap-2">
          {title}
          {badge > 0 && (
            <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white" style={{ background: "#1d4ed8" }}>{badge}</span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: .2 }}>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: .22, ease: [.4, 0, .2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Price section (self-contained local state) ───────────────────────
function PriceSection({ urlMin, urlMax, onCommit }) {
  const numMin = Number(urlMin) || 0;
  const numMax = Number(urlMax) || MAX_PRICE;

  // local draft — only written to URL on mouseup / blur / preset click
  const [draft, setDraft] = useState([numMin, numMax]);
  const [minInput, setMinInput] = useState(numMin === 0 ? "" : String(numMin));
  const [maxInput, setMaxInput] = useState(numMax >= MAX_PRICE ? "" : String(numMax));

  // sync from URL changes (e.g. chip removed)
  useEffect(() => {
    const mn = Number(urlMin) || 0;
    const mx = Number(urlMax) || MAX_PRICE;
    setDraft([mn, mx]);
    setMinInput(mn === 0 ? "" : String(mn));
    setMaxInput(mx >= MAX_PRICE ? "" : String(mx));
  }, [urlMin, urlMax]);

  const commit = (mn, mx) => {
    onCommit(mn > 0 ? mn : "", mx < MAX_PRICE ? mx : "");
  };

  const applyPreset = (preset) => {
    const mn = preset.min;
    const mx = preset.max || MAX_PRICE;
    setDraft([mn, mx]);
    setMinInput(mn > 0 ? String(mn) : "");
    setMaxInput(mx < MAX_PRICE ? String(mx) : "");
    commit(mn, mx);
  };

  const isPresetActive = (preset) => {
    const mn = preset.min;
    const mx = preset.max || MAX_PRICE;
    return draft[0] === mn && draft[1] === mx;
  };

  const handleMinBlur = () => {
    const v = Number(minInput.replace(/\D/g, "")) || 0;
    const mn = Math.max(0, Math.min(v, draft[1] - 50_000));
    setDraft([mn, draft[1]]);
    setMinInput(mn > 0 ? String(mn) : "");
    commit(mn, draft[1]);
  };
  const handleMaxBlur = () => {
    const v = Number(maxInput.replace(/\D/g, ""));
    if (!v) { setDraft([draft[0], MAX_PRICE]); setMaxInput(""); commit(draft[0], MAX_PRICE); return; }
    const mx = Math.min(MAX_PRICE, Math.max(v, draft[0] + 50_000));
    setDraft([draft[0], mx]);
    setMaxInput(String(mx));
    commit(draft[0], mx);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Preset quick-select */}
      <div className="flex flex-wrap gap-1.5">
        {PRICE_PRESETS.map(p => (
          <button key={p.label} className={`sp-preset ${isPresetActive(p) ? "on" : ""}`}
            onClick={() => applyPreset(p)}>{p.label}</button>
        ))}
      </div>

      {/* Dual-range slider */}
      <div className="px-1 py-3">
        <PriceRangeSlider
          min={0} max={MAX_PRICE}
          minVal={draft[0]} maxVal={draft[1]}
          onChange={(mn, mx) => {
            setDraft([mn, mx]);
            setMinInput(mn > 0 ? String(mn) : "");
            setMaxInput(mx < MAX_PRICE ? String(mx) : "");
          }}
          onCommit={() => commit(draft[0], draft[1])}
        />
      </div>

      {/* Manual inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-1 font-semibold">Từ</p>
          <input
            className="sp-price-input"
            type="text" inputMode="numeric"
            placeholder="0"
            value={minInput}
            onChange={e => setMinInput(e.target.value.replace(/\D/g,""))}
            onBlur={handleMinBlur}
            onKeyDown={e => e.key === "Enter" && handleMinBlur()}
          />
        </div>
        <div className="w-4 h-px bg-slate-300 mt-4 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-1 font-semibold">Đến</p>
          <input
            className="sp-price-input"
            type="text" inputMode="numeric"
            placeholder="Tối đa"
            value={maxInput}
            onChange={e => setMaxInput(e.target.value.replace(/\D/g,""))}
            onBlur={handleMaxBlur}
            onKeyDown={e => e.key === "Enter" && handleMaxBlur()}
          />
        </div>
      </div>

      {/* Display current range */}
      {(draft[0] > 0 || draft[1] < MAX_PRICE) && (
        <p className="text-[11px] text-blue-600 font-semibold text-center">
          {formatCurrency(draft[0])} – {draft[1] >= MAX_PRICE ? "Không giới hạn" : formatCurrency(draft[1])}
        </p>
      )}
    </div>
  );
}

// ─── Filter Sidebar ────────────────────────────────────────────────────
function FilterSidebar({ filters, setFilter, setFilters, categories, brands, onReset }) {
  const [open, setOpen] = useState({
    category: true, brand: false, price: true,
    size: true, color: false, rating: true, other: false,
  });
  const tog = (k) => setOpen(s => ({ ...s, [k]: !s[k] }));

  const [brandQ, setBrandQ] = useState("");
  const filteredBrands = brandQ.trim()
    ? brands.filter(b => b.name.toLowerCase().includes(brandQ.toLowerCase()))
    : brands;

  const activeSizes  = filters.sizes  ? filters.sizes.split(",").filter(Boolean)  : [];
  const activeColors = filters.colors ? filters.colors.split(",").filter(Boolean) : [];
  const toggleArr = (cur, val) => {
    const arr = cur ? cur.split(",").filter(Boolean) : [];
    return arr.includes(val) ? arr.filter(x => x !== val).join(",") : [...arr, val].join(",");
  };

  // badge counts per section
  const sizeBadge  = activeSizes.length;
  const colorBadge = activeColors.length;
  const priceBadge = (filters.minPrice || filters.maxPrice) ? 1 : 0;
  const brandBadge = filters.brand ? 1 : 0;
  const catBadge   = filters.category ? 1 : 0;
  const ratingBadge = filters.rating ? 1 : 0;
  const otherBadge = (filters.inStock === "1" ? 1 : 0) + (filters.discounts === "1" ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid #eff6ff", boxShadow: "0 4px 20px rgba(29,78,216,.06)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-50">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} style={{ color: "#1d4ed8" }} />
          <span className="font-black text-sm text-slate-800" style={{ fontFamily: "'Baloo 2',cursive" }}>Bộ lọc</span>
        </div>
        <button onClick={onReset}
          className="text-[11px] font-bold px-2 py-1 rounded-lg transition-colors hover:bg-blue-50"
          style={{ color: "#1d4ed8" }}>
          Xóa tất cả
        </button>
      </div>

      <div className="px-4 py-3">

        {/* Category */}
        <Section id="category" title="Danh mục" open={open.category} onToggle={tog} badge={catBadge}>
          <div className="flex flex-col">
            {[{ _id: "", name: "Tất cả" }, ...categories].map(c => {
              const val = c._id ? (c.slug || c._id) : "";
              const active = filters.category === val || (!filters.category && val === "");
              return (
                <button key={c._id || "all"}
                  className="text-left text-[13px] px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between group"
                  style={{ color: active ? "#1d4ed8" : "#374151", fontWeight: active ? 700 : 500,
                    background: active ? "rgba(219,234,254,.5)" : "transparent" }}
                  onClick={() => setFilter("category", val)}
                >
                  {c.name}
                  {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#1d4ed8" }} />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Brand */}
        <Section id="brand" title="Thương hiệu" open={open.brand} onToggle={tog} badge={brandBadge}>
          {brands.length > 5 && (
            <input className="sp-brand-search mb-2" placeholder="Tìm thương hiệu…"
              value={brandQ} onChange={e => setBrandQ(e.target.value)} />
          )}
          <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto pr-1">
            {filteredBrands.map(b => {
              const val = b.slug || b._id;
              const active = filters.brand === val;
              return (
                <label key={b._id} className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ border: active ? "none" : "1.5px solid #dbeafe",
                      background: active ? "#1d4ed8" : "#fff" }}
                    onClick={() => setFilter("brand", active ? "" : val)}>
                    {active && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-[13px] truncate" style={{ color: active ? "#1d4ed8" : "#374151", fontWeight: active ? 600 : 400 }}
                    onClick={() => setFilter("brand", active ? "" : val)}>
                    {b.name}
                  </span>
                </label>
              );
            })}
            {filteredBrands.length === 0 && <p className="text-[12px] text-slate-400 px-1 py-2">Không tìm thấy</p>}
          </div>
        </Section>

        {/* Price */}
        <Section id="price" title="Khoảng giá" open={open.price} onToggle={tog} badge={priceBadge}>
          <PriceSection
            urlMin={filters.minPrice}
            urlMax={filters.maxPrice}
            onCommit={(mn, mx) => setFilters({ minPrice: mn, maxPrice: mx })}
          />
        </Section>

        {/* Size */}
        <Section id="size" title="Kích cỡ" open={open.size} onToggle={tog} badge={sizeBadge}>
          <div className="flex flex-wrap gap-2">
            {SIZES.map(s => (
              <button key={s} className={`sp-sz ${activeSizes.includes(s) ? "on" : ""}`}
                onClick={() => setFilter("sizes", toggleArr(filters.sizes, s))}>{s}</button>
            ))}
          </div>
        </Section>

        {/* Color */}
        <Section id="color" title="Màu sắc" open={open.color} onToggle={tog} badge={colorBadge}>
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map(c => {
              const active = activeColors.includes(c.value);
              return (
                <button key={c.value} title={c.name}
                  className="sp-swatch relative flex items-center justify-center"
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: c.hex,
                    border: `2px solid ${active ? "#1d4ed8" : (c.border || "transparent")}`,
                    outline: active ? "2.5px solid #bfdbfe" : "none",
                    outlineOffset: "2px",
                  }}
                  onClick={() => setFilter("colors", toggleArr(filters.colors, c.value))}
                >
                  {active && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke={["white","yellow"].includes(c.value) ? "#1d4ed8" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          {activeColors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {activeColors.map(v => {
                const c = COLORS.find(x => x.value === v);
                return <span key={v} className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{c?.name || v}</span>;
              })}
            </div>
          )}
        </Section>

        {/* Rating */}
        <Section id="rating" title="Đánh giá" open={open.rating} onToggle={tog} badge={ratingBadge}>
          <div className="flex flex-col gap-1">
            {RATING_OPTIONS.map(r => {
              const active = Number(filters.rating) === r;
              return (
                <button key={r}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors"
                  style={{ background: active ? "rgba(219,234,254,.5)" : "transparent",
                    color: active ? "#1d4ed8" : "#374151", fontWeight: active ? 700 : 400 }}
                  onClick={() => setFilter("rating", active ? "" : r)}
                >
                  <Stars value={r} size={12} />
                  <span>trở lên</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#1d4ed8" }} />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Other */}
        <Section id="other" title="Khác" open={open.other} onToggle={tog} badge={otherBadge}>
          <div className="flex flex-col gap-2">
            {[
              { key: "inStock",   label: "Còn hàng",     icon: "🟢" },
              { key: "discounts", label: "Đang giảm giá", icon: "🏷️" },
            ].map(({ key, label, icon }) => {
              const active = filters[key] === "1";
              return (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer px-1 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ border: active ? "none" : "1.5px solid #dbeafe", background: active ? "#1d4ed8" : "#fff" }}
                    onClick={() => setFilter(key, active ? "" : "1")}>
                    {active && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-[13px] select-none" style={{ color: active ? "#1d4ed8" : "#374151", fontWeight: active ? 600 : 400 }}
                    onClick={() => setFilter(key, active ? "" : "1")}>
                    {icon} {label}
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();

  const getP = (k, def = "") => searchParams.get(k) ?? def;
  const filters = {
    q:         getP("q"),
    sort:      getP("sort", "created_at"),
    category:  getP("category"),
    brand:     getP("brand"),
    minPrice:  getP("minPrice"),
    maxPrice:  getP("maxPrice"),
    sizes:     getP("sizes"),
    colors:    getP("colors"),
    rating:    getP("rating"),
    inStock:   getP("inStock"),
    discounts: getP("discounts"),
    page:      getP("page", "1"),
  };

  // Atomic single-key setter
  const setFilter = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === "" || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
      if (key !== "page") next.set("page", "1");
      return next;
    });
  }, [setSearchParams]);

  // Atomic multi-key setter — fixes the race condition
  const setFilters = useCallback((updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === "" || value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      }
      next.set("page", "1");
      return next;
    });
  }, [setSearchParams]);

  const resetFilters = () => {
    setSearchParams(filters.q ? new URLSearchParams({ q: filters.q }) : new URLSearchParams());
  };

  // ── Search input (debounced) ──
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedQ = useDebounce(searchInput, 380);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilter("q", debouncedQ);
  }, [debouncedQ]);

  // Sync URL q → input when navigated from header
  useEffect(() => { setSearchInput(getP("q")); }, [searchParams.get("q")]);

  // ── Autocomplete suggestions ──
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const sugRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (sugRef.current && !sugRef.current.contains(e.target)) setShowSug(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!searchInput || searchInput.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await productApi.getAll({ q: searchInput, limit: 6 });
        setSuggestions((res?.products || []).slice(0, 6));
      } catch { setSuggestions([]); }
    }, 260);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Data ──
  const [products, setProducts]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);

  useEffect(() => {
    Promise.allSettled([homeService.fetchCategories(), homeService.fetchHomepage()])
      .then(([catR, homeR]) => {
        if (catR.status === "fulfilled" && Array.isArray(catR.value)) setCategories(catR.value);
        else if (homeR.status === "fulfilled" && homeR.value?.categories)  setCategories(homeR.value.categories);
        if (homeR.status === "fulfilled" && homeR.value?.brands) setBrands(homeR.value.brands);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { page: filters.page, limit: 20, sort: filters.sort || "created_at" };
        if (filters.q)        params.q          = filters.q;
        if (filters.category) params.category    = filters.category;
        if (filters.brand)    params.brand       = filters.brand;
        if (filters.minPrice) params.min_price   = filters.minPrice;
        if (filters.maxPrice) params.max_price   = filters.maxPrice;
        if (filters.rating)   params.rating_min  = filters.rating;
        if (filters.inStock === "1") params.in_stock = "1";

        const res = await productApi.getAll(params);
        if (cancelled) return;
        setProducts(res?.products || []);
        setTotal(res?.total || 0);
        setTotalPages(res?.total_pages || 1);
      } catch { if (!cancelled) setProducts([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [searchParams.toString()]);

  // ── Mobile filter ──
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Active chips ──
  const activeChips = [];
  if (filters.category) {
    const c = categories.find(x => (x.slug || x._id) === filters.category);
    activeChips.push({ label: c?.name || filters.category, key: "category" });
  }
  if (filters.brand) {
    const b = brands.find(x => (x.slug || x._id) === filters.brand);
    activeChips.push({ label: b?.name || filters.brand, key: "brand" });
  }
  if (filters.minPrice) activeChips.push({ label: `Từ ${formatCurrency(Number(filters.minPrice))}`, key: "minPrice" });
  if (filters.maxPrice) activeChips.push({ label: `Đến ${formatCurrency(Number(filters.maxPrice))}`, key: "maxPrice" });
  if (filters.sizes)    filters.sizes.split(",").filter(Boolean).forEach(s => activeChips.push({ label: `Size ${s}`, key: "sizes", val: s }));
  if (filters.colors)   filters.colors.split(",").filter(Boolean).forEach(c => {
    activeChips.push({ label: COLORS.find(x => x.value === c)?.name || c, key: "colors", val: c });
  });
  if (filters.rating)    activeChips.push({ label: `≥ ${filters.rating}★`, key: "rating" });
  if (filters.inStock === "1") activeChips.push({ label: "Còn hàng", key: "inStock" });
  if (filters.discounts === "1") activeChips.push({ label: "Giảm giá", key: "discounts" });

  const removeChip = ({ key, val }) => {
    if (val) {
      const arr = (filters[key] || "").split(",").filter(x => x && x !== val);
      setFilter(key, arr.join(","));
    } else setFilter(key, "");
  };

  const sidebarProps = { filters, setFilter, setFilters, categories, brands, onReset: resetFilters };

  return (
    <PageContainer wide>

      {/* ── Hero search bar ── */}
      <div className="relative mb-5" ref={sugRef}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full h-[52px] pl-11 pr-12 text-[15px] font-semibold bg-white rounded-2xl outline-none transition-all"
            style={{ border: "1.5px solid #dbeafe", boxShadow: "0 2px 16px rgba(29,78,216,.06)",
              fontFamily: "'Quicksand',sans-serif", color: "#1e293b" }}
            placeholder="Tìm kiếm sản phẩm, thương hiệu, danh mục…"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setShowSug(true); }}
            onFocus={() => setShowSug(true)}
            onKeyDown={e => { if (e.key === "Enter") { setShowSug(false); setFilter("q", searchInput); } }}
          />
          <style>{`input::placeholder{color:#94a3b8;font-family:'Quicksand',sans-serif;font-size:14px}`}</style>
          <AnimatePresence>
            {searchInput && (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                onClick={() => { setSearchInput(""); setFilter("q", ""); }}>
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSug && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: .15 }}
              className="absolute top-full left-0 right-0 z-50 bg-white rounded-2xl mt-1 overflow-hidden"
              style={{ border: "1.5px solid #dbeafe", boxShadow: "0 12px 40px rgba(29,78,216,.12)" }}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gợi ý</p>
              {suggestions.map(p => (
                <div key={p._id} className="sp-sug flex items-center gap-3"
                  onClick={() => { setShowSug(false); nav(`/products/${p.slug || p._id}`); }}>
                  {Array.isArray(p.images) && p.images[0]
                    ? <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-xl bg-blue-50 flex-shrink-0 flex items-center justify-center"><Package size={16} className="text-blue-300" /></div>
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] font-bold" style={{ color: "#1d4ed8" }}>{formatCurrency(p.base_price)}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Active filter chips ── */}
      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-1.5 mb-4 overflow-hidden">
            {activeChips.map((chip, i) => (
              <motion.span key={`${chip.key}-${chip.val || ""}`}
                initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: .8 }} transition={{ delay: i * .03 }}
                className="sp-tag">
                {chip.label}
                <button onClick={() => removeChip(chip)}><X size={11} /></button>
              </motion.span>
            ))}
            <button onClick={resetFilters}
              className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors underline decoration-dotted ml-1">
              Xóa tất cả
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar: mobile filter btn + result count + sort ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mobile filter button */}
          <motion.button whileTap={{ scale: .96 }}
            className="lg:hidden flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-bold transition-colors"
            style={{ background: "rgba(219,234,254,.7)", border: "1.5px solid #bfdbfe", color: "#1d4ed8" }}
            onClick={() => setMobileOpen(true)}>
            <SlidersHorizontal size={14} />
            Bộ lọc
            {activeChips.length > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                style={{ background: "#1d4ed8" }}>{activeChips.length}</span>
            )}
          </motion.button>

          <p className="text-[13px] text-slate-500">
            {loading
              ? <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin inline-block" /> Đang tìm…</span>
              : <><span className="font-bold text-slate-800">{total.toLocaleString()}</span> sản phẩm{filters.q && <> cho <span className="font-bold" style={{ color: "#1d4ed8" }}>"{filters.q}"</span></>}</>
            }
          </p>
        </div>

        {/* Sort */}
        <Select
          size="sm" radius="lg" className="w-44 flex-shrink-0"
          selectedKeys={new Set([filters.sort])}
          onSelectionChange={k => setFilter("sort", Array.from(k)[0])}
          variant="bordered"
          aria-label="Sắp xếp"
          startContent={<TrendingUp size={13} className="text-blue-400" />}
          classNames={{ trigger: "border-blue-100 hover:border-blue-300 h-9 text-[13px]" }}
        >
          {SORT_OPTIONS.map(o => <SelectItem key={o.key}>{o.label}</SelectItem>)}
        </Select>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-6 items-start">

        {/* Sidebar (desktop) */}
        <div className="hidden lg:block w-[240px] flex-shrink-0 sticky top-4 max-h-[calc(100vh-80px)] overflow-y-auto pb-4">
          <FilterSidebar {...sidebarProps} />
        </div>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)" }}>
                <Sparkles size={34} style={{ color: "#1d4ed8" }} />
              </motion.div>
              <p className="text-xl font-black text-slate-800 mb-2" style={{ fontFamily: "'Baloo 2',cursive" }}>
                Không tìm thấy sản phẩm
              </p>
              <p className="text-[14px] text-slate-500 mb-5 max-w-xs">
                Hãy thử từ khóa khác hoặc mở rộng bộ lọc để xem thêm kết quả.
              </p>
              {activeChips.length > 0 && (
                <Button radius="lg" variant="flat" color="primary" size="sm" onPress={resetFilters}>
                  Xóa bộ lọc
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={searchParams.toString()}
              className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
              variants={{ hidden: {}, show: { transition: { staggerChildren: .04 } } }}
              initial="hidden" animate="show"
            >
              {products.map(p => (
                <motion.div key={p._id}
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: .22 }}>
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex justify-center mt-10">
              <Pagination
                total={totalPages}
                page={Number(filters.page)}
                onChange={p => { setFilter("page", p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                color="primary" radius="lg" showShadow
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Mobile filter modal ── */}
      <Modal isOpen={mobileOpen} onClose={() => setMobileOpen(false)} size="full" scrollBehavior="inside"
        classNames={{ body: "p-0 pb-6" }}>
        <ModalContent>
          <ModalHeader className="font-black border-b border-blue-50" style={{ fontFamily: "'Baloo 2',cursive" }}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} style={{ color: "#1d4ed8" }} /> Bộ lọc
            </div>
          </ModalHeader>
          <ModalBody className="px-4">
            <FilterSidebar {...sidebarProps} />
          </ModalBody>
          <ModalFooter className="border-t border-blue-50">
            <Button color="primary" radius="lg" className="w-full font-bold" onPress={() => setMobileOpen(false)}>
              Xem {total.toLocaleString()} sản phẩm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
