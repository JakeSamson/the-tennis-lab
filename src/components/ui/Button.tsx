import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

/** Shared button. Reuse this — don't create new button styles per feature. */
export default function Button({ variant = "primary", className = "", ...rest }: Props) {
  return <button className={`btn btn--${variant} ${className}`} {...rest} />;
}
