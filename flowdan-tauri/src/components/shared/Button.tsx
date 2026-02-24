import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", children, className = "", ...props }: ButtonProps) {
  const variantClass =
    variant === "primary" ? "btn-primary"
      : variant === "danger" ? "btn-danger"
        : "btn-ghost";

  const sizeClass = size === "sm" ? "text-xs" : "text-sm";

  return (
    <button className={`${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
