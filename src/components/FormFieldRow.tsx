import React from "react";
import { LABEL_STYLE } from "@/lib/styles";

interface FormFieldRowProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormFieldRow: React.FC<FormFieldRowProps> = ({ label, required, children }) => (
  <div className="flex items-center gap-2">
    <span style={LABEL_STYLE}>
      {label}
      {required && <span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>}
    </span>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

export default FormFieldRow;
