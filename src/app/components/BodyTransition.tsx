"use client";
import { useEffect } from "react";

const BackgroundTransition = () => {
  useEffect(() => {
    document.body.classList.add("body-loaded");
  }, []);

  return null;
};

export default BackgroundTransition;
