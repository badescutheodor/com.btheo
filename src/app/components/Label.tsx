import React from "react";
import styles from "@/app/styles/Label.module.css";

interface LabelProps {
  htmlFor?: string;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const Label: React.FC<LabelProps> = ({ htmlFor, href, onClick, children }) => {
  if (href || onClick) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={`${styles.label} ${styles.labelLink}`}
      >
        {children}
      </a>
    );
  }

  return (
    <div className={styles.label} data-for={htmlFor}>
      {children}
    </div>
  );
};

export default Label;
