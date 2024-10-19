import React, { useState, useEffect } from "react";
import styles from "@/app/styles/Table.module.css";
import {
  FiX,
  FiMoreHorizontal,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import cx from "classnames";
import Pagination from "./Pagination";
import Dropdown from "./Dropdown";

type Field = {
  name: string;
  key: string;
  label: string;
  transform?: (value: any, item: any) => any;
  sortable: boolean;
  style?: React.CSSProperties;
};

interface TableProps {
  className?: string;
  fields: Field[];
  filters: any;
  meta: any;
  data: any;
  sorts: any;
  actions: any[];
  onPageChange: (page: number) => void;
  onSort: (field: string, order: string) => void;
  onSearch: (search: string) => void;
  params: any;
}

const Table: React.FC<TableProps> = ({
  className,
  data,
  fields,
  meta,
  actions,
  onPageChange,
  onSort,
  onSearch,
  params,
}) => {
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

  const [sorts, setSorts] = useState<any>(convertSorts(params.sorts));

  useEffect(() => {
    setSorts(convertSorts(params.sort));
  }, [params.sort]);

  return (
    <div className={cx(className, styles.table)}>
      {data.length === 0 && <p>No data available to be displayed</p>}
      {data.length > 0 && (
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
              {data.map((item: any, key: number) => (
                <tr key={`${item.id}-${key}`}>
                  {fields.map((field) => (
                    <td key={field.key}>
                      {field.transform && typeof field.transform === "function"
                        ? field.transform(item[field.key], item)
                        : item[field.key]}
                    </td>
                  ))}
                  {actions.length && (
                    <td>
                      <Dropdown
                        className={styles.actionDropdown}
                        options={actions.map((action) => {
                          return {
                            labelClassName: action.labelClassName,
                            label: action.label,
                            onClick: () => action.onClick(item),
                          };
                        })}
                        withCaret={false}
                        onSelect={() => {}}
                      >
                        <FiMoreHorizontal />
                      </Dropdown>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            totalItems={meta.totalItems}
            itemsPerPage={meta.itemsPerPage}
            page={meta.currentPage}
            onPageChange={(page) => onPageChange(page)}
          />
        </>
      )}
    </div>
  );
};

export default Table;
