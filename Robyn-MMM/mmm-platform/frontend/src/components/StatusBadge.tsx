import clsx from 'clsx'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={clsx('status-badge', {
        'status-queued': status === 'queued',
        'status-running': status === 'running',
        'status-complete': status === 'complete',
        'status-failed': status === 'failed',
      })}
    >
      {status === 'queued' && 'Queued'}
      {status === 'running' && 'Running'}
      {status === 'complete' && 'Complete'}
      {status === 'failed' && 'Failed'}
    </span>
  )
}
