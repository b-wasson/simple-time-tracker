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

/// Clear all entries command
#[tauri::command]
pub fn clear_all_entries(app: AppHandle) -> Result<usize, String> {
    let mut store = storage::load(&app)?;
    let count = store.entries.len();
    store.entries.clear();
    storage::save(&app, &store)?;
    Ok(count)
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

// ════════════════════════════════════════════════════════════════════════════
//  GOAL COMMANDS
// ════════════════════════════════════════════════════════════════════════════

use crate::models::{Goal, GoalPeriod};

#[derive(Serialize)]
pub struct GoalProgress {
    pub goal: Goal,
    pub logged_secs: u64,   // how much has been tracked this period
    pub percent: f64,       // 0.0 – 100.0+ (can exceed 100)
}

/// List all goals with current period progress
#[tauri::command]
pub fn get_goals(app: AppHandle) -> Result<Vec<GoalProgress>, String> {
    let store = storage::load(&app)?;
    let now = crate::models::now_ms();
    let ms_per_day = 86_400_000u64;
    let today_start = (now / ms_per_day) * ms_per_day;
    // ISO week start (Monday)
    let day_of_week = ((now / ms_per_day + 3) % 7) as u64; // 0=Mon
    let week_start = today_start - day_of_week * ms_per_day;

    let goals_with_progress = store.goals.iter().map(|goal| {
        let period_start = match goal.period {
            GoalPeriod::Daily  => today_start,
            GoalPeriod::Weekly => week_start,
        };

        let logged_secs: u64 = store.entries.iter()
            .filter(|e| e.start_ms >= period_start && e.project_id == goal.project_id)
            .map(|e| e.duration_secs())
            .sum();

        let percent = if goal.target_secs > 0 {
            (logged_secs as f64 / goal.target_secs as f64) * 100.0
        } else { 0.0 };

        GoalProgress { goal: goal.clone(), logged_secs, percent }
    }).collect();

    Ok(goals_with_progress)
}

/// Create a new goal
#[tauri::command]
pub fn create_goal(
    app: AppHandle,
    project_id: Option<String>,
    label: String,
    target_secs: u64,
    period: String,
) -> Result<Goal, String> {
    if label.trim().is_empty() {
        return Err("Goal label cannot be empty".into());
    }
    if target_secs == 0 {
        return Err("Target must be greater than zero".into());
    }
    let period = match period.as_str() {
        "daily"  => GoalPeriod::Daily,
        "weekly" => GoalPeriod::Weekly,
        other    => return Err(format!("Unknown period '{other}'")),
    };
    let mut store = storage::load(&app)?;
    if let Some(ref pid) = project_id {
        if !store.projects.iter().any(|p| &p.id == pid) {
            return Err(format!("Project '{pid}' not found"));
        }
    }
    let goal = Goal::new(project_id, label, target_secs, period);
    store.goals.push(goal.clone());
    storage::save(&app, &store)?;
    Ok(goal)
}

/// Delete a goal by id
#[tauri::command]
pub fn delete_goal(app: AppHandle, goal_id: String) -> Result<String, String> {
    let mut store = storage::load(&app)?;
    let before = store.goals.len();
    store.goals.retain(|g| g.id != goal_id);
    if store.goals.len() == before {
        return Err(format!("Goal '{goal_id}' not found"));
    }
    storage::save(&app, &store)?;
    Ok(goal_id)
}

/// Update a goal's label, target, or period
#[tauri::command]
pub fn update_goal(
    app: AppHandle,
    goal_id: String,
    label: Option<String>,
    target_secs: Option<u64>,
    period: Option<String>,
) -> Result<Goal, String> {
    let mut store = storage::load(&app)?;
    let goal = store.goals.iter_mut()
        .find(|g| g.id == goal_id)
        .ok_or_else(|| format!("Goal '{goal_id}' not found"))?;

    if let Some(l) = label { goal.label = l; }
    if let Some(t) = target_secs { goal.target_secs = t; }
    if let Some(p) = period {
        goal.period = match p.as_str() {
            "daily"  => GoalPeriod::Daily,
            "weekly" => GoalPeriod::Weekly,
            other    => return Err(format!("Unknown period '{other}'")),
        };
    }
    let updated = goal.clone();
    storage::save(&app, &store)?;
    Ok(updated)
}