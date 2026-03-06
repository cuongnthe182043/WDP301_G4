import React from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Select, SelectItem
} from "@heroui/react";

const EditProductModal = ({ show, onHide, product, onSave }) => {
  const [editedProduct, setEditedProduct] = React.useState(product);

  const handleChange = (field, value) => {
    setEditedProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(editedProduct);
  };

  return (
    <Modal isOpen={show} onClose={onHide} size="md">
      <ModalContent>
        <ModalHeader>Chỉnh sửa sản phẩm</ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            label="Tên sản phẩm"
            value={editedProduct.name}
            onValueChange={(v) => handleChange("name", v)}
          />
          <textarea
            className="w-full border border-default-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
            rows={2}
            placeholder="Mô tả"
            value={editedProduct.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
          />
          <Input
            label="Giá (₫)"
            type="number"
            value={String(editedProduct.base_price)}
            onValueChange={(v) => handleChange("base_price", Number(v))}
          />
          <Input
            label="Tồn kho"
            type="number"
            value={String(editedProduct.stock_total)}
            onValueChange={(v) => handleChange("stock_total", Number(v))}
          />
          <Select
            label="Trạng thái"
            selectedKeys={new Set([editedProduct.status])}
            onSelectionChange={(k) => handleChange("status", Array.from(k)[0])}
          >
            <SelectItem key="active">Hoạt động</SelectItem>
            <SelectItem key="out_of_stock">Hết hàng</SelectItem>
            <SelectItem key="inactive">Ngừng bán</SelectItem>
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onHide}>Hủy</Button>
          <Button color="primary" onPress={handleSubmit}>Lưu thay đổi</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditProductModal;
