import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "@/app/styles/Accordion.module.css";

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionItemProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = isOpen
        ? `${contentRef.current.scrollHeight}px`
        : "0";
    }
  }, [isOpen]);

  return (
    <div className={styles.accordionItem}>
      <button className={styles.accordionHeader} onClick={toggleAccordion}>
        <span>{title}</span>
        {isOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
      </button>
      <div
        ref={contentRef}
        className={`${styles.accordionContent} ${isOpen ? styles.open : ""}`}
      >
        <div className={styles.accordionContentInner}>{children}</div>
      </div>
    </div>
  );
};

export default Accordion;
