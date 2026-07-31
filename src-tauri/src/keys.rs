use keyring::Entry;

const SERVICE_NAME: &str = "axon-ide";

/// Get the keychain entry key for a provider (shared key)
fn get_shared_entry_key(provider_id: &str) -> String {
    format!("axon:{}", provider_id)
}

/// Get the keychain entry key for a provider with agent-specific override
fn get_agent_entry_key(provider_id: &str, agent_id: &str) -> String {
    format!("axon:{}:{}", provider_id, agent_id)
}

/// Save an API key to the keychain
/// If agent_id is provided, saves as agent-specific override
/// If agent_id is None, saves as shared key for the provider
pub fn save_api_key(provider_id: String, key: String, agent_id: Option<String>) -> Result<(), String> {
    let entry_key = if let Some(agent) = agent_id {
        get_agent_entry_key(&provider_id, &agent)
    } else {
        get_shared_entry_key(&provider_id)
    };

    let entry = Entry::new(SERVICE_NAME, &entry_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    entry.set_password(&key)
        .map_err(|e| format!("Failed to save API key: {}", e))?;

    Ok(())
}

/// Get an API key from the keychain
/// If agent_id is provided, looks for agent-specific override first, then falls back to shared
/// If agent_id is None, only looks for shared key
pub fn get_api_key(provider_id: String, agent_id: Option<String>) -> Result<Option<String>, String> {
    // If agent_id provided, try agent-specific override first
    if let Some(agent) = agent_id {
        let agent_entry_key = get_agent_entry_key(&provider_id, &agent);
        let agent_entry = Entry::new(SERVICE_NAME, &agent_entry_key)
            .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

        if let Ok(password) = agent_entry.get_password() {
            return Ok(Some(password));
        }
    }

    // Fall back to shared key
    let shared_entry_key = get_shared_entry_key(&provider_id);
    let shared_entry = Entry::new(SERVICE_NAME, &shared_entry_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    match shared_entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve API key: {}", e)),
    }
}

/// Delete an API key from the keychain
/// If agent_id is provided, deletes agent-specific override
/// If agent_id is None, deletes shared key
pub fn delete_api_key(provider_id: String, agent_id: Option<String>) -> Result<(), String> {
    let entry_key = if let Some(agent) = agent_id {
        get_agent_entry_key(&provider_id, &agent)
    } else {
        get_shared_entry_key(&provider_id)
    };

    let entry = Entry::new(SERVICE_NAME, &entry_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    entry.delete_credential()
        .map_err(|e| format!("Failed to delete API key: {}", e))?;

    Ok(())
}

/// Check if an API key exists for a provider/agent combination
pub fn has_api_key(provider_id: String, agent_id: Option<String>) -> Result<bool, String> {
    match get_api_key(provider_id, agent_id) {
        Ok(Some(_)) => Ok(true),
        Ok(None) => Ok(false),
        Err(e) => Err(e),
    }
}

/// Resolve the API key for a specific agent
/// This is the core resolution function that implements the priority:
/// 1. Agent-specific override (axon:{provider_id}:{agent_id})
/// 2. Shared key (axon:{provider_id})
/// 3. Error if neither exists
pub fn resolve_key_for_agent(provider_id: &str, agent_id: &str) -> Result<String, String> {
    // First try agent-specific override
    let agent_entry_key = get_agent_entry_key(provider_id, agent_id);
    let agent_entry = Entry::new(SERVICE_NAME, &agent_entry_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    if let Ok(password) = agent_entry.get_password() {
        return Ok(password);
    }

    // Fall back to shared key
    let shared_entry_key = get_shared_entry_key(provider_id);
    let shared_entry = Entry::new(SERVICE_NAME, &shared_entry_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    match shared_entry.get_password() {
        Ok(password) => Ok(password),
        Err(keyring::Error::NoEntry) => Err(format!("No API key configured for {}", provider_id)),
        Err(e) => Err(format!("Failed to retrieve API key: {}", e)),
    }
}

/// Seed keys from environment variables if they don't exist in keychain
/// This is for development convenience only
pub fn seed_keys_from_env() -> Result<(), String> {
    let env_mappings = [
        ("anthropic", "ANTHROPIC_API_KEY"),
        ("openai", "OPENAI_API_KEY"),
        ("openrouter", "OPENROUTER_API_KEY"),
        ("nvidia", "NVIDIA_API_KEY"),
        ("deepseek", "DEEPSEEK_API_KEY"),
        ("groq", "GROQ_API_KEY"),
        ("gemini", "GEMINI_API_KEY"),
        ("mistral", "MISTRAL_API_KEY"),
        ("together", "TOGETHER_API_KEY"),
        ("perplexity", "PERPLEXITY_API_KEY"),
        ("xai", "XAI_API_KEY"),
        ("fireworks", "FIREWORKS_API_KEY"),
        ("cerebras", "CEREBRAS_API_KEY"),
    ];

    for (provider_id, env_var) in env_mappings {
        if let Ok(api_key) = std::env::var(env_var) {
            if !api_key.is_empty() {
                // Check if key already exists in keychain
                let shared_entry_key = get_shared_entry_key(provider_id);
                let shared_entry = Entry::new(SERVICE_NAME, &shared_entry_key)
                    .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

                // Only seed if key doesn't already exist
                if let Err(keyring::Error::NoEntry) = shared_entry.get_password() {
                    if let Err(e) = save_api_key(provider_id.to_string(), api_key, None) {
                        eprintln!("Warning: Failed to seed {} from env: {}", env_var, e);
                    }
                }
            }
        }
    }

    Ok(())
}
