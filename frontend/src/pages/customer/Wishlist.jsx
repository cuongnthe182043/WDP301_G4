import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { Button, Skeleton } from "@heroui/react";
import { userService } from "../../services/userService";
import { useToast } from "../../components/common/ToastProvider";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";
import { formatCurrency } from "../../utils/formatCurrency";

const TOKEN_KEY = "DFS_TOKEN";

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-default-100 bg-white shadow-sm">
          <Skeleton className="aspect-square w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-4/5 rounded-lg" />
            <Skeleton className="h-4 w-2/5 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 28 } },
  exit:   { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export default function Wishlist() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const isLoggedIn = !!localStorage.getItem(TOKEN_KEY);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await userService.getWishlist();
      setItems(list || []);
    } catch (e) {
      toast.error(e?.message || t("common.error"));
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
      toast.success(t("common.remove") + " " + t("common.success").toLowerCase());
    } catch (e) {
      toast.error(e?.message || t("common.error"));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <PageContainer wide>
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black text-default-900 mb-7"
      >
        {t("nav.wishlist")}
      </motion.h1>

      {loading ? (
        <WishlistSkeleton />
      ) : !isLoggedIn ? (
        <EmptyState
          icon={Heart}
          title={t("auth.login_title")}
          description={t("auth.have_account")}
          actionLabel={t("common.login")}
          onAction={() => nav("/login?returnUrl=/wishlist")}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("product.add_to_wishlist")}
          description={t("product.no_products_yet")}
          actionLabel={t("cart.empty_cta")}
          onAction={() => nav("/")}
        />
      ) : (
        <>
          <p className="text-sm text-default-400 mb-5">{items.length} {t("product.products_count")}</p>
          <motion.div
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {items.map((product) => {
                const img = Array.isArray(product.images) ? product.images[0] : "";
                const price = product.base_price ?? 0;
                return (
                  <motion.div
                    key={product._id}
                    variants={cardVariants}
                    exit="exit"
                    layout
                    className="group relative rounded-2xl overflow-hidden border border-default-100 bg-white shadow-sm cursor-pointer"
                    onClick={() => nav(`/products/${product.slug || product._id}`)}
                  >
                    {/* Image */}
                    <div className="aspect-square overflow-hidden bg-default-50">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-default-200">
                          <Heart size={48} strokeWidth={1} />
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <motion.button
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-danger z-10"
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handleRemove(product._id); }}
                      disabled={removing === product._id}
                      aria-label={t("common.remove")}
                    >
                      {removing === product._id ? (
                        <span className="animate-spin w-4 h-4 border-2 border-danger border-t-transparent rounded-full" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </motion.button>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-default-800 line-clamp-2 leading-snug mb-1">
                        {product.name}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(price)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </PageContainer>
  );
}
