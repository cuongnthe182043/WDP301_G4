import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export default function ConfirmProvider({ children }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({});
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    setState({
      title:      opts.title      || t("common.confirm"),
      content:    opts.content    || t("common.confirm_action"),
      okText:     opts.okText     || t("common.ok"),
      cancelText: opts.cancelText || t("common.cancel"),
      okColor:    opts.okColor    || "danger",
    });
    setOpen(true);
    return new Promise((resolve) => { resolverRef.current = resolve; });
  }, []);

  const handleClose = (result) => {
    setOpen(false);
    resolverRef.current?.(result);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal isOpen={open} onClose={() => handleClose(false)} size="sm">
        <ModalContent>
          <ModalHeader>{state.title}</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">{state.content}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => handleClose(false)}>{state.cancelText}</Button>
            <Button color={state.okColor} onPress={() => handleClose(true)}>{state.okText}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
