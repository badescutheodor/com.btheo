import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "@/app/styles/Modal.module.css";
import { FiX } from "react-icons/fi";
import useOutsideClick from "@/hooks/useOutsideClick";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children }) => {
  const [mounted, setMounted] = useState(false);
  const modalRef = useOutsideClick(onClose);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <div className={`${styles.overlay} ${isOpen ? styles.open : ""}`}>
      <div
        ref={modalRef}
        className={`${styles.modal} ${isOpen ? styles.open : ""}`}
      >
        <button className={styles.closeButton} onClick={onClose}>
          <FiX />
        </button>
        <div className={styles.modalContent}>
          {title && <h2 className={styles.modalTitle}>{title}</h2>}
          <div className={styles.modalBody}>{isOpen && children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
