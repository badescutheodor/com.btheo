import React, { useState } from "react";
import styles from "@/app/styles/Pagination.module.css";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  page: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  onPageChange,
  page,
}) => {
  const [currentPage, setCurrentPage] = useState(page);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange(page);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`${styles.pageButton} ${
            currentPage === i ? styles.currentPage : ""
          }`}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };

  const pageNumbers = renderPageNumbers();

  if (totalPages === 1) {
    return null;
  }

  return (
    <div className={styles.pagination}>
      <button
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`${styles.pageButton} ${styles.prevNext}`}
      >
        <FiChevronLeft />
      </button>
      {pageNumbers}
      <button
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`${styles.pageButton} ${styles.prevNext}`}
      >
        <FiChevronRight />
      </button>
    </div>
  );
};

export default Pagination;
