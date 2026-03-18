import React from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Select, SelectItem
} from "@heroui/react";
import { useTranslation } from "react-i18next";

const EditProductModal = ({ show, onHide, product, onSave }) => {
  const { t } = useTranslation();
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
        <ModalHeader>{t("product.edit_product")}</ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            label={t("product.name")}
            value={editedProduct.name}
            onValueChange={(v) => handleChange("name", v)}
          />
          <textarea
            className="w-full border border-default-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
            rows={2}
            placeholder={t("product.description")}
            value={editedProduct.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
          />
          <Input
            label={t("product.price_vnd")}
            type="number"
            value={String(editedProduct.base_price)}
            onValueChange={(v) => handleChange("base_price", Number(v))}
          />
          <Input
            label={t("shop.stock")}
            type="number"
            value={String(editedProduct.stock_total)}
            onValueChange={(v) => handleChange("stock_total", Number(v))}
          />
          <Select
            label={t("common.status")}
            selectedKeys={new Set([editedProduct.status])}
            onSelectionChange={(k) => handleChange("status", Array.from(k)[0])}
          >
            <SelectItem key="active">{t("common.status_active")}</SelectItem>
            <SelectItem key="out_of_stock">{t("product.out_of_stock")}</SelectItem>
            <SelectItem key="inactive">{t("common.status_inactive")}</SelectItem>
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onHide}>{t("common.cancel")}</Button>
          <Button color="primary" onPress={handleSubmit}>{t("common.save_changes")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditProductModal;
