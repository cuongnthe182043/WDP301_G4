import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button, Select, SelectItem, Input } from "@heroui/react";
import { SlidersHorizontal, Search } from "lucide-react";
import { productApi } from "../../services/productService";
import ProductCard from "../../components/home/ProductCard.jsx";
import SkeletonProductCard from "../../components/ui/SkeletonProductCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const LIMIT = 20;

export default function CategoryProductsPage() {
  const { slug } = useParams();
  const { t } = useTranslation();

  const SORT_OPTIONS = [
    { key: "created_at", label: t("product.sort_newest") },
    { key: "price_asc",  label: t("product.sort_price_asc") },
    { key: "price_desc", label: t("product.sort_price_desc") },
    { key: "sold",       label: t("product.sort_best_sold") },
  ];

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState(new Set(["created_at"]));

  const load = async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll({
        category: slug,
        sort: Array.from(sort)[0],
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        limit: LIMIT,
      });
      setProducts(res.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug, sort]);

  const catLabel = slug
    ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
    : t("product.category");

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-black text-default-900">{catLabel}</h1>
        <p className="text-sm text-default-400 mt-1">
          {loading ? t("common.loading") : `${products.length} ${t("product.products_count")}`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-7 p-4 bg-default-50 rounded-2xl border border-default-100">
        <SlidersHorizontal size={16} className="text-default-500 self-center" />
        <Input
          size="sm"
          label={t("product.price_from")}
          type="number"
          placeholder="0"
          value={minPrice}
          onValueChange={setMinPrice}
          className="w-32"
          radius="lg"
          startContent={<span className="text-xs text-default-400">₫</span>}
        />
        <Input
          size="sm"
          label={t("product.price_to")}
          type="number"
          placeholder="∞"
          value={maxPrice}
          onValueChange={setMaxPrice}
          className="w-32"
          radius="lg"
          startContent={<span className="text-xs text-default-400">₫</span>}
        />
        <Select
          size="sm"
          label={t("common.sort")}
          selectedKeys={sort}
          onSelectionChange={setSort}
          className="w-44"
          radius="lg"
        >
          {SORT_OPTIONS.map((o) => <SelectItem key={o.key}>{o.label}</SelectItem>)}
        </Select>
        <Button
          size="sm"
          color="primary"
          radius="lg"
          onPress={load}
          startContent={<Search size={14} />}
          className="font-semibold"
        >
          {t("common.filter")}
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonProductCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("product.no_products")}
          description={t("product.filter_adjust")}
          actionLabel={t("product.filter_clear")}
          onAction={() => { setMinPrice(""); setMaxPrice(""); load(); }}
        />
      ) : (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          {products.map((p, i) => (
            <ProductCard key={p._id} item={p} index={i} />
          ))}
        </motion.div>
      )}
    </PageContainer>
  );
}
