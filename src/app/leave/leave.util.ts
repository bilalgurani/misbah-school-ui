import { LeaveStatus } from './leave.service';

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function statusBadgeClass(status: LeaveStatus): string {
  switch (status) {
    case 'PENDING': return 'badge badge-warning';
    case 'APPROVED': return 'badge badge-success';
    case 'REJECTED': return 'badge badge-danger';
    default: return 'badge';
  }
}

export function errorMessage(err: any, fallback: string): string {
  const body = err?.error;
  const apiMessage = typeof body === 'string' ? body : body?.message;
  return apiMessage || (err?.status === 0 ? 'Cannot reach the server. Check your connection.' : fallback);
}

export function dayLabel(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function limitLabel(value: number | null | undefined, unlimited: boolean): string {
  return unlimited || value === null || value === undefined ? 'No limit' : String(value);
}

export function canCancelLeave(status: LeaveStatus, fromDate: string, today: string, isAdmin: boolean): boolean {
  if (status === 'PENDING') return true;
  return status === 'APPROVED' && (isAdmin || fromDate > today);
}
