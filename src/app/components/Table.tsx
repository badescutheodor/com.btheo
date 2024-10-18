import React, { useState, useEffect } from "react";
import styles from "@/app/styles/Table.module.css";
import { FiX, FiMoreHorizontal } from "react-icons/fi";
import cx from "classnames";
import Pagination from "./Pagination";
import Button from "./Button";
import Dropdown from "./Dropdown";

type Field = {
  name: string;
  key: string;
  label: string;
  transform?: (value: any) => any;
  sortable: boolean;
  style?: React.CSSProperties;
};

interface TableProps {
  className?: string;
  fields: Field[];
  filters: any;
  meta: any;
  data: any;
  actions: any[];
}

const Table: React.FC<TableProps> = ({
  className,
  data,
  fields,
  meta,
  actions,
}) => {
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
                    {...(field.style ? { style: field.style } : {})}
                  >
                    {field.label}
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
                        ? field.transform(item[field.key])
                        : item[field.key]}
                    </td>
                  ))}
                  {actions.length && (
                    <td>
                      <Dropdown
                        className={styles.actionDropdown}
                        menuOpen
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
            page={meta.page}
            onPageChange={(page) => console.log(page)}
          />
        </>
      )}
    </div>
  );
};

export default Table;
