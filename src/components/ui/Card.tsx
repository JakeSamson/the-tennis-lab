import type { HTMLAttributes } from "react";

/** Shared surface container used across all feature pages. */
export default function Card(props: HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return <div className={`card ${className}`} {...rest} />;
}
