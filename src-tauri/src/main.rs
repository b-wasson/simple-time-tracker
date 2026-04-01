#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod storage;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Projects
            commands::get_projects,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            // Entries
            commands::get_entries,
            commands::start_timer,
            commands::stop_timer,
            commands::get_running_entry,
            commands::delete_entry,
            commands::clear_all_entries,
            commands::update_entry,
            // Stats
            commands::get_today_total,
            commands::get_today_by_project,
            // Goals
            commands::get_goals,
            commands::create_goal,
            commands::update_goal,
            commands::delete_goal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}