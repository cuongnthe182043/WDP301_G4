// components/home/ProductCard.jsx — Premium product card (HeroUI + framer-motion)
import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ShoppingBag, Flame, PackageX, Store } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";

/* ─── Animation variant (exported for stagger grids) ──────────────────────── */
export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/** 1200 → "1.2k" · 999 → "999" */
const fmtSold = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}k`;
  return String(num);
};

/** 1234 → "1.2k" for review counts */
const fmtReview = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

/** 5 individual star icons — half-star via filled count */
function StarRow({ value = 0, size = 10 }) {
  const v      = Math.min(5, Math.max(0, Number(value) || 0));
  const filled = Math.round(v);                // 0-5
  return (
    <span className="flex items-center gap-[1px]" aria-label={`${v.toFixed(1)} / 5 sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < filled
              ? "text-amber-400 fill-amber-400"
              : "text-gray-200 fill-gray-200"
          }
        />
      ))}
    </span>
  );
}

/** Stock status pill — rendered below rating row */
function StockBadge({ stock }) {
  if (stock == null) return null;
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full leading-none">
        Hết hàng
      </span>
    );
  }
  if (stock <= 10) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full leading-none">
        Còn {stock} sp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full leading-none">
      Còn hàng
    </span>
  );
}

/* ─── ProductCard ─────────────────────────────────────────────────────────── */
/**
 * Accepts `item.product` (carousel wrapper shape) OR a flat product object.
 *
 * Backend field contract (from homeService):
 *   name, slug, images[], base_price, currency
 *   rating_avg, rating_count, sold_count, stock_total    ← all now selected
 *
 * Flash-sale extra fields (on the wrapper `item`, NOT on `item.product`):
 *   flash_price, original_price, discount_percent, remaining
 *
 * Props:
 *   item    — product/wrapper object
 *   type    — "flash" | undefined
 *   index   — stagger delay position
 */
const ProductCard = memo(function ProductCard({ item, type, index = 0 }) {
  // ── Normalise shape ──────────────────────────────────────────────────────
  const p    = item?.product || item || {};
  const id   = p._id || p.id || "";
  const href = p.slug ? `/product/${p.slug}` : `/product/${id}`;
  const name = p.name || "Sản phẩm";
  const img  = p.images?.[0] || p.image || p.thumbnail || "";

  // ── Prices ───────────────────────────────────────────────────────────────
  const basePrice = Number(p.base_price ?? p.price ?? 0) || 0;
  const salePrice =
    type === "flash"
      ? Number(item?.flash_price ?? basePrice) || 0
      : basePrice;

  // Discount %:
  //   1. item.discount_percent  — flash-sale item level  (BUG FIX ✓)
  //   2. p.discount_percent     — product-level discount
  //   3. calculate from flash prices
  const discountPct =
    Number(item?.discount_percent ?? p.discount_percent ?? 0) ||
    (type === "flash" && basePrice > 0
      ? Math.max(0, Math.round((1 - salePrice / basePrice) * 100))
      : 0);

  const showStrikethrough =
    discountPct > 0 && basePrice > 0 && basePrice !== salePrice;

  // ── Shop info ─────────────────────────────────────────────────────────────
  const shop = p.shop || item?.shop || null;

  // ── Social proof ─────────────────────────────────────────────────────────
  // rating_count is the review count from the Product model  (BUG FIX ✓)
  const rating      = Number(p.rating_avg ?? 0) || 0;
  const reviewCount = Number(p.rating_count ?? p.review_count ?? 0) || 0;
  const sold        = Number(p.sold_count ?? 0) || 0;

  // ── Stock ─────────────────────────────────────────────────────────────────
  // stock_total is the field on the Product model             (BUG FIX ✓)
  // For flash items, prefer item.remaining (flash-specific stock)
  const stockRaw =
    type === "flash" && item?.remaining != null
      ? Number(item.remaining)
      : p.stock_total != null
        ? Number(p.stock_total)
        : p.stock != null
          ? Number(p.stock)
          : null;

  const isOutOfStock = stockRaw != null && stockRaw === 0;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      whileHover={{ y: -5, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 360, damping: 24 }}
      className="h-full"
    >
      <Link
        to={href}
        className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
        tabIndex={0}
      >
        <div
          className={[
            "h-full flex flex-col rounded-2xl overflow-hidden bg-white",
            "border border-gray-100 shadow-sm",
            "hover:shadow-xl hover:border-blue-200",
            "transition-all duration-300 ease-in-out",
            isOutOfStock ? "opacity-70" : "",
          ].join(" ")}
        >

          {/* ────────────────── Thumbnail ───────────────────────────────── */}
          <div className="relative aspect-square overflow-hidden bg-gray-50 flex-shrink-0">
            {img ? (
              <img
                src={img}
                alt={name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100">
                <PackageX size={32} className="text-gray-300" />
                <span className="text-[10px] text-gray-400 font-medium">Chưa có ảnh</span>
              </div>
            )}

            {/* Dark overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Discount badge — top-left */}
            {discountPct > 0 && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-md leading-none">
                -{discountPct}%
              </div>
            )}

            {/* Flash HOT badge — top-right */}
            {type === "flash" && (
              <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md leading-none">
                <Flame size={8} className="fill-white stroke-none" />
                HOT
              </div>
            )}

            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center backdrop-blur-[1px]">
                <span className="bg-white/90 text-gray-700 text-xs font-black px-3 py-1 rounded-full shadow-md">
                  Hết hàng
                </span>
              </div>
            )}
          </div>

          {/* ────────────────── Info ────────────────────────────────────── */}
          <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3 gap-1.5">

            {/* Product name */}
            <p
              className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors duration-200 flex-1"
              title={name}
            >
              {name}
            </p>

            {/* Rating row: stars + value + (review count) */}
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
              /* No rating yet — thin placeholder keeps height consistent */
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
                <span /> /* spacer */
              )}

              {/* Stock status badge — right side of sold row */}
              <StockBadge stock={stockRaw} />
            </div>

            {/* Price row */}
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-black text-blue-600 text-[14px] leading-none">
                {formatCurrency(salePrice)}
              </span>
              {showStrikethrough && (
                <span className="text-[11px] text-gray-400 line-through leading-none">
                  {formatCurrency(basePrice)}
                </span>
              )}
            </div>

            {/* Shop badge */}
            {shop && (
              <Link
                to={`/shops/${shop.shop_slug}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 mt-1 group/shop"
              >
                <Store size={10} className="text-gray-400 group-hover/shop:text-blue-500 flex-shrink-0" />
                <span className="text-[10px] text-gray-400 group-hover/shop:text-blue-500 truncate leading-none transition-colors">
                  {shop.shop_name}
                </span>
              </Link>
            )}

          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export default ProductCard;
