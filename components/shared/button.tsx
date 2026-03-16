import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "lg";

type SharedButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type LinkButtonProps = SharedButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type NativeButtonProps = SharedButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background shadow-[0_14px_28px_rgba(16,34,29,0.18)] hover:bg-accent-deep hover:text-white",
  secondary:
    "border border-line-strong bg-white/70 text-foreground hover:border-accent/40 hover:bg-white",
  ghost: "text-foreground-soft hover:text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm sm:text-[0.95rem]",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold tracking-[-0.02em] transition duration-200 ease-out",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export function Button(props: LinkButtonProps | NativeButtonProps) {
  const { children, className, variant = "primary", size = "md", ...rest } = props;

  if ("href" in props && props.href) {
    const { href, ...linkProps } = rest as LinkButtonProps;
    return (
      <Link href={href} className={buttonClassName({ variant, size, className })} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClassName({ variant, size, className })} {...(rest as NativeButtonProps)}>
      {children}
    </button>
  );
}
