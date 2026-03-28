import React from "react";
import { Pagination, Select, SelectItem } from "@heroui/react";
import { useTranslation } from "react-i18next";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Unified pagination bar with page navigation + page-size selector.
 *
 * Props:
 *  - total       : total number of items (from API)
 *  - page        : current page (1-based)
 *  - limit       : items per page
 *  - onPageChange(page)   : called when user navigates
 *  - onLimitChange(limit) : called when user picks a new page size
 *  - sizes       : optional array of page-size options (default [10,20,50,100])
 */
export default function PaginationBar({
  total = 0,
  page = 1,
  limit = 20,
  onPageChange,
  onLimitChange,
  sizes = PAGE_SIZE_OPTIONS,
}) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (total <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      {/* Left: total count */}
      <span className="text-xs text-default-500 whitespace-nowrap">
        {t("common.total")}: {total}
      </span>

      {/* Center: page navigation */}
      {totalPages > 1 && (
        <Pagination
          total={totalPages}
          page={page}
          onChange={onPageChange}
          color="primary"
          radius="lg"
          size="sm"
          showShadow
        />
      )}

      {/* Right: page-size selector */}
      <div className="flex items-center gap-2">
        <Select
          size="sm"
          aria-label={t("common.per_page")}
          selectedKeys={[String(limit)]}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v && onLimitChange) onLimitChange(v);
          }}
          className="w-[75px]"
          radius="lg"
          classNames={{ trigger: "min-h-8 h-8", value: "text-xs" }}
        >
          {sizes.map((s) => (
            <SelectItem key={String(s)} value={String(s)}>
              {String(s)}
            </SelectItem>
          ))}
        </Select>
        <span className="text-xs text-default-500 whitespace-nowrap">
          / {t("common.per_page")}
        </span>
      </div>
    </div>
  );
}
