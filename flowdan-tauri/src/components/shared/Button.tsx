import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "icon";
  size?: "sm" | "md";
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading = false, children, className = "", disabled, ...props }: ButtonProps) {
  const variantClass =
    variant === "primary" ? "btn-primary"
      : variant === "danger" ? "btn-danger"
        : variant === "outline" ? "btn-outline"
          : variant === "icon" ? "btn-icon"
            : "btn-ghost";

  const sizeClass = size === "sm" ? "text-xs" : "text-sm";

  return (
    <button
      className={`${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  );
}
