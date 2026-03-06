import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card, CardBody, Button, Checkbox, Divider, Input, Chip, Popover, PopoverTrigger, PopoverContent,
} from "@heroui/react";
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, AlertTriangle, ImageOff, ChevronDown, Check } from "lucide-react";
import { cartService } from "../../services/cartService";
import { formatCurrency } from "../../utils/formatCurrency";
import PageContainer from "../../components/ui/PageContainer.jsx";

import "../../assets/styles/Cart.css";

/* ─────────────────────── Variant helpers (unchanged logic) ─────────────────────── */
const norm = (s) => String(s ?? "").trim().toLowerCase();

function groupVariantOptions(variants) {
  const map = {};
  for (const v of variants || []) {
    const attrs = v?.attributes || {};
    for (const [k, val] of Object.entries(attrs)) {
      if (val == null || val === "") continue;
      if (!map[k]) map[k] = new Set();
      map[k].add(String(val));
    }
  }
  const keys = Object.keys(map).sort((a, b) => a.localeCompare(b));
  const optionGroups = {};
  for (const k of keys) optionGroups[k] = Array.from(map[k]);
  return { optionGroups, orderedKeys: keys };
}
function findVariantById(variants, id) { return (variants || []).find((v) => v._id === id) || null; }
function findBestVariant(variants, selections) {
  if (!variants?.length) return null;
  let best = null, bestScore = -1;
  for (const v of variants) {
    const attrs = v?.attributes || {};
    let score = 0;
    for (const [k, val] of Object.entries(selections || {})) {
      if (!val) continue;
      if (norm(attrs[k]) === norm(val)) score++;
    }
    if ((v.stock ?? 0) > 0) score += 0.25;
    if (score > bestScore) { best = v; bestScore = score; }
  }
  return best;
}
function resolveOnPick(variants, current, key, value) {
  const list = (variants || []).filter((v) => norm(v?.attributes?.[key]) === norm(value));
  if (!list.length) return current;
  let best = null, bestScore = -1;
  for (const v of list) {
    const attrs = v.attributes || {};
    let s = 0;
    for (const [k2, val2] of Object.entries(current || {})) {
      if (k2 === key || !val2) continue;
      if (norm(attrs[k2]) === norm(val2)) s++;
    }
    if ((v.stock ?? 0) > 0) s += 0.25;
    if (s > bestScore) { best = v; bestScore = s; }
  }
  const next = { ...(current || {}), [key]: value };
  if (best?.attributes) for (const [k, v] of Object.entries(best.attributes)) next[k] = v;
  return next;
}
function buildDisabledMap(variants, key, values) {
  const map = new Map();
  for (const val of values) {
    const list = (variants || []).filter((v) => norm(v?.attributes?.[key]) === norm(val));
    map.set(val, !(list.length > 0 && list.some((v) => (v.stock ?? 0) > 0)));
  }
  return map;
}
const titleize = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ─────────────────────── Cart skeleton ─────────────────────── */
function CartSkeleton() {
  return (
    <PageContainer wide>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-default-100 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-default-100 animate-pulse" />
      </div>
    </PageContainer>
  );
}

