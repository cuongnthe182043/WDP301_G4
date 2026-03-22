import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Avatar, Button, Chip, Input, Select, SelectItem, Skeleton,
  Card, CardBody,
} from "@heroui/react";
import { Star, Package, Users, Search, Store, ShoppingBag, MessageCircle } from "lucide-react";
import { getShopBySlug, getShopProducts } from "../../services/shopService";
import ProductCard, { cardVariants } from "../../components/home/ProductCard";
import chatService from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";

function ShopBannerSkeleton() {
  return (
    <div className="w-full h-52 bg-gray-200 animate-pulse rounded-none" />
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-gray-400 flex-shrink-0" />
      <div>
        <span className="text-sm font-semibold text-gray-800">{value}</span>
        <span className="text-xs text-gray-500 ml-1">{label}</span>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const { t } = useTranslation();
  const { shopSlug } = useParams();
  const nav = useNavigate();
  const { isAuthenticated } = useAuth();

  const SORT_OPTIONS = [
    { key: "newest",     label: t("product.sort_newest") },
    { key: "popular",   label: t("product.sort_popular") },
    { key: "price_asc", label: t("product.sort_price_asc") },
    { key: "price_desc",label: t("product.sort_price_desc") },
    { key: "rating",    label: t("product.sort_rating") },
  ];

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getShopBySlug(shopSlug)
      .then(setShop)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shopSlug]);

  const loadProducts = useCallback(async (reset = false) => {
    if (!shopSlug) return;
    setLoadingProducts(true);
    try {
      const currentPage = reset ? 1 : page;
      const data = await getShopProducts(shopSlug, { q, sort, page: currentPage, limit: 24 });
      if (reset) {
        setProducts(data.items);
        setPage(1);
      } else {
        setProducts((p) => [...p, ...data.items]);
      }
      setTotal(data.total);
    } catch {
      /* ignore */
    } finally {
      setLoadingProducts(false);
    }
  }, [shopSlug, q, sort, page]);

  useEffect(() => {
    if (shop) loadProducts(true);
  }, [shop, q, sort]);

  const handleChat = async () => {
    if (!isAuthenticated) { nav("/login"); return; }
    if (!shop?._id) return;
    try {
      const conv = await chatService.startConversation(shop._id);
      window.dispatchEvent(new CustomEvent("openChat", { detail: { conversation: conv } }));
    } catch (e) {
      console.error("Failed to start conversation:", e);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <Store size={48} className="text-gray-300" />
        <p className="text-lg font-semibold">{t("product.shop_not_found")}</p>
        <Link to="/" className="text-blue-500 hover:underline text-sm">{t("product.go_home")}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Banner & Shop Header ─────────────────────────────────────────── */}
      {loading ? (
        <ShopBannerSkeleton />
      ) : (
        <div className="relative">
          {/* Banner */}
          <div
            className="w-full h-52 bg-gradient-to-r from-blue-600 to-indigo-700 bg-cover bg-center"
            style={shop?.banner_url ? { backgroundImage: `url(${shop.banner_url})` } : {}}
          />
          {/* Shop info bar */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Avatar */}
                <div className="-mt-10 sm:-mt-12 relative z-10 flex-shrink-0">
                  <Avatar
                    src={shop?.shop_logo}
                    name={shop?.shop_name?.charAt(0)}
                    className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-md text-2xl"
                  />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-black text-gray-900 truncate">{shop?.shop_name}</h1>
                  {shop?.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{shop.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <StatItem icon={Star} label={t("shop.shop_ratings")} value={(shop?.rating_avg || 0).toFixed(1)} />
                    <StatItem icon={Package} label={t("shop.shop_products")} value={total} />
                    <StatItem icon={ShoppingBag} label={t("shop.shop_orders")} value={shop?.total_orders || 0} />
                    <StatItem icon={Users} label={t("shop.shop_followers")} value={shop?.followers || 0} />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      color="primary"
                      radius="lg"
                      variant="bordered"
                      startContent={<MessageCircle size={14} />}
                      onPress={handleChat}
                    >
                      Chat với shop
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Filter bar ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t("product.search_in_shop")}
            value={q}
            onValueChange={(v) => setQ(v)}
            startContent={<Search size={16} className="text-gray-400" />}
            radius="lg"
            variant="bordered"
            className="flex-1"
          />
          <Select
            selectedKeys={new Set([sort])}
            onSelectionChange={(k) => setSort(Array.from(k)[0] || "newest")}
            radius="lg"
            variant="bordered"
            className="w-48"
            aria-label={t("common.sort")}
          >
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.key}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {total} {t("product.products_count")}
        </p>
      </div>

      {/* ─── Products grid ───────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <AnimatePresence mode="wait">
          {loadingProducts && products.length === 0 ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i} radius="xl">
                  <CardBody className="p-0">
                    <Skeleton className="aspect-square rounded-t-xl" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-3 rounded-full w-3/4" />
                      <Skeleton className="h-3 rounded-full w-1/2" />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400"
            >
              <Package size={48} className="text-gray-200" />
              <p className="text-sm">{t("shop.shop_no_products")}</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {products.map((item, i) => (
                <motion.div key={item._id} variants={cardVariants} custom={i}>
                  <ProductCard item={item} index={i} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load more */}
        {products.length < total && (
          <div className="flex justify-center mt-8">
            <Button
              variant="bordered"
              radius="lg"
              isLoading={loadingProducts}
              onPress={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                getShopProducts(shopSlug, { q, sort, page: nextPage, limit: 24 })
                  .then((data) => {
                    setProducts((p) => [...p, ...data.items]);
                  })
                  .catch(() => {});
              }}
            >
              {t("shop.shop_load_more", { count: total - products.length })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
