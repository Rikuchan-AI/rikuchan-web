"use client";

import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  const className = isPrimary
    ? "inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-deep transition-colors"
    : "text-sm font-medium text-accent hover:underline transition-colors";

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
        {icon}
      </div>
      <h3
        className="mt-4 text-base font-semibold text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p className="mt-1 max-w-[300px] text-sm text-foreground-muted">
        {description}
      </p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-4 flex items-center gap-3">
          {primaryAction && (
            <ActionButton action={primaryAction} variant="primary" />
          )}
          {secondaryAction && (
            <ActionButton action={secondaryAction} variant="secondary" />
          )}
        </div>
      )}
    </div>
  );
}
