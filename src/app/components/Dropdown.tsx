import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "@/app/styles/Dropdown.module.css";
import Link from "next/link";
import cx from "classnames";

interface Option {
  value?: string;
  label?: string;
  href?: string;
  onClick?: () => void;
}

interface DropdownProps {
  options: Option[];
  onSelect: (option: Option) => void;
  children?: React.ReactNode;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  onSelect,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);

  const handleSelect = (option: Option) => {
    setSelectedOption(option);
    setIsOpen(false);
    onSelect(option);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={`${styles.dropdown} ${className}`}
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.dropdownToggle}>
        <span>
          {children
            ? selectedOption
              ? children
              : children
            : selectedOption
            ? selectedOption.label
            : "Select an option"}
        </span>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </div>
      <ul
        className={cx(styles.dropdownMenu, {
          [styles.open]: isOpen,
        })}
      >
        {options.map((option, index) => (
          <li
            key={index}
            className={styles.dropdownItem}
            onClick={() => handleSelect(option)}
          >
            {option.href ? (
              <Link href={option.href}>{option.label}</Link>
            ) : option.onClick ? (
              <span onClick={option.onClick}>{option.label}</span>
            ) : (
              <span>{option.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dropdown;
