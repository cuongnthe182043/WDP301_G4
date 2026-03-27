import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { productAdminService as svc } from "../../services/productAdminService";
import {
  Card, CardBody, Button, Input, Chip, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import { ChevronLeft, Plus, Trash2, Save, Pencil, X, Check } from "lucide-react";

function fmt(n) {
  return Number(n || 0).toLocaleString() + " ₫";
}

function genSku(slug, attrs) {
  const base = (slug || "PROD").slice(0, 6).toUpperCase();
  const suffix = Object.values(attrs)
    .map((v) => String(v).slice(0, 2).toUpperCase().replace(/\s/g, ""))
    .join("-");
  return suffix ? `${base}-${suffix}` : base;
}

/** Single variant row with inline edit for stock + price */
function VariantRow({ variant, onSave, onDelete, t }) {
  const [editing, setEditing]   = useState(false);
  const [stock,   setStock]     = useState(String(variant.stock ?? 0));
  const [price,   setPrice]     = useState(String(variant.price ?? 0));
  const [saving,  setSaving]    = useState(false);

  // Reset local state if variant changes from outside
  useEffect(() => {
    setStock(String(variant.stock ?? 0));
    setPrice(String(variant.price ?? 0));
  }, [variant.stock, variant.price]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(variant._id, {
        stock: Number(stock) || 0,
        price: Number(price) || 0,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setStock(String(variant.stock ?? 0));
    setPrice(String(variant.price ?? 0));
    setEditing(false);
  };

  const attrs = variant.variant_attributes || {};
  const attrEntries = Object.entries(attrs);

  return (
    <tr className="hover:bg-default-50 dark:hover:bg-zinc-800 transition-colors">
      {/* SKU */}
      <td className="px-4 py-3 font-mono text-xs text-default-600 whitespace-nowrap">
        {variant.sku}
      </td>

      {/* Attributes */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {attrEntries.length > 0
            ? attrEntries.map(([k, v]) => (
                <Chip key={k} size="sm" variant="flat" color="primary">
                  {v}
                </Chip>
              ))
            : <span className="text-default-400 text-xs">—</span>
          }
        </div>
      </td>

      {/* Price */}
      <td className="px-4 py-3">
        {editing ? (
          <Input
            size="sm" type="number" min="0" radius="lg"
            value={price}
            onValueChange={setPrice}
            className="w-32"
            endContent={<span className="text-xs text-default-400">₫</span>}
          />
        ) : (
          <span className="font-semibold text-primary">{fmt(variant.price)}</span>
        )}
      </td>

      {/* Stock */}
      <td className="px-4 py-3">
        {editing ? (
          <Input
            size="sm" type="number" min="0" radius="lg"
            value={stock}
            onValueChange={setStock}
            className="w-24"
          />
        ) : (
          <span className={`font-semibold ${Number(variant.stock) === 0 ? "text-danger" : Number(variant.stock) <= 5 ? "text-warning-600" : "text-default-800"}`}>
            {variant.stock ?? 0}
          </span>
        )}
      </td>

      {/* Active badge */}
      <td className="px-4 py-3">
        <Chip
          size="sm"
          color={variant.is_active ? "success" : "default"}
          variant="flat"
        >
          {variant.is_active ? t("common.status_active") : t("common.status_inactive")}
        </Chip>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex gap-1.5 justify-end">
          {editing ? (
            <>
              <Button
                size="sm" color="success" variant="flat" radius="lg" isIconOnly
                isLoading={saving}
                onPress={handleSave}
              >
                {!saving && <Check size={14} />}
              </Button>
              <Button
                size="sm" variant="light" radius="lg" isIconOnly
                onPress={handleCancel}
                isDisabled={saving}
              >
                <X size={14} />
              </Button>
            </>
          ) : (
            <Button
              size="sm" variant="bordered" radius="lg" isIconOnly
              onPress={() => setEditing(true)}
            >
              <Pencil size={13} />
            </Button>
          )}
          <Button
            size="sm" color="danger" variant="light" radius="lg" isIconOnly
            onPress={() => onDelete(variant._id)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function VariantsPage() {
  const { t }      = useTranslation();
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [product,       setProduct]       = useState(null);
  const [rows,          setRows]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  // Matrix builder — pre-filled from product's variant_values
  const [matrixInputs, setMatrixInputs] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, variants] = await Promise.all([
        svc.get(id),
        svc.listVariants(id),
      ]);
      setProduct(p);
      setRows(variants);

      // Pre-fill matrix inputs from product's variant_values
      if (p?.variant_values) {
        const pre = {};
        for (const [dim, vals] of Object.entries(p.variant_values)) {
          if (Array.isArray(vals) && vals.length) pre[dim] = vals.join(", ");
        }
        setMatrixInputs(pre);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (variantId, data) => {
    await svc.updateVariant(variantId, data);
    setRows((prev) =>
      prev.map((v) => v._id === variantId ? { ...v, ...data } : v)
    );
  };

  const handleDelete = async () => {
    await svc.removeVariant(deleteTarget);
    setDeleteTarget(null);
    await load();
  };

  const handleBulkCreate = async () => {
    if (!product) return;
    const dims = product.variant_dimensions || [];
    if (dims.length === 0) return;

    const dimArrays = dims.map((dim) => {
      const raw = matrixInputs[dim] || "";
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }).filter((arr) => arr.length > 0);

    if (dimArrays.length === 0) return;

    // Cartesian product
    const combos = dimArrays.reduce(
      (acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
      [[]]
    );

    const items = combos.map((combo) => {
      const attrs = {};
      dims.forEach((dim, i) => { if (combo[i] !== undefined) attrs[dim] = combo[i]; });
      return {
        sku:                genSku(product.slug, attrs),
        price:              product.base_price || 0,
        stock:              0,
        variant_attributes: attrs,
        is_active:          true,
      };
    });

    await svc.createVariantsBulk(id, items);
    await load();
  };

  // All dimension keys present across all variants (for column headers)
  const dimKeys = Array.from(
    new Set(rows.flatMap((v) => Object.keys(v.variant_attributes || {})))
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const dims = product?.variant_dimensions || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          isIconOnly size="sm" variant="light" radius="lg"
          onPress={() => navigate("/shop/admin/products")}
        >
          <ChevronLeft size={16} />
        </Button>
        <div>
          <h1 className="text-xl font-black text-default-900">
            {t("shop.variants_of", { name: product?.name || "…" })}
          </h1>
          <p className="text-xs text-default-400 mt-0.5">
            {rows.length} {t("shop.variant_count")}
          </p>
        </div>
      </div>

      {/* Matrix builder */}
      {dims.length > 0 && (
        <Card radius="xl" shadow="sm">
          <CardBody className="p-4 space-y-3">
            <h3 className="font-bold text-default-800 dark:text-[#d1d5db]">{t("shop.create_variant_matrix")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {dims.map((dim) => (
                <Input
                  key={dim}
                  size="sm" radius="lg"
                  label={dim}
                  placeholder={t("shop.values_comma_hint")}
                  value={matrixInputs[dim] || ""}
                  onValueChange={(v) =>
                    setMatrixInputs((p) => ({ ...p, [dim]: v }))
                  }
                />
              ))}
            </div>
            <Button
              color="primary" size="sm" radius="lg"
              startContent={<Plus size={14} />}
              onPress={handleBulkCreate}
            >
              {t("shop.create_matrix")}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Variants table */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-default-50 dark:bg-[#1a1e2e] border-b border-default-100 dark:border-[#2e3347]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-default-500 dark:text-[#9ea3b5] uppercase">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-default-500 dark:text-[#9ea3b5] uppercase">
                  {t("product.variants")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">
                  {t("product.price_label")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">
                  {t("shop.stock")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">
                  {t("common.status")}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-default-400">
                    {t("shop.no_variants")}
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <VariantRow
                    key={v._id}
                    variant={v}
                    onSave={handleSave}
                    onDelete={(vid) => setDeleteTarget(vid)}
                    t={t}
                  />
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("shop.variant_delete_title")}</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500">{t("shop.variant_delete_body")}</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" radius="lg" onPress={onClose}>{t("common.cancel")}</Button>
                <Button color="danger" radius="lg" onPress={async () => { await handleDelete(); onClose(); }}>
                  {t("common.delete")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
