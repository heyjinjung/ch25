// src/components/common/Button.tsx
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "figma-primary" | "figma-secondary" | "figma-outline";
  fullWidth?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-figma-primary text-white font-bold shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:brightness-110 active:scale-95 uppercase tracking-wide", // Now defaults to Figma Style
  secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
  ghost: "bg-transparent text-emerald-200 hover:bg-slate-800",
  "figma-primary": "bg-figma-primary text-white font-bold shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:brightness-110 active:scale-95 uppercase tracking-wide",
  "figma-secondary": "bg-white text-black font-black hover:bg-gray-100 active:scale-95 uppercase tracking-wide",
  "figma-outline": "bg-transparent border-2 border-figma-accent text-figma-accent font-bold hover:bg-figma-accent/10 active:scale-95 uppercase tracking-wide",
};

const Button: React.FC<ButtonProps> = ({ children, className = "", variant = "primary", fullWidth, ...rest }) => {
  return (
    <button
      type="button"
      className={`rounded-lg px-4 py-2 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;

