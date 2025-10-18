// filepath: /src/utils/status.js
// Centralized status utilities
// Normalizes Chinese labels and canonical codes to canonical codes used in the app.

export const STATUS_NOT_STARTED = 'not_started'
export const STATUS_IN_PROGRESS = 'in_progress'
export const STATUS_COMPLETED = 'completed'

/**
 * Normalize a status value to one of the canonical codes:
 * - 'not_started' | 'in_progress' | 'completed'
 * If the input is already a canonical code, it is returned as-is.
 * If the input is a known Chinese label, it is mapped to the matching code.
 * Otherwise, the original value is returned (for forward compatibility).
 */
export function normalizeStatus(s) {
  if (!s) return s
  if (s === '未开始' || s === STATUS_NOT_STARTED) return STATUS_NOT_STARTED
  if (s === '施工中' || s === STATUS_IN_PROGRESS) return STATUS_IN_PROGRESS
  if (s === '完成' || s === STATUS_COMPLETED) return STATUS_COMPLETED
  return s
}

