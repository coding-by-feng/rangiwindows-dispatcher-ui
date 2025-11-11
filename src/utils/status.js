// filepath: /src/utils/status.js
// Centralized status utilities for project status
// Normalizes labels and canonical codes to canonical codes used in the app.

export const STATUS_GLASS_ORDERED = 'glass_ordered'
export const STATUS_DW_PRODUCED = 'doors_windows_produced'
export const STATUS_DW_DELIVERED = 'doors_windows_delivered'
export const STATUS_DW_INSTALLED = 'doors_windows_installed'
export const STATUS_FINAL_PAYMENT = 'final_payment_received'

const ALL = [
  STATUS_GLASS_ORDERED,
  STATUS_DW_PRODUCED,
  STATUS_DW_DELIVERED,
  STATUS_DW_INSTALLED,
  STATUS_FINAL_PAYMENT,
]

/**
 * Normalize a status value to one of the canonical codes above.
 * If the input is already a canonical code, it is returned as-is.
 * If the input is a known Chinese/English label, it is mapped accordingly.
 * Otherwise, the original value is returned (forward compatibility).
 */
export function normalizeStatus(s) {
  if (!s) return s
  if (ALL.includes(s)) return s
  // Simplified Chinese
  if (s === '玻璃已下单') return STATUS_GLASS_ORDERED
  if (s === '门窗已生产') return STATUS_DW_PRODUCED
  if (s === '门窗已送货') return STATUS_DW_DELIVERED
  if (s === '门窗已安装') return STATUS_DW_INSTALLED
  if (s === '尾款已收到') return STATUS_FINAL_PAYMENT
  // Traditional Chinese (rough mapping)
  if (s === '玻璃已下單') return STATUS_GLASS_ORDERED
  if (s === '門窗已生產') return STATUS_DW_PRODUCED
  if (s === '門窗已送貨') return STATUS_DW_DELIVERED
  if (s === '門窗已安裝') return STATUS_DW_INSTALLED
  if (s === '尾款已收到') return STATUS_FINAL_PAYMENT
  // English display labels
  if (s === 'Glass Ordered') return STATUS_GLASS_ORDERED
  if (s === 'Doors/Windows Produced') return STATUS_DW_PRODUCED
  if (s === 'Doors/Windows Delivered') return STATUS_DW_DELIVERED
  if (s === 'Doors/Windows Installed') return STATUS_DW_INSTALLED
  if (s === 'Final Payment Received') return STATUS_FINAL_PAYMENT
  return s
}
