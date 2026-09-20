import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export function Section({ title, to, linkLabel = 'See all', children }: { title: string; to?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-xl font-extrabold md:text-2xl">{title}</h2>
        {to && (
          <Link to={to} className="flex items-center gap-0.5 text-sm font-semibold text-mute hover:text-gold">
            {linkLabel} <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** Horizontal, swipeable strip of fixed-width cards. */
export function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 items-start gap-3.5 overflow-x-auto px-4 pb-1 md:mx-0 md:scroll-px-0 md:px-0 [&>*]:w-[132px] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-[156px]">
      {children}
    </div>
  )
}
