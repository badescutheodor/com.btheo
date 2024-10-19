import React, {
  useState,
  useRef,
  useEffect,
  lazy,
  Suspense,
  useCallback,
} from "react";
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
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

const Switch = lazy(() => import("./Switch"));
const Checkbox = lazy(() => import("./Checkbox"));
const Radio = lazy(() => import("./Radio"));

const getNestedValue = (
  obj: any,
  path: string,
  defaultValue: any = undefined
): any => {
  const keys = path.split(".");
  let result = obj;
  for (const key of keys) {
    if (result == null || typeof result !== "object") {
      return defaultValue;
    }
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
};

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
  | "file"
  | "react-select"
  | "react-select-creatable";

interface InputProps {
  type?: InputType;
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
  autoScaleHeight?: boolean;
  value?: unknown;
  onChange?: (value: unknown, e?: any) => void;
  onBlur?: (e?: any) => void;
  error?: string;
  isMulti?: boolean;
  isClearable?: boolean;
  isSearchable?: boolean;
  style?: React.CSSProperties;
}

const Input: React.FC<InputProps> = React.memo(
  ({
    type = "text",
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
    autoScaleHeight,
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
    isMulti,
    isClearable,
    isSearchable,
    style,
  }) => {
    let formContext = {};
    try {
      formContext = useForm();
    } catch {}

    const getValue = (
      name: string,
      isControlled: boolean,
      propValue: any,
      formContext: any
    ) => {
      if (isControlled) {
        return propValue;
      }
      return getNestedValue(formContext?.values, name);
    };

    const [isFocused, setIsFocused] = useState(autoFocus);
    const inputRef = useRef<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const isControlled = propValue !== undefined && propOnChange !== undefined;

    const value = getValue(name, isControlled, propValue, formContext);
    const error = isControlled ? propError : formContext?.errors[name];
    const touched = isControlled ? true : formContext?.touched[name];

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (type === "textarea" && autoScaleHeight && textareaRef.current) {
        adjustTextareaHeight();
      }
    }, [value, type, autoScaleHeight]);

    const adjustTextareaHeight = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };

    const handleTextareaChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      handleChange(e.target.value);
      if (autoScaleHeight) {
        adjustTextareaHeight();
      }
    };

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

    const handleFocus = (e: any) => {
      e && e.stopPropagation();
      setIsFocused(true);
      if (!isControlled) {
        formContext?.setFieldTouched(name, true);
      }
    };

    const debouncedValidation = useCallback(
      (fieldName: string, fieldValue: unknown) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          formContext?.validateField(fieldName, fieldValue);
        }, 300);
      },
      [formContext]
    );

    const handleBlur = (e: any) => {
      e && e.stopPropagation();
      setIsFocused(false);
      if (isControlled) {
        propOnBlur?.(e);
      } else {
        value && formContext?.setFieldTouched(name, true);
        touched && debouncedValidation(name, value);
      }
    };

    const handleChange = (newValue: any, e?: any) => {
      e && e.stopPropagation();
      if (isControlled) {
        propOnChange(newValue, e);
      } else {
        formContext?.setFieldValue(name, newValue);
        touched && debouncedValidation(name, newValue);
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
        ) => handleChange(e.target.value, e),
        onFocus: handleFocus,
        onBlur: handleBlur,
        disabled,
        placeholder,
        className: `${styles.input} ${error ? styles.error : ""} ${
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
                ref={textareaRef}
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                maxLength={maxLength}
                onChange={handleTextareaChange}
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
            <Suspense fallback={null}>
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
            <Suspense fallback={null}>
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
            <Suspense fallback={null}>
              <Radio
                name={name}
                checked={!!value}
                onChange={(checked) => handleChange(checked)}
                label={label}
                value={value}
                disabled={disabled}
              />
            </Suspense>
          );
        case "date":
        case "time":
        case "datetime":
          return (
            <DatePicker
              selected={value ? moment(value).toDate() : null}
              onChange={(date: Date, e: any) => {
                handleChange(moment(date).utc().format(), e);
              }}
              showTimeSelect={type !== "date"}
              showTimeSelectOnly={type === "time"}
              timeIntervals={15}
              timeCaption="Time"
              dateFormat={
                type === "date"
                  ? "yyyy-MM-dd HH:mm"
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
        case "react-select":
        case "react-select-creatable":
          const SelectComponent =
            type === "react-select" ? Select : CreatableSelect;
          return (
            <SelectComponent
              options={options}
              value={value}
              name={name}
              onChange={(newValue) => handleChange(newValue)}
              onBlur={handleBlur}
              isDisabled={disabled}
              isLoading={loading}
              placeholder={placeholder}
              className={`${styles.reactSelect} ${error ? styles.error : ""}`}
              classNamePrefix="react-select"
              isMulti={isMulti}
              isClearable={isClearable}
              isSearchable={isSearchable}
            />
          );
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
          floatingLabel && (isFocused || value) ? styles.floatingLabel : ""
        }`}
        {...(style ? { style } : {})}
      >
        {label &&
          type !== "switch" &&
          type !== "checkbox" &&
          type !== "radio" &&
          (floatingLabel ? floatingLabel && (value || isFocused) : true) && (
            <label className={styles.label} htmlFor={name}>
              {label}
            </label>
          )}
        <div className={styles.inputContainer}>
          {iconLeft && (
            <span
              className={`${styles.icon} ${styles.iconLeft} ${
                error ? styles.error : ""
              }`}
            >
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
        {error && <p className={styles.errorMessage}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
