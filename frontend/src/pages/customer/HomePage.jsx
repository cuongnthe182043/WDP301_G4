import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiTrendingUp,
  FiZap,
  FiStar,
  FiTag,
  FiShield,
  FiRefreshCw,
  FiTruck,
  FiCreditCard,
  FiGrid,
  FiAward,
  FiUsers,
  FiHeart,
  FiEye,
  FiLock,
  FiCheckCircle,
} from "react-icons/fi";
import { Skeleton } from "@heroui/react";
import { homeService } from "../../services/homeService";
import { userService } from "../../services/userService";
import ProductCard from "../../components/home/ProductCard.jsx";
import FeatureBadge from "../../components/home/FeatureBadge.jsx";
import "../../assets/styles/Homepage.css";

const TOKEN_KEY = "DFS_TOKEN";

/* ─── Data Normalizers ─── */
function normalizeHomepage(raw) {
  const banners = {
    homepage_top: raw?.banners?.homepage_top || [],
    homepage_mid: raw?.banners?.homepage_mid || [],
    homepage_bottom: raw?.banners?.homepage_bottom || [],
    __count:
      (raw?.banners?.homepage_top?.length || 0) +
      (raw?.banners?.homepage_mid?.length || 0) +
      (raw?.banners?.homepage_bottom?.length || 0),
  };
  return {
    banners,
    brands: raw?.brands || raw?.brand_list || [],
    categories: raw?.categories || [],
    men: raw?.men || [],
    women: raw?.women || [],
    unisex: raw?.unisex || [],
    flashSale: raw?.flashSale || raw?.flash_sale || null,
  };
}

function normalizeFlashItem(it) {
  if (it.product) return it;
  return {
    ...it,
    product: {
      _id: it.product_id || it._id,
      name: it.name || it.title || "Sản phẩm",
      images: it.images || (it.image ? [it.image] : []),
      base_price: it.original_price || it.base_price || it.price || 0,
    },
    flash_price: it.flash_price || it.sale_price || it.price || 0,
  };
}

