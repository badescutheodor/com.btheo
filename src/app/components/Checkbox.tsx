import React from "react";
import styles from "@/app/styles/Checkbox.module.css";
import { useForm } from "./FormProvider";

interface CheckboxProps {
  name: string;
  label?: string;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = React.memo(
  ({ name, label, disabled, checked: propChecked, onChange: propOnChange }) => {
    const formContext = useForm();

    const isControlled =
      propChecked !== undefined && propOnChange !== undefined;
    const checked = isControlled ? propChecked : formContext?.values[name];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked;
      if (isControlled) {
        propOnChange(newChecked);
      } else {
        formContext?.setFieldValue(name, newChecked);
        formContext?.setFieldTouched(name, true);
        formContext?.validateField(name);
      }
    };

    return (
      <label
        className={`${styles.checkbox} ${disabled ? styles.disabled : ""}`}
      >
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <span className={styles.checkmark}></span>
        {label && <span className={styles.checkboxLabel}>{label}</span>}
      </label>
    );
  }
);

export default Checkbox;
