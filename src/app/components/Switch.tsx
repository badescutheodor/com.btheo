import React from "react";
import styles from "@/app/styles/Switch.module.css";
import { useForm } from "./FormProvider";

interface SwitchProps {
  name: string;
  label?: string;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = React.memo(
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
      <label className={`${styles.switch} ${disabled ? styles.disabled : ""}`}>
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <span className={styles.slider}></span>
        {label && <span className={styles.switchLabel}>{label}</span>}
      </label>
    );
  }
);

export default Switch;
