// frontend/src/components/shop/ShopSideNav.jsx
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const groups = [
  { title: "Tổng quan", items: [{ t: "Bảng điều khiển", to: "/shop/dashboard" }] },
  {
    title: "Sản phẩm", items: [
      { t: "Tất cả sản phẩm", to: "/shop/products" },
      { t: "Thêm sản phẩm", to: "/shop/products/new" },
      { t: "Hàng sắp hết", to: "/shop/inventory/low-stock" },
    ]
  },
  {
    title: "Danh mục & Thuộc tính", items: [
      { t: "Danh mục", to: "/shop/catalog/categories" },
      { t: "Thuộc tính", to: "/shop/catalog/attributes" },
      { t: "Brand", to: "/shop/catalog/brands" },
    ]
  },
  { title: "Dữ liệu", items: [{ t: "Import Excel", to: "/shop/products#import" }] },
];

export default function ShopSideNav({ open, onClose }) {
  const nav = useNavigate();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed left-0 top-0 h-full w-72 bg-white shadow-xl z-50 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-default-100">
          <span className="font-bold text-default-900">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-default-100 text-default-500"
          >
            <X size={20} />
          </button>
        </div>

        {groups.map(g => (
          <div key={g.title}>
            <p className="px-4 py-2 text-xs font-semibold uppercase text-default-400 tracking-wide">
              {g.title}
            </p>
            {g.items.map(it => (
              <button
                key={it.t}
                onClick={() => { nav(it.to); onClose?.(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-default-700 hover:bg-default-50 hover:text-primary transition-colors"
              >
                {it.t}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
