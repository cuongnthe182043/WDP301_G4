import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export default function ConfirmProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ title: "Xác nhận", content: "Bạn chắc chắn?" });
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    setState({
      title: opts.title || "Xác nhận",
      content: opts.content || "Bạn chắc chắn muốn thực hiện hành động này?",
      okText: opts.okText || "Đồng ý",
      cancelText: opts.cancelText || "Huỷ",
      okColor: opts.okColor || "danger",
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
