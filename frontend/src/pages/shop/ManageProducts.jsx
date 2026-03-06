import React, { useState, useEffect } from "react";
import { productService } from "../../services/productService";
import EditProductModal from "../../components/common/EditProductModal";
import {
  Card, CardBody, Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner,
} from "@heroui/react";
import { Search, Pencil, Trash2 } from "lucide-react";

const STATUS_COLOR = { active: "success", out_of_stock: "warning", inactive: "default" };

const ManageProducts = () => {
  const [loading,        setLoading]        = useState(true);
  const [products,       setProducts]       = useState([]);
  const [query,          setQuery]          = useState("");
  const [typingTimeout,  setTypingTimeout]  = useState(null);
  const [showModal,      setShowModal]      = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const data = await productService.getAllProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setQuery(value);
    if (value.trim() === "") { fetchProducts(); return; }
    if (typingTimeout) clearTimeout(typingTimeout);
    const t = setTimeout(async () => {
      const data = await productService.searchProducts(value);
      setProducts(data);
    }, 400);
    setTypingTimeout(t);
  };

  const handleEdit = (product) => { setEditingProduct({ ...product }); setShowModal(true); };

  const handleSave = async (updated) => {
    try {
      await productService.updateProduct(updated._id, updated);
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    try {
      await productService.deleteProduct(deleteTarget._id);
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-default-900">Quản lý sản phẩm</h1>
          <p className="text-sm text-default-400">Xem, tìm kiếm và quản lý toàn bộ sản phẩm trong kho</p>
        </div>
        <Input
          size="sm" placeholder="Tìm kiếm sản phẩm..." value={query}
          onValueChange={handleSearch} radius="lg" className="w-64"
          startContent={<Search size={14} className="text-default-400" />}
          isClearable onClear={() => handleSearch("")}
        />
      </div>

      <Card radius="xl" shadow="sm">
        <CardBody className="p-0 overflow-auto">
          {products.length === 0 ? (
            <div className="text-center py-16 text-default-400">Không tìm thấy sản phẩm phù hợp</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-100">
                <tr>
                  {["Ảnh", "Tên sản phẩm", "Giá", "Tồn kho", "Trạng thái", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-default-50 transition-colors">
                    <td className="px-4 py-3">
                      <img
                        src={p.images?.[0] || "/no-image.jpg"} alt={p.name}
                        className="w-14 h-14 object-cover rounded-xl"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-default-900 truncate">{p.name}</p>
                      <p className="text-xs text-default-400 truncate">{p.description || "Không có mô tả"}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {p.base_price.toLocaleString("vi-VN")}₫
                    </td>
                    <td className="px-4 py-3">{p.stock_total}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" color={STATUS_COLOR[p.status] || "default"} variant="flat">
                        {p.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="bordered" radius="lg" startContent={<Pencil size={13} />} onPress={() => handleEdit(p)}>
                          Sửa
                        </Button>
                        <Button size="sm" color="danger" variant="bordered" radius="lg" startContent={<Trash2 size={13} />} onPress={() => setDeleteTarget(p)}>
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Edit Modal (custom component) */}
      {showModal && editingProduct && (
        <EditProductModal
          show={showModal}
          onHide={() => setShowModal(false)}
          product={editingProduct}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} radius="xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Xác nhận xóa sản phẩm</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500">
                  Bạn có chắc chắn muốn xóa sản phẩm "<strong className="text-default-900">{deleteTarget?.name}</strong>"?
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Hủy</Button>
                <Button color="danger" onPress={async () => { await confirmDelete(); onClose(); }}>Xóa</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ManageProducts;
