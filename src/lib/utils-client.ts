import React from "react";
import ReactDOM from "react-dom/client";
import ConfirmationModal from "@/app/components/ConfirmationModal";

type DebouncedFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => void;

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

export const confirm = ({
  message,
  title,
}: {
  message: string;
  title: string;
}): Promise<boolean> => {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    const handleConfirm = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(true);
    };

    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(false);
    };

    root.render(
      React.createElement(ConfirmationModal, {
        onClose: handleCancel,
        onConfirm: handleConfirm,
        isOpen: true,
        message,
        title,
      })
    );
  });
};