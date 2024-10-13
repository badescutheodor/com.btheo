import React from "react";
import { IconType } from "react-icons";
import styles from "@/app/styles/Button.module.css";
import cx from "classnames";

interface ButtonProps {
  children?: React.ReactNode;
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  color?: "default" | "primary" | "success" | "warning" | "error";
  inverted?: boolean;
  icon?: IconType;
  onClick?: () => void;
  href?: string;
  className?: string;
  target?: string;
  rel?: string;
  maskAnimated?: 1 | 2 | 3;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "medium",
  fullWidth = false,
  loading = false,
  disabled = false,
  color = "default",
  inverted = false,
  icon: Icon,
  onClick,
  href,
  target,
  rel,
  className,
  maskAnimated,
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    styles[size],
    styles[color],
    fullWidth ? styles.fullWidth : "",
    loading ? styles.loading : "",
    inverted ? styles.inverted : "",
    maskAnimated ? styles[`button--mask-${maskAnimated}`] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {maskAnimated && <span className={styles.button__mask}></span>}
      <span className={styles.button__text}>
        {Icon && (
          <Icon
            className={cx(styles.icon, {
              [styles.iconMargin]: children,
            })}
          />
        )}
        {children}
      </span>
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        className={buttonClasses}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;
