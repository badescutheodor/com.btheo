import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import * as yup from "yup";

type ValidationRule =
  | yup.AnySchema
  | ((value: unknown) => Promise<void> | void);

export interface ValidationSchema {
  [key: string]: {
    rules?: ValidationRule[];
    type?: string;
    size?: string;
    options?: { value: string; label: string }[];
    row?: number;
    [key: string]: unknown;
  };
}

interface FormContextType {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setFieldValue: (name: string, value: unknown) => void;
  setFieldTouched: (name: string, isTouched: boolean) => void;
  validateField: (name: string, value: unknown) => Promise<void>;
  validateForm: () => Promise<boolean>;
  resetForm: () => void;
  resetErrors: () => void;
  submitForm: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitted: boolean;
  done: boolean;
  resetSubmissionState: () => void;
  clientValidationFailed: boolean;
  serverValidationFailed: boolean;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

interface FormProviderProps {
  children: React.ReactNode | ((context: FormContextType) => React.ReactNode);
  initialValues?: Record<string, unknown>;
  validationSchema?: ValidationSchema;
  onSubmit: (values: Record<string, unknown>) => void;
  enableEnterSubmit?: boolean;
}

export const FormProvider: React.FC<FormProviderProps> = ({
  children,
  initialValues,
  validationSchema,
  onSubmit,
  enableEnterSubmit = true,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [values, setValues] = useState(initialValues || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientValidationFailed, setClientValidationFailed] = useState(false);
  const [serverValidationFailed, setServerValidationFailed] = useState(false);

  const setFieldValue = useCallback((name: string, value: unknown) => {
    setValues((prevValues) => {
      const keys = name.split(".");
      const lastKey = keys.pop()!;
      let current: any = prevValues;

      for (const key of keys) {
        if (!(key in current)) {
          current[key] = {};
        }
        current = current[key];
      }

      current[lastKey] = value;

      return { ...prevValues };
    });
  }, []);

  const setFieldTouched = useCallback((name: string, isTouched: boolean) => {
    setTouched((prevTouched) => ({ ...prevTouched, [name]: isTouched }));
  }, []);

  const validateField = useCallback(
    async (name: string, value: any) => {
      const fieldSchema = validationSchema?.[name];
      if (!fieldSchema) return;
      try {
        for (const rule of fieldSchema.rules || []) {
          if (typeof rule === "function") {
            await rule(value);
          } else {
            await rule.validate(value);
          }
        }

        setErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          delete newErrors[name];
          return newErrors;
        });
      } catch (error) {
        if (error instanceof yup.ValidationError) {
          setErrors((prevErrors) => ({ ...prevErrors, [name]: error.message }));
        }
      }
    },
    [values, validationSchema]
  );

  const validateForm = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    for (const [field, schema] of Object.entries(validationSchema || {})) {
      try {
        for (const rule of schema.rules || []) {
          if (typeof rule === "function") {
            await rule(values[field]);
          } else {
            await rule.validate(values[field]);
          }
        }
      } catch (error) {
        isValid = false;
        newErrors[field] =
          error instanceof yup.ValidationError
            ? error.message
            : "This field failed validation";
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validationSchema]);

  const resetForm = useCallback(() => {
    setValues(initialValues || {});
    setErrors({});
    setTouched({});
    setIsSubmitted(false);
    setClientValidationFailed(false);
    setServerValidationFailed(false);
  }, [initialValues]);

  const resetSubmissionState = useCallback(() => {
    setIsSubmitted(false);
    setClientValidationFailed(false);
    setServerValidationFailed(false);
  }, []);

  const resetErrors = useCallback(() => {
    setErrors({});
  }, []);

  const submitForm = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);
      setClientValidationFailed(false);
      setServerValidationFailed(false);

      let isValid = true;
      if (validationSchema) {
        isValid = await validateForm();
      }

      if (isValid) {
        const result: any = await onSubmit(values || {});

        if (result && result.success) {
          setIsSubmitting(false);
          setIsSubmitted(true);
          return;
        }

        if (result) {
          setErrors(result || {});
          setServerValidationFailed(true);
        }
      } else {
        setClientValidationFailed(true);
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
    },
    [validateForm, onSubmit, values, validationSchema]
  );

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (enableEnterSubmit && event.key === "Enter" && !event.shiftKey) {
        const target = event.target as HTMLElement;
        if (target.tagName !== "TEXTAREA") {
          event.preventDefault();
          submitForm(new Event("submit") as any);
        }
      }
    },
    [enableEnterSubmit, submitForm]
  );

  useEffect(() => {
    if (enableEnterSubmit) {
      document.addEventListener("keypress", handleKeyPress);
      return () => {
        document.removeEventListener("keypress", handleKeyPress);
      };
    }
  }, [enableEnterSubmit, handleKeyPress]);

  const hasErrors = Object.keys(errors).length > 0;
  const contextValue = useMemo(
    () => ({
      values,
      errors,
      touched,
      isSubmitting,
      setFieldValue,
      setFieldTouched,
      validateField,
      validateForm,
      resetForm,
      resetErrors,
      submitForm,
      isSubmitted,
      resetSubmissionState,
      setValues,
      done:
        isSubmitted &&
        !clientValidationFailed &&
        !serverValidationFailed &&
        !hasErrors,
      clientValidationFailed,
      serverValidationFailed,
    }),
    [
      values,
      errors,
      touched,
      setValues,
      isSubmitting,
      setFieldValue,
      setFieldTouched,
      validateField,
      validateForm,
      resetForm,
      resetErrors,
      submitForm,
      isSubmitted,
      resetSubmissionState,
      hasErrors,
      clientValidationFailed,
      serverValidationFailed,
    ]
  );

  return (
    <FormContext.Provider value={contextValue}>
      {typeof children === "function" ? (
        children(contextValue)
      ) : (
        <form onSubmit={submitForm}>{children}</form>
      )}
    </FormContext.Provider>
  );
};

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useForm must be used within a FormProvider");
  }
  return context;
};

export const useFormOperations = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error("useFormOperations must be used within a FormProvider");
  }

  const {
    resetForm,
    submitForm,
    resetErrors,
    errors,
    isSubmitting,
    isSubmitted,
    resetSubmissionState,
    clientValidationFailed,
    serverValidationFailed,
  } = context;
  const hasErrors = Object.keys(errors).length > 0;

  return {
    resetForm,
    submitForm,
    resetErrors,
    hasErrors,
    isSubmitting,
    isSubmitted,
    resetSubmissionState,
    clientValidationFailed,
    serverValidationFailed,
  };
};
