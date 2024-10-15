import React, { useEffect, useState } from "react";
import { useForm } from "./FormProvider";
import styles from "@/app/styles/FormErrors.module.css";
import { Alert } from "./Alert";
import cx from "classnames";

type FormErrorsProps = {
  className?: string;
  afterSubmit?: boolean;
  size?: string;
};

const FormErrors = ({ className, size, afterSubmit }: FormErrorsProps) => {
  const [open, setOpen] = useState(true);
  const { errors, isSubmitted, resetSubmissionState, serverValidationFailed } =
    useForm();
  const errorMessages = Object.values(errors).filter((error) => error !== "");

  useEffect(() => {
    // Only open the alert if there are errors and the form has been submitted
    if (errorMessages.length > 0 && isSubmitted) {
      setOpen(true);
    }
  }, [errorMessages, isSubmitted]);

  if (errorMessages.length === 0 || !isSubmitted) {
    return null;
  }

  if (isSubmitted && !serverValidationFailed) {
    return null;
  }

  const handleClose = () => {
    setOpen(false);
    resetSubmissionState(); // Reset the submission state when closing the alert
  };

  const FormAlert = (
    <div className={cx(styles.formErrors, className)}>
      <Alert type="error" open={open} onClose={handleClose}>
        <h6>Please correct the following errors:</h6>
        <ul>
          {errorMessages.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </Alert>
    </div>
  );

  if (size) {
    return (
      <div className="row">
        <div className={size}>{FormAlert}</div>
      </div>
    );
  }

  return FormAlert;
};

export default FormErrors;
