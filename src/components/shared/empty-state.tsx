import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: React.ReactNode | LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  // Check if icon is a Lucide component (function) vs a ReactNode
  const isIconComponent = typeof icon === 'function'

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent text-primary">
        {isIconComponent ? (
          (() => {
            const IconComponent = icon as LucideIcon
            return <IconComponent className="w-8 h-8" />
          })()
        ) : (
          icon as React.ReactNode
        )}
      </div>
      <h3 className="mt-4 font-heading text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
