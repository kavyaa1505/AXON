mod commands;

use commands::*;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from AXON IDE!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            read_dir_tree,
            create_file,
            create_folder,
            delete_entry,
            rename_entry,
            run_git_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

