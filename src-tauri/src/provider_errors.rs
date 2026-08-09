use serde::Serialize;

#[derive(Serialize, Debug)]
#[serde(tag = "kind")]
pub enum ProviderError {
    QuotaExceeded { provider: String, detail: String },
    AuthInvalid { provider: String, detail: String },
    RateLimited { provider: String, retry_after_secs: Option<u64> },
    Network { detail: String },
    Other { status: u16, detail: String },
}
