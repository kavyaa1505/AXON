use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::keys;

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

// API Key Management Commands

#[tauri::command]
pub fn save_api_key(provider_id: String, key: String, agent_id: Option<String>) -> Result<(), String> {
    keys::save_api_key(provider_id, key, agent_id)
}

#[tauri::command]
pub fn get_api_key(provider_id: String, agent_id: Option<String>) -> Result<Option<String>, String> {
    keys::get_api_key(provider_id, agent_id)
}

#[tauri::command]
pub fn delete_api_key(provider_id: String, agent_id: Option<String>) -> Result<(), String> {
    keys::delete_api_key(provider_id, agent_id)
}

#[tauri::command]
pub fn has_api_key(provider_id: String, agent_id: Option<String>) -> Result<bool, String> {
    keys::has_api_key(provider_id, agent_id)
}

// LLM Request Structures

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProviderEntry {
    pub id: String,
    pub name: String,
    pub endpoint: String,
    pub auth_type: String,
    pub auth_header: String,
    pub auth_param: String,
    pub model: String,
    pub models: Vec<String>,
    pub response_format: String,
    pub custom_response_path: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LlmRequest {
    pub provider_config: ProviderEntry,
    pub agent_id: String,
    pub messages: Vec<ChatMessage>,
    pub system_prompt: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LlmResponse {
    pub text: String,
    pub raw: serde_json::Value,
}

#[tauri::command]
pub async fn make_llm_request(request: LlmRequest) -> Result<LlmResponse, String> {
    let provider = &request.provider_config;
    let agent_id = &request.agent_id;

    // Resolve the API key using the keychain
    let api_key = keys::resolve_key_for_agent(&provider.id, agent_id)?;

    let mut url = provider.endpoint.clone();
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::CONTENT_TYPE,
        reqwest::header::HeaderValue::from_static("application/json")
    );

    // Auth & Provider Specific Headers
    match provider.auth_type.as_str() {
        "bearer" => {
            headers.insert(
                reqwest::header::AUTHORIZATION,
                reqwest::header::HeaderValue::from_str(&format!("Bearer {}", api_key))
                    .map_err(|e| format!("Invalid auth header: {}", e))?
            );
        }
        "x-api-key" => {
            let header_name = if provider.auth_header.is_empty() {
                "x-api-key".to_string()
            } else {
                provider.auth_header.clone()
            };
            headers.insert(
                reqwest::header::HeaderName::from_bytes(header_name.as_bytes())
                    .map_err(|e| format!("Invalid header name: {}", e))?,
                reqwest::header::HeaderValue::from_str(&api_key)
                    .map_err(|e| format!("Invalid header value: {}", e))?
            );
        }
        "query-param" => {
            let param_name = if provider.auth_param.is_empty() {
                "key".to_string()
            } else {
                provider.auth_param.clone()
            };
            let separator = if url.contains('?') { "&" } else { "?" };
            url = format!("{}{}{}={}", url, separator, param_name, urlencoding::encode(&api_key));
        }
        _ => {
            return Err(format!("Unsupported auth type: {}", provider.auth_type));
        }
    }

    // Gemini-specific URL modification (before creating body_builder)
    if provider.response_format == "gemini" && !url.contains(":generateContent") {
        url = format!("{}/{}:generateContent", url, provider.model);
    }

    // Provider-specific header additions
    if provider.id == "anthropic" || provider.name.to_lowercase().contains("anthropic") {
        headers.insert(
            reqwest::header::HeaderName::from_bytes(b"anthropic-version")
                .map_err(|e| format!("Invalid header name: {}", e))?,
            reqwest::header::HeaderValue::from_static("2023-06-01")
        );
        headers.insert(
            reqwest::header::HeaderName::from_bytes(b"anthropic-dangerous-direct-browser-access")
                .map_err(|e| format!("Invalid header name: {}", e))?,
            reqwest::header::HeaderValue::from_static("true")
        );
    }

    if provider.id == "openrouter" || url.contains("openrouter.ai") {
        headers.insert(
            reqwest::header::HeaderName::from_bytes(b"HTTP-Referer")
                .map_err(|e| format!("Invalid header name: {}", e))?,
            reqwest::header::HeaderValue::from_static("https://axon-ide.app")
        );
        headers.insert(
            reqwest::header::HeaderName::from_bytes(b"X-Title")
                .map_err(|e| format!("Invalid header name: {}", e))?,
            reqwest::header::HeaderValue::from_static("AXON IDE")
        );
    }

    let client = reqwest::Client::new();
    let mut body_builder = client.post(&url).headers(headers);

    let model = if !provider.model.is_empty() {
        &provider.model
    } else {
        return Err("Provider model is empty".to_string());
    };

    // Build request body based on response format
    let body_value = match provider.response_format.as_str() {
        "openai" => {
            let mut formatted_messages = Vec::new();
            if let Some(system_prompt) = &request.system_prompt {
                formatted_messages.push(serde_json::json!({
                    "role": "system",
                    "content": system_prompt
                }));
            }
            for msg in &request.messages {
                formatted_messages.push(serde_json::json!({
                    "role": msg.role,
                    "content": msg.content
                }));
            }

            serde_json::json!({
                "model": model,
                "messages": formatted_messages,
                "temperature": 0.7
            })
        }
        "anthropic" => {
            let formatted_messages: Vec<serde_json::Value> = request.messages
                .iter()
                .filter(|m| m.role != "system")
                .map(|m| {
                    let role = if m.role == "assistant" { "assistant" } else { "user" };
                    serde_json::json!({
                        "role": role,
                        "content": m.content
                    })
                })
                .collect();

            serde_json::json!({
                "model": model,
                "max_tokens": 4096,
                "system": request.system_prompt,
                "messages": formatted_messages
            })
        }
        "gemini" => {
            let contents: Vec<serde_json::Value> = request.messages
                .iter()
                .map(|m| {
                    let role = if m.role == "assistant" { "model" } else { "user" };
                    serde_json::json!({
                        "role": role,
                        "parts": [{"text": m.content}]
                    })
                })
                .collect();

            let mut body_obj = serde_json::json!({ "contents": contents });
            if let Some(system_prompt) = &request.system_prompt {
                body_obj["systemInstruction"] = serde_json::json!({
                    "parts": [{"text": system_prompt}]
                });
            }

            body_obj
        }
        _ => {
            // Custom format fallback
            serde_json::json!({
                "model": model,
                "messages": request.messages,
                "system": request.system_prompt
            })
        }
    };

    body_builder = body_builder.json(&body_value);

    let response = body_builder
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let err_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Provider '{}' HTTP {}: {}", provider.name, status, err_text));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = match provider.response_format.as_str() {
        "openai" => {
            let choice = data.get("choices").and_then(|c| c.get(0));
            if let Some(content) = choice.and_then(|c| c.get("message")).and_then(|m| m.get("content")) {
                if content.is_string() {
                    content.as_str().unwrap_or("").to_string()
                } else {
                    serde_json::to_string(content).unwrap_or_default()
                }
            } else if let Some(text) = choice.and_then(|c| c.get("text")) {
                text.as_str().unwrap_or("").to_string()
            } else if let Some(reasoning) = choice.and_then(|c| c.get("message")).and_then(|m| m.get("reasoning_content")) {
                reasoning.as_str().unwrap_or("").to_string()
            } else {
                String::new()
            }
        }
        "anthropic" => {
            data.get("content")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("text"))
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string()
        }
        "gemini" => {
            data.get("candidates")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("content"))
                .and_then(|c| c.get("parts"))
                .and_then(|p| p.get(0))
                .and_then(|p| p.get("text"))
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string()
        }
        _ => {
            if !provider.custom_response_path.is_empty() {
                get_nested_property(&data, &provider.custom_response_path)
                    .and_then(|v| v.as_str())
                    .unwrap_or(&serde_json::to_string(&data).unwrap_or_default())
                    .to_string()
            } else {
                serde_json::to_string(&data).unwrap_or_default()
            }
        }
    };

    Ok(LlmResponse { text, raw: data })
}

fn get_nested_property<'a>(obj: &'a serde_json::Value, path: &'a str) -> Option<&'a serde_json::Value> {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = obj;
    for part in parts {
        current = current.get(part)?;
    }
    Some(current)
}

