import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/app/styles/Modal.module.css";
import { FiX } from "react-icons/fi";
import useOutsideClick from "@/hooks/useOutsideClick";
import cx from "classnames";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
  style?: React.CSSProperties;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
  fullScreen,
  style,
}) => {
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
        className={cx(styles.modal, {
          [styles.fullScreen]: fullScreen,
          [styles.open]: isOpen,
        })}
        style={style}
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
