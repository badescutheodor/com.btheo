import React from "react";
import { useForm } from "./FormProvider";
import styles from "@/app/styles/FormError.module.css";

const FormError: React.FC = () => {
  const { errors } = useForm();

  const errorMessages = Object.values(errors);

  if (errorMessages.length === 0) {
    return null;
  }

  return (
    <div className={styles.formError}>
      <h3>Please correct the following errors:</h3>
      <ul>
        {errorMessages.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

export default FormError;
