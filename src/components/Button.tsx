"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost" | "google";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--indigo)] text-white shadow-[0_0_28px_rgba(94,106,210,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[var(--indigo-hover)] hover:-translate-y-px",
  secondary:
    "bg-[var(--surface)] text-[var(--fg)] border-[var(--border-strong)] backdrop-blur-[10px] hover:bg-[var(--surface-strong)]",
  ghost:
    "bg-transparent text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]",
  google:
    "bg-white text-[#1A1A24] shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.1)] hover:bg-[#F7F7F9] hover:-translate-y-px",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3.5 py-2 text-[13px] rounded-lg",
  md: "px-5 py-3 text-sm rounded-[10px]",
  lg: "px-7 py-3.5 text-[15px] rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          "relative inline-flex items-center justify-center gap-2 font-semibold border border-transparent cursor-pointer overflow-hidden whitespace-nowrap leading-tight transition-all duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] disabled:opacity-40 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {variant === "primary" && (
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-[transform] duration-700 ease-out group-hover:translate-x-full pointer-events-none" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export default Button;
