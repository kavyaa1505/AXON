use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use rand_core::OsRng;
use argon2::{
    password_hash::{
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProfileMeta {
    pub username: String,
    pub display_name: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Default)]
struct ProfilesData {
    profiles: Vec<ProfileMeta>,
}

fn get_profiles_path(app: &AppHandle) -> Result<PathBuf, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path.join("profiles.json"))
}

fn read_profiles(app: &AppHandle) -> Result<ProfilesData, String> {
    let path = get_profiles_path(app)?;
    if !path.exists() {
        return Ok(ProfilesData::default());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_profiles(app: &AppHandle, data: &ProfilesData) -> Result<(), String> {
    let path = get_profiles_path(app)?;
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_profiles(app: AppHandle) -> Result<Vec<ProfileMeta>, String> {
    let data = read_profiles(&app)?;
    Ok(data.profiles)
}

#[tauri::command]
pub fn create_profile(app: AppHandle, username: String, password: String, display_name: String) -> Result<(), String> {
    if username.is_empty() || password.len() < 8 {
        return Err("Invalid username or password too short".into());
    }

    let mut data = read_profiles(&app)?;
    if data.profiles.iter().any(|p| p.username == username) {
        return Err("Username already exists".into());
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Hashing failed: {}", e))?
        .to_string();

    let entry = keyring::Entry::new("axon-ide-auth", &username).map_err(|e| e.to_string())?;
    entry.set_password(&password_hash).map_err(|e| e.to_string())?;

    data.profiles.push(ProfileMeta {
        username,
        display_name,
        created_at: chrono::Utc::now().to_rfc3339(),
    });

    write_profiles(&app, &data)?;
    Ok(())
}

#[tauri::command]
pub fn verify_login(username: String, password: String) -> Result<bool, String> {
    let entry = keyring::Entry::new("axon-ide-auth", &username).map_err(|_| "Incorrect username or password".to_string())?;
    let hash_str = match entry.get_password() {
        Ok(h) => h,
        Err(_) => return Err("Incorrect username or password".into()),
    };

    let parsed_hash = PasswordHash::new(&hash_str).map_err(|_| "Incorrect username or password".to_string())?;
    
    match Argon2::default().verify_password(password.as_bytes(), &parsed_hash) {
        Ok(_) => Ok(true),
        Err(_) => Err("Incorrect username or password".into()),
    }
}

#[tauri::command]
pub fn change_password(username: String, old_password: String, new_password: String) -> Result<(), String> {
    verify_login(username.clone(), old_password)?;
    
    if new_password.len() < 8 {
        return Err("New password too short".into());
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let new_hash = argon2.hash_password(new_password.as_bytes(), &salt)
        .map_err(|e| format!("Hashing failed: {}", e))?
        .to_string();

    let entry = keyring::Entry::new("axon-ide-auth", &username).map_err(|e| e.to_string())?;
    entry.set_password(&new_hash).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_profile(app: AppHandle, username: String, password: String) -> Result<(), String> {
    verify_login(username.clone(), password)?;

    let entry = keyring::Entry::new("axon-ide-auth", &username).map_err(|e| e.to_string())?;
    let _ = entry.delete_credential();

    let mut data = read_profiles(&app)?;
    data.profiles.retain(|p| p.username != username);
    write_profiles(&app, &data)?;

    Ok(())
}
