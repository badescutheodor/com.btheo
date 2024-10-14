import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useDropzone } from "react-dropzone";
import {
  FiX,
  FiChevronDown,
  FiCalendar,
  FiClock,
  FiUpload,
} from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import { useForm } from "./FormProvider";
import styles from "@/app/styles/Input.module.css";

const Switch = lazy(() => import("./Switch"));
const Checkbox = lazy(() => import("./Checkbox"));
const Radio = lazy(() => import("./Radio"));

type InputType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "select"
  | "textarea"
  | "switch"
  | "checkbox"
  | "radio"
  | "date"
  | "time"
  | "datetime"
  | "file";

interface InputProps {
  type: InputType;
  name: string;
  label?: string;
  placeholder?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  addonLeft?: React.ReactNode;
  addonRight?: React.ReactNode;
  options?: { value: string; label: string }[];
  floatingLabel?: boolean;
  loading?: boolean;
  disabled?: boolean;
  withClear?: boolean;
  className?: string;
  multiple?: boolean;
  accept?: string;
  maxLength?: number;
  autoFocus?: boolean;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  error?: string;
}

const Input: React.FC<InputProps> = React.memo(
  ({
    type,
    name,
    label,
    placeholder,
    iconLeft,
    iconRight,
    addonLeft,
    addonRight,
    options,
    floatingLabel,
    loading,
    disabled,
    withClear,
    className,
    multiple,
    accept,
    maxLength,
    autoFocus,
    value: propValue,
    onChange: propOnChange,
    onBlur: propOnBlur,
    error: propError,
  }) => {
    const formContext = useForm();
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(null);

    const isControlled = propValue !== undefined && propOnChange !== undefined;

    const value = isControlled ? propValue : formContext?.values[name];
    const error = isControlled ? propError : formContext?.errors[name];
    const touched = isControlled ? true : formContext?.touched[name];

    useEffect(() => {
      if (floatingLabel && inputRef.current) {
        if (value) {
          inputRef.current.classList.add(styles.hasValue);
        } else {
          inputRef.current.classList.remove(styles.hasValue);
        }
      }

      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }, [value, floatingLabel, name, autoFocus]);

    const handleFocus = () => {
      setIsFocused(true);
      if (!isControlled) {
        formContext?.setFieldTouched(name, true);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (isControlled) {
        propOnBlur?.();
      } else {
        formContext?.validateField(name);
      }
    };

    const handleChange = (newValue: any) => {
      if (isControlled) {
        propOnChange(newValue);
      } else {
        formContext?.setFieldValue(name, newValue);
      }
    };

    const handleClear = () => {
      handleChange("");
    };

    const onDrop = (acceptedFiles: File[]) => {
      handleChange(acceptedFiles);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      disabled,
      multiple,
      accept: accept ? { [accept]: [] } : undefined,
    });

    const renderFileUpload = () => {
      const files = Array.isArray(value) ? value : [];
      return (
        <div className={styles.fileUpload}>
          <div
            {...getRootProps()}
            className={`${styles.dropzone} ${
              isDragActive ? styles.active : ""
            }`}
          >
            <input {...getInputProps()} />
            <FiUpload className={styles.uploadIcon} />
            <p>Drag & drop files here, or click to select files</p>
          </div>
          {files.length > 0 && (
            <div className={styles.filePreview}>
              {files.map((file: File, index: number) => (
                <div key={index} className={styles.fileItem}>
                  {file.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className={styles.imagePreview}
                    />
                  ) : (
                    <span>{file.name}</span>
                  )}
                  <button
                    onClick={() =>
                      handleChange(
                        files.filter((_: File, i: number) => i !== index)
                      )
                    }
                    className={styles.removeFile}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    const renderInput = () => {
      const commonProps = {
        name,
        value: value || "",
        onChange: (
          e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          >
        ) => handleChange(e.target.value),
        onFocus: handleFocus,
        onBlur: handleBlur,
        disabled,
        placeholder,
        className: `${styles.input} ${touched && error ? styles.error : ""} ${
          iconLeft ? styles.hasIconLeft : ""
        } ${iconRight ? styles.hasIconRight : ""} ${
          addonLeft ? styles.hasAddonLeft : ""
        } ${addonRight ? styles.hasAddonRight : ""} ${className || ""}`,
        autoFocus,
      };

      switch (type) {
        case "select":
          return (
            <div className={styles.selectWrapper}>
              <select
                {...commonProps}
                ref={inputRef as React.RefObject<HTMLSelectElement>}
              >
                {options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className={styles.selectIcon} />
            </div>
          );
        case "textarea":
          return (
            <>
              <textarea
                {...commonProps}
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                maxLength={maxLength}
              />
              {maxLength && (
                <div className={styles.characterCount}>
                  {value?.length || 0} / {maxLength}
                </div>
              )}
            </>
          );
        case "switch":
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <Switch
                name={name}
                checked={!!value}
                onChange={(checked) => handleChange(checked)}
                label={label}
                disabled={disabled}
              />
            </Suspense>
          );
        case "checkbox":
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <Checkbox
                name={name}
                checked={!!value}
                onChange={(checked) => handleChange(checked)}
                label={label}
                disabled={disabled}
              />
            </Suspense>
          );
        case "radio":
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <Radio
                name={name}
                checked={!!value}
                onChange={(checked) => handleChange(checked)}
                label={label}
                disabled={disabled}
              />
            </Suspense>
          );
        case "date":
        case "time":
        case "datetime":
          return (
            <DatePicker
              selected={value ? new Date(value) : null}
              onChange={(date: Date) =>
                handleChange(moment(date).utc().format())
              }
              showTimeSelect={type !== "date"}
              showTimeSelectOnly={type === "time"}
              timeIntervals={15}
              timeCaption="Time"
              dateFormat={
                type === "date"
                  ? "yyyy-MM-dd"
                  : type === "time"
                  ? "HH:mm"
                  : "yyyy-MM-dd HH:mm"
              }
              disabled={disabled}
              customInput={
                <div className={styles.customDatePickerInput}>
                  {type !== "time" && <FiCalendar className={styles.icon} />}
                  {type !== "date" && <FiClock className={styles.icon} />}
                  <input {...commonProps} readOnly />
                </div>
              }
            />
          );
        case "file":
          return renderFileUpload();
        default:
          return (
            <>
              <input
                type={type}
                {...commonProps}
                ref={inputRef as React.RefObject<HTMLInputElement>}
                maxLength={maxLength}
              />
              {maxLength && type === "text" && (
                <div className={styles.characterCount}>
                  {value?.length || 0} / {maxLength}
                </div>
              )}
            </>
          );
      }
    };

    return (
      <div
        className={`${styles.inputWrapper} ${
          floatingLabel ? styles.floatingLabel : ""
        }`}
      >
        {label &&
          type !== "switch" &&
          type !== "checkbox" &&
          type !== "radio" && (
            <label className={styles.label} htmlFor={name}>
              {label}
            </label>
          )}
        <div className={styles.inputContainer}>
          {iconLeft && (
            <span className={`${styles.icon} ${styles.iconLeft}`}>
              {iconLeft}
            </span>
          )}
          {addonLeft && (
            <span className={`${styles.addon} ${styles.addonLeft}`}>
              {addonLeft}
            </span>
          )}
          {renderInput()}
          {iconRight && (
            <span className={`${styles.icon} ${styles.iconRight}`}>
              {iconRight}
            </span>
          )}
          {addonRight && (
            <span className={`${styles.addon} ${styles.addonRight}`}>
              {addonRight}
            </span>
          )}
          {withClear && value && !disabled && type !== "file" && (
            <button
              className={styles.clearButton}
              onClick={handleClear}
              type="button"
            >
              <FiX />
            </button>
          )}
          {loading && <div className={styles.loader}></div>}
        </div>
        {touched && error && <p className={styles.errorMessage}>{error}</p>}
      </div>
    );
  }
);

export default Input;
