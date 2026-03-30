/**
 * api.ts — typed wrappers around every Tauri backend command.
 *
 * Import these in your React components instead of calling `invoke` directly.
 * Every function matches the Rust command signature 1-to-1.
 */

import { invoke } from "@tauri-apps/api/core";

// ─── Types (mirror the Rust structs) ─────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  color: string;       // hex, e.g. "#3B82F6"
  created_at: number;  // Unix ms
}

export interface TimeEntry {
  id: string;
  project_id: string | null;
  description: string;
  start_ms: number;    // Unix ms
  end_ms: number | null; // null = currently running
  tags: string[];
}

export interface ProjectSummary {
  project_id: string | null;
  project_name: string;
  total_secs: number;
}

// ─── Project Commands ─────────────────────────────────────────────────────────

export const getProjects = (): Promise<Project[]> =>
  invoke("get_projects");

export const createProject = (name: string, color: string): Promise<Project> =>
  invoke("create_project", { name, color });

export const updateProject = (
  projectId: string,
  name: string,
  color: string
): Promise<Project> =>
  invoke("update_project", { projectId, name, color });

export const deleteProject = (projectId: string): Promise<string> =>
  invoke("delete_project", { projectId });

// ─── Timer / Entry Commands ───────────────────────────────────────────────────

export const getEntries = (): Promise<TimeEntry[]> =>
  invoke("get_entries");

export const startTimer = (
  description: string,
  projectId: string | null = null,
  tags: string[] = []
): Promise<TimeEntry> =>
  invoke("start_timer", { description, projectId, tags });

export const stopTimer = (): Promise<TimeEntry | null> =>
  invoke("stop_timer");

export const getRunningEntry = (): Promise<TimeEntry | null> =>
  invoke("get_running_entry");

export const deleteEntry = (entryId: string): Promise<string> =>
  invoke("delete_entry", { entryId });

export const updateEntry = (
  entryId: string,
  opts: {
    description?: string;
    projectId?: string | null;  // undefined = unchanged, null = clear
    tags?: string[];
  }
): Promise<TimeEntry> => {
  // Tauri needs explicit None vs Some(None) — we map undefined → omit, null → Some(None)
  const payload: Record<string, unknown> = { entryId };
  if (opts.description !== undefined) payload.description = opts.description;
  if ("projectId" in opts) payload.projectId = opts.projectId; // Some(x) or Some(null)
  if (opts.tags !== undefined) payload.tags = opts.tags;
  return invoke("update_entry", payload);
};

// ─── Stats Commands ───────────────────────────────────────────────────────────

/** Total seconds tracked today (UTC midnight boundary) */
export const getTodayTotal = (): Promise<number> =>
  invoke("get_today_total");

/** Per-project totals for today */
export const getTodayByProject = (): Promise<ProjectSummary[]> =>
  invoke("get_today_by_project");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format seconds as "h:mm:ss" */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Format a Unix ms timestamp as a locale time string */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Format a Unix ms timestamp as a locale date string */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}