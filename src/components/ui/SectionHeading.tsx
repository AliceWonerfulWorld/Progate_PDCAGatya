import type { PropsWithChildren } from "react";

export function SectionHeading({ children }: PropsWithChildren) {
  return (
    <h1 className="px-1 text-2xl font-black tracking-tight text-text-strong">
      {children}
    </h1>
  );
}
