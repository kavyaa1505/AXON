use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_dir_tree(path: String) -> Result<Vec<FileNode>, String> {
    let mut nodes = Vec::new();
    let dir = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in dir {
        if let Ok(entry) = entry {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry_path.is_dir();
            let path_str = entry_path.to_string_lossy().to_string();

            // Skip hidden VCS / build output directories for performance
            let children = if is_dir && name != ".git" && name != "node_modules" && name != "target" && name != "dist" && name != ".next" {
                read_dir_tree(path_str.clone()).ok()
            } else {
                None
            };

            nodes.push(FileNode {
                name,
                path: path_str,
                is_dir,
                children,
            });
        }
    }

    nodes.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(nodes)
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::File::create(&path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_git_command(args: Vec<String>, cwd: String) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

use crate::keys;

#[tauri::command]
pub fn get_api_key_masked(username: String, provider_id: String, agent_id: Option<String>) -> Result<Option<String>, String> {
    keys::get_api_key_masked(&username, &provider_id, agent_id.as_deref())
}

#[tauri::command]
pub fn get_api_key(username: String, provider_id: String, agent_id: Option<String>) -> Result<Option<String>, String> {
    keys::get_api_key(&username, &provider_id, agent_id.as_deref())
}

#[tauri::command]
pub fn save_api_key(username: String, provider_id: String, agent_id: Option<String>, key: String) -> Result<(), String> {
    keys::save_api_key(&username, &provider_id, agent_id.as_deref(), &key)
}

#[tauri::command]
pub async fn make_llm_request(
    username: String,
    provider_id: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: serde_json::Value,
    auth_type: String,
    auth_header: String,
    auth_param: String,
) -> Result<serde_json::Value, crate::provider_errors::ProviderError> {
    crate::llm::make_llm_request_internal(username, provider_id, url, headers, body, auth_type, auth_header, auth_param).await
}

#[tauri::command]
pub fn migrate_legacy_keys(username: String, provider_ids: Vec<String>) -> Result<(), String> {
    keys::migrate_legacy_keys(&username, provider_ids)
}
