import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Chip, Skeleton, Divider, Progress,
} from "@heroui/react";
import {
  ShoppingCart, Zap, Star, ChevronLeft, ChevronRight, Ruler, Package,
  AlertCircle, CheckCircle2, Heart, Sparkles, Save, RefreshCw,
} from "lucide-react";
import { productService } from "../../services/productService";
import { cartService } from "../../services/cartService";
import { userService } from "../../services/userService";
import { useCart } from "../../context/CartContext";
import { formatCurrency } from "../../utils/formatCurrency";
import { useToast } from "../../components/common/ToastProvider";
import ProductCard from "../../components/home/ProductCard.jsx";

const TOKEN_KEY = "DFS_TOKEN";

/* Fly-to-cart animation lives in Cart.css */
import "../../assets/styles/Cart.css";

/* ─────────────────────── Pure utility / business logic ─────────────────────── */
const norm = (s) => String(s ?? "").trim().toLowerCase();
const prettyKey = (k) => String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const getVarAttrs = (v) => {
  const va = v?.variant_attributes ?? v?.attributes ?? {};
  return va instanceof Map ? Object.fromEntries(va) : typeof va === "object" ? va : {};
};
const rawVal = (x) => {
  if (x == null) return "";
  if (typeof x === "object") return x.value ?? x.label ?? x.name ?? x.code ?? "";
  return String(x);
};
const formatSold = (n) => {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${n}`;
};

function buildVariantOptionGroups(variants) {
  const valuesByKey = new Map();
  for (const v of variants || []) {
    const attrs = getVarAttrs(v);
    for (const [k, val] of Object.entries(attrs)) {
      const r = rawVal(val);
      if (!r) continue;
      if (!valuesByKey.has(k)) valuesByKey.set(k, new Set());
      valuesByKey.get(k).add(r);
    }
  }
  const orderedKeys = Array.from(valuesByKey.keys()).sort();
  const optionGroups = {};
  for (const k of orderedKeys) {
    optionGroups[k] = Array.from(valuesByKey.get(k) || [])
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((v) => ({ value: v, label: v }));
  }
  return { optionGroups, orderedKeys };
}

function findBestVariant(variants, selections) {
  if (!variants?.length) return null;
  let best = null, bestScore = -1;
  for (const v of variants) {
    const va = getVarAttrs(v);
    let s = 0;
    for (const [k, sel] of Object.entries(selections || {})) {
      if (sel && norm(rawVal(va?.[k])) === norm(sel)) s++;
    }
    if ((v.stock ?? 0) > 0) s += 0.5;
    if (s > bestScore) { best = v; bestScore = s; }
  }
  return best;
}

function resolveOnPick(variants, current, key, value) {
  const list = variants.filter((v) => norm(rawVal(getVarAttrs(v)?.[key])) === norm(value));
  if (!list.length) return current;
  let best = null, bestScore = -1;
  for (const v of list) {
    const va = getVarAttrs(v);
    let s = 0;
    for (const [k2, val2] of Object.entries(current)) {
      if (k2 === key || !val2) continue;
      if (norm(rawVal(va?.[k2])) === norm(val2)) s++;
    }
    if ((v.stock ?? 0) > 0) s += 0.5;
    if (s > bestScore) { best = v; bestScore = s; }
  }
  const next = { ...current, [key]: value };
  const bestAttrs = getVarAttrs(best) || {};
  for (const [k, v] of Object.entries(bestAttrs)) next[k] = rawVal(v);
  return next;
}

function buildDisabledMap(variants, key, selections) {
  const map = new Map();
  const values = new Set();
  for (const v of variants || []) {
    const val = rawVal(getVarAttrs(v)?.[key]);
    if (val) values.add(val);
  }
  for (const val of values) {
    let ok = false;
    for (const v of variants || []) {
      const va = getVarAttrs(v);
      if (norm(rawVal(va?.[key])) !== norm(val)) continue;
      let match = true;
      for (const [k2, sel] of Object.entries(selections || {})) {
        if (!sel || k2 === key) continue;
        if (norm(rawVal(va?.[k2])) !== norm(sel)) { match = false; break; }
      }
      if (match && (v.stock ?? 0) > 0) { ok = true; break; }
    }
    map.set(String(val), !ok);
  }
  return map;
}

function pickSizeByHeightWeight(rows = [], height, weight) {
  const inRange = rows.filter((r) => {
    const m = r.measurements || {};
    const okH = (m.height_min == null || height >= m.height_min) && (m.height_max == null || height <= m.height_max);
    const okW = (m.weight_min == null || weight >= m.weight_min) && (m.weight_max == null || weight <= m.weight_max);
    return okH && okW;
  });
  if (inRange.length) return inRange[0].label;
  let best = null, bestDist = Infinity;
  for (const r of rows) {
    const m = r.measurements || {};
    const hc = m.height_min != null && m.height_max != null ? (m.height_min + m.height_max) / 2 : height;
    const wc = m.weight_min != null && m.weight_max != null ? (m.weight_min + m.weight_max) / 2 : weight;
    const d = Math.hypot((height - hc) || 0, (weight - wc) || 0);
    if (d < bestDist) { best = r; bestDist = d; }
  }
  return best?.label || null;
}

function refineByMeasurements(rows = [], baseLabel, extras = {}) {
  const { chest, waist, hip, shoulder } = extras;
  const hasExtra = [chest, waist, hip, shoulder].some((v) => Number(v) > 0);
  if (!hasExtra) return baseLabel;
  let best = null, bestScore = Infinity;
  for (const r of rows) {
    const m = r.measurements || {};
    const score =
      (chest ? Math.abs((m.chest || chest) - chest) : 0) +
      (waist ? Math.abs((m.waist || waist) - waist) : 0) +
      (hip ? Math.abs((m.hip || hip) - hip) : 0) +
      (shoulder ? Math.abs((m.shoulder || shoulder) - shoulder) : 0);
    if (score < bestScore) { best = r; bestScore = score; }
  }
  return best?.label || baseLabel;
}

function fitLabelVi(fit) {
  return { perfect: "Rất phù hợp", good: "Phù hợp", acceptable: "Tạm ổn", poor: "Không phù hợp" }[fit] || fit;
}

/* ─────────────────────── Star component ─────────────────────── */
function Stars({ value = 0, size = 16 }) {
  const v = Number(value || 0);
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  const arr = Array.from({ length: 5 }, (_, i) => (i < full ? "full" : i === full && half ? "half" : "empty"));
  const color = { full: "#f59e0b", half: "#f59e0b", empty: "#d1d5db" };
  return (
    <div className="flex gap-0.5" aria-label={`${v.toFixed(1)} / 5 sao`}>
      {arr.map((t, i) => (
        <Star key={i} size={size} fill={color[t]} color={color[t]} strokeWidth={0} />
      ))}
    </div>
  );
}

/* ─────────────────────── Skeleton loading ─────────────────────── */
function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="w-20 h-20 rounded-xl" />)}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-7 w-4/5 rounded-xl" />
          <Skeleton className="h-5 w-2/5 rounded-xl" />
          <Skeleton className="h-9 w-2/5 rounded-xl" />
          <Skeleton className="h-5 w-full rounded-xl" />
          <Skeleton className="h-5 w-4/5 rounded-xl" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="h-12 flex-1 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════ */
export default function ProductDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { refresh: refreshCartBadge } = useCart();
  const mainImgRef = useRef(null);

  const [detail, setDetail] = useState(null);
  const [summary, setSummary] = useState({ average: 0, count: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [reviews, setReviews] = useState({ total: 0, items: [] });
  const [related, setRelated] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [selectedVar, setSelectedVar] = useState(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sizeOpen, setSizeOpen] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [shoulder, setShoulder] = useState("");
  const [sizeSuggest, setSizeSuggest] = useState(null);
  const [sizeScores, setSizeScores] = useState([]);
  const [sizeResultFit, setSizeResultFit] = useState(null);
  const [sizeLoading, setSizeLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [rvStar, setRvStar] = useState("all");
  const [rvPage, setRvPage] = useState(1);
  const RV_LIMIT = 6;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  /* ── Data loading ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(""); setSelectedAttrs({}); setSelectedVar(null);
        const [d, s, r, rel] = await Promise.all([
          productService.getDetail(idOrSlug),
          productService.getRatingsSummary?.(idOrSlug),
          productService.getReviews?.(idOrSlug, 1, RV_LIMIT),
          productService.getRelated?.(idOrSlug, 12),
        ]);
        if (!alive) return;
        setDetail(d ?? null);
        // Track recently viewed + check wishlist (fire-and-forget, only for logged-in users)
        if (d?.product?._id && localStorage.getItem(TOKEN_KEY)) {
          userService.addRecentlyViewed(d.product._id).catch(() => {});
          userService.getWishlist().then((list) => {
            if (!alive) return;
            setIsWishlisted((list || []).some((wl) => wl._id === d.product._id || wl === d.product._id));
          }).catch(() => {});
        }
        setSummary(s ?? { average: 0, count: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
        setReviews(r ?? { total: 0, items: [] });
        setRelated(rel ?? []);
        const first = (d?.variants || []).find((v) => (v.stock ?? 0) > 0) || d?.variants?.[0];
        if (first) {
          const firstAttrs = getVarAttrs(first);
          const firstRaw = Object.fromEntries(Object.entries(firstAttrs).map(([k, v]) => [k, rawVal(v)]));
          setSelectedAttrs(firstRaw); setSelectedVar(first);
          if (typeof first.stock === "number" && first.stock > 0) setQty((q) => Math.min(q, first.stock));
        }
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || "Không tải được chi tiết sản phẩm");
      } finally { if (alive) setLoading(false); }
    })();
    setActiveIndex(0);
    return () => { alive = false; };
  }, [idOrSlug]);

  useEffect(() => {
    const variants = detail?.variants || [];
    if (!variants.length) { setSelectedVar(null); return; }
    const best = findBestVariant(variants, selectedAttrs);
    setSelectedVar(best);
    if (best && typeof best.stock === "number" && best.stock >= 1) {
      setQty((q) => Math.min(Math.max(1, q), best.stock));
    }
    setActiveIndex(0);
  }, [detail?.variants, selectedAttrs]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await productService.getReviews?.(idOrSlug, rvPage, RV_LIMIT, rvStar === "all" ? undefined : rvStar);
        if (!alive || !res) return;
        setReviews(res);
      } catch {}
    })();
    return () => { alive = false; };
  }, [rvStar, rvPage, idOrSlug]);

  /* ── Computed values ── */
  const variantsMemo = detail?.variants || [];
  const { optionGroups, orderedKeys } = useMemo(() => buildVariantOptionGroups(variantsMemo), [variantsMemo]);

  const p = detail?.product || {};
  const brand = detail?.brand;
  const category = detail?.category;
  const flash_sale = detail?.flash_sale;
  const sizeChart = detail?.size_chart;

  const rawImages = selectedVar?.images?.length ? selectedVar.images : p.images || [];
  const images = Array.isArray(rawImages)
    ? rawImages.map((x) => (typeof x === "string" ? x : x?.url || x?.secure_url || x?.path || ""))
        .map((s) => String(s || "").trim()).filter(Boolean)
        .filter((url, i, arr) => arr.indexOf(url) === i)
    : [];
  const mainImg = images[activeIndex] || images[0] || "";

  const priceMin = p.price_min ?? p.base_price ?? 0;
  const priceMax = p.price_max ?? p.base_price ?? 0;
  const displayPrice = selectedVar ? selectedVar.price : variantsMemo.length ? priceMin : p.base_price;
  const compareAt = selectedVar?.compare_at_price ?? (variantsMemo.length ? priceMax : null);
  const hasDiscount = !!(compareAt && compareAt > displayPrice);
  const flashBadge = flash_sale?.discount_percent ? `${flash_sale.discount_percent}% OFF` : null;

  const di = p.detail_info || {};
  const specEntries = [
    di.origin_country ? ["Xuất xứ", di.origin_country] : null,
    Array.isArray(di.materials) && di.materials.length ? ["Chất liệu", di.materials.join(", ")] : null,
    di.material_ratio && Object.keys(di.material_ratio).length
      ? ["Tỉ lệ chất liệu", Object.entries(di.material_ratio).map(([k, v]) => `${k}: ${v}%`).join(", ")] : null,
    Array.isArray(di.seasons) && di.seasons.length ? ["Mùa phù hợp", di.seasons.join(", ")] : null,
    di.customization_available != null ? ["Tuỳ chỉnh", di.customization_available ? "Có" : "Không"] : null,
    di.care_instructions ? ["Hướng dẫn bảo quản", di.care_instructions] : null,
  ].filter(Boolean);
  const va = getVarAttrs(selectedVar);
  Object.entries(va).forEach(([k, v]) => specEntries.push([prettyKey(k), String(rawVal(v))]));

  const sizeHeaders = useMemo(() => {
    const rows = Array.isArray(sizeChart?.rows) ? sizeChart.rows : [];
    return Array.from(new Set(rows.flatMap((r) => Object.keys(r.measurements || {}))));
  }, [sizeChart]);

  const onPick = (k, v) => setSelectedAttrs((prev) => resolveOnPick(variantsMemo, prev, k, v));

  const canSuggest = Number(height) > 0 && Number(weight) > 0 && Array.isArray(sizeChart?.rows) && sizeChart.rows.length > 0;

  // Load saved body profile when modal opens
  useEffect(() => {
    if (!sizeOpen) return;
    if (!localStorage.getItem(TOKEN_KEY)) return;
    setProfileLoading(true);
    userService.getBodyProfile().then((profile) => {
      if (!profile) return;
      if (profile.height && !height) setHeight(String(profile.height));
      if (profile.weight && !weight) setWeight(String(profile.weight));
      if (profile.chest  && !chest)  setChest(String(profile.chest));
      if (profile.waist  && !waist)  setWaist(String(profile.waist));
      if (profile.hip    && !hip)    setHip(String(profile.hip));
      if (profile.shoulder && !shoulder) setShoulder(String(profile.shoulder));
    }).catch(() => {}).finally(() => setProfileLoading(false));
  }, [sizeOpen]);

  const saveProfile = async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    setProfileSaving(true);
    try {
      await userService.saveBodyProfile({
        height:   Number(height)   || undefined,
        weight:   Number(weight)   || undefined,
        chest:    Number(chest)    || undefined,
        waist:    Number(waist)    || undefined,
        hip:      Number(hip)      || undefined,
        shoulder: Number(shoulder) || undefined,
      });
      toast.success("Đã lưu số đo cơ thể!");
    } catch {
      toast.error("Không lưu được số đo");
    } finally { setProfileSaving(false); }
  };

  const runSuggest = async () => {
    if (!canSuggest) return;
    setSizeLoading(true);
    try {
      const result = await productService.sizeMatch(p._id, {
        height:   Number(height)   || undefined,
        weight:   Number(weight)   || undefined,
        chest:    Number(chest)    || undefined,
        waist:    Number(waist)    || undefined,
        hip:      Number(hip)      || undefined,
        shoulder: Number(shoulder) || undefined,
      });
      const label = result?.recommended_size || null;
      setSizeSuggest(label);
      setSizeScores(result?.all_sizes || []);
      setSizeResultFit(result?.fit || null);
      if (label && (p.variant_dimensions || []).map(norm).includes("size")) {
        setSelectedAttrs((prev) => ({ ...prev, size: label }));
      }
      // Auto-save profile after successful recommendation
      if (localStorage.getItem(TOKEN_KEY)) {
        userService.saveBodyProfile({
          height: Number(height) || undefined, weight: Number(weight) || undefined,
          chest:  Number(chest)  || undefined, waist:  Number(waist)  || undefined,
          hip:    Number(hip)    || undefined, shoulder: Number(shoulder) || undefined,
        }).catch(() => {});
      }
    } catch {
      // Fallback to local computation when API unavailable
      let label = pickSizeByHeightWeight(sizeChart?.rows || [], Number(height), Number(weight));
      label = refineByMeasurements(sizeChart?.rows || [], label, {
        chest: Number(chest) || 0, waist: Number(waist) || 0,
        hip: Number(hip) || 0, shoulder: Number(shoulder) || 0,
      });
      setSizeSuggest(label || null);
      setSizeScores([]);
      setSizeResultFit(null);
      if (label && (p.variant_dimensions || []).map(norm).includes("size")) {
        setSelectedAttrs((prev) => ({ ...prev, size: label }));
      }
    } finally {
      setSizeLoading(false);
    }
  };

  /* ── Fly-to-cart animation ── */
  const flyToCart = () => {
    try {
      const imgEl = mainImgRef.current;
      const cartEl = document.getElementById("cartIcon");
      if (!imgEl || !cartEl) return;
      const imgRect = imgEl.getBoundingClientRect();
      const cartRect = cartEl.getBoundingClientRect();
      const ghost = imgEl.cloneNode();
      ghost.className = "fly-img";
      ghost.style.left = `${imgRect.left}px`;
      ghost.style.top = `${imgRect.top}px`;
      ghost.style.width = `${imgRect.width}px`;
      ghost.style.height = `${imgRect.height}px`;
      document.body.appendChild(ghost);
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${cartRect.left - imgRect.left}px, ${cartRect.top - imgRect.top}px) scale(0.25)`;
        ghost.style.opacity = "0.2";
      });
      setTimeout(() => ghost.remove(), 700);
    } catch {}
  };

  /* ── Cart actions ── */
  const addToCart = async () => {
    if (!selectedVar) return toast.error("Vui lòng chọn tổ hợp hợp lệ.");
    if ((selectedVar.stock ?? 0) <= 0) return toast.error("Biến thể đã hết hàng.");
    if (qty > (selectedVar.stock ?? 0)) return toast.error("Không đủ tồn kho.");
    setAdding(true);
    try {
      await cartService.add({ product_id: p._id, variant_id: selectedVar._id || selectedVar.id, qty });
      flyToCart();
      toast.success("Đã thêm vào giỏ hàng!");
      refreshCartBadge();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Không thêm được vào giỏ";
      if ([401, 403].includes(e?.response?.status)) {
        return navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
      }
      toast.error(msg);
    } finally { setAdding(false); }
  };

  const buyNow = () => {
    if (!selectedVar) return toast.error("Vui lòng chọn tổ hợp hợp lệ.");
    if ((selectedVar.stock ?? 0) <= 0) return toast.error("Biến thể đã hết hàng.");
    if (qty > (selectedVar.stock ?? 0)) return toast.error("Không đủ tồn kho.");
    if (!localStorage.getItem(TOKEN_KEY)) return navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
    navigate("/checkout", {
      state: {
        buy_now_items: [{ productId: p._id, variantId: selectedVar._id || selectedVar.id, quantity: qty }],
      },
    });
  };

  const toggleWishlist = async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return navigate(`/login?returnUrl=${encodeURIComponent(location.pathname)}`);
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await userService.removeFromWishlist(p._id);
        setIsWishlisted(false);
        toast.success("Đã xóa khỏi danh sách yêu thích");
      } else {
        await userService.addToWishlist(p._id);
        setIsWishlisted(true);
        toast.success("Đã thêm vào danh sách yêu thích!");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Không cập nhật được danh sách yêu thích");
    } finally {
      setWishlistLoading(false);
    }
  };

  const ratingValue = summary.average || p.rating_avg || 0;
  const ratingCount = summary.count || p.rating_count || 0;
  const sold = p.sold_count ?? 0;

  const outOfStock = selectedVar ? (selectedVar.stock ?? 0) <= 0 : false;
  const actionDisabled = !selectedVar || outOfStock || qty > (selectedVar?.stock ?? Infinity) || adding;

  /* ─── Early returns ─── */
  if (loading) return <ProductDetailSkeleton />;

  if (error) return (
    <div className="max-w-6xl mx-auto px-4 py-20 text-center">
      <AlertCircle size={48} className="mx-auto mb-4 text-danger" />
      <p className="text-danger font-semibold">{error}</p>
      <Button className="mt-4" variant="bordered" onPress={() => navigate(-1)}>Quay lại</Button>
    </div>
  );

  if (!p._id) return (
    <div className="max-w-6xl mx-auto px-4 py-20 text-center">
      <Package size={48} className="mx-auto mb-4 text-default-300" />
      <p className="text-default-500 font-semibold">Không tìm thấy sản phẩm</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 py-8"
    >
      {/* ══ MAIN GRID: Gallery + Info ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-10">

        {/* ── Gallery ── */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-default-50 border border-default-100">
            <AnimatePresence mode="wait">
              {mainImg ? (
                <motion.img
                  key={mainImg}
                  ref={mainImgRef}
                  src={mainImg}
                  alt={p.name}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-default-300 text-sm">
                  Không có ảnh
                </div>
              )}
            </AnimatePresence>

            {/* Badges */}
            {flashBadge && (
              <Chip color="danger" variant="solid" size="sm" className="absolute top-3 left-3 font-bold shadow-md">
                ⚡ {flashBadge}
              </Chip>
            )}
            {!flashBadge && hasDiscount && (
              <Chip color="danger" variant="solid" size="sm" className="absolute top-3 left-3 font-bold shadow-md">
                SALE
              </Chip>
            )}

            {/* Wishlist button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              aria-label={isWishlisted ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md z-10 transition-colors hover:bg-white"
            >
              {wishlistLoading ? (
                <span className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
              ) : (
                <Heart
                  size={18}
                  fill={isWishlisted ? "#f31260" : "none"}
                  color={isWishlisted ? "#f31260" : "#6b7280"}
                  strokeWidth={2}
                />
              )}
            </motion.button>

            {/* Gallery nav for mobile */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-default-700 hover:bg-white transition-colors md:hidden"
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-default-700 hover:bg-white transition-colors md:hidden"
                  aria-label="Ảnh tiếp"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              {images.map((img, idx) => (
                <button
                  key={`${img}#${idx}`}
                  onClick={() => setActiveIndex(idx)}
                  aria-current={idx === activeIndex ? "true" : "false"}
                  className={`flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    idx === activeIndex
                      ? "border-primary shadow-md"
                      : "border-default-200 hover:border-default-400"
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col gap-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-default-400">
            {category?.name && <span>{category.name}</span>}
            {brand?.name && <><span>/</span><span>{brand.name}</span></>}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-black text-default-900 leading-tight">{p.name}</h1>

          {/* Rating + sold */}
          <div className="flex items-center gap-4 flex-wrap">
            {ratingValue > 0 && (
              <div className="flex items-center gap-1.5">
                <Stars value={ratingValue} size={16} />
                <span className="text-sm font-bold text-default-700">{ratingValue.toFixed(1)}</span>
                <span className="text-sm text-default-400">({ratingCount} đánh giá)</span>
              </div>
            )}
            {sold > 0 && (
              <span className="text-sm text-default-400">• Đã bán <b className="text-default-700">{formatSold(sold)}</b></span>
            )}
            {p.sku && <span className="text-xs text-default-400 border border-default-200 rounded-lg px-2 py-0.5">SKU: {p.sku}</span>}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 py-3 border-y border-default-100">
            <span className="text-3xl font-black text-primary">{formatCurrency(displayPrice || 0)}</span>
            {hasDiscount && (
              <span className="text-lg text-default-400 line-through font-medium">{formatCurrency(compareAt)}</span>
            )}
            {!selectedVar && variantsMemo.length > 0 && (
              <span className="text-sm text-default-400">
                ({formatCurrency(priceMin)} – {formatCurrency(priceMax)})
              </span>
            )}
          </div>

          {/* Variants */}
          {!!orderedKeys.length && (
            <div className="space-y-4">
              {orderedKeys.map((key) => {
                const options = optionGroups[key] || [];
                const selected = selectedAttrs[key] ?? "";
                const disabledMap = buildDisabledMap(variantsMemo, key, selectedAttrs);
                return (
                  <div key={key}>
                    <p className="text-sm font-bold text-default-700 mb-2">{prettyKey(key)}</p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt) => {
                        const isActive = norm(opt.value) === norm(selected);
                        const isDisabled = disabledMap.get(String(opt.value)) === true;
                        return (
                          <motion.button
                            key={`${key}:${opt.value}`}
                            whileHover={!isDisabled ? { scale: 1.05 } : {}}
                            whileTap={!isDisabled ? { scale: 0.97 } : {}}
                            disabled={isDisabled}
                            onClick={() => onPick(key, opt.value)}
                            className={`px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                              isActive
                                ? "border-primary bg-primary text-white shadow-md"
                                : isDisabled
                                ? "border-default-200 text-default-300 cursor-not-allowed line-through"
                                : "border-default-200 text-default-700 hover:border-primary hover:text-primary"
                            }`}
                          >
                            {opt.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Stock indicator */}
              {selectedVar && (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${
                  (selectedVar.stock ?? 0) > 0 ? "text-success" : "text-danger"
                }`}>
                  {(selectedVar.stock ?? 0) > 0 ? (
                    <><CheckCircle2 size={15} /> Còn hàng ({selectedVar.stock})</>
                  ) : (
                    <><AlertCircle size={15} /> Hết hàng</>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Size guide */}
          <button
            onClick={() => setSizeOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-75 transition-opacity self-start"
          >
            <Sparkles size={15} /> AI gợi ý size
            {sizeSuggest && (
              <Chip size="sm" color="success" variant="flat" className="ml-1">
                Đề xuất: {sizeSuggest}
              </Chip>
            )}
          </button>

          {/* Qty + Actions */}
          <div className="space-y-3 pt-2">
            {/* Quantity selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-default-700">Số lượng:</span>
              <div className="flex items-center gap-1 border border-default-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="w-9 h-9 flex items-center justify-center text-default-600 hover:bg-default-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  max={selectedVar?.stock ?? 999999}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value) || 1);
                    setQty(selectedVar?.stock != null ? Math.min(n, selectedVar.stock) : n);
                  }}
                  className="w-12 h-9 text-center text-sm font-bold bg-transparent border-x border-default-200 outline-none"
                />
                <button
                  onClick={() => setQty((q) => (selectedVar?.stock != null ? Math.min(q + 1, selectedVar.stock) : q + 1))}
                  disabled={selectedVar?.stock != null && qty >= selectedVar.stock}
                  className="w-9 h-9 flex items-center justify-center text-default-600 hover:bg-default-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  fullWidth
                  variant="bordered"
                  color="primary"
                  size="lg"
                  radius="xl"
                  startContent={<ShoppingCart size={18} />}
                  onPress={addToCart}
                  isDisabled={actionDisabled}
                  isLoading={adding}
                  className="font-bold border-2"
                >
                  Thêm vào giỏ
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  fullWidth
                  color="primary"
                  size="lg"
                  radius="xl"
                  startContent={<Zap size={18} />}
                  onPress={buyNow}
                  isDisabled={actionDisabled}
                  isLoading={adding}
                  className="font-bold shadow-md"
                >
                  Mua ngay
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Meta tags */}
          {(brand || category) && (
            <div className="flex gap-2 flex-wrap pt-2">
              {brand?.name && <Chip size="sm" variant="flat" color="default">🏷 {brand.name}</Chip>}
              {category?.name && <Chip size="sm" variant="flat" color="default">📁 {category.name}</Chip>}
            </div>
          )}
        </div>
      </div>

      {/* ══ SIZE ADVISOR + SIZE CHART ══ */}
      <section id="size-section" className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-default-800 flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> Gợi ý size bằng AI
              </p>
              <p className="text-sm text-default-500 mt-0.5">
                {sizeSuggest
                  ? <>Size phù hợp nhất: <b className="text-primary">{sizeSuggest}</b> {sizeResultFit && <span className="text-xs text-default-400">({fitLabelVi(sizeResultFit)})</span>}</>
                  : "Nhập số đo để AI gợi ý size phù hợp chính xác nhất"}
              </p>
            </div>
            <Button size="sm" color="primary" variant="flat" radius="lg" onPress={() => setSizeOpen(true)}
              startContent={<Ruler size={14} />}>
              {sizeSuggest ? "Cập nhật số đo" : "Nhập số đo →"}
            </Button>
          </div>

          {/* Size score bars (shown after recommendation) */}
          {sizeScores.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {sizeScores.map((s) => {
                const score = s.fit_score ?? 0;
                const isBest = s.label === sizeSuggest;
                const color = score >= 80 ? "success" : score >= 60 ? "warning" : "danger";
                return (
                  <div
                    key={s.label}
                    className={`rounded-xl p-3 border transition-all ${isBest ? "border-primary bg-white shadow-md" : "border-blue-100 bg-white/60"}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-black ${isBest ? "text-primary" : "text-default-700"}`}>
                        {s.label}
                        {isBest && <span className="ml-1 text-[10px] font-bold text-primary">✓ Tốt nhất</span>}
                      </span>
                      <span className={`text-xs font-bold text-${color}`}>{score}%</span>
                    </div>
                    <Progress value={score} color={color} size="sm" radius="full" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {Array.isArray(sizeChart?.rows) && sizeChart.rows.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-default-200">
            <table className="w-full text-sm">
              <thead className="bg-default-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-default-700">Size</th>
                  {sizeHeaders.map((k) => (
                    <th key={k} className="text-left px-4 py-2.5 font-bold text-default-700">{prettyKey(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeChart.rows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-default-50/50"}>
                    <td className="px-4 py-2.5 font-black text-primary">{r.label}</td>
                    {sizeHeaders.map((k) => (
                      <td key={k} className="px-4 py-2.5 text-default-700">{r.measurements?.[k] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ══ SPECS ══ */}
      {!!specEntries.length && (
        <section className="mb-8">
          <h3 className="text-lg font-black text-default-900 mb-4">Chi tiết sản phẩm</h3>
          <div className="rounded-2xl border border-default-200 overflow-hidden">
            {specEntries.map(([k, v], i) => (
              <div key={i} className={`flex gap-4 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-white" : "bg-default-50/50"}`}>
                <span className="w-40 flex-shrink-0 font-semibold text-default-600">{k}</span>
                <span className="text-default-800">{String(v)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ DESCRIPTION ══ */}
      {p.description && (
        <section className="mb-8">
          <h3 className="text-lg font-black text-default-900 mb-4">Mô tả sản phẩm</h3>
          <div
            className="prose prose-sm max-w-none text-default-700 bg-white border border-default-200 rounded-2xl p-5"
            dangerouslySetInnerHTML={{ __html: p.description }}
          />
        </section>
      )}

      {/* ══ REVIEWS ══ */}
      <section className="mb-10">
        <h2 className="text-lg font-black text-default-900 mb-5">Đánh giá sản phẩm</h2>

        {/* Summary */}
        <div className="flex items-start gap-6 bg-default-50 rounded-2xl p-5 mb-5">
          <div className="text-center flex-shrink-0">
            <div className="text-4xl font-black text-default-900">{ratingValue?.toFixed(1)}</div>
            <Stars value={ratingValue} size={18} />
            <div className="text-xs text-default-400 mt-1">{ratingCount} đánh giá</div>
          </div>
          <div className="flex-1">
            {/* Star filter chips */}
            <div className="flex flex-wrap gap-2">
              {["all", 5, 4, 3, 2, 1].map((f) => (
                <button
                  key={f}
                  onClick={() => { setRvStar(String(f)); setRvPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    String(rvStar) === String(f)
                      ? "bg-primary text-white border-primary"
                      : "border-default-200 text-default-600 hover:border-primary hover:text-primary"
                  }`}
                >
                  {f === "all" ? "Tất cả" : `${f} ★ (${summary.histogram?.[f] || 0})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Review list */}
        {reviews.items?.length ? (
          <>
            <div className="space-y-4">
              {reviews.items.map((r) => (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-default-100 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {r.author_avatar ? (
                        <img src={r.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {(r.author_name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-default-800">{r.author_name || "Người dùng"}</p>
                        <Stars value={r.rating || 0} size={13} />
                      </div>
                    </div>
                    {r.createdAt && (
                      <span className="text-xs text-default-400 flex-shrink-0">
                        {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>
                  {(r.comment || r.content) && (
                    <p className="text-sm text-default-600 leading-relaxed mt-1">{r.comment || r.content}</p>
                  )}
                  {r.images?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.images.map((img, i) => (
                        <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-default-200">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {r.size_feedback && r.size_feedback !== "unknown" && (
                    <Chip size="sm" variant="flat" color="secondary" className="mt-2">
                      {r.size_feedback === "fit" ? "Vừa vặn" : r.size_feedback === "tight" ? "Chật" : "Rộng"}
                    </Chip>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <Button
                size="sm" variant="bordered" radius="lg"
                isDisabled={rvPage <= 1}
                onPress={() => setRvPage((p) => Math.max(1, p - 1))}
                startContent={<ChevronLeft size={14} />}
              >
                Trước
              </Button>
              <span className="text-sm text-default-500">Trang {rvPage}</span>
              <Button
                size="sm" variant="bordered" radius="lg"
                isDisabled={(reviews.items?.length || 0) < RV_LIMIT}
                onPress={() => setRvPage((p) => p + 1)}
                endContent={<ChevronRight size={14} />}
              >
                Sau
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-default-400 bg-default-50 rounded-2xl">
            <Star size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có đánh giá phù hợp bộ lọc.</p>
          </div>
        )}
      </section>

      {/* ══ RELATED PRODUCTS ══ */}
      {!!related?.length && (
        <section>
          <h2 className="text-lg font-black text-default-900 mb-5">Sản phẩm liên quan</h2>
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {related.map((rp, i) => (
              <ProductCard key={rp._id || rp.id} item={rp} index={i} />
            ))}
          </motion.div>
        </section>
      )}

      {/* ══ SIZE ADVISOR MODAL ══ */}
      <Modal isOpen={sizeOpen} onOpenChange={(open) => { setSizeOpen(open); }} radius="2xl" size="lg" backdrop="blur" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)" }}>
                    <Sparkles size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-default-900 leading-tight">AI Gợi ý size</p>
                    <p className="text-xs text-default-400 font-normal">Nhập số đo để nhận gợi ý chính xác</p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                {profileLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : (
                  <>
                    {/* Measurement inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Chiều cao (cm)", placeholder: "VD: 165", val: height, setter: setHeight, required: true },
                        { label: "Cân nặng (kg)",  placeholder: "VD: 55",  val: weight, setter: setWeight, required: true },
                        { label: "Vòng ngực (cm)", placeholder: "VD: 86",  val: chest,  setter: setChest },
                        { label: "Vòng eo (cm)",   placeholder: "VD: 68",  val: waist,  setter: setWaist },
                        { label: "Vòng mông (cm)", placeholder: "VD: 90",  val: hip,    setter: setHip },
                        { label: "Ngang vai (cm)", placeholder: "VD: 38",  val: shoulder, setter: setShoulder },
                      ].map(({ label, placeholder, val, setter, required }) => (
                        <Input
                          key={label}
                          label={label + (required ? " *" : "")}
                          placeholder={placeholder}
                          type="number"
                          min="0"
                          value={val}
                          onValueChange={setter}
                          size="sm"
                          radius="lg"
                          variant="bordered"
                          color={required && !Number(val) ? "default" : "primary"}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-default-400">* Bắt buộc. Số đo khác giúp AI gợi ý chính xác hơn.</p>

                    {/* Result — shown after scoring */}
                    {sizeSuggest && sizeScores.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                        <Divider className="my-3" />
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 size={16} className="text-success" />
                          <p className="font-bold text-sm text-default-800">
                            Đề xuất cho bạn: <span className="text-primary">{sizeSuggest}</span>
                            {sizeResultFit && (
                              <Chip size="sm" color={sizeResultFit === "perfect" ? "success" : sizeResultFit === "good" ? "primary" : "warning"} variant="flat" className="ml-2 text-xs">
                                {fitLabelVi(sizeResultFit)}
                              </Chip>
                            )}
                          </p>
                        </div>
                        <div className="space-y-2.5">
                          {sizeScores.map((s) => {
                            const score = s.fit_score ?? 0;
                            const isBest = s.label === sizeSuggest;
                            const color = score >= 80 ? "success" : score >= 60 ? "warning" : "danger";
                            return (
                              <div key={s.label} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isBest ? "bg-primary/5 border border-primary/20" : ""}`}>
                                <span className={`w-10 text-sm font-black flex-shrink-0 ${isBest ? "text-primary" : "text-default-600"}`}>
                                  {s.label}
                                </span>
                                <div className="flex-1">
                                  <Progress value={score} color={color} size="sm" radius="full" />
                                </div>
                                <span className={`text-xs font-bold w-10 text-right text-${color}`}>{score}%</span>
                                {isBest && <CheckCircle2 size={13} className="text-primary flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* No chart available */}
                    {!Array.isArray(sizeChart?.rows) || sizeChart.rows.length === 0 ? (
                      <div className="text-center py-4 text-default-400 text-sm">
                        <Ruler size={28} className="mx-auto mb-2 opacity-30" />
                        <p>Sản phẩm này chưa có bảng size để gợi ý.</p>
                      </div>
                    ) : null}
                  </>
                )}
              </ModalBody>
              <ModalFooter className="flex gap-2 flex-wrap">
                <Button
                  variant="flat"
                  radius="lg"
                  size="sm"
                  startContent={<Save size={13} />}
                  isLoading={profileSaving}
                  isDisabled={!Number(height) && !Number(weight)}
                  onPress={saveProfile}
                  className="font-bold"
                >
                  Lưu số đo
                </Button>
                <div className="flex-1" />
                <Button variant="light" radius="lg" onPress={onClose}>Đóng</Button>
                <Button
                  color="primary"
                  radius="lg"
                  startContent={<Sparkles size={14} />}
                  onPress={runSuggest}
                  isDisabled={!canSuggest || sizeLoading}
                  isLoading={sizeLoading}
                  className="font-bold"
                >
                  Gợi ý size
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
