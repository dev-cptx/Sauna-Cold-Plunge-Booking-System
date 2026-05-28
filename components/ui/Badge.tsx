import { cn } from '@/lib/utils'

const variants = {
  default:   'bg-gray-100 text-gray-700',
  success:   'bg-green-100 text-green-700',
  warning:   'bg-yellow-100 text-yellow-700',
  danger:    'bg-red-100 text-red-700',
  info:      'bg-blue-100 text-blue-700',
  pending:   'bg-orange-100 text-orange-700',
} as const

interface BadgeProps {
  children: React.ReactNode
  variant?: keyof typeof variants
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, [string, BadgeProps['variant']]> = {
    PENDING:   ['Pending',   'pending'],
    CONFIRMED: ['Confirmed', 'success'],
    COMPLETED: ['Completed', 'info'],
    CANCELLED: ['Cancelled', 'danger'],
    NO_SHOW:   ['No Show',   'warning'],
    EXPIRED:   ['Expired',   'default'],
    PAID:      ['Paid',      'success'],
    FAILED:    ['Failed',    'danger'],
    REFUNDED:  ['Refunded',  'info'],
  }
  const [label, variant] = map[status] ?? [status, 'default']
  return <Badge variant={variant}>{label}</Badge>
}
