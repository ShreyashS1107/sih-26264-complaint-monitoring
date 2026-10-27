import React from "react";
import { ComplaintPriority, ComplaintStatus, OverlapReviewStatus } from "../../lib/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "primary" | "success" | "warning" | "critical";
  size?: "sm" | "md";
  children: React.ReactNode;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-slate-500/10 text-slate-400 dark:text-slate-300 border-slate-500/25",
  primary: "bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border-[var(--primary-accent)]/30 shadow-[0_0_8px_var(--primary-accent-glow)]",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
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
