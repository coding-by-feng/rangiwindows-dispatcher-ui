// Centralized runtime config sourced from Vite envs (env.* files)
// Keep host/port only in env files; avoid hardcoded fallbacks in code.

export const ENV_DEFAULT_MODE = import.meta?.env?.VITE_API_MODE || 'local'

// If not provided, defaults to empty string -> same-origin (use Vite proxy in dev)
export const API_BASE_FALLBACK = import.meta?.env?.VITE_API_BASE || ''
export const API_BASE_PROD = import.meta?.env?.VITE_API_BASE_PROD || API_BASE_FALLBACK
export const API_BASE_TEST = import.meta?.env?.VITE_API_BASE_TEST || 'http://localhost:9005'

export const IS_DEV = !!import.meta?.env?.DEV
export const ENV_MODE = import.meta?.env?.MODE || ''