/* ═══════════════════════════ PAGE ═══════════════════════════ */
export default function CartPage() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [checked, setChecked] = useState(new Set());
  const [pickState, setPickState] = useState({});
  const [vEditor, setVEditor] = useState({ open: false, item: null, temp: {} });
  const [voucherInput, setVoucherInput] = useState("");

  const fetchCart = async () => {
    setLoading(true); setErr("");
    try {
      const res = await cartService.get();
      setData(res);
      const next = {};
      for (const it of res.items || []) {
        const v = findVariantById(it.available_variants, it.variant_id);
        next[it._id] = { selections: v?.attributes ? { ...v.attributes } : {}, selectedVarId: v?._id || it.variant_id || null };
      }
      setPickState(next);
      setChecked(new Set((res.items || []).map((it) => it._id)));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Không tải được giỏ hàng");
      if ([401, 403].includes(e?.response?.status)) {
        navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, []);

  const items = data?.items || [];
  const toggleAll = (on) => setChecked(new Set(on ? items.map(it => it._id) : []));
  const toggleOne = (id) => setChecked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleQty = async (item, nextQty) => {
    const qty = Math.max(1, Number(nextQty) || 1);
    try { const res = await cartService.updateItem(item._id, { qty }); setData(res); }
    catch (e) { alert(e?.response?.data?.message || e.message); }
  };

  const applySelections = async (item, selections) => {
    const bestVariant = findBestVariant(item.available_variants, selections);
    setPickState(ps => ({ ...ps, [item._id]: { selections, selectedVarId: bestVariant?._id || null } }));
    if (bestVariant?._id && bestVariant._id !== item.variant_id) {
      try { const res = await cartService.updateItem(item._id, { variant_id: bestVariant._id }); setData(res); }
      catch (e) { alert(e?.response?.data?.message || e.message); fetchCart(); }
    }
  };

  const removeItem = async (item) => {
    if (!confirm("Xoá sản phẩm này khỏi giỏ?")) return;
    try {
      const res = await cartService.removeItem(item._id);
      setData(res);
      setChecked(prev => { const s = new Set(prev); s.delete(item._id); return s; });
    } catch (e) { alert(e?.response?.data?.message || e.message); }
  };

  const removeSelected = async () => {
    if (!checked.size) return;
    if (!confirm(`Xoá ${checked.size} sản phẩm đã chọn?`)) return;
    try {
      let res = null;
      for (const id of checked) res = await cartService.removeItem(id);
      if (res) setData(res);
      setChecked(new Set());
    } catch (e) { alert(e?.response?.data?.message || e.message); }
  };

  const clearCart = async () => {
    if (!confirm("Xoá toàn bộ giỏ hàng?")) return;
    try { const res = await cartService.clear(); setData(res); setChecked(new Set()); }
    catch (e) { alert(e?.response?.data?.message || e.message); }
  };

  const selectedSummary = useMemo(() => {
    let total = 0, count = 0;
    for (const it of items) {
      if (!checked.has(it._id)) continue;
      const variant = findVariantById(it.available_variants, pickState[it._id]?.selectedVarId || it.variant_id);
      if ((variant?.stock ?? 0) > 0 && it.qty <= (variant?.stock ?? 0)) {
        total += it.total || (it.price || 0) * it.qty;
        count++;
      }
    }
    return { total, count };
  }, [items, checked, pickState]);

  if (loading) return <CartSkeleton />;

  if (err) return (
    <PageContainer>
      <div className="bg-danger-50 text-danger border border-danger-200 px-4 py-3 rounded-2xl">{err}</div>
    </PageContainer>
  );

  return (
    <PageContainer wide>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── Left: Items ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              as={RouterLink} to="/"
              variant="light" size="sm"
              startContent={<ArrowLeft size={16} />}
              className="text-default-600"
            >
              Tiếp tục mua sắm
            </Button>
          </div>

          <Card radius="xl" shadow="sm" className="border border-default-100">
            <CardBody className="p-5 sm:p-6">
              {/* Header row */}
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-black text-default-900">Giỏ hàng</h2>
                  <p className="text-sm text-default-500">{items.length} sản phẩm</p>
                </div>
                <Checkbox
                  isSelected={checked.size === items.length && items.length > 0}
                  isIndeterminate={checked.size > 0 && checked.size < items.length}
                  onValueChange={toggleAll}
                  size="sm"
                >
                  <span className="text-sm font-medium">Chọn tất cả</span>
                </Checkbox>
              </div>

              <Divider className="mb-4" />

              {/* Empty state */}
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-16 text-center"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-3xl bg-default-100 flex items-center justify-center mb-4"
                  >
                    <ShoppingCart size={36} className="text-default-300" strokeWidth={1.5} />
                  </motion.div>
                  <p className="font-bold text-default-700 mb-1">Giỏ hàng trống</p>
                  <p className="text-sm text-default-400 mb-5">Khám phá sản phẩm và thêm vào giỏ của bạn.</p>
                  <Button as={RouterLink} to="/" color="primary" radius="full" className="font-semibold px-7">
                    Mua sắm ngay
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map((it) => {
                      const pick = pickState[it._id] || { selections: {}, selectedVarId: it.variant_id };
                      const selectedVar = findVariantById(it.available_variants, pick.selectedVarId) || findVariantById(it.available_variants, it.variant_id);
                      const { orderedKeys } = groupVariantOptions(it.available_variants);
                      const productHref = it.product?.slug ? `/product/${it.product.slug}` : `/product/${it.product_id}`;
                      const price = it.price || 0;
                      const subTotal = it.total || price * it.qty;
                      const outOfStock = (selectedVar?.stock ?? 0) <= 0;
                      const overStock = !outOfStock && it.qty > (selectedVar?.stock ?? 0);
                      const summary = orderedKeys.map(k => pick.selections?.[k]).filter(Boolean).join(", ");

                      return (
                        <motion.div
                          key={it._id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.25 }}
                          className="border border-default-100 rounded-2xl p-4 hover:shadow-sm transition-shadow bg-white"
                        >
                          <div className="flex gap-3">
                            <Checkbox
                              isSelected={checked.has(it._id)}
                              onValueChange={() => toggleOne(it._id)}
                              size="sm"
                              className="mt-1 flex-shrink-0"
                            />

                            {/* Thumbnail */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-default-100 flex-shrink-0">
                              {it.image ? (
                                <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-default-300">
                                  <ImageOff size={24} />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <RouterLink
                                to={productHref}
                                className="font-semibold text-default-900 hover:text-primary transition-colors truncate block text-sm"
                              >
                                {it.name}
                              </RouterLink>

                              {(outOfStock || overStock) && (
                                <div className="flex items-center gap-1 mt-1 text-warning text-xs font-medium">
                                  <AlertTriangle size={12} />
                                  {outOfStock ? "Biến thể đã hết hàng" : "Vượt quá tồn kho"}
                                </div>
                              )}

                              {/* Variant selector */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs text-default-400">Phân loại:</span>
                                <span className="text-xs font-semibold text-default-700">{summary || "—"}</span>
                                <Popover
                                  isOpen={vEditor.open && vEditor.item?._id === it._id}
                                  onOpenChange={(open) => {
                                    if (!open) setVEditor({ open: false, item: null, temp: {} });
                                  }}
                                  placement="bottom-start"
                                >
                                  <PopoverTrigger>
                                    <Button
                                      size="sm" variant="bordered" radius="full"
                                      endContent={<ChevronDown size={12} />}
                                      className="h-7 text-xs px-2"
                                      onPress={() => {
                                        const p = pickState[it._id] || { selections: {} };
                                        setVEditor({ open: true, item: it, temp: { ...p.selections } });
                                      }}
                                    >
                                      Thay đổi
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="p-4 w-80">
                                    {vEditor.item?._id === it._id && (() => {
                                      const { optionGroups, orderedKeys: keys } = groupVariantOptions(vEditor.item.available_variants);
                                      return (
                                        <div>
                                          {keys.map((key) => {
                                            const vals = optionGroups[key] || [];
                                            const cur = vEditor.temp?.[key] ?? "";
                                            const disabledMap = buildDisabledMap(vEditor.item.available_variants, key, vals);
                                            return (
                                              <div key={key} className="mb-3">
                                                <p className="text-xs font-semibold text-default-600 mb-2">{titleize(key)}:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {vals.map((val) => {
                                                    const active = norm(val) === norm(cur);
                                                    const disabled = disabledMap.get(val) === true;
                                                    return (
                                                      <button
                                                        key={val}
                                                        disabled={disabled}
                                                        onClick={() => setVEditor(p => ({ ...p, temp: resolveOnPick(vEditor.item.available_variants, p.temp, key, val) }))}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                          active ? "bg-primary text-white border-primary" :
                                                          disabled ? "opacity-40 cursor-not-allowed border-default-200 text-default-400" :
                                                          "border-default-300 text-default-700 hover:border-primary hover:text-primary"
                                                        }`}
                                                      >
                                                        {active && <Check size={10} className="inline mr-1" />}{val}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })}
                                          <div className="flex justify-between gap-2 mt-3 pt-3 border-t border-default-100">
                                            <Button size="sm" variant="bordered" radius="lg" onPress={() => setVEditor({ open: false, item: null, temp: {} })}>Trở lại</Button>
                                            <Button size="sm" color="primary" radius="lg" onPress={async () => { await applySelections(vEditor.item, vEditor.temp); setVEditor({ open: false, item: null, temp: {} }); }}>Xác nhận</Button>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Qty + Price row */}
                              <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                                <div className="flex items-center gap-1">
                                  <Button isIconOnly size="sm" variant="bordered" radius="lg"
                                    onPress={() => handleQty(it, Math.max(1, it.qty - 1))} isDisabled={it.qty <= 1}>
                                    <Minus size={13} />
                                  </Button>
                                  <input
                                    type="number"
                                    value={it.qty}
                                    min={1}
                                    className="w-12 text-center text-sm border border-default-300 rounded-lg py-1 outline-none focus:border-primary"
                                    onChange={(e) => handleQty(it, Math.max(1, Number(e.target.value) || 1))}
                                  />
                                  <Button isIconOnly size="sm" variant="bordered" radius="lg"
                                    onPress={() => handleQty(it, it.qty + 1)}>
                                    <Plus size={13} />
                                  </Button>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs text-default-400">Đơn giá</p>
                                  <p className="font-semibold text-sm">{formatCurrency(price)}</p>
                                  <p className="font-black text-primary text-sm">{formatCurrency(subTotal)}</p>
                                </div>

                                <Button isIconOnly size="sm" variant="light" color="danger"
                                  onPress={() => removeItem(it)} aria-label="Xoá">
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {items.length > 0 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-default-100 flex-wrap gap-2">
                  <Button variant="bordered" color="danger" size="sm" radius="lg"
                    startContent={<Trash2 size={14} />}
                    isDisabled={!checked.size} onPress={removeSelected}>
                    Xoá đã chọn ({checked.size})
                  </Button>
                  <Button variant="light" size="sm" radius="lg" onPress={clearCart} className="text-default-500">
                    Xoá toàn bộ
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── Right: Summary ── */}
        <div className="lg:sticky lg:top-20">
          <Card radius="xl" shadow="sm" className="border border-default-100">
            <CardBody className="p-5">
              <h3 className="font-black text-default-900 mb-4">Tóm tắt đơn hàng</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-default-500">Sản phẩm đã chọn</span>
                  <Chip size="sm" variant="flat" color="primary">{selectedSummary.count}</Chip>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-default-500">Tạm tính</span>
                  <span className="font-bold">{formatCurrency(selectedSummary.total)}</span>
                </div>

                <Divider />

                {/* Voucher */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Mã voucher"
                    size="sm"
                    radius="lg"
                    value={voucherInput}
                    onValueChange={setVoucherInput}
                    className="flex-1"
                    maxLength={32}
                  />
                  <Button size="sm" color="primary" radius="lg" variant="flat" className="px-4 font-semibold">
                    Áp dụng
                  </Button>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-default-500">Phí vận chuyển</span>
                  <span className="text-success font-semibold">Miễn phí</span>
                </div>

                <Divider />

                <div className="flex justify-between">
                  <span className="font-bold text-default-800">Tổng thanh toán</span>
                  <span className="font-black text-xl text-primary">{formatCurrency(selectedSummary.total)}</span>
                </div>
                <p className="text-xs text-default-400">Đã bao gồm VAT (nếu có)</p>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    color="primary"
                    fullWidth
                    size="lg"
                    radius="xl"
                    startContent={<ShoppingCart size={18} />}
                    isDisabled={selectedSummary.count === 0}
                    onPress={() => navigate("/checkout", { state: { selected_item_ids: Array.from(checked) } })}
                    className="font-black mt-1 shadow-md"
                  >
                    THANH TOÁN ({selectedSummary.count})
                  </Button>
                </motion.div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
