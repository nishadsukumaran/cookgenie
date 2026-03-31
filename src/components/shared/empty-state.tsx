import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

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
  const IconComponent = typeof icon === 'function' ? icon : null
  const isIconComponent = IconComponent !== null

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent text-primary">
        {isIconComponent ? (
          <IconComponent className="w-8 h-8" />
        ) : (
          icon
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
