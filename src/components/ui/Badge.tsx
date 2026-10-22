import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
}

export function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toUpperCase();

  if (["ACTIVE", "PRESENT", "ENROLLED", "COMPLETED"].includes(normalized)) {
    return <Badge variant="success">{status}</Badge>;
  }
  if (["LATE", "UPCOMING", "ON_LEAVE"].includes(normalized)) {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (["ABSENT", "INACTIVE", "TERMINATED", "WITHDRAWN", "SUSPENDED"].includes(normalized)) {
    return <Badge variant="danger">{status}</Badge>;
  }
  if (["EXCUSED", "TRANSFERRED"].includes(normalized)) {
    return <Badge variant="info">{status}</Badge>;
  }

  return <Badge variant="neutral">{status}</Badge>;
}
