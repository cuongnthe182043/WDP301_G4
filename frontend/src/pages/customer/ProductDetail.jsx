import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Chip, Skeleton, Divider, Progress,
} from "@heroui/react";
import {
  ShoppingCart, Zap, Star, ChevronLeft, ChevronRight, Ruler, Package,
  AlertCircle, CheckCircle2, Heart, Sparkles, Save, RefreshCw,
  Store, MessageCircle, BadgeCheck, Users, ExternalLink,
} from "lucide-react";
import { productService } from "../../services/productService";
import { cartService } from "../../services/cartService";
import { userService } from "../../services/userService";
import chatService from "../../services/chatService";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
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

function fitLabel(fit, t) {
  const map = {
    perfect: t("product.fit_perfect"),
    good: t("product.fit_good"),
    acceptable: t("product.fit_acceptable"),
    poor: t("product.fit_poor"),
  };
  return map[fit] || fit;
}

/* ─────────────────────── Star component ─────────────────────── */
function Stars({ value = 0, size = 16 }) {
  const { t } = useTranslation();
  const v = Number(value || 0);
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  const arr = Array.from({ length: 5 }, (_, i) => (i < full ? "full" : i === full && half ? "half" : "empty"));
  const color = { full: "#f59e0b", half: "#f59e0b", empty: "#d1d5db" };
  return (
    <div className="flex gap-0.5" aria-label={t("product.stars_aria", { value: v.toFixed(1) })}>
      {arr.map((type, i) => (
        <Star key={i} size={size} fill={color[type]} color={color[type]} strokeWidth={0} />
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
  const { t } = useTranslation();
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { refresh: refreshCartBadge } = useCart();
  const { isAuthenticated } = useAuth();
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
  const [sizeReason, setSizeReason] = useState(null);    // "xgboost_model" | "rule_based"
  const [sizeFeatures, setSizeFeatures] = useState([]);  // features used by XGBoost
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
        setError(e?.response?.data?.message || e?.message || t("product.load_error"));
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
  const shopInfo = detail?.shop_info || null;

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
    di.origin_country ? [t("product.spec_origin"), di.origin_country] : null,
    Array.isArray(di.materials) && di.materials.length ? [t("product.spec_materials"), di.materials.join(", ")] : null,
    di.material_ratio && Object.keys(di.material_ratio).length
      ? [t("product.spec_material_ratio"), Object.entries(di.material_ratio).map(([k, v]) => `${k}: ${v}%`).join(", ")] : null,
    Array.isArray(di.seasons) && di.seasons.length ? [t("product.spec_seasons"), di.seasons.join(", ")] : null,
    di.customization_available != null ? [t("product.spec_customization"), di.customization_available ? t("common.yes") : t("common.no")] : null,
    di.care_instructions ? [t("product.spec_care"), di.care_instructions] : null,
  ].filter(Boolean);
  const va = getVarAttrs(selectedVar);
  Object.entries(va).forEach(([k, v]) => specEntries.push([prettyKey(k), String(rawVal(v))]));

  const sizeHeaders = useMemo(() => {
    const rows = Array.isArray(sizeChart?.rows) ? sizeChart.rows : [];
    return Array.from(new Set(rows.flatMap((r) => Object.keys(r.measurements || {}))));
  }, [sizeChart]);

  const onPick = (k, v) => setSelectedAttrs((prev) => resolveOnPick(variantsMemo, prev, k, v));

  const canSuggest = Number(height) > 0 && Number(weight) > 0;

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
      toast.success(t("product.body_saved"));
    } catch {
      toast.error(t("product.body_save_error"));
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
      if (result?.reason === "no_chart") {
        toast.error(t("product.no_size_chart"));
        return;
      }
      const label = result?.recommended_size || null;
      setSizeSuggest(label);
      setSizeScores(result?.all_sizes || []);
      setSizeResultFit(result?.fit || null);
      setSizeReason(result?.reason || null);
      setSizeFeatures(result?.features_used || []);
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
      setSizeReason("rule_based");
      setSizeFeatures([]);
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

  /* ── Chat with shop ── */
  const handleChat = async () => {
    if (!isAuthenticated) return navigate(`/login?returnUrl=${encodeURIComponent(location.pathname)}`);
    const shopId = shopInfo?._id || p.shop_id;
    if (!shopId) return toast.error("Sản phẩm này không có shop bán");
    try {
      const context = p._id ? {
        type: "product",
        data: {
          _id:   p._id,
          name:  p.name,
          image: images[0] || "",
          price: displayPrice,
          slug:  p.slug || idOrSlug,
        },
      } : null;
      const conv = await chatService.startConversation(shopId, context);
      window.dispatchEvent(new CustomEvent("openChat", { detail: { conversation: conv, context } }));
    } catch (e) {
      toast.error("Không thể mở chat");
    }
  };

  /* ── Cart actions ── */
  const addToCart = async () => {
    if (!selectedVar) return toast.error(t("product.select_variant"));
    if ((selectedVar.stock ?? 0) <= 0) return toast.error(t("product.variant_out_of_stock"));
    if (qty > (selectedVar.stock ?? 0)) return toast.error(t("product.insufficient_stock"));
    setAdding(true);
    try {
      await cartService.add({ product_id: p._id, variant_id: selectedVar._id || selectedVar.id, qty });
      flyToCart();
      toast.success(t("product.added_to_cart"));
      refreshCartBadge();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || t("product.add_to_cart_error");
      if ([401, 403].includes(e?.response?.status)) {
        return navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
      }
      toast.error(msg);
    } finally { setAdding(false); }
  };

  const buyNow = () => {
    if (!selectedVar) return toast.error(t("product.select_variant"));
    if ((selectedVar.stock ?? 0) <= 0) return toast.error(t("product.variant_out_of_stock"));
    if (qty > (selectedVar.stock ?? 0)) return toast.error(t("product.insufficient_stock"));
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
        toast.success(t("product.removed_from_wishlist"));
      } else {
        await userService.addToWishlist(p._id);
        setIsWishlisted(true);
        toast.success(t("product.added_to_wishlist"));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || t("product.wishlist_error"));
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
      <Button className="mt-4" variant="bordered" onPress={() => navigate(-1)}>{t("common.back")}</Button>
    </div>
  );

  if (!p._id) return (
    <div className="max-w-6xl mx-auto px-4 py-20 text-center">
      <Package size={48} className="mx-auto mb-4 text-default-300" />
      <p className="text-default-500 font-semibold">{t("product.no_products")}</p>
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
                  {t("product.no_image")}
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
              aria-label={isWishlisted ? t("product.remove_from_wishlist_aria") : t("product.add_to_wishlist_aria")}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm flex items-center justify-center shadow-md z-10 transition-colors hover:bg-white dark:hover:bg-zinc-800"
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-default-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors md:hidden"
                  aria-label={t("product.prev_image")}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-default-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors md:hidden"
                  aria-label={t("product.next_image")}
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
                <span className="text-sm text-default-400">({ratingCount} {t("product.reviews")})</span>
              </div>
            )}
            {sold > 0 && (
              <span className="text-sm text-default-400">• {t("product.sold_prefix")} <b className="text-default-700">{formatSold(sold)}</b> {t("product.sold_suffix")}</span>
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
                    <><CheckCircle2 size={15} /> {t("product.in_stock")} ({selectedVar.stock})</>
                  ) : (
                    <><AlertCircle size={15} /> {t("product.out_of_stock")}</>
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
            <Sparkles size={15} /> {t("product.ai_size")}
            {sizeSuggest && (
              <Chip size="sm" color="success" variant="flat" className="ml-1">
                {t("product.size_recommend_label", { size: sizeSuggest })}
              </Chip>
            )}
          </button>

          {/* Qty + Actions */}
          <div className="space-y-3 pt-2">
            {/* Quantity selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-default-700">{t("product.quantity")}:</span>
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
                  {t("product.add_to_cart")}
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
                  {t("product.buy_now")}
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

          {/* ── Mini shop bar ── */}
          {(shopInfo || p.shop_id) && (
            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-default-100 dark:border-zinc-700">
              {/* Logo — only clickable when we have the slug */}
              <div
                className={`w-9 h-9 rounded-lg overflow-hidden bg-default-100 dark:bg-zinc-700 border border-default-100 flex-shrink-0 ${shopInfo?.shop_slug ? "cursor-pointer" : ""}`}
                onClick={() => shopInfo?.shop_slug && navigate(`/shops/${shopInfo.shop_slug}`)}
              >
                {shopInfo?.shop_logo
                  ? <img src={shopInfo.shop_logo} alt={shopInfo.shop_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Store size={16} className="text-default-300" /></div>
                }
              </div>
              {/* Shop name / stats */}
              <div
                className={`flex-1 min-w-0 ${shopInfo?.shop_slug ? "cursor-pointer" : ""}`}
                onClick={() => shopInfo?.shop_slug && navigate(`/shops/${shopInfo.shop_slug}`)}
              >
                <p className="text-sm font-bold text-default-900 dark:text-zinc-100 flex items-center gap-1 truncate">
                  {shopInfo?.shop_name || "Shop"}
                  <BadgeCheck size={13} className="text-primary flex-shrink-0" />
                </p>
                {shopInfo?.rating_avg > 0 && (
                  <p className="text-xs text-default-400 flex items-center gap-1">
                    <Star size={10} fill="#f59e0b" color="#f59e0b" strokeWidth={0} />
                    {Number(shopInfo.rating_avg).toFixed(1)}
                    {shopInfo.total_products > 0 && <span>· {shopInfo.total_products} sp</span>}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                color="primary"
                variant="bordered"
                radius="lg"
                startContent={<MessageCircle size={14} />}
                onPress={handleChat}
                className="font-semibold flex-shrink-0"
              >
                Chat
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ══ SHOP CARD ══ */}
      {shopInfo && (
        <div className="mb-8 rounded-2xl border border-default-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div
              className="w-16 h-16 rounded-xl overflow-hidden bg-default-100 dark:bg-zinc-700 flex-shrink-0 border border-default-100 dark:border-zinc-600 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate(`/shops/${shopInfo.shop_slug}`)}
            >
              {shopInfo.shop_logo
                ? <img src={shopInfo.shop_logo} alt={shopInfo.shop_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Store size={24} className="text-default-300" /></div>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div
                className="flex items-center gap-1.5 cursor-pointer group w-fit"
                onClick={() => navigate(`/shops/${shopInfo.shop_slug}`)}
              >
                <span className="font-black text-base text-default-900 dark:text-zinc-100 group-hover:text-primary transition-colors truncate">
                  {shopInfo.shop_name}
                </span>
                <BadgeCheck size={15} className="text-primary flex-shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-default-500">
                {shopInfo.rating_avg > 0 && (
                  <span className="flex items-center gap-1">
                    <Star size={11} fill="#f59e0b" color="#f59e0b" strokeWidth={0} />
                    <b className="text-default-700">{Number(shopInfo.rating_avg).toFixed(1)}</b>
                    <span>Đánh giá</span>
                  </span>
                )}
                {shopInfo.total_products > 0 && (
                  <span className="flex items-center gap-1">
                    <Package size={11} />
                    {shopInfo.total_products.toLocaleString("vi-VN")} sản phẩm
                  </span>
                )}
                {shopInfo.followers > 0 && (
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {shopInfo.followers.toLocaleString("vi-VN")} theo dõi
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="bordered"
                radius="lg"
                startContent={<MessageCircle size={14} />}
                onPress={handleChat}
                className="font-semibold"
              >
                Chat ngay
              </Button>
              <Button
                size="sm"
                variant="flat"
                radius="lg"
                startContent={<ExternalLink size={14} />}
                onPress={() => navigate(`/shops/${shopInfo.shop_slug}`)}
                className="font-semibold"
              >
                Xem shop
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SIZE ADVISOR + SIZE CHART ══ */}
      <section id="size-section" className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-800 border border-blue-100 dark:border-zinc-700 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-default-800 flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> {t("product.ai_size_heading")}
              </p>
              <p className="text-sm text-default-500 mt-0.5">
                {sizeSuggest
                  ? <>{t("product.best_size_label")}: <b className="text-primary">{sizeSuggest}</b> {sizeResultFit && <span className="text-xs text-default-400">({fitLabel(sizeResultFit, t)})</span>}</>
                  : t("product.enter_measurements_hint")}
              </p>
            </div>
            <Button size="sm" color="primary" variant="flat" radius="lg" onPress={() => setSizeOpen(true)}
              startContent={<Ruler size={14} />}>
              {sizeSuggest ? t("product.update_measurements") : t("product.enter_measurements_cta")}
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
                    className={`rounded-xl p-3 border transition-all ${isBest ? "border-primary bg-white dark:bg-zinc-800 shadow-md" : "border-blue-100 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60"}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-black ${isBest ? "text-primary" : "text-default-700"}`}>
                        {s.label}
                        {isBest && <span className="ml-1 text-[10px] font-bold text-primary">✓ {t("product.size_best")}</span>}
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
          <div className="mt-4 overflow-x-auto rounded-2xl border border-default-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead className="bg-default-50 dark:bg-zinc-800">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-default-700 dark:text-zinc-300">Size</th>
                  {sizeHeaders.map((k) => (
                    <th key={k} className="text-left px-4 py-2.5 font-bold text-default-700 dark:text-zinc-300">{prettyKey(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeChart.rows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-default-50/50 dark:bg-zinc-800/50"}>
                    <td className="px-4 py-2.5 font-black text-primary">{r.label}</td>
                    {sizeHeaders.map((k) => (
                      <td key={k} className="px-4 py-2.5 text-default-700 dark:text-zinc-300">{r.measurements?.[k] ?? "—"}</td>
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
          <h3 className="text-lg font-black text-default-900 mb-4">{t("product.product_details")}</h3>
          <div className="rounded-2xl border border-default-200 dark:border-zinc-700 overflow-hidden">
            {specEntries.map(([k, v], i) => (
              <div key={i} className={`flex gap-4 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-default-50/50 dark:bg-zinc-800/50"}`}>
                <span className="w-40 flex-shrink-0 font-semibold text-default-600 dark:text-zinc-400">{k}</span>
                <span className="text-default-800 dark:text-zinc-200">{String(v)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ DESCRIPTION ══ */}
      {p.description && (
        <section className="mb-8">
          <h3 className="text-lg font-black text-default-900 mb-4">{t("product.description")}</h3>
          <div
            className="prose prose-sm max-w-none text-default-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-default-200 dark:border-zinc-700 rounded-2xl p-5"
            dangerouslySetInnerHTML={{ __html: p.description }}
          />
        </section>
      )}

      {/* ══ REVIEWS ══ */}
      <section className="mb-10">
        <h2 className="text-lg font-black text-default-900 mb-5">{t("product.reviews_section")}</h2>

        {/* Summary */}
        <div className="flex items-start gap-6 bg-default-50 dark:bg-zinc-800 rounded-2xl p-5 mb-5">
          <div className="text-center flex-shrink-0">
            <div className="text-4xl font-black text-default-900">{ratingValue?.toFixed(1)}</div>
            <Stars value={ratingValue} size={18} />
            <div className="text-xs text-default-400 mt-1">{ratingCount} {t("product.reviews")}</div>
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
                      : "border-default-200 dark:border-zinc-700 text-default-600 dark:text-zinc-400 hover:border-primary hover:text-primary"
                  }`}
                >
                  {f === "all" ? t("common.all") : `${f} ★ (${summary.histogram?.[f] || 0})`}
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
                  className="bg-white dark:bg-zinc-900 border border-default-100 dark:border-zinc-700 rounded-2xl p-4 shadow-sm"
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
                        <p className="font-bold text-sm text-default-800">{r.author_name || t("common.anonymous")}</p>
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
                      {r.size_feedback === "fit" ? t("common.size_fit") : r.size_feedback === "tight" ? t("common.size_tight") : t("common.size_loose")}
                    </Chip>
                  )}

                  {/* Shop reply */}
                  {r.reply && (
                    <div className="mt-3 ml-2 border-l-2 border-primary/30 pl-3 space-y-2">
                      <div className="bg-primary/5 rounded-xl p-3">
                        <p className="text-xs font-bold text-primary mb-1">{t("product.shop_reply")}</p>
                        <p className="text-sm text-default-700">{r.reply}</p>
                        {r.reply_at && (
                          <p className="text-xs text-default-400 mt-1">{new Date(r.reply_at).toLocaleDateString("vi-VN")}</p>
                        )}
                      </div>

                      {/* Thread replies after shop reply */}
                      {(r.thread || []).filter(th => th.from === "customer").map((th, i) => (
                        <div key={i} className="bg-default-50 rounded-xl p-3">
                          <p className="text-xs font-bold text-default-600 mb-1">{t("product.buyer_reply")}</p>
                          <p className="text-sm text-default-700">{th.text}</p>
                          <p className="text-xs text-default-400 mt-1">{new Date(th.at).toLocaleDateString("vi-VN")}</p>
                        </div>
                      ))}
                    </div>
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
                {t("product.prev_page")}
              </Button>
              <span className="text-sm text-default-500">{t("common.page")} {rvPage}</span>
              <Button
                size="sm" variant="bordered" radius="lg"
                isDisabled={(reviews.items?.length || 0) < RV_LIMIT}
                onPress={() => setRvPage((p) => p + 1)}
                endContent={<ChevronRight size={14} />}
              >
                {t("product.next_page")}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-default-400 bg-default-50 rounded-2xl">
            <Star size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t("product.no_reviews_filter")}</p>
          </div>
        )}
      </section>

      {/* ══ RELATED PRODUCTS ══ */}
      {!!related?.length && (
        <section>
          <h2 className="text-lg font-black text-default-900 mb-5">{t("product.related")}</h2>
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
                    <p className="font-black text-default-900 leading-tight">{t("product.modal_ai_title")}</p>
                    <p className="text-xs text-default-400 font-normal">{t("product.modal_ai_subtitle")}</p>
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
                        { label: t("product.measure_height"), placeholder: "165", val: height, setter: setHeight, required: true },
                        { label: t("product.measure_weight"), placeholder: "55",  val: weight, setter: setWeight, required: true },
                        { label: t("product.measure_chest"),  placeholder: "86",  val: chest,  setter: setChest },
                        { label: t("product.measure_waist"),  placeholder: "68",  val: waist,  setter: setWaist },
                        { label: t("product.measure_hip"),    placeholder: "90",  val: hip,    setter: setHip },
                        { label: t("product.measure_shoulder"), placeholder: "38", val: shoulder, setter: setShoulder },
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
                    <p className="text-xs text-default-400">{t("product.measure_required_hint")}</p>

                    {/* Result — shown after scoring */}
                    {sizeSuggest && sizeScores.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                        <Divider className="my-3" />
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <CheckCircle2 size={16} className="text-success" />
                          <p className="font-bold text-sm text-default-800">
                            {t("product.recommend_for_you")}: <span className="text-primary">{sizeSuggest}</span>
                          </p>
                          {sizeResultFit && (
                            <Chip size="sm" color={sizeResultFit === "perfect" ? "success" : sizeResultFit === "good" ? "primary" : "warning"} variant="flat" className="text-xs">
                              {fitLabel(sizeResultFit, t)}
                            </Chip>
                          )}
                          {sizeReason === "xgboost_model" ? (
                            <Chip size="sm" color="secondary" variant="flat" className="text-xs">🤖 XGBoost AI</Chip>
                          ) : sizeReason === "rule_based" ? (
                            <Chip size="sm" color="default" variant="flat" className="text-xs">📐 Rule-based</Chip>
                          ) : null}
                        </div>
                        {sizeFeatures.length > 0 && (
                          <p className="text-xs text-default-400 mb-2">
                            Based on: {sizeFeatures.map((f) => f.replace(/_/g, " ")).join(", ")}
                          </p>
                        )}
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
                        <p>{t("product.no_size_chart")}</p>
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
                  {t("product.save_measurements")}
                </Button>
                <div className="flex-1" />
                <Button variant="light" radius="lg" onPress={onClose}>{t("common.close")}</Button>
                <Button
                  color="primary"
                  radius="lg"
                  startContent={<Sparkles size={14} />}
                  onPress={runSuggest}
                  isDisabled={!canSuggest || sizeLoading}
                  isLoading={sizeLoading}
                  className="font-bold"
                >
                  {t("product.suggest_size")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
