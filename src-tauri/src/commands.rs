/// commands.rs — every Tauri command the frontend can call
///
/// Pattern: each command receives the AppHandle (to load/save), does its work,
/// persists the result, then returns data to the frontend as JSON-serializable types.

use tauri::AppHandle;

use crate::models::{Project, TimeEntry};
use crate::storage;

// ════════════════════════════════════════════════════════════════════════════
//  PROJECT COMMANDS
// ════════════════════════════════════════════════════════════════════════════

/// List all projects
#[tauri::command]
pub fn get_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let store = storage::load(&app)?;
    Ok(store.projects)
}

/// Create a new project. Returns the created project.
#[tauri::command]
pub fn create_project(
    app: AppHandle,
    name: String,
    color: String,
) -> Result<Project, String> {
    if name.trim().is_empty() {
        return Err("Project name cannot be empty".into());
    }

    let mut store = storage::load(&app)?;

    // Prevent duplicate names
    if store.projects.iter().any(|p| p.name.eq_ignore_ascii_case(&name)) {
        return Err(format!("A project named '{name}' already exists"));
    }

    let project = Project::new(name, color);
    store.projects.push(project.clone());
    storage::save(&app, &store)?;

    Ok(project)
}

/// Delete a project by id. Returns the deleted project's id.
#[tauri::command]
pub fn delete_project(app: AppHandle, project_id: String) -> Result<String, String> {
    let mut store = storage::load(&app)?;

    let before = store.projects.len();
    store.projects.retain(|p| p.id != project_id);

    if store.projects.len() == before {
        return Err(format!("Project '{project_id}' not found"));
    }

    // Detach entries that belong to this project (keep entries, just unlink)
    for entry in &mut store.entries {
        if entry.project_id.as_deref() == Some(&project_id) {
            entry.project_id = None;
        }
    }

    storage::save(&app, &store)?;
    Ok(project_id)
}

/// Rename a project
#[tauri::command]
pub fn update_project(
    app: AppHandle,
    project_id: String,
    name: String,
    color: String,
) -> Result<Project, String> {
    if name.trim().is_empty() {
        return Err("Project name cannot be empty".into());
    }

    let mut store = storage::load(&app)?;

    let project = store
        .projects
        .iter_mut()
        .find(|p| p.id == project_id)
        .ok_or_else(|| format!("Project '{project_id}' not found"))?;

    project.name = name;
    project.color = color;

    let updated = project.clone();
    storage::save(&app, &store)?;
    Ok(updated)
}

// ════════════════════════════════════════════════════════════════════════════
//  TIME ENTRY COMMANDS
// ════════════════════════════════════════════════════════════════════════════

/// List all time entries (most recent first)
#[tauri::command]
pub fn get_entries(app: AppHandle) -> Result<Vec<TimeEntry>, String> {
    let mut store = storage::load(&app)?;
    // Sort by start_ms descending so the frontend gets newest first
    store.entries.sort_by(|a, b| b.start_ms.cmp(&a.start_ms));
    Ok(store.entries)
}

/// Start a new timer. Returns the new running entry.
/// Only one entry can be running at a time — calling start_timer stops any
/// currently running entry first.
#[tauri::command]
pub fn start_timer(
    app: AppHandle,
    project_id: Option<String>,
    description: String,
    tags: Vec<String>,
) -> Result<TimeEntry, String> {
    let mut store = storage::load(&app)?;

    // Auto-stop any running timer
    for entry in &mut store.entries {
        if entry.end_ms.is_none() {
            entry.end_ms = Some(crate::models::now_ms());
        }
    }

    // Validate project_id if provided
    if let Some(ref pid) = project_id {
        if !store.projects.iter().any(|p| &p.id == pid) {
            return Err(format!("Project '{pid}' not found"));
        }
    }

    let entry = TimeEntry::new(project_id, description, tags);
    store.entries.push(entry.clone());
    storage::save(&app, &store)?;

    Ok(entry)
}

/// Stop the currently running timer. Returns the stopped entry.
#[tauri::command]
pub fn stop_timer(app: AppHandle) -> Result<Option<TimeEntry>, String> {
    let mut store = storage::load(&app)?;

    let mut stopped: Option<TimeEntry> = None;

    for entry in &mut store.entries {
        if entry.end_ms.is_none() {
            entry.end_ms = Some(crate::models::now_ms());
            stopped = Some(entry.clone());
            break;
        }
    }

    if stopped.is_some() {
        storage::save(&app, &store)?;
    }

    Ok(stopped)
}

