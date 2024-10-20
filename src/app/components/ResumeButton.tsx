"use client";
import React from "react";
import { FiFileText } from "react-icons/fi";
import Button from "./Button";
import { useAnalytics } from "../contexts/AnalyticsContext";

type ResumeButtonProps = {
  href: string;
};

const ResumeButton = ({ href }: ResumeButtonProps) => {
  const { y } = useAnalytics();

  return (
    <Button
      size={"large"}
      icon={FiFileText}
      target={"_blank"}
      className={"full-width-md border-radius-10-md"}
      href={href}
      maskAnimated={2}
      onClick={() => {
        y("CONVERSION", { button: "resume" });
      }}
    >
      My Resume
    </Button>
  );
};

export default ResumeButton;
