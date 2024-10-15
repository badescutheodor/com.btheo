"use client";
import { FormProvider } from "../components/FormProvider";
import Button from "../components/Button";
import AutoFormBuilder from "../components/AutoFormBuilder";
import FormErrors from "../components/FormErrors";
import * as yup from "yup";

export default function GuestbookForm({ createGuestbook }: any) {
  const handleSubmit = async (values = {}) => {
    return await createGuestbook(values);
  };

  return (
    <div className="guestbook">
      <FormProvider
        validationSchema={{
          name: {
            rules: [yup.string().required("Name is required")],
          },
          message: {
            rules: [yup.string().required("Message is required")],
          },
        }}
        onSubmit={handleSubmit}
      >
        {({ done, submitForm }) => {
          if (done) {
            return <p>Thanks for signing the guestbook!</p>;
          }

          return (
            <>
              <FormErrors afterSubmit size="col-lg-6" />
              <AutoFormBuilder
                schema={{
                  name: {
                    type: "text",
                    label: "Name",
                    required: true,
                    autoFocus: true,
                    size: "col-lg-2 col-sm-12",
                    row: 1,
                  },
                  message: {
                    type: "textarea",
                    label: "Message",
                    required: true,
                    size: "col-lg-6 col-sm-12",
                    maxLength: 500,
                    row: 2,
                  },
                }}
              />
              <Button type="submit" onClick={submitForm}>
                Send Message
              </Button>
            </>
          );
        }}
      </FormProvider>
    </div>
  );
}