/// Get the currently running entry (if any)
#[tauri::command]
pub fn get_running_entry(app: AppHandle) -> Result<Option<TimeEntry>, String> {
    let store = storage::load(&app)?;
    let running = store.entries.into_iter().find(|e| e.end_ms.is_none());
    Ok(running)
}

/// Delete a time entry by id
#[tauri::command]
pub fn delete_entry(app: AppHandle, entry_id: String) -> Result<String, String> {
    let mut store = storage::load(&app)?;

    let before = store.entries.len();
    store.entries.retain(|e| e.id != entry_id);

    if store.entries.len() == before {
        return Err(format!("Entry '{entry_id}' not found"));
    }

    storage::save(&app, &store)?;
    Ok(entry_id)
}

/// Update an entry's description, project, or tags (cannot change start/end via this)
#[tauri::command]
pub fn update_entry(
    app: AppHandle,
    entry_id: String,
    description: Option<String>,
    project_id: Option<Option<String>>, // Some(Some(id)) = set, Some(None) = clear, None = unchanged
    tags: Option<Vec<String>>,
) -> Result<TimeEntry, String> {
    let mut store = storage::load(&app)?;

    let entry = store
        .entries
        .iter_mut()
        .find(|e| e.id == entry_id)
        .ok_or_else(|| format!("Entry '{entry_id}' not found"))?;

    if let Some(desc) = description {
        entry.description = desc;
    }
    if let Some(pid_opt) = project_id {
        // Validate if setting a project
        if let Some(ref pid) = pid_opt {
            if !store.projects.iter().any(|p| &p.id == pid) {
                return Err(format!("Project '{pid}' not found"));
            }
        }
        entry.project_id = pid_opt;
    }
    if let Some(t) = tags {
        entry.tags = t;
    }

    let updated = entry.clone();
    storage::save(&app, &store)?;
    Ok(updated)
}

// ════════════════════════════════════════════════════════════════════════════
//  STATS / SUMMARY COMMANDS
// ════════════════════════════════════════════════════════════════════════════

use serde::Serialize;

#[derive(Serialize)]
pub struct DailySummary {
    pub date: String,        // "YYYY-MM-DD"
    pub total_secs: u64,
    pub entries: Vec<TimeEntry>,
}

#[derive(Serialize)]
pub struct ProjectSummary {
    pub project_id: Option<String>,
    pub project_name: String,
    pub total_secs: u64,
}

/// Returns total seconds tracked today (UTC)
#[tauri::command]
pub fn get_today_total(app: AppHandle) -> Result<u64, String> {
    let store = storage::load(&app)?;
    let today_start = today_start_ms();

    let total = store
        .entries
        .iter()
        .filter(|e| e.start_ms >= today_start)
        .map(|e| e.duration_secs())
        .sum();

    Ok(total)
}

/// Returns per-project totals for today
#[tauri::command]
pub fn get_today_by_project(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let store = storage::load(&app)?;
    let today_start = today_start_ms();

    let mut map: std::collections::HashMap<Option<String>, u64> = std::collections::HashMap::new();

    for entry in store.entries.iter().filter(|e| e.start_ms >= today_start) {
        *map.entry(entry.project_id.clone()).or_default() += entry.duration_secs();
    }

    let summaries = map
        .into_iter()
        .map(|(pid, secs)| {
            let name = pid
                .as_ref()
                .and_then(|id| store.projects.iter().find(|p| &p.id == id))
                .map(|p| p.name.clone())
                .unwrap_or_else(|| "No Project".into());
            ProjectSummary {
                project_id: pid,
                project_name: name,
                total_secs: secs,
            }
        })
        .collect();

    Ok(summaries)
}

// ── helpers ──────────────────────────────────────────────────────────────────

fn today_start_ms() -> u64 {
    let now = crate::models::now_ms();
    // Floor to nearest day (UTC)
    let ms_per_day = 86_400_000u64;
    (now / ms_per_day) * ms_per_day
}