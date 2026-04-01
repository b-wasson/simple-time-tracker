/**
 * api.ts — typed wrappers around every Tauri backend command.
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (e) {
    console.error(`[invoke] "${cmd}" failed:`, e);
    throw e;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export interface TimeEntry {
  id: string;
  project_id: string | null;
  description: string;
  start_ms: number;
  end_ms: number | null;
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

export const updateProject = (projectId: string, name: string, color: string): Promise<Project> =>
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
  opts: { description?: string; projectId?: string | null; tags?: string[] }
): Promise<TimeEntry> => {
  const payload: Record<string, unknown> = { entryId };
  if (opts.description !== undefined) payload.description = opts.description;
  if ("projectId" in opts) payload.projectId = opts.projectId;
  if (opts.tags !== undefined) payload.tags = opts.tags;
  return invoke("update_entry", payload);
};

// ─── Stats Commands ───────────────────────────────────────────────────────────

export const getTodayTotal = (): Promise<number> =>
  invoke("get_today_total");

export const getTodayByProject = (): Promise<ProjectSummary[]> =>
  invoke("get_today_by_project");

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], {
    weekday: "short", month: "short", day: "numeric",
  });
}

export const clearAllEntries = (): Promise<number> =>
  invoke("clear_all_entries");

// ─── Goal Types & Commands ────────────────────────────────────────────────────

export type GoalPeriod = "daily" | "weekly";

export interface Goal {
  id: string;
  project_id: string | null;
  label: string;
  target_secs: number;
  period: GoalPeriod;
  created_at: number;
}

export interface GoalProgress {
  goal: Goal;
  logged_secs: number;
  percent: number;
}

export const getGoals = (): Promise<GoalProgress[]> =>
  invoke("get_goals");

export const createGoal = (
  label: string,
  targetSecs: number,
  period: GoalPeriod,
  projectId: string | null = null,
): Promise<Goal> =>
  invoke("create_goal", { label, targetSecs, period, projectId });

export const updateGoal = (
  goalId: string,
  opts: { label?: string; targetSecs?: number; period?: GoalPeriod }
): Promise<Goal> =>
  invoke("update_goal", { goalId, ...opts });

export const deleteGoal = (goalId: string): Promise<string> =>
  invoke("delete_goal", { goalId });