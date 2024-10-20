import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import styles from "@/app/styles/Alert.module.css";

interface AlertProps {
  type?: "success" | "warning" | "error" | "default";
  onClose?: () => void;
  children: React.ReactNode[];
  open?: boolean;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  open,
  onClose,
  children,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(open || true);

  useEffect(() => {
    setIsVisible(open || true);
  }, [open]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`${styles.alert} ${styles[type || "default"]}`}>
      <span className={styles.message}>{children}</span>
      <button className={styles.closeButton} onClick={handleClose}>
        <FiX />
      </button>
    </div>
  );
};

export default Alert;
