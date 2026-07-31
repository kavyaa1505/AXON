#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    // Load .env file for development convenience
    dotenvy::dotenv().ok();

    // Seed API keys from environment variables if they don't exist in keychain
    // This is for development convenience only - never overwrites existing keys
    tauri_app_lib::keys::seed_keys_from_env().unwrap_or_else(|e| {
        eprintln!("Warning: Failed to seed keys from env: {}", e);
    });

    tauri_app_lib::run();
}

