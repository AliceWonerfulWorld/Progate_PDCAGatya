import type { PropsWithChildren } from 'react'

export function SectionHeading({ children }: PropsWithChildren) {
  return <h1 className="text-2xl font-bold tracking-normal text-slate-900">{children}</h1>
}
