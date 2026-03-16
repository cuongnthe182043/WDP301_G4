import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  Heart, Trash2, Star, SlidersHorizontal, X, Package,
  TrendingUp, Search, ShoppingCart, ShoppingBag, ChevronDown,
  Sparkles, PackageX, Flame,
} from "lucide-react";
import {
  Button, Skeleton, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import { userService } from "../../services/userService";
import { cartService } from "../../services/cartService";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../components/common/ToastProvider";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { formatCurrency } from "../../utils/formatCurrency";

const TOKEN_KEY = "DFS_TOKEN";

// ─── Inject CSS (matching SearchPage design system) ─────────────────
if (!document.getElementById("wl-css")) {
  const s = document.createElement("style");
  s.id = "wl-css";
  s.textContent = `
    /* Card hover */
    .wl-card { transition: transform .22s cubic-bezier(.4,0,.2,1), box-shadow .22s; }
    .wl-card:hover { transform: translateY(-5px); box-shadow: 0 16px 48px rgba(29,78,216,.13) !important; }
    .wl-card:hover .wl-img { transform: scale(1.06); }
    .wl-img { transition: transform .35s cubic-bezier(.4,0,.2,1); }

    /* Filter sections */
    .wl-section { border-bottom: 1px solid #eff6ff; }
    .wl-section:last-child { border-bottom: none; }

    /* Preset chip */
    .wl-preset { padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600;
      border:1.5px solid #dbeafe; color:#374151; background:#f8faff; cursor:pointer; transition:all .15s; }
    .wl-preset.on  { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
    .wl-preset:not(.on):hover { border-color:#93c5fd; color:#1d4ed8; background:#eff6ff; }

    /* Active filter tag */
    .wl-tag { display:inline-flex; align-items:center; gap:5px; padding:4px 10px 4px 12px;
      border-radius:20px; background:rgba(219,234,254,.8); border:1.5px solid #bfdbfe;
      font-size:12px; font-weight:700; color:#1d4ed8; }
    .wl-tag button { display:flex; align-items:center; transition:color .12s; }
    .wl-tag button:hover { color:#1e3a8a; }

    /* Card badge */
    .wl-badge { position:absolute; top:8px; left:8px; padding:2px 8px; border-radius:6px;
      font-size:10px; font-weight:800; letter-spacing:.02em; }

    /* Remove button fade */
    .wl-card .wl-remove { opacity:0; transition: opacity .2s; }
    .wl-card:hover .wl-remove { opacity:1; }

    @keyframes wl-fade-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
    .wl-section-body { animation: wl-fade-in .18s ease; overflow:hidden; }
  `;
  document.head.appendChild(s);
}

// ─── Constants ──────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "default",    label: "Mặc định" },
  { key: "price_asc",  label: "Giá tăng dần" },
  { key: "price_desc", label: "Giá giảm dần" },
  { key: "rating",     label: "Đánh giá cao" },
  { key: "sold",       label: "Bán chạy nhất" },
  { key: "name_asc",   label: "Tên A → Z" },
];

const PRICE_PRESETS = [
  { label: "Dưới 200k",   min: 0,         max: 200_000 },
  { label: "200k – 500k", min: 200_000,   max: 500_000 },
  { label: "500k – 1tr",  min: 500_000,   max: 1_000_000 },
  { label: "Trên 1tr",    min: 1_000_000, max: Infinity },
];

const RATING_OPTIONS = [5, 4, 3, 2];

// ─── Helpers ────────────────────────────────────────────────────────
const fmtSold = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}k`;
  return String(num);
};

const fmtReview = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

function StarRow({ value = 0, size = 10 }) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  const filled = Math.round(v);
  return (
    <span className="flex items-center gap-[1px]" aria-label={`${v.toFixed(1)} / 5 sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < filled ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </span>
  );
}

