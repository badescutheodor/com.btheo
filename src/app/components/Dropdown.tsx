import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "@/app/styles/Dropdown.module.css";
import Link from "next/link";
import cx from "classnames";

interface Option {
  value?: string;
  label?: string;
  labelClassName?: string;
  href?: string;
  onClick?: () => void;
}

interface DropdownProps {
  options: Option[];
  onSelect: (option: Option) => void;
  children?: React.ReactNode | ((params: any) => React.ReactNode);
  className?: string;
  withCaret: boolean;
  withHover?: boolean;
  menuOpen?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  onSelect,
  children,
  className,
  withCaret = true,
  menuOpen,
  withHover,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => withHover && setIsOpen(true);
  const handleMouseLeave = () => withHover && setIsOpen(false);

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
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.dropdownToggle}>
        <span>
          {typeof children === "function" && children({ open: isOpen })}
          {typeof children !== "function" &&
            (children
              ? selectedOption
                ? children
                : children
              : selectedOption
              ? selectedOption.label
              : "Select an option")}
        </span>
        {withCaret ? isOpen ? <FiChevronUp /> : <FiChevronDown /> : null}
      </div>
      <ul
        className={cx(styles.dropdownMenu, {
          [styles.open]: isOpen || menuOpen,
        })}
      >
        {options.map((option, index) => (
          <li
            key={index}
            className={styles.dropdownItem}
            onClick={() => handleSelect(option)}
          >
            {option.href ? (
              <Link href={option.href} className={cx(option.labelClassName)}>
                {option.label}
              </Link>
            ) : option.onClick ? (
              <span
                onClick={option.onClick}
                className={cx(option.labelClassName)}
              >
                {option.label}
              </span>
            ) : (
              <span className={cx(option.labelClassName)}>{option.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dropdown;
