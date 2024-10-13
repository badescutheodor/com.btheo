import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "@/app/styles/Dropdown.module.css";
import Link from "next/link";
import useOutsideClick from "@/hooks/useOutsideClick";

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

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (option: Option) => {
    setSelectedOption(option);
    setIsOpen(false);
    onSelect(option);
  };

  const handleOutsideClick = () => {
    if (isOpen) {
      setIsOpen(false);
    }
  };

  const dropdownRef = useOutsideClick(handleOutsideClick);

  return (
    <div className={`${styles.dropdown} ${className}`} ref={dropdownRef}>
      <div className={styles.dropdownToggle} onClick={toggleDropdown}>
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
      <ul className={`${styles.dropdownMenu} ${isOpen ? styles.open : ""}`}>
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
