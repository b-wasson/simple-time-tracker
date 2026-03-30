use std::fs;
use std::path::PathBuf;
use tauri::Manager;

use crate::models::Store;

/// Returns the path to the data file, e.g.
/// ~/.local/share/com.timetracker.app/time_tracker_data.json  (Linux)
/// ~/Library/Application Support/com.timetracker.app/...      (macOS)
/// %APPDATA%\com.timetracker.app\...                          (Windows)
pub fn data_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("could not resolve app data dir")
        .join("time_tracker_data.json")
}

/// Load store from disk, returning an empty store if the file doesn't exist yet.
pub fn load(app: &tauri::AppHandle) -> Result<Store, String> {
    let path = data_path(app);

    if !path.exists() {
        return Ok(Store::default());
    }

    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read data file: {e}"))?;

    serde_json::from_str(&raw)
        .map_err(|e| format!("Failed to parse data file: {e}"))
}

/// Persist the store to disk (pretty-printed for easy debugging).
pub fn save(app: &tauri::AppHandle, store: &Store) -> Result<(), String> {
    let path = data_path(app);

    // Ensure the directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {e}"))?;
    }

    let json = serde_json::to_string_pretty(store)
        .map_err(|e| format!("Failed to serialize store: {e}"))?;

    fs::write(&path, json)
        .map_err(|e| format!("Failed to write data file: {e}"))?;

    Ok(())
}