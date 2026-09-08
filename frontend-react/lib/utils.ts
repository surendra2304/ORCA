import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names together conditionally using clsx and tailwind-merge.
 */
export function mergeClasses(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Single source of truth for the API base URL used across all frontend code.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3005/api/v1';

/**
 * Formats an ISO string into a standard readable date and time.
 */
export function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats a duration in seconds into a human-readable string (e.g. "2m 15s").
 */
export function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`;
}

/**
 * Formats an ISO date string into a short date-time (e.g. "Aug 28, 3:45 PM").
 */
export function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Returns a hex color string for a lead score value.
 */
export function getScoreColor(score?: string | null): string {
  const colors: Record<string, string> = {
    hot: "#D9534F",
    warm: "#E0A100",
    cold: "#4A8FB5",
  };
  return colors[(score || "").toLowerCase()] || "#138A63";
}

export const getMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Safely parses a value that may be a JSON string array or already an array.
 */
export function parseJsonList(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return []; }
  }
  return [];
}

/**
 * Safely parses a value that may be a JSON string object or already an object.
 */
export function parseJsonObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object") return v as Record<string, unknown>;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return {};
}

export const parseList = parseJsonList;
export const parseObj = parseJsonObj;

