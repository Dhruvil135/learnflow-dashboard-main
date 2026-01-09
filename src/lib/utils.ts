import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ NEW: Universal date/time formatter with fallback for older browsers
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '';
  
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Try modern Intl API (supported in all modern browsers)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    }
    
    // Fallback for older browsers
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    // Ultimate fallback
    return new Date(value as any).toUTCString();
  }
}

// ✅ NEW: Format date only (no time)
export function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }).format(date);
    }
    
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Date formatting error:', error);
    return new Date(value as any).toDateString();
  }
}

// ✅ NEW: Format time only (no date)
export function formatTime(value?: string | Date | null): string {
  if (!value) return '';
  
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    
    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    }
    
    return date.toLocaleTimeString();
  } catch (error) {
    console.error('Time formatting error:', error);
    return new Date(value as any).toTimeString().split(' ')[0];
  }
}

// ✅ NEW: Relative time formatter (e.g., "2 hours ago", "3 days ago")
export function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return '';
  
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return formatDate(date);
  } catch (error) {
    return formatDateTime(value);
  }
}
