import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

export default function ImportDialog({ open, onClose, svc, onImported }) {
  const { t } = useTranslation();
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
        <ModalHeader>{t("product.import_from_excel")}</ModalHeader>
        <ModalBody className="space-y-2">
          <p className="text-sm text-default-600">
            {t("product.import_required_cols")}
          </p>
          <Button as="label" variant="bordered" className="cursor-pointer">
            {t("product.pick_excel_file")}
            <input type="file" hidden accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0])} />
          </Button>
          {file && <p className="text-xs text-default-400">{file.name}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
          <Button color="primary" isDisabled={!file || busy} onPress={doImport}>
            {busy ? t("product.importing") : t("product.import")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
