import { Badge } from "@/components/ui/badge"

export function getSeverityBadge(severity: string) {
  const colors = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200'
  }
  return (
    <Badge variant="outline" className={colors[severity as keyof typeof colors] || colors.LOW}>
      {severity}
    </Badge>
  )
}

export function getStatusBadge(status: string) {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200'
  }
  return (
    <Badge variant="outline" className={colors[status as keyof typeof colors] || colors.PENDING}>
      {status.replace('_', ' ')}
    </Badge>
  )
}