/* ─── Carousel Hook ─── */
function useCarousel({ itemWidth, gap, perClick = 2 }) {
  const viewportRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = () => {
    const el = viewportRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 2;
    setCanPrev(el.scrollLeft > 0);
    setCanNext(el.scrollLeft < max);
  };

  useEffect(() => {
    update();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    el.addEventListener("scroll", update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);

  const scrollByStep = (dir) => {
    const el = viewportRef.current;
    if (!el) return;
    const step = perClick * (itemWidth + gap);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return {
    viewportRef,
    canPrev,
    canNext,
    scrollPrev: () => scrollByStep(-1),
    scrollNext: () => scrollByStep(1),
  };
}

/* ─── Countdown ─── */
function Countdown({ endTime, label = "Kết thúc sau" }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, new Date(endTime).getTime() - now);
  const hh = String(Math.floor(left / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-white/80 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        {[hh, mm, ss].map((v, i) => (
          <React.Fragment key={i}>
            <span className="bg-black/50 text-white font-black font-mono text-sm px-2 py-0.5 rounded-lg tabular-nums border border-white/10">
              {v}
            </span>
            {i < 2 && <span className="text-white/50 font-black text-sm leading-none">:</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Nav Button ─── */
function NavBtn({ onClick, disabled, direction, light = false }) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.1 } : {}}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed
        ${light
          ? "bg-white/15 border border-white/30 text-white hover:bg-white hover:text-blue-600"
          : "bg-white border-2 border-blue-100 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 shadow-sm"
        }`}
    >
      {direction === "prev" ? <FiChevronLeft size={15} /> : <FiChevronRight size={15} />}
    </motion.button>
  );
}

/* ─── View All Link ─── */
function ViewAll({ to, light = false }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200
        ${light
          ? "border border-white/40 text-white hover:bg-white hover:text-blue-600"
          : "border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-500 hover:text-white"
        }`}
    >
      Xem tất cả <FiChevronRight size={12} />
    </Link>
  );
}

/* ─── Section Wrapper ─── */
function Section({ title, Icon, accentGradient = "from-blue-500 to-blue-700", viewAllHref, rightNode, children }) {
  return (
    <section className="mb-8 bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-md`}>
            {Icon && <Icon size={15} className="text-white" />}
          </div>
          <h2 className="text-[16px] font-black text-gray-900 tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {rightNode}
          {viewAllHref && <ViewAll to={viewAllHref} />}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ─── Section with Carousel ─── */
function SectionCarousel({ title, Icon, accentGradient, viewAllHref, items = [], renderItem, itemWidth = 200, gap = 12, emptyText }) {
  const { viewportRef, canPrev, canNext, scrollPrev, scrollNext } = useCarousel({ itemWidth, gap });

  return (
    <section className="mb-8 bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accentGradient || "from-blue-500 to-blue-700"} flex items-center justify-center shadow-md`}>
            {Icon && <Icon size={15} className="text-white" />}
          </div>
          <h2 className="text-[16px] font-black text-gray-900 tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref && <ViewAll to={viewAllHref} />}
          <div className="flex gap-1">
            <NavBtn onClick={scrollPrev} disabled={!canPrev} direction="prev" />
            <NavBtn onClick={scrollNext} disabled={!canNext} direction="next" />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        {!items.length ? (
          emptyText ? (
            <div className="border-2 border-dashed border-blue-100 rounded-2xl py-10 text-center text-gray-400 text-sm mt-4">
              {emptyText}
            </div>
          ) : null
        ) : (
          <div className="carousel">
            <div className="carousel-viewport" ref={viewportRef}>
              <div className="carousel-track" style={{ gap }}>
                {items.map((it, i) => (
                  <div key={it._id || it.id || it.slug || i} style={{ width: itemWidth, minWidth: itemWidth }}>
                    {renderItem(it, i)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Banner Carousel ─── */
function BannerCarousel({ banners }) {
  const rows = [banners.homepage_top, banners.homepage_mid, banners.homepage_bottom].filter((r) => r?.length);
  const list = rows.flat();

  const [activeIdx, setActiveIdx] = useState(0);
  const total = list.length;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % total), 5000);
    return () => clearInterval(t);
  }, [total]);

  const goPrev = () => setActiveIdx((i) => (i - 1 + total) % total);
  const goNext = () => setActiveIdx((i) => (i + 1) % total);

  // Fallback banner khi không có data
  const FallbackBanner = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/20 rounded-full" />
      <div className="relative text-center px-8">
        <p className="text-blue-200 text-sm font-semibold tracking-widest uppercase mb-3">Fashion Store</p>
        <h1 className="text-white text-4xl font-black mb-3 drop-shadow-lg">Thời Trang Chính Hãng</h1>
        <p className="text-blue-100 text-base mb-6">Hàng nghìn sản phẩm – Giá tốt nhất thị trường</p>
        <Link to="/products" className="inline-flex items-center gap-2 bg-white text-blue-600 font-black px-6 py-3 rounded-full hover:bg-blue-50 transition-colors shadow-lg text-sm">
          Khám phá ngay <FiChevronRight size={16} />
        </Link>
      </div>
    </div>
  );

  return (
    <section className="mb-8">
      <div className="relative w-full rounded-3xl overflow-hidden shadow-xl" style={{ paddingTop: "40%" }}>
        {/* Default background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-blue-500">
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="absolute inset-0">
          {!list.length ? (
            <FallbackBanner />
          ) : (
            <AnimatePresence mode="wait">
              {list.map((b, i) => {
                const src = b.image_url || b.image || b.url;
                if (i !== activeIdx) return null;
                const href = b.link || b.href || "#";
                return (
                  <motion.a
                    key={`${src || "fb"}-${i}`}
                    href={href}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="absolute inset-0 block"
                  >
                    {src ? (
                      <>
                        <img src={src} alt={b.title || "Banner"} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
                        {(b.title || b.subtitle) && (
                          <div className="absolute bottom-10 left-10 max-w-sm">
                            {b.title && <h3 className="text-white text-3xl font-black drop-shadow-lg mb-2">{b.title}</h3>}
                            {b.subtitle && <p className="text-white/80 text-sm">{b.subtitle}</p>}
                          </div>
                        )}
                      </>
                    ) : (
                      <FallbackBanner />
                    )}
                  </motion.a>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Controls */}
        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 border border-white/20 transition-all"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 border border-white/20 transition-all"
            >
              <FiChevronRight size={20} />
            </button>
          </>
        )}

        {/* Dots */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === activeIdx ? "w-6 h-2 bg-white shadow" : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}

        {/* Badge */}
        {total > 1 && (
          <div className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/20">
            {activeIdx + 1} / {total}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Feature / Trust Badges (6 items) ─── */
const FEATURE_BADGES = [
  {
    icon: FiTruck,
    title: "Miễn phí vận chuyển",
    description: "Đơn hàng từ 299K",
    gradient: "from-blue-50 to-blue-100",
    border: "border-blue-200",
    iconBg: "bg-blue-500",
  },
  {
    icon: FiRefreshCw,
    title: "Đổi trả 30 ngày",
    description: "Hoàn trả dễ dàng",
    gradient: "from-emerald-50 to-green-100",
    border: "border-green-200",
    iconBg: "bg-emerald-500",
  },
  {
    icon: FiShield,
    title: "Hàng chính hãng 100%",
    description: "Cam kết xác thực",
    gradient: "from-purple-50 to-violet-100",
    border: "border-purple-200",
    iconBg: "bg-purple-500",
  },
  {
    icon: FiCreditCard,
    title: "Thanh toán an toàn",
    description: "Mã hóa đầu cuối",
    gradient: "from-orange-50 to-amber-100",
    border: "border-orange-200",
    iconBg: "bg-orange-500",
  },
  {
    icon: FiLock,
    title: "Bảo mật SSL",
    description: "Kết nối được mã hóa",
    gradient: "from-cyan-50 to-sky-100",
    border: "border-cyan-200",
    iconBg: "bg-cyan-500",
  },
  {
    icon: FiCheckCircle,
    title: "Bảo hành chính hãng",
    description: "Bảo hành đầy đủ",
    gradient: "from-indigo-50 to-indigo-100",
    border: "border-indigo-200",
    iconBg: "bg-indigo-500",
  },
];

function FeatureBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {FEATURE_BADGES.map((badge, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <FeatureBadge {...badge} />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Category Card ─── */
const CAT_GRADIENTS = [
  "from-blue-500 to-blue-700",
  "from-blue-400 to-cyan-600",
  "from-sky-500 to-blue-600",
  "from-indigo-500 to-blue-600",
  "from-blue-600 to-indigo-700",
  "from-cyan-500 to-blue-500",
  "from-blue-500 to-teal-600",
  "from-blue-700 to-blue-900",
];

function CategoryCard({ cat, index = 0 }) {
  const grad = CAT_GRADIENTS[index % CAT_GRADIENTS.length];
  return (
    <Link to={`/categories/${cat.slug}`} className="flex flex-col items-center gap-2.5 group no-underline">
      <motion.div
        whileHover={{ scale: 1.08, y: -3 }}
        whileTap={{ scale: 0.95 }}
        className={`w-[68px] h-[68px] rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-250`}
      >
        {cat.image_url ? (
          <img src={cat.image_url} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-black text-xl drop-shadow">{cat.name?.[0] || "?"}</span>
        )}
      </motion.div>
      <span className="text-[11px] font-bold text-gray-700 text-center group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight max-w-[76px]">
        {cat.name}
      </span>
    </Link>
  );
}

/* ─── Brand Card ─── */
function BrandCard({ br }) {
  return (
    <Link to={`/products`} className="flex flex-col items-center gap-2 group no-underline">
      <motion.div
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="w-[84px] h-[64px] rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center overflow-hidden group-hover:border-blue-400 group-hover:shadow-lg transition-all duration-200 shadow-sm"
      >
        {br.logo_url || br.image_url ? (
          <img
            src={br.logo_url || br.image_url}
            alt={br.name}
            loading="lazy"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <span className="text-lg font-black text-gray-400 group-hover:text-blue-500 transition-colors">{br.name?.[0] || "?"}</span>
        )}
      </motion.div>
      <span className="text-[11px] font-bold text-gray-600 text-center line-clamp-1 max-w-[84px] group-hover:text-blue-600 transition-colors">
        {br.name}
      </span>
    </Link>
  );
}

/* ─── Categories + Brands Panel ─── */
function CategoriesPanel({ categories }) {
  const { viewportRef, canPrev, canNext, scrollPrev, scrollNext } = useCarousel({ itemWidth: 88, gap: 16 });

  return (
    <section className="mb-8">
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 40%, #3B82F6 100%)" }}
      >
        {/* Header inside the panel */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <FiGrid size={15} className="text-white" />
            </div>
            <h2 className="text-[17px] font-black text-white tracking-tight">Danh mục sản phẩm</h2>
          </div>
          <div className="flex items-center gap-2">
            <ViewAll to="/products" light />
            <div className="flex gap-1">
              <NavBtn onClick={scrollPrev} disabled={!canPrev} direction="prev" light />
              <NavBtn onClick={scrollNext} disabled={!canNext} direction="next" light />
            </div>
          </div>
        </div>

        {/* White card area for categories */}
        <div className="bg-white mx-4 mb-4 rounded-2xl px-5 py-4">
          <div className="carousel">
            <div className="carousel-viewport" ref={viewportRef}>
              <div className="carousel-track" style={{ gap: 16 }}>
                {categories.map((cat, i) => (
                  <div key={cat._id || cat.slug || i} style={{ width: 88, minWidth: 88 }}>
                    <CategoryCard cat={cat} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Brands Panel ─── */
function BrandsPanel({ brands }) {
  const { viewportRef, canPrev, canNext, scrollPrev, scrollNext } = useCarousel({ itemWidth: 100, gap: 14 });

  return (
    <section className="mb-8">
      <div className="bg-white rounded-3xl border-2 border-blue-100 overflow-hidden shadow-sm">
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
              <FiAward size={15} className="text-white" />
            </div>
            <h2 className="text-[17px] font-black text-gray-900 tracking-tight">Thương hiệu nổi bật</h2>
          </div>
          <div className="flex items-center gap-2">
            <ViewAll to="/products" />
            <div className="flex gap-1">
              <NavBtn onClick={scrollPrev} disabled={!canPrev} direction="prev" />
              <NavBtn onClick={scrollNext} disabled={!canNext} direction="next" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="carousel">
            <div className="carousel-viewport" ref={viewportRef}>
              <div className="carousel-track" style={{ gap: 14 }}>
                {brands.map((br, i) => (
                  <div key={br._id || br.slug || i} style={{ width: 100, minWidth: 100 }}>
                    <BrandCard br={br} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Flash Sale ─── */
function FlashSaleSection({ flashSale }) {
  const { viewportRef, canPrev, canNext, scrollPrev, scrollNext } = useCarousel({ itemWidth: 200, gap: 12 });
  const isUpcoming = flashSale._upcoming;

  return (
    <section className="mb-8">
      {/* Header */}
      <div
        className="rounded-3xl overflow-hidden shadow-lg"
        style={{ background: "linear-gradient(135deg, #B91C1C 0%, #DC2626 35%, #EA580C 70%, #F59E0B 100%)" }}
      >
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
              <FiZap size={20} className="text-white fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  {isUpcoming ? "Flash Sale sắp diễn ra" : "Flash Sale"}
                </h2>
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                  HOT
                </span>
              </div>
              <p className="text-white/70 text-xs mt-0.5">Giá sốc – Số lượng có hạn</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Countdown
              label={isUpcoming ? "Bắt đầu sau" : "Kết thúc sau"}
              endTime={isUpcoming ? flashSale.start_time : flashSale.end_time}
            />
            <Link
              to="/products"
              className="text-xs font-bold text-white border border-white/40 rounded-full px-3 py-1.5 hover:bg-white hover:text-red-500 transition-all duration-200 whitespace-nowrap hidden md:inline-flex items-center gap-1"
            >
              Xem tất cả <FiChevronRight size={12} />
            </Link>
            <div className="flex gap-1">
              <NavBtn onClick={scrollPrev} disabled={!canPrev} direction="prev" light />
              <NavBtn onClick={scrollNext} disabled={!canNext} direction="next" light />
            </div>
          </div>
        </div>

        {/* Products inside flash sale */}
        <div className="bg-gray-50 mx-3 mb-3 rounded-2xl p-3">
          <div className="carousel">
            <div className="carousel-viewport" ref={viewportRef}>
              <div className="carousel-track" style={{ gap: 12 }}>
                {flashSale.items.map((it, i) => (
                  <div key={it._id || it.product_id || i} style={{ width: 200, minWidth: 200 }}>
                    <ProductCard item={normalizeFlashItem(it)} type="flash" index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Product Grid Section ────────────────────────────────────────────────── */
/**
 * Responsive 4-column product grid.
 * Mirrors the same card-based section styling used by SectionCarousel.
 *
 * Props:
 *   title        — section heading
 *   Icon         — react-icons component for the accent badge
 *   accentGradient — Tailwind gradient classes
 *   viewAllHref  — optional "see all" link
 *   items        — flat product array (from API, shape: { product: {...} } OR direct)
 *   max          — max items to show (default 12 = 3 rows of 4)
 */
function ProductGridSection({ title, Icon, accentGradient, viewAllHref, items = [], max = 12 }) {
  const visible = items.slice(0, max);
  if (!visible.length) return null;

  return (
    <section className="mb-8 bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accentGradient || "from-blue-500 to-blue-700"} flex items-center justify-center shadow-md`}
          >
            {Icon && <Icon size={15} className="text-white" />}
          </div>
          <h2 className="text-[16px] font-black text-gray-900 tracking-tight">{title}</h2>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {visible.length}
          </span>
        </div>
        {viewAllHref && <ViewAll to={viewAllHref} />}
      </div>

      {/* Grid */}
      <div className="p-4">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          variants={{ show: { transition: { staggerChildren: 0.045 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {visible.map((p, i) => (
            <ProductCard
              key={p._id || p.id || i}
              item={{ product: p }}
              index={i}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Skeleton ─── */
function HomePageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Banner */}
      <Skeleton className="w-full rounded-3xl" style={{ paddingTop: "40%" }} />

      {/* Feature badges — 6 cols */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Categories */}
      <Skeleton className="w-full h-36 rounded-3xl" />

      {/* Carousel sections */}
      {Array.from({ length: 2 }, (_, s) => (
        <div key={s} className="bg-white rounded-3xl border border-blue-50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-5 w-36 rounded-lg" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex-shrink-0 w-[200px] space-y-2">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-3.5 w-4/5 rounded-lg" />
                <Skeleton className="h-3 w-3/5 rounded-lg" />
                <Skeleton className="h-4 w-2/5 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Grid section */}
      <div className="bg-white rounded-3xl border border-blue-50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-5 w-44 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-3.5 w-4/5 rounded-lg" />
              <Skeleton className="h-3 w-3/5 rounded-lg" />
              <Skeleton className="h-4 w-2/5 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ PAGE ═══════════════════ */
export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const payload = await homeService.fetchHomepage();
        setData(normalizeHomepage(payload));
      } catch (e) {
        setError(e?.message || "Không tải được trang chủ");
      } finally {
        setLoading(false);
      }
    })();

    if (localStorage.getItem(TOKEN_KEY)) {
      userService.getRecentlyViewed().then(setRecentlyViewed).catch(() => {});
    }
  }, []);

  if (loading) return <HomePageSkeleton />;

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="inline-flex flex-col items-center gap-4 bg-white rounded-3xl p-10 shadow-sm border-2 border-blue-50">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <FiRefreshCw size={28} className="text-red-400" />
        </div>
        <p className="text-gray-700 font-bold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors text-sm"
        >
          Thử lại
        </button>
      </div>
    </div>
  );

  if (!data) return null;

  const { banners, brands, categories, men, women, flashSale, unisex } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-20"
      style={{ background: "linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 40%, #F1F5FF 100%)", minHeight: "100vh" }}
    >
      {/* Banner */}
      <BannerCarousel banners={banners} />

      {/* Trust / Feature Badges */}
      <FeatureBadges />

      {/* Categories – full-bleed blue panel */}
      {!!categories.length && <CategoriesPanel categories={categories} />}

      {/* Brands */}
      {!!brands.length && <BrandsPanel brands={brands} />}

      {/* Flash Sale */}
      {!!flashSale?.items?.length && <FlashSaleSection flashSale={flashSale} />}

      {/* Men */}
      {!!men.length && (
        <SectionCarousel
          title="Thời trang Nam"
          Icon={FiUsers}
          accentGradient="from-blue-500 to-blue-700"
          viewAllHref="/categories/men"
          items={men}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />}
          itemWidth={200}
          gap={12}
        />
      )}

      {/* Women */}
      {!!women.length && (
        <SectionCarousel
          title="Thời trang Nữ"
          Icon={FiHeart}
          accentGradient="from-sky-400 to-blue-600"
          viewAllHref="/categories/women"
          items={women}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />}
          itemWidth={200}
          gap={12}
        />
      )}

      {/* Unisex */}
      {!!unisex?.length && (
        <SectionCarousel
          title="Unisex"
          Icon={FiStar}
          accentGradient="from-blue-600 to-indigo-700"
          viewAllHref="/categories/unisex"
          items={unisex}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />}
          itemWidth={200}
          gap={12}
        />
      )}

      {/* Trending */}
      {!!men.length && (
        <SectionCarousel
          title="Xu hướng nổi bật"
          Icon={FiTrendingUp}
          accentGradient="from-blue-500 to-cyan-600"
          viewAllHref="/products?sort=popular"
          items={[...men, ...women].slice(0, 12)}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />}
          itemWidth={200}
          gap={12}
        />
      )}

      {/* Featured Products Grid — responsive 4-column */}
      {!!(men.length || women.length) && (
        <ProductGridSection
          title="Sản phẩm nổi bật"
          Icon={FiTrendingUp}
          accentGradient="from-blue-500 to-indigo-600"
          viewAllHref="/products"
          items={[...men, ...women, ...(unisex || [])].slice(0, 12)}
          max={12}
        />
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <SectionCarousel
          title="Đã xem gần đây"
          Icon={FiEye}
          accentGradient="from-blue-400 to-blue-600"
          viewAllHref="/products"
          items={recentlyViewed}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />}
          itemWidth={200}
          gap={12}
        />
      )}
    </motion.div>
  );
}