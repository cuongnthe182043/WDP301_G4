import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { orderService } from "../../services/orderService";
import {
  Card, CardBody, Tabs, Tab, Button, Chip, Divider, Pagination, Input,
} from "@heroui/react";
import { Truck, Printer, RefreshCw, Receipt, Search } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageContainer from "../../components/ui/PageContainer.jsx";

const STATUS_TABS = [
  { key: "",                 label: "Tất cả" },
  { key: "pending",          label: "Chờ xác nhận" },
  { key: "confirmed",        label: "Đang xử lý" },
  { key: "shipping",         label: "Đang giao" },
  { key: "delivered",        label: "Hoàn thành" },
  { key: "canceled",         label: "Đã hủy" },
  { key: "refund_pending",   label: "Hoàn/Đổi (chờ)" },
  { key: "refund_completed", label: "Hoàn/Đổi xong" },
];

const STATUS_COLOR = {
  pending:          "warning",
  confirmed:        "primary",
  processing:       "primary",
  shipping:         "secondary",
  delivered:        "success",
  canceled:         "default",
  refund_pending:   "warning",
  refund_completed: "success",
};

const STATUS_LABEL = {
  pending:          "Chờ xác nhận",
  confirmed:        "Đang xử lý",
  processing:       "Đang xử lý",
  shipping:         "Đang giao",
  delivered:        "Hoàn thành",
  canceled:         "Đã hủy",
  refund_pending:   "Chờ hoàn/đổi",
  refund_completed: "Đã hoàn/đổi",
};

export default function Orders() {
  const nav = useNavigate();
  const [tab, setTab]   = useState("all");
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [q, setQ]       = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const tabKey = STATUS_TABS.find(t => t.label === tab)?.key ?? "";
      const status = tabKey || undefined;
      const res = await orderService.list({ status, page, limit: 10, q: q || undefined });
      setData(res);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [tab]);

  return (
    <PageContainer wide={false}>
      <h1 className="text-2xl font-black text-default-900 mb-6">Đơn hàng của tôi</h1>

      {/* Filter row */}
      <div className="flex flex-col md:flex-row gap-3 mb-5 items-start md:items-center">
        <Tabs
          selectedKey={tab}
          onSelectionChange={setTab}
          variant="underlined"
          classNames={{ tabList: "gap-1 overflow-x-auto", tab: "text-sm whitespace-nowrap" }}
          className="flex-1"
        >
          {STATUS_TABS.map((t) => <Tab key={t.label} title={t.label} />)}
        </Tabs>
        <div className="flex gap-2 flex-shrink-0">
          <Input
            size="sm"
            placeholder="Tìm mã đơn"
            value={q}
            onValueChange={setQ}
            radius="lg"
            startContent={<Search size={13} className="text-default-400" />}
            onKeyDown={(e) => { if (e.key === "Enter") load(1); }}
            className="w-44"
          />
          <Button size="sm" variant="bordered" radius="lg" onPress={() => load(1)} className="font-medium">
            Tìm
          </Button>
        </div>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-default-100 animate-pulse" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Không có đơn hàng nào"
          description="Đơn hàng của bạn sẽ xuất hiện tại đây sau khi bạn đặt mua."
          actionLabel="Mua sắm ngay"
          onAction={() => nav("/")}
        />
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {data.items.map((o, idx) => (
              <motion.div
                key={o._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <Card radius="xl" shadow="sm" className="border border-default-100">
                  <CardBody className="p-5">
                    {/* Order header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-default-900">#{o.order_code}</span>
                        <Chip
                          size="sm"
                          color={STATUS_COLOR[o.status] || "default"}
                          variant="flat"
                          className="font-semibold"
                        >
                          {STATUS_LABEL[o.status] || o.status}
                        </Chip>
                        {o.createdAt && (
                          <span className="text-xs text-default-400">
                            {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Truck size={13} />}
                          onPress={() => nav(`/orders/${o._id}`)}
                          className="font-medium"
                        >
                          Chi tiết
                        </Button>
                        <Button
                          size="sm" variant="bordered" radius="lg"
                          startContent={<Printer size={13} />}
                          onPress={async () => { const { url } = await orderService.invoice(o._id); window.open(url, "_blank"); }}
                          className="font-medium"
                        >
                          Hoá đơn
                        </Button>
                        <Button
                          size="sm" color="primary" radius="lg" variant="flat"
                          startContent={<RefreshCw size={13} />}
                          onPress={async () => { await orderService.reorder(o._id); nav("/cart"); }}
                          className="font-medium"
                        >
                          Mua lại
                        </Button>
                      </div>
                    </div>

                    <Divider className="mb-3" />

                    {/* Items preview */}
                    <div className="space-y-2.5">
                      {(o.items || []).slice(0, 3).map((it, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-default-100 flex-shrink-0">
                              {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-default-900 line-clamp-1">{it.name}</p>
                              {it.variant_text && <p className="text-xs text-default-400">{it.variant_text}</p>}
                              <p className="text-xs text-default-400">SL: {it.qty}</p>
                            </div>
                          </div>
                          <p className="font-bold text-sm text-default-800 whitespace-nowrap">
                            {formatCurrency(it.total || it.price * it.qty)}
                          </p>
                        </div>
                      ))}
                      {(o.items?.length || 0) > 3 && (
                        <p className="text-xs text-default-400 text-center pt-1">
                          +{o.items.length - 3} sản phẩm khác
                        </p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-default-100">
                      <div className="flex gap-2 flex-wrap">
                        {["pending", "confirmed", "processing"].includes(o.status) && (
                          <Button
                            size="sm" color="danger" variant="bordered" radius="lg"
                            onPress={async () => {
                              if (!confirm("Hủy đơn hàng này?")) return;
                              await orderService.cancel(o._id);
                              await load(data.page);
                            }}
                          >
                            Hủy đơn
                          </Button>
                        )}
                        {o.status === "delivered" && (
                          <Button
                            size="sm" variant="bordered" radius="lg"
                            onPress={async () => { await orderService.reviewReminder(o._id); alert("Đã gửi nhắc nhở"); }}
                          >
                            Nhắc đánh giá
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default-400">Tổng:</span>
                        <span className="font-black text-primary text-base">
                          {formatCurrency(Number(o.total_price))}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {(data.total || 0) > (data.limit || 10) && (
        <div className="flex justify-center mt-8">
          <Pagination
            total={Math.ceil(data.total / data.limit) || 1}
            page={data.page}
            onChange={(p) => load(p)}
            color="primary"
            radius="lg"
            showShadow
          />
        </div>
      )}
    </PageContainer>
  );
}
