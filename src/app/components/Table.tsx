import React, { useState, useEffect, useRef, useCallback } from "react";
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
  filters: any;
  meta: any;
  data: any;
  sorts: any;
  actions: any[];
  onPageChange: (page: number) => void;
  onSort: (field: string, order: string) => void;
  onSearch: (search: string) => void;
  params: any;
  onLoadMore: () => void;
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
  onLoadMore,
}) => {
  const [sorts, setSorts] = useState<any>(convertSorts(params.sorts));
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const observerTarget = useRef(null);

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
    (node) => {
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

  return (
    <div className={cx(className, styles.table, { [styles.mobile]: isMobile })}>
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
                    <td key={field.key} data-label={field.label}>
                      {field.transform && typeof field.transform === "function"
                        ? field.transform(item[field.key], item)
                        : item[field.key]}
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
                        <FiMoreHorizontal />
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
            >
              {meta.currentPage < meta.totalPages && <p>Loading more...</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Table;
