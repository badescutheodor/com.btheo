import React from "react";
import styles from "@/app/styles/Radio.module.css";
import { useForm } from "./FormProvider";

interface RadioProps {
  name: string;
  value: string;
  label?: string;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Radio: React.FC<RadioProps> = React.memo(
  ({
    name,
    value,
    label,
    disabled,
    checked: propChecked,
    onChange: propOnChange,
  }) => {
    const formContext = useForm();

    const isControlled =
      propChecked !== undefined && propOnChange !== undefined;
    const checked = isControlled
      ? propChecked
      : formContext?.values[name] === value;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isControlled) {
        propOnChange(e.target.checked);
      } else {
        formContext?.setFieldValue(name, value);
        formContext?.setFieldTouched(name, true);
        formContext?.validateField(name);
      }
    };

    return (
      <label className={`${styles.radio} ${disabled ? styles.disabled : ""}`}>
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <span className={styles.radiomark}></span>
        {label && <span className={styles.radioLabel}>{label}</span>}
      </label>
    );
  }
);

export default Radio;
