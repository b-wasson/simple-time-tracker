use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: u64,
}

impl Project {
    pub fn new(name: String, color: String) -> Self {
        Self { id: uuid_v4(), name, color, created_at: now_ms() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: String,
    pub project_id: Option<String>,
    pub description: String,
    pub start_ms: u64,
    pub end_ms: Option<u64>,
    pub tags: Vec<String>,
}

impl TimeEntry {
    pub fn new(project_id: Option<String>, description: String, tags: Vec<String>) -> Self {
        Self { id: uuid_v4(), project_id, description, start_ms: now_ms(), end_ms: None, tags }
    }

    pub fn duration_secs(&self) -> u64 {
        let end = self.end_ms.unwrap_or_else(now_ms);
        (end.saturating_sub(self.start_ms)) / 1000
    }

    pub fn is_running(&self) -> bool { self.end_ms.is_none() }
}

/// A time goal for a project over a given period
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Goal {
    pub id: String,
    pub project_id: Option<String>, // None = applies to all untracked time
    pub label: String,              // e.g. "Deep work", "Client A"
    pub target_secs: u64,           // goal duration in seconds
    pub period: GoalPeriod,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum GoalPeriod {
    Daily,
    Weekly,
}

impl Goal {
    pub fn new(project_id: Option<String>, label: String, target_secs: u64, period: GoalPeriod) -> Self {
        Self { id: uuid_v4(), project_id, label, target_secs, period, created_at: now_ms() }
    }
}

/// The full persisted store
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Store {
    pub projects: Vec<Project>,
    pub entries: Vec<TimeEntry>,
    #[serde(default)]
    pub goals: Vec<Goal>,
}

fn uuid_v4() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    now_ms().hash(&mut h);
    std::thread::current().id().hash(&mut h);
    let a = h.finish();
    (a ^ 0xDEAD_BEEF_CAFE_1234).hash(&mut h);
    let b = h.finish();
    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        (a >> 32) as u32, (a >> 16) as u16,
        a as u16 & 0x0FFF,
        (b >> 48) as u16 | 0x8000,
        b & 0x0000_FFFF_FFFF_FFFF
    )
}