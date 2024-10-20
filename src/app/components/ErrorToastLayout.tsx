import React, { useState, useEffect } from "react";

const ErrorToastLayout = ({ children }: any) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleFetchError = (event: any) => {
      if (event.reason instanceof Error) {
        setError(event.reason.message);
        setTimeout(() => setError(null), 5000); // Remove after 5 seconds
      }
    };

    window.addEventListener("unhandledrejection", handleFetchError);

    return () => {
      window.removeEventListener("unhandledrejection", handleFetchError);
    };
  }, []);

  const closeToast = () => {
    setError(null);
  };

  return (
    <>
      {children}
      {error && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            backgroundColor: "#f44336",
            color: "white",
            padding: "12px",
            borderRadius: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            maxWidth: "300px",
            zIndex: 1000,
          }}
        >
          <div style={{ marginRight: "20px" }}>{error}</div>
          <button
            onClick={closeToast}
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default ErrorToastLayout;
