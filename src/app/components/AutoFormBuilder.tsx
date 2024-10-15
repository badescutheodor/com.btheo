import React from "react";
import Input from "./Input";
import { ValidationSchema } from "./FormProvider";

interface AutoFormBuilderProps {
  schema: ValidationSchema;
}

const AutoFormBuilder: React.FC<AutoFormBuilderProps> = ({ schema }) => {
  const rows: { [key: number]: React.ReactNode[] } = {};

  Object.entries(schema).forEach(([name, fieldSchema]) => {
    const { type, options, size, row, ...others } = fieldSchema;
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    let field: React.ReactNode;

    switch (type) {
      case "text":
      case "password":
      case "email":
      case "number":
      case "textarea":
      case "date":
      case "time":
      case "datetime":
        field = (
          <Input key={name} type={type} name={name} label={label} {...others} />
        );
        break;
      case "select":
        field = (
          <Input
            key={name}
            type="select"
            name={name}
            label={label}
            options={options}
            {...others}
          />
        );
        break;
      case "checkbox":
        field = (
          <Input
            key={name}
            type="checkbox"
            name={name}
            label={label}
            {...others}
          />
        );
        break;
      case "radio":
        field = options?.map((option) => (
          <Input
            key={`${name}-${option.value}`}
            type="radio"
            name={name}
            label={option.label}
            value={option.value}
            {...others}
          />
        ));
        break;
      case "file":
        field = (
          <Input key={name} type="file" name={name} label={label} {...others} />
        );
        break;
    }

    if (size) {
      field = (
        <div className={size} key={`${size}-${name}`}>
          {field}
        </div>
      );
    }

    const rowNumber = row ?? 0;
    if (!rows[rowNumber]) {
      rows[rowNumber] = [];
    }
    rows[rowNumber].push(field);
  });

  return (
    <>
      {Object.entries(rows).map(([rowNumber, fields]) => (
        <div key={`row-${rowNumber}`} className="row">
          {fields}
        </div>
      ))}
    </>
  );
};

export default AutoFormBuilder;
