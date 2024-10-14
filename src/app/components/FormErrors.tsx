import React, { useEffect, useState, useRef } from "react";
import { useForm } from "./FormProvider";
import styles from "@/app/styles/FormErrors.module.css";
import { Alert } from "./Alert";

const FormErrors: React.FC = () => {
  const [open, setOpen] = useState(true);
  const { errors, isSubmitted, resetSubmissionState } = useForm();
  const errorMessages = Object.values(errors);

  useEffect(() => {
    // Only open the alert if there are errors and the form has been submitted
    if (errorMessages.length > 0 && isSubmitted) {
      setOpen(true);
    }
  }, [errorMessages, isSubmitted]);

  if (errorMessages.length === 0 || !isSubmitted) {
    return null;
  }

  const handleClose = () => {
    setOpen(false);
    resetSubmissionState(); // Reset the submission state when closing the alert
  };

  return (
    <div className={styles.formErrors}>
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
};

export default FormErrors;
