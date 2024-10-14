import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
} from "react";
import * as yup from "yup";

type ValidationRule =
  | yup.AnySchema
  | ((value: unknown) => Promise<void> | void);

export interface ValidationSchema {
  [key: string]: {
    rules?: ValidationRule[];
    type?: string;
    options?: { value: string; label: string }[];
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
  validateField: (name: string) => Promise<void>;
  validateForm: () => Promise<boolean>;
  resetForm: () => void;
  resetErrors: () => void;
  submitForm: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitted: boolean;
  resetSubmissionState: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

interface FormProviderProps {
  children: React.ReactNode;
  initialValues?: Record<string, unknown>;
  validationSchema?: ValidationSchema;
  onSubmit: (values: Record<string, unknown>) => void;
}

export const FormProvider: React.FC<FormProviderProps> = ({
  children,
  initialValues,
  validationSchema,
  onSubmit,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [values, setValues] = useState(initialValues || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues((prevValues) => ({ ...prevValues, [name]: value }));
  }, []);

  const setFieldTouched = useCallback((name: string, isTouched: boolean) => {
    setTouched((prevTouched) => ({ ...prevTouched, [name]: isTouched }));
  }, []);

  const validateField = useCallback(
    async (name: string) => {
      const fieldSchema = validationSchema?.[name];
      if (!fieldSchema) return;

      try {
        for (const rule of fieldSchema.rules || []) {
          if (typeof rule === "function") {
            await rule(values[name]);
          } else {
            await rule.validate(values[name]);
          }
        }
        setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
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
    setIsSubmitted(false); // Reset isSubmitted when form is reset
  }, [initialValues]);

  const resetSubmissionState = useCallback(() => {
    setIsSubmitted(false);
  }, []);

  const resetErrors = useCallback(() => {
    setErrors({});
  }, []);

  const submitForm = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);
      if (validationSchema) {
        const isValid = await validateForm();
        if (isValid) {
          await onSubmit(values || {});
        }
      } else {
        await onSubmit(values || {});
      }
      setIsSubmitting(false);
      setIsSubmitted(true);
    },
    [validateForm, onSubmit, values]
  );

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
    }),
    [
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
    ]
  );

  return (
    <FormContext.Provider value={contextValue}>
      <form onSubmit={submitForm}>{children}</form>
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
  };
};
