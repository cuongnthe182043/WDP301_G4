import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Pagination, Input, Select, SelectItem, Chip, Button } from "@heroui/react";
import { Search, SlidersHorizontal, X, Layers } from "lucide-react";
import { productApi } from "../../services/productService";
import ProductCard from "../../components/home/ProductCard.jsx";
import SkeletonProductCard from "../../components/ui/SkeletonProductCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";

const LIMIT = 24;

const SORT_OPTIONS = [
  { key: "newest",     label: "Mới nhất" },
  { key: "price_asc",  label: "Giá tăng dần" },
  { key: "price_desc", label: "Giá giảm dần" },
  { key: "popular",    label: "Phổ biến nhất" },
];

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export default function AllProductsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSearchPage = location.pathname === "/search";

  // Derive filter values from URL params
  const qParam   = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") || "newest";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [localQ, setLocalQ]     = useState(qParam);

  const fetch = useCallback(async (params) => {
    setLoading(true);
    try {
      const res = await productApi.getAll({ ...params, limit: LIMIT });
      setProducts(res.products || []);
      setTotal(res.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Sync localQ when URL param changes (e.g. from header search)
  useEffect(() => { setLocalQ(qParam); }, [qParam]);

  useEffect(() => {
    fetch({ q: qParam || undefined, sort: sortParam, page: pageParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, sortParam, pageParam]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const handleSearch = () => {
    updateParam("q", localQ.trim());
  };

  const clearSearch = () => {
    setLocalQ("");
    updateParam("q", "");
  };

  const pageTitle = isSearchPage && qParam
    ? `Kết quả cho "${qParam}"`
    : qParam
      ? `Tìm kiếm: "${qParam}"`
      : "Tất cả sản phẩm";

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-default-900">{pageTitle}</h1>
        {total > 0 && (
          <span className="text-sm text-default-400">{total.toLocaleString("vi-VN")} sản phẩm</span>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex gap-3 mb-7 flex-wrap items-center">
        <div className="flex gap-2 flex-1 min-w-[220px] max-w-md">
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            value={localQ}
            onValueChange={setLocalQ}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            radius="lg"
            startContent={<Search size={15} className="text-default-400" />}
            endContent={localQ ? (
              <button onClick={clearSearch} className="text-default-400 hover:text-default-600">
                <X size={14} />
              </button>
            ) : null}
            classNames={{ inputWrapper: "shadow-sm" }}
          />
          <Button color="primary" radius="lg" onPress={handleSearch} isIconOnly>
            <Search size={16} />
          </Button>
        </div>

        <Select
          aria-label="Sắp xếp"
          selectedKeys={new Set([sortParam])}
          onSelectionChange={(k) => updateParam("sort", Array.from(k)[0] || "newest")}
          radius="lg"
          className="w-44"
          startContent={<SlidersHorizontal size={14} className="text-default-400" />}
        >
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.key}>{o.label}</SelectItem>
          ))}
        </Select>

        {qParam && (
          <Chip
            onClose={clearSearch}
            variant="flat"
            color="primary"
            radius="lg"
            className="font-semibold"
          >
            {qParam}
          </Chip>
        )}
      </div>

      {/* ── Product grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: LIMIT }).map((_, i) => <SkeletonProductCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Không tìm thấy sản phẩm"
          description={qParam ? `Không có sản phẩm nào khớp với "${qParam}".` : "Hiện tại chưa có sản phẩm nào."}
        />
      ) : (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          {products.map((p, i) => (
            <ProductCard key={p._id || i} item={p} index={i} />
          ))}
        </motion.div>
      )}

      {total > LIMIT && (
        <div className="flex justify-center mt-10">
          <Pagination
            total={Math.ceil(total / LIMIT)}
            page={pageParam}
            onChange={(p) => updateParam("page", p > 1 ? String(p) : "")}
            color="primary"
            radius="lg"
            showShadow
          />
        </div>
      )}
    </PageContainer>
  );
}
