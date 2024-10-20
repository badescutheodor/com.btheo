import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/styles/Table.module.css";
import { FiMoreHorizontal, FiChevronUp, FiChevronDown } from "react-icons/fi";
import cx from "classnames";
import Pagination from "./Pagination";
import Dropdown from "./Dropdown";
import Button from "./Button";
import Input from "./Input";
import * as yup from "yup";

type ValidationRule =
  | yup.AnySchema
  | ((value: unknown) => Promise<void> | void);

type Field = {
  name: string;
  key: string;
  label: string;
  transform?: (value: any, item: any) => any;
  sortable: boolean;
  style?: React.CSSProperties;
  editable?: boolean;
  type?: string;
  rules?: ValidationRule[];
};

const convertSorts = (sorts: string) => {
  if (!sorts) {
    return {};
  }

  return sorts.split(",").reduce((acc, sort) => {
    const [field, order] = sort.split(":");
    acc[field] = order;
    return acc;
  }, {});
};

interface TableProps {
  className?: string;
  fields: Field[];
  meta: any;
  data: any;
  params: any;
  actions: any[];
  onPageChange: (page: number) => void;
  onSort: (field: string, order: string) => void;
  onLoadMore: () => void;
  updateEntry?: (entry: any) => void;
}

const Table: React.FC<TableProps> = ({
  className,
  data,
  fields,
  meta,
  actions,
  onPageChange,
  onSort,
  params,
  onLoadMore,
  updateEntry,
}) => {
  const [sorts, setSorts] = useState<any>(convertSorts(params.sorts));
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const observerTarget = useRef(null);
  const [currentData, setCurrentData] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{
    itemId: string | number;
    fieldKey: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [touchedFields, setTouchedFields] = useState<
    Record<string, Record<string, boolean>>
  >({});

  useEffect(() => {
    setCurrentData(data);
  }, [data]);

  useEffect(() => {
    setSorts(convertSorts(params.sort));
  }, [params.sort]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const infiniteScrollObserver = useCallback(
    (node: any) => {
      if (isMobile) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              onLoadMore();
            }
          },
          { threshold: 1.0 }
        );

        if (node) {
          observer.observe(node);
        }

        return () => {
          if (node) {
            observer.unobserve(node);
          }
        };
      }
    },
    [isMobile, onLoadMore]
  );

  const validateField = async (item: any, field: Field, value: any) => {
    if (!field.rules) return true;

    try {
      for (const rule of field.rules) {
        if (typeof rule === "function") {
          await rule(value);
        } else {
          await rule.validate(value);
        }
      }
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        if (newErrors[item.id]) {
          delete newErrors[item.id][field.key];
          if (Object.keys(newErrors[item.id]).length === 0) {
            delete newErrors[item.id];
          }
        }
        return newErrors;
      });
      return true;
    } catch (error) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [item.id]: {
          ...prevErrors[item.id],
          [field.key]:
            error instanceof yup.ValidationError
              ? error.message
              : "Validation failed",
        },
      }));
      return false;
    }
  };

  const toggleEdit = (item: any, field: Field) => {
    if (!field.editable && item.id !== "new") {
      return;
    }

    if (
      editingCell &&
      editingCell.itemId === item.id &&
      editingCell.fieldKey === field.key
    ) {
      setEditingCell(null);
    } else {
      setEditingCell({ itemId: item.id, fieldKey: field.key });
    }
  };

  const saveEdit = async (item: any, field: Field, value: any) => {
    if ((!field.editable || field.type === "date") && item.id !== "new") {
      return;
    }

    if (value === data.find((dataItem) => dataItem.id === item.id)[field.key]) {
      setEditingCell(null);
      return;
    }

    // Mark the field as touched
    setTouchedFields((prevTouched) => ({
      ...prevTouched,
      [item.id]: {
        ...prevTouched[item.id],
        [field.key]: true,
      },
    }));

    const isValid = await validateField(item, field, value);
    if (!isValid) return;

    const updatedItem = { ...item, [field.key]: value };
    const newData = currentData.map((dataItem) =>
      dataItem.id === item.id ? updatedItem : dataItem
    );

    setCurrentData(newData);
    setEditingCell(null);

    // Only call updateEntry if all fields are valid
    const itemErrors = errors[item.id] || {};
    if (Object.keys(itemErrors).length === 0) {
      updateEntry && updateEntry(updatedItem);
    }
  };

  const onEditChange = (item: any, field: Field, value: any) => {
    const newData = currentData.map((dataItem) => {
      if (dataItem.id === item.id) {
        return {
          ...dataItem,
          [field.key]: value,
        };
      }
      return dataItem;
    });

    setCurrentData(newData);
    if (field.type === "date") {
      saveEdit(item, { ...field, type: "text" }, value);
    }
  };

  return (
    <div className={cx(className, styles.table, { [styles.mobile]: isMobile })}>
      {currentData.length === 0 && <p>No data available to be displayed</p>}
      {currentData.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                {fields.map((field) => (
                  <th
                    key={field.key}
                    className={cx({ [styles.sortable]: field.sortable })}
                    {...(field.style ? { style: field.style } : {})}
                    {...(field.sortable
                      ? {
                          onClick: () => {
                            onSort(
                              field.key,
                              sorts[field.key] === "ASC" ? "DESC" : "ASC"
                            );
                          },
                        }
                      : {})}
                  >
                    {field.label}{" "}
                    {field.sortable &&
                      (sorts[field.key] === "ASC" ? (
                        <FiChevronUp />
                      ) : (
                        <FiChevronDown />
                      ))}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item: any, key: number) => (
                <tr key={`${key}`}>
                  {fields.map((field, fieldIndex) => (
                    <td
                      key={field.key}
                      data-label={field.label}
                      {...(field.style ? { style: field.style } : {})}
                      className={cx({
                        [styles.editable]:
                          (field.editable ||
                            (item.id === "new" && field.key !== "id")) &&
                          !(
                            editingCell &&
                            editingCell.itemId === item.id &&
                            editingCell.fieldKey === field.key
                          ),
                      })}
                    >
                      {!(
                        editingCell &&
                        editingCell.itemId === item.id &&
                        editingCell.fieldKey === field.key
                      ) &&
                        (item.id === "new" ? field.key === "id" : true) && (
                          <div
                            onClick={() =>
                              !editingCell && toggleEdit(item, field)
                            }
                          >
                            {field.transform &&
                            typeof field.transform === "function"
                              ? field.transform(item[field.key], item)
                              : item[field.key]}
                          </div>
                        )}
                      {(editingCell &&
                        editingCell.itemId === item.id &&
                        editingCell.fieldKey === field.key) ||
                      (item.id === "new" && field.key !== "id") ? (
                        <Input
                          value={item[field.key]}
                          name={field.key}
                          style={{ marginBottom: 0 }}
                          className={styles.input}
                          autoFocus={
                            (item.id === "new" && fieldIndex === 1) ||
                            editingCell?.fieldKey === field.key
                          }
                          type={
                            (typeof field.type === "function"
                              ? field.type(item)
                              : field.type) || "text"
                          }
                          onBlur={() => {
                            saveEdit(item, field, item[field.key]);
                          }}
                          onChange={(value) => {
                            onEditChange(item, field, value);
                          }}
                          error={
                            touchedFields[item.id]?.[field.key]
                              ? errors[item.id]?.[field.key]
                              : undefined
                          }
                        />
                      ) : null}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td>
                      <Dropdown
                        className={styles.actionDropdown}
                        options={actions.map((action) => ({
                          labelClassName: action.labelClassName,
                          label: action.label,
                          onClick: () => action.onClick(item),
                        }))}
                        withCaret={false}
                        onSelect={() => {}}
                      >
                        {({ open }) => {
                          return (
                            <>
                              <FiMoreHorizontal className="hidden-sm" />
                              <Button className="visible-sm">
                                Actions{" "}
                                {open ? <FiChevronUp /> : <FiChevronDown />}
                              </Button>
                            </>
                          );
                        }}
                      </Dropdown>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isMobile && (
            <Pagination
              totalItems={meta.totalItems}
              itemsPerPage={meta.itemsPerPage}
              page={meta.currentPage}
              onPageChange={(page) => onPageChange(page)}
            />
          )}
          {isMobile && (
            <div
              ref={infiniteScrollObserver}
              className={styles.loadMoreTrigger}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Table;
