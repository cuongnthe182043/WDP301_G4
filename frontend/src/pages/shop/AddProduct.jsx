import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardBody, Button, Spinner, Chip } from "@heroui/react";
import { CheckCircle, Clock, ChevronLeft, Layers } from "lucide-react";
import ProductForm from "../../components/ProductForm";
import { productAdminService as svc } from "../../services/productAdminService";

// Cartesian product of arrays
function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
    [[]]
  );
}

export default function AddProduct({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit" || !!id;

  const [loading,      setLoading]      = useState(false);
  const [fetching,     setFetching]     = useState(isEdit);
  const [initial,      setInitial]      = useState(null);
  const [created,      setCreated]      = useState(null);   // { _id, name, variantCount }

  useEffect(() => {
    if (!isEdit || !id) return;
    svc.get(id)
      .then((p) => setInitial(p))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [id]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      if (isEdit) {
        await svc.update(id, payload);
        navigate("/shop/admin/products");
      } else {
        const p = await svc.create(payload);

        // Auto-create variants from variant_values if provided
        let variantCount = 0;
        const variantValues = payload.variant_values || {};
        const dims = (payload.variant_dimensions || []).filter(
          (d) => (variantValues[d] || []).length > 0
        );

        if (dims.length > 0) {
          try {
            const dimArrays = dims.map((d) => variantValues[d]);
            const combos    = cartesian(dimArrays);
            const rows = combos.map((combo, i) => {
              const attrs = {};
              dims.forEach((d, j) => { attrs[d] = combo[j]; });
              return {
                sku:                `${p._id.replace("prod-", "")}-${i + 1}`,
                price:              payload.base_price,
                stock:              0,
                variant_attributes: attrs,
                is_active:          true,
              };
            });
            await svc.createVariantsBulk(p._id, rows);
            variantCount = rows.length;
          } catch (err) {
            console.error("Auto-create variants failed:", err);
          }
        }

        setCreated({ _id: p._id, name: p.name, variantCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Success state after creation ─────────────────────────────────
  if (created) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-warning-50 flex items-center justify-center">
            <Clock size={36} className="text-warning-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-default-900">Sản phẩm đang chờ duyệt</h2>
          <p className="text-sm text-default-500">
            Sản phẩm <strong className="text-default-700">"{created.name}"</strong> đã được tạo thành công.
            Sản phẩm sẽ hiển thị trên hệ thống sau khi quản trị viên phê duyệt.
          </p>
          {created.variantCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success-50 border border-success-200 rounded-xl">
              <CheckCircle size={13} className="text-success-600" />
              <p className="text-xs text-success-700">
                Đã tạo tự động <strong>{created.variantCount}</strong> biến thể từ các giá trị đã nhập
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="bordered" radius="lg" size="sm"
            startContent={<ChevronLeft size={14} />}
            onPress={() => navigate("/shop/admin/products")}
          >
            Quay lại danh sách
          </Button>
          <Button
            color="primary" radius="lg" size="sm"
            startContent={<Layers size={14} />}
            onPress={() => navigate(`/shop/admin/products/${created._id}/variants`)}
          >
            {created.variantCount > 0 ? "Quản lý biến thể" : "Thêm biến thể"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          isIconOnly size="sm" variant="light" radius="lg"
          onPress={() => navigate("/shop/admin/products")}
        >
          <ChevronLeft size={16} />
        </Button>
        <div>
          <h1 className="text-xl font-black text-default-900">
            {isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          </h1>
          {!isEdit && (
            <p className="text-xs text-default-400 mt-0.5">
              Sản phẩm mới sẽ ở trạng thái <strong>chờ duyệt</strong> cho đến khi quản trị viên phê duyệt
            </p>
          )}
        </div>
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-6">
          <ProductForm
            initial={isEdit ? initial : undefined}
            onSubmit={handleSubmit}
            svc={svc}
            loading={loading}
          />
        </CardBody>
      </Card>
    </div>
  );
}
