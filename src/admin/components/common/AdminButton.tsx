import React from "react";
import clsx from "clsx";

type AdminButtonVariant = "primary" | "secondary" | "outline" | "ghost";

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
};

const VARIANT_CLASS: Record<AdminButtonVariant, string> = {
  primary: "btn-admin-primary",
  secondary: "btn-admin-secondary",
  outline: "btn-admin-secondary",
  ghost: "btn-admin-ghost",
};

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  function AdminButton(
    { variant = "secondary", className, type = "button", disabled, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={clsx(
          "transition-all duration-200 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-admin-bg",
          disabled && "cursor-not-allowed opacity-50",
          VARIANT_CLASS[variant],
          className
        )}
        {...props}
      />
    );
  }
);
