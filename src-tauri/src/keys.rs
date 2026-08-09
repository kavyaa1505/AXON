use keyring::Entry;

pub fn mask_key(key: &str) -> String {
    if key.len() <= 4 {
        return "••••".to_string();
    }
    format!("••••{}", &key[key.len() - 4..])
}

fn get_entry(username: &str, provider_id: &str, agent_id: Option<&str>) -> Result<Entry, String> {
    let service = "axon_ide";
    let user = match agent_id {
        Some(agent) => format!("axon:{}:{}:{}", username, provider_id, agent),
        None => format!("axon:{}:{}", username, provider_id),
    };
    Entry::new(service, &user).map_err(|e| e.to_string())
}

pub fn save_api_key(username: &str, provider_id: &str, agent_id: Option<&str>, key: &str) -> Result<(), String> {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return Err("API key cannot be empty or whitespace".to_string());
    }
    if trimmed.starts_with('•') {
        return Err("Cannot save a masked API key".to_string());
    }
    let entry = get_entry(username, provider_id, agent_id)?;
    entry.set_password(trimmed).map_err(|e| e.to_string())
}

pub fn get_api_key(username: &str, provider_id: &str, agent_id: Option<&str>) -> Result<Option<String>, String> {
    let entry = get_entry(username, provider_id, agent_id)?;
    match entry.get_password() {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn get_api_key_masked(username: &str, provider_id: &str, agent_id: Option<&str>) -> Result<Option<String>, String> {
    let key_opt = get_api_key(username, provider_id, agent_id)?;
    Ok(key_opt.map(|k| mask_key(&k)))
}

pub fn delete_api_key(username: &str, provider_id: &str, agent_id: Option<&str>) -> Result<(), String> {
    let entry = get_entry(username, provider_id, agent_id)?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn has_api_key(username: &str, provider_id: &str, agent_id: Option<&str>) -> Result<bool, String> {
    let entry = get_entry(username, provider_id, agent_id)?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

pub fn resolve_key_for_agent(username: &str, provider_id: &str, agent_id: &str) -> Result<String, String> {
    if let Ok(Some(key)) = get_api_key(username, provider_id, Some(agent_id)) {
        return Ok(key);
    }
    if let Ok(Some(key)) = get_api_key(username, provider_id, None) {
        return Ok(key);
    }
    Err(format!("No API key found for provider {} (agent: {})", provider_id, agent_id))
}

pub fn seed_keys_from_env() -> Result<(), String> {
    // Mock implementation for completeness
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_key() {
        assert_eq!(mask_key("12345678"), "••••5678");
        assert_eq!(mask_key("1234"), "••••");
        assert_eq!(mask_key("1"), "••••");
        assert_eq!(mask_key(""), "••••");
        assert_eq!(mask_key("abcde"), "••••bcde");
    }

    #[test]
    fn test_save_api_key_validation() {
        let empty_res = save_api_key("testuser", "test_prov", None, "");
        assert!(empty_res.is_err());
        assert_eq!(empty_res.unwrap_err(), "API key cannot be empty or whitespace");

        let whitespace_res = save_api_key("testuser", "test_prov", None, "   ");
        assert!(whitespace_res.is_err());
        assert_eq!(whitespace_res.unwrap_err(), "API key cannot be empty or whitespace");

        let mask_res = save_api_key("testuser", "test_prov", None, "••••abcd");
        assert!(mask_res.is_err());
        assert_eq!(mask_res.unwrap_err(), "Cannot save a masked API key");
    }
}

pub fn migrate_legacy_keys(username: &str, provider_ids: Vec<String>) -> Result<(), String> {
    for provider_id in provider_ids {
        // Try shared provider key
        if let Ok(old_entry) = keyring::Entry::new("axon_ide", &provider_id) {
            if let Ok(pw) = old_entry.get_password() {
                let _ = save_api_key(username, &provider_id, None, &pw);
            }
        }
        // Try known agent keys
        for agent_id in ["planningAgent", "developmentAgent"] {
            let old_user = format!("{}:{}", provider_id, agent_id);
            if let Ok(old_entry) = keyring::Entry::new("axon_ide", &old_user) {
                if let Ok(pw) = old_entry.get_password() {
                    let _ = save_api_key(username, &provider_id, Some(agent_id), &pw);
                }
            }
        }
    }
    Ok(())
}
