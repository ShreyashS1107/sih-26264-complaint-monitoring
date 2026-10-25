import React from "react";
import { ComplaintPriority, ComplaintStatus, OverlapReviewStatus } from "../../lib/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "primary" | "success" | "warning" | "critical";
  size?: "sm" | "md";
  children: React.ReactNode;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  critical: "bg-rose-50 text-rose-800 border-rose-200",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...rest
}) => {
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-wide whitespace-nowrap ${variantStyles[variant]} ${sizeClasses} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ComplaintStatus; className?: string }> = ({
  status,
  className = "",
}) => {
  let variant: BadgeProps["variant"] = "neutral";

  switch (status) {
    case "Resolved":
      variant = "success";
      break;
    case "Show-Cause Notice Issued":
    case "Hearing Scheduled":
      variant = "warning";
      break;
    case "Escalated":
      variant = "critical";
      break;
    case "Under Scrutiny":
    case "Assigned to Bureau":
    case "Institution Response Received":
      variant = "primary";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
};

export const PriorityBadge: React.FC<{ priority: ComplaintPriority; className?: string }> = ({
  priority,
  className = "",
}) => {
  let variant: BadgeProps["variant"] = "neutral";

  switch (priority) {
    case "Critical":
      variant = "critical";
      break;
    case "High":
      variant = "warning";
      break;
    case "Medium":
      variant = "primary";
      break;
    case "Low":
      variant = "neutral";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {priority}
    </Badge>
  );
};

export const OverlapStatusBadge: React.FC<{ status: OverlapReviewStatus; className?: string }> = ({
  status,
  className = "",
}) => {
  let variant: BadgeProps["variant"] = "neutral";
  let label: string = status;

  switch (status) {
    case "Pending":
      variant = "warning";
      label = "Pending Triage";
      break;
    case "Linked":
      variant = "primary";
      label = "Linked as Related";
      break;
    case "Independent":
      variant = "success";
      label = "Confirmed Independent";
      break;
    case "Dismissed":
      variant = "neutral";
      label = "Dismissed Overlap";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};
