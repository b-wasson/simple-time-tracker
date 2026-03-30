use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// Returns current Unix timestamp in milliseconds
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

/// A project that time entries belong to
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,      // hex color, e.g. "#3B82F6"
    pub created_at: u64,    // Unix ms
}

impl Project {
    pub fn new(name: String, color: String) -> Self {
        Self {
            id: uuid_v4(),
            name,
            color,
            created_at: now_ms(),
        }
    }
}

/// A single time entry (a running or completed session)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: String,
    pub project_id: Option<String>,  // None = no project (inbox)
    pub description: String,
    pub start_ms: u64,               // Unix ms when started
    pub end_ms: Option<u64>,         // None = currently running
    pub tags: Vec<String>,
}

impl TimeEntry {
    pub fn new(project_id: Option<String>, description: String, tags: Vec<String>) -> Self {
        Self {
            id: uuid_v4(),
            project_id,
            description,
            start_ms: now_ms(),
            end_ms: None,
            tags,
        }
    }

    /// Duration in seconds. If still running, duration up to now.
    pub fn duration_secs(&self) -> u64 {
        let end = self.end_ms.unwrap_or_else(now_ms);
        (end.saturating_sub(self.start_ms)) / 1000
    }

    pub fn is_running(&self) -> bool {
        self.end_ms.is_none()
    }
}

/// The full persisted store
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Store {
    pub projects: Vec<Project>,
    pub entries: Vec<TimeEntry>,
}

// ── tiny UUID v4 (no external dep needed) ─────────────────────────────────────
fn uuid_v4() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut h = DefaultHasher::new();
    now_ms().hash(&mut h);
    std::thread::current().id().hash(&mut h);
    let a = h.finish();

    // second value with different seed
    (a ^ 0xDEAD_BEEF_CAFE_1234).hash(&mut h);
    let b = h.finish();

    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        (a >> 32) as u32,
        (a >> 16) as u16,
        a as u16 & 0x0FFF,
        (b >> 48) as u16 | 0x8000,
        b & 0x0000_FFFF_FFFF_FFFF
    )
}