import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

export default function ImportDialog({ open, onClose, svc, onImported }) {
  const [file, setFile] = useState();
  const [busy, setBusy] = useState(false);

  const doImport = async () => {
    if (!file) return;
    setBusy(true);
    const res = await svc.importExcel(file);
    setBusy(false);
    onImported?.(res);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader>Import sản phẩm từ Excel</ModalHeader>
        <ModalBody className="space-y-2">
          <p className="text-sm text-default-600">
            Cột bắt buộc: name, sku, price, stock. Tuỳ chọn: category, brand, images, attrs(json)
          </p>
          <Button as="label" variant="bordered" className="cursor-pointer">
            Chọn file Excel
            <input type="file" hidden accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0])} />
          </Button>
          {file && <p className="text-xs text-default-400">{file.name}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>Huỷ</Button>
          <Button color="primary" isDisabled={!file || busy} onPress={doImport}>
            {busy ? "Đang import…" : "Import"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
