mod keys;
mod commands;
mod llm;
mod provider_errors;
mod auth;
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
            run_git_command,
            get_api_key_masked,
            get_api_key,
            save_api_key,
            make_llm_request,
            auth::list_profiles,
            auth::create_profile,
            auth::verify_login,
            auth::change_password,
            auth::delete_profile,
            migrate_legacy_keys
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