// ─── Section accordion (SearchPage style) ───────────────────────────
function Section({ title, id, open, onToggle, children, badge }) {
  return (
    <div className="wl-section pb-4 mb-1">
      <button
        className="flex items-center justify-between w-full py-2 text-[13px] font-bold text-slate-700 group"
        onClick={() => onToggle(id)}
      >
        <span className="flex items-center gap-2">
          {title}
          {badge > 0 && (
            <span
              className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
              style={{ background: "#1d4ed8" }}
            >
              {badge}
            </span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────
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

// ─── Product Card (homepage style + wishlist actions) ────────────────
function WishlistProductCard({ product, onRemove, removing, onBuyNow, buying, index = 0 }) {
  const nav = useNavigate();
  const href = product.slug ? `/product/${product.slug}` : `/product/${product._id}`;
  const name = product.name || "Sản phẩm";
  const img = Array.isArray(product.images) ? product.images[0] : "";

  const basePrice = Number(product.base_price ?? 0) || 0;
  const salePrice = Number(product.price ?? basePrice) || 0;
  const discountPct = Number(product.discount_percent ?? 0) || 0;
  const showStrikethrough = discountPct > 0 && basePrice > 0 && basePrice !== salePrice;

  const rating = Number(product.rating_avg ?? 0) || 0;
  const reviewCount = Number(product.rating_count ?? 0) || 0;
  const sold = Number(product.sold_count ?? 0) || 0;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
      }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      layout
      className="h-full"
    >
      <div
        className="wl-card h-full flex flex-col rounded-2xl overflow-hidden bg-white"
        style={{ border: "1.5px solid #eff6ff", boxShadow: "0 2px 12px rgba(29,78,216,.04)" }}
      >
        {/* ── Thumbnail ── */}
        <div
          className="relative aspect-square overflow-hidden bg-gray-50 flex-shrink-0 cursor-pointer"
          onClick={() => nav(href)}
        >
          {img ? (
            <img
              src={img}
              alt={name}
              loading="lazy"
              decoding="async"
              className="wl-img w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100">
              <PackageX size={32} className="text-gray-300" />
              <span className="text-[10px] text-gray-400 font-medium">Chưa có ảnh</span>
            </div>
          )}

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Discount badge — top-left */}
          {discountPct > 0 && (
            <div className="wl-badge bg-gradient-to-r from-red-500 to-rose-500 text-white font-black shadow-md leading-none text-[11px] px-2 py-0.5 rounded-full">
              -{discountPct}%
            </div>
          )}

          {/* Hot badge — top-left (if no discount) */}
          {sold > 100 && !discountPct && (
            <div className="wl-badge flex items-center gap-0.5 text-white font-black shadow-md leading-none"
              style={{ background: "linear-gradient(90deg,#f97316,#ef4444)" }}>
              <Flame size={8} className="fill-white stroke-none" />
              Hot
            </div>
          )}

          {/* Featured badge */}
          {product.is_featured && !discountPct && sold <= 100 && (
            <span className="wl-badge text-white" style={{ background: "linear-gradient(90deg,#1d4ed8,#2563eb)" }}>
              Nổi bật
            </span>
          )}

          {/* Remove button (top-right, appears on hover) */}
          <button
            className="wl-remove absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition-all z-10"
            onClick={(e) => { e.stopPropagation(); onRemove(product._id); }}
            disabled={removing === product._id}
            aria-label="Xóa khỏi yêu thích"
          >
            {removing === product._id ? (
              <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>

        {/* ── Info ── */}
        <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3 gap-1.5">
          {/* Product name */}
          <Link to={href} className="group">
            <p
              className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors duration-200"
              title={name}
            >
              {name}
            </p>
          </Link>

          {/* Rating row */}
          {rating > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <StarRow value={rating} />
              <span className="text-[11px] font-bold text-gray-700 leading-none tabular-nums">
                {rating.toFixed(1)}
              </span>
              {reviewCount > 0 && (
                <span className="text-[11px] text-gray-400 leading-none">
                  ({fmtReview(reviewCount)})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={10} className="text-gray-200 fill-gray-200" />
              ))}
              <span className="text-[10px] text-gray-400 ml-0.5">Chưa có đánh giá</span>
            </div>
          )}

          {/* Sold count */}
          <div className="flex items-center justify-between">
            {sold > 0 ? (
              <div className="flex items-center gap-1">
                <ShoppingBag size={11} className="text-blue-400 flex-shrink-0" />
                <span className="text-[11px] text-gray-500 font-medium">
                  {fmtSold(sold)} đã bán
                </span>
              </div>
            ) : (
              <span />
            )}
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-black text-[14px] leading-none" style={{ color: "#1d4ed8" }}>
              {formatCurrency(salePrice)}
            </span>
            {showStrikethrough && (
              <span className="text-[11px] text-gray-400 line-through leading-none">
                {formatCurrency(basePrice)}
              </span>
            )}
          </div>

          {/* Buy now button */}
          <div className="mt-auto pt-2">
            <Button
              size="sm"
              color="primary"
              radius="lg"
              className="w-full font-bold text-[12px] h-8"
              startContent={<ShoppingCart size={13} />}
              isLoading={buying === product._id}
              onPress={(e) => { e?.stopPropagation?.(); onBuyNow(product); }}
            >
              Mua ngay
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Filter Sidebar ─────────────────────────────────────────────────
function FilterSidebar({ searchQuery, setSearchQuery, sortKey, setSortKey, priceRange, setPriceRange, minRating, setMinRating, clearFilters, activeFilterCount }) {
  const [open, setOpen] = useState({ sort: true, price: true, rating: true });
  const tog = (k) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  const priceBadge = priceRange ? 1 : 0;
  const ratingBadge = minRating > 0 ? 1 : 0;
  const sortBadge = sortKey !== "default" ? 1 : 0;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid #eff6ff", boxShadow: "0 4px 20px rgba(29,78,216,.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-50">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} style={{ color: "#1d4ed8" }} />
          <span className="font-black text-sm text-slate-800">Bộ lọc</span>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-[11px] font-bold px-2 py-1 rounded-lg transition-colors hover:bg-blue-50"
            style={{ color: "#1d4ed8" }}
          >
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {/* Search input */}
        <div className="mb-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search size={13} className="text-slate-400" />
            </div>
            <input
              type="text"
              className="w-full h-9 pl-8 pr-8 text-[13px] font-medium bg-white rounded-xl outline-none transition-all"
              style={{ border: "1.5px solid #dbeafe", color: "#1e293b" }}
              placeholder="Tìm trong yêu thích…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setSearchQuery("")}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <Section id="sort" title="Sắp xếp" open={open.sort} onToggle={tog} badge={sortBadge}>
          <div className="flex flex-col">
            {SORT_OPTIONS.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <button
                  key={opt.key}
                  className="text-left text-[13px] px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between"
                  style={{
                    color: active ? "#1d4ed8" : "#374151",
                    fontWeight: active ? 700 : 500,
                    background: active ? "rgba(219,234,254,.5)" : "transparent",
                  }}
                  onClick={() => setSortKey(active ? "default" : opt.key)}
                >
                  {opt.label}
                  {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#1d4ed8" }} />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Price range */}
        <Section id="price" title="Khoảng giá" open={open.price} onToggle={tog} badge={priceBadge}>
          <div className="flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((preset, idx) => {
              const active = priceRange && priceRange.min === preset.min && priceRange.max === preset.max;
              return (
                <button
                  key={idx}
                  className={`wl-preset ${active ? "on" : ""}`}
                  onClick={() => setPriceRange(active ? null : { min: preset.min, max: preset.max })}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {priceRange && (
            <p className="text-[11px] text-blue-600 font-semibold text-center mt-2">
              {formatCurrency(priceRange.min)} – {priceRange.max === Infinity ? "Không giới hạn" : formatCurrency(priceRange.max)}
            </p>
          )}
        </Section>

        {/* Rating */}
        <Section id="rating" title="Đánh giá" open={open.rating} onToggle={tog} badge={ratingBadge}>
          <div className="flex flex-col gap-1">
            {RATING_OPTIONS.map((r) => {
              const active = minRating === r;
              return (
                <button
                  key={r}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors"
                  style={{
                    background: active ? "rgba(219,234,254,.5)" : "transparent",
                    color: active ? "#1d4ed8" : "#374151",
                    fontWeight: active ? 700 : 400,
                  }}
                  onClick={() => setMinRating(active ? 0 : r)}
                >
                  <StarRow value={r} size={12} />
                  <span>trở lên</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#1d4ed8" }} />}
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────
export default function Wishlist() {
  const nav = useNavigate();
  const toast = useToast();
  const { refresh: refreshCart } = useCart?.() || {};
  const isLoggedIn = !!localStorage.getItem(TOKEN_KEY);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [buying, setBuying] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("default");
  const [priceRange, setPriceRange] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await userService.getWishlist();
      setItems(list || []);
    } catch (e) {
      toast.error(e?.message || "Không tải được danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    load();
  }, [isLoggedIn, load]);

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await userService.removeFromWishlist(productId);
      setItems((prev) => prev.filter((p) => p._id !== productId));
      toast.success("Đã xóa khỏi danh sách yêu thích");
    } catch (e) {
      toast.error(e?.message || "Không xóa được");
    } finally {
      setRemoving(null);
    }
  };

  const handleBuyNow = async (product) => {
    setBuying(product._id);
    try {
      await cartService.add({
        product_id: product._id,
        variant_id: product.default_variant_id || undefined,
        qty: 1,
      });
      refreshCart?.();
      toast.success("Đã thêm vào giỏ hàng");
      nav("/cart");
    } catch {
      toast.info("Vui lòng chọn phân loại sản phẩm");
      nav(`/products/${product.slug || product._id}`);
    } finally {
      setBuying(null);
    }
  };

  // ─── Derived: filter + sort ───────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => p.name?.toLowerCase().includes(q));
    }

    if (priceRange) {
      result = result.filter((p) => {
        const price = p.price ?? p.base_price ?? 0;
        if (priceRange.max === Infinity) return price >= priceRange.min;
        return price >= priceRange.min && price <= priceRange.max;
      });
    }

    if (minRating > 0) {
      result = result.filter((p) => (p.rating_avg || 0) >= minRating);
    }

    switch (sortKey) {
      case "price_asc":
        result.sort((a, b) => (a.price ?? a.base_price ?? 0) - (b.price ?? b.base_price ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price ?? b.base_price ?? 0) - (a.price ?? a.base_price ?? 0));
        break;
      case "rating":
        result.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
        break;
      case "sold":
        result.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
        break;
      case "name_asc":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
        break;
      default:
        break;
    }

    return result;
  }, [items, searchQuery, sortKey, priceRange, minRating]);

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (priceRange ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (sortKey !== "default" ? 1 : 0);

  const clearFilters = () => {
    setSearchQuery("");
    setSortKey("default");
    setPriceRange(null);
    setMinRating(0);
  };

  // ─── Active chips ───────────────────────────────────────────────
  const activeChips = useMemo(() => {
    const chips = [];
    if (searchQuery.trim()) chips.push({ label: `"${searchQuery}"`, key: "search" });
    if (sortKey !== "default") chips.push({ label: SORT_OPTIONS.find((o) => o.key === sortKey)?.label, key: "sort" });
    if (priceRange) {
      const preset = PRICE_PRESETS.find((p) => p.min === priceRange.min && p.max === priceRange.max);
      chips.push({ label: preset?.label || "Khoảng giá", key: "price" });
    }
    if (minRating > 0) chips.push({ label: `≥ ${minRating}★`, key: "rating" });
    return chips;
  }, [searchQuery, sortKey, priceRange, minRating]);

  const removeChip = (chip) => {
    switch (chip.key) {
      case "search": setSearchQuery(""); break;
      case "sort": setSortKey("default"); break;
      case "price": setPriceRange(null); break;
      case "rating": setMinRating(0); break;
    }
  };

  // ─── Stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (items.length === 0) return null;
    const withDiscount = items.filter((p) => p.discount_percent > 0).length;
    return { withDiscount };
  }, [items]);

  const sidebarProps = { searchQuery, setSearchQuery, sortKey, setSortKey, priceRange, setPriceRange, minRating, setMinRating, clearFilters, activeFilterCount };

  return (
    <PageContainer wide>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black text-slate-800"
          >
            Sản phẩm yêu thích
          </motion.h1>
          {stats && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[13px] text-slate-500">
                <span className="font-bold text-slate-800">{items.length}</span> sản phẩm
              </span>
              {stats.withDiscount > 0 && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}
                >
                  {stats.withDiscount} đang giảm giá
                </span>
              )}
            </div>
          )}
        </div>

        {!loading && items.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Sort select — desktop */}
            <div className="hidden sm:block">
              <Select
                size="sm"
                radius="lg"
                className="w-44 flex-shrink-0"
                selectedKeys={new Set([sortKey])}
                onSelectionChange={(k) => setSortKey(Array.from(k)[0] || "default")}
                variant="bordered"
                aria-label="Sắp xếp"
                startContent={<TrendingUp size={13} className="text-blue-400" />}
                classNames={{ trigger: "border-blue-100 hover:border-blue-300 h-9 text-[13px]" }}
              >
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.key}>{o.label}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Mobile filter button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="lg:hidden flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-bold transition-colors"
              style={{ background: "rgba(219,234,254,.7)", border: "1.5px solid #bfdbfe", color: "#1d4ed8" }}
              onClick={() => setMobileOpen(true)}
            >
              <SlidersHorizontal size={14} />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                  style={{ background: "#1d4ed8" }}
                >
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
          </div>
        )}
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 mb-4 overflow-hidden"
          >
            {activeChips.map((chip, i) => (
              <motion.span
                key={chip.key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.03 }}
                className="wl-tag"
              >
                {chip.label}
                <button onClick={() => removeChip(chip)}>
                  <X size={11} />
                </button>
              </motion.span>
            ))}
            <button
              onClick={clearFilters}
              className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors underline decoration-dotted ml-1"
            >
              Xóa tất cả
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex gap-6">
          <div className="hidden lg:block w-[240px] flex-shrink-0">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : !isLoggedIn ? (
        <EmptyState
          icon={Heart}
          title="Chưa đăng nhập"
          description="Đăng nhập để xem danh sách yêu thích của bạn."
          actionLabel="Đăng nhập"
          onAction={() => nav("/login?returnUrl=/wishlist")}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Chưa có sản phẩm yêu thích"
          description="Nhấn biểu tượng trái tim trên trang sản phẩm để lưu vào danh sách yêu thích."
          actionLabel="Khám phá sản phẩm"
          onAction={() => nav("/")}
        />
      ) : (
        <div className="flex gap-6 items-start">
          {/* Filter sidebar — desktop */}
          <div className="hidden lg:block w-[240px] flex-shrink-0 sticky top-4 max-h-[calc(100vh-80px)] overflow-y-auto pb-4">
            <FilterSidebar {...sidebarProps} />
          </div>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {/* Result count */}
            {activeFilterCount > 0 && (
              <p className="text-[13px] text-slate-500 mb-3">
                <span className="font-bold text-slate-800">{filteredItems.length}</span> kết quả
              </p>
            )}

            {filteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)" }}
                >
                  <Sparkles size={34} style={{ color: "#1d4ed8" }} />
                </motion.div>
                <p className="text-xl font-black text-slate-800 mb-2">Không tìm thấy sản phẩm</p>
                <p className="text-[14px] text-slate-500 mb-5 max-w-xs">
                  Hãy thử từ khóa khác hoặc mở rộng bộ lọc để xem thêm kết quả.
                </p>
                <Button radius="lg" variant="flat" color="primary" size="sm" onPress={clearFilters}>
                  Xóa bộ lọc
                </Button>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                initial="hidden"
                animate="show"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((product, idx) => (
                    <WishlistProductCard
                      key={product._id}
                      product={product}
                      onRemove={handleRemove}
                      removing={removing}
                      onBuyNow={handleBuyNow}
                      buying={buying}
                      index={idx}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Mobile filter modal */}
      <Modal
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        size="full"
        scrollBehavior="inside"
        classNames={{ body: "p-0 pb-6" }}
      >
        <ModalContent>
          <ModalHeader className="font-black border-b border-blue-50">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} style={{ color: "#1d4ed8" }} /> Bộ lọc
            </div>
          </ModalHeader>
          <ModalBody className="px-4">
            <FilterSidebar {...sidebarProps} />
          </ModalBody>
          <ModalFooter className="border-t border-blue-50">
            <Button
              color="primary"
              radius="lg"
              className="w-full font-bold"
              onPress={() => setMobileOpen(false)}
            >
              Xem {filteredItems.length} sản phẩm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
