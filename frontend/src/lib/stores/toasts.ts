import { writable } from 'svelte/store';
import type { Toast, ToastType } from '$lib/types';

// Create a writable store for managing active toasts
export const toastsStore = writable<Toast[]>([]);

// Generate unique IDs for toasts
let toastIdCounter = 0;
function generateToastId(): string {
  return `toast-${Date.now()}-${toastIdCounter++}`;
}

/**
 * Show a new toast notification
 * @param message - The message to display
 * @param type - The type of toast (success, error, info, warning)
 * @param duration - How long to show the toast in milliseconds (default: 3000)
 */
export function showToast(
  message: string,
  type: ToastType = 'success',
  duration: number = 3000
): void {
  const toast: Toast = {
    id: generateToastId(),
    message,
    type,
    duration
  };

  toastsStore.update(toasts => [...toasts, toast]);

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(toast.id);
    }, duration);
  }
}

/**
 * Dismiss a toast by ID
 * @param id - The ID of the toast to dismiss
 */
export function dismissToast(id: string): void {
  toastsStore.update(toasts => toasts.filter(t => t.id !== id));
}
