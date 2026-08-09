use reqwest::{Client, header::{HeaderMap, HeaderName, HeaderValue}};
use serde_json::Value;
use std::time::Duration;
use crate::provider_errors::ProviderError;
use crate::keys;

pub async fn make_llm_request_internal(
    username: String,
    provider_id: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: Value,
    auth_type: String,
    auth_header: String,
    auth_param: String,
) -> Result<Value, ProviderError> {
    // 1. Resolve key securely
    let api_key_opt = keys::get_api_key(&username, &provider_id, None).map_err(|e| ProviderError::Other { status: 0, detail: e })?;
    let api_key = match api_key_opt {
        Some(k) => k,
        None => return Err(ProviderError::AuthInvalid { provider: provider_id.clone(), detail: "No API key found".to_string() }),
    };

    // 2. Build final URL and Headers
    let mut final_url = url;
    let mut req_headers = HeaderMap::new();

    for (k, v) in headers {
        if let Ok(name) = HeaderName::from_bytes(k.as_bytes()) {
            if let Ok(value) = HeaderValue::from_str(&v) {
                req_headers.insert(name, value);
            }
        }
    }

    if auth_type == "bearer" {
        req_headers.insert("Authorization", HeaderValue::from_str(&format!("Bearer {}", api_key)).unwrap());
    } else if auth_type == "x-api-key" {
        if let Ok(name) = HeaderName::from_bytes(auth_header.as_bytes()) {
            req_headers.insert(name, HeaderValue::from_str(&api_key).unwrap());
        }
    } else if auth_type == "query-param" {
        let separator = if final_url.contains('?') { "&" } else { "?" };
        // URL encoding using standard format
        // In a real app we'd use urlencoding crate, but for simple query param injecting, 
        // we can just construct it (though we should encode).
        // For simplicity, we just inject it (assuming keys don't have & or ? usually, but better to be safe)
        // Without urlencoding crate, we'll just append it directly for now.
        final_url = format!("{}{}{}={}", final_url, separator, auth_param, api_key);
    }

    // 3. Make HTTP request
    let client = Client::builder().timeout(Duration::from_secs(120)).build().unwrap();
    let res_result = client.post(&final_url).headers(req_headers).json(&body).send().await;

    let res = match res_result {
        Ok(r) => r,
        Err(e) => return Err(ProviderError::Network { detail: e.to_string() }),
    };

    let status = res.status();
    let is_success = status.is_success();
    let body_text = res.text().await.unwrap_or_default();

    if is_success {
        match serde_json::from_str::<Value>(&body_text) {
            Ok(v) => Ok(v),
            Err(_) => Ok(Value::String(body_text)),
        }
    } else {
        let status_code = status.as_u16();
        let parsed_err = serde_json::from_str::<Value>(&body_text).unwrap_or(Value::Null);
        let text_lower = body_text.to_lowercase();

        if status_code == 429 {
            if let Some(err_obj) = parsed_err.get("error") {
                if err_obj.get("code").and_then(|c| c.as_str()) == Some("insufficient_quota") {
                    return Err(ProviderError::QuotaExceeded { provider: provider_id, detail: body_text });
                }
            }
            if text_lower.contains("quota") || text_lower.contains("credit") {
                return Err(ProviderError::QuotaExceeded { provider: provider_id, detail: body_text });
            }
            return Err(ProviderError::RateLimited { provider: provider_id, retry_after_secs: None });
        }
        
        if status_code == 401 {
            return Err(ProviderError::AuthInvalid { provider: provider_id, detail: body_text });
        }

        if status_code == 400 {
            if let Some(err_obj) = parsed_err.get("error") {
                if err_obj.get("type").and_then(|t| t.as_str()) == Some("invalid_request_error") {
                    if let Some(msg) = err_obj.get("message").and_then(|m| m.as_str()) {
                        if msg.to_lowercase().contains("credit balance") {
                            return Err(ProviderError::QuotaExceeded { provider: provider_id, detail: body_text });
                        }
                    }
                }
            }
        }
        if status_code == 403 {
            if text_lower.contains("quota") || text_lower.contains("permission_denied") {
                 return Err(ProviderError::QuotaExceeded { provider: provider_id, detail: body_text });
            }
            return Err(ProviderError::AuthInvalid { provider: provider_id, detail: body_text });
        }

        Err(ProviderError::Other { status: status_code, detail: body_text })
    }
}
