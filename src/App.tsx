import { useEffect, useState } from "react";
import type { TimeEntry, Project } from "./api";
import { getEntries, getProjects, getRunningEntry } from "./api";
import TimerBar from "./components/TimerBar";
import EntryList from "./components/EntryList";
import ProjectsPanel from "./components/ProjectsPanel";
import StatsBar from "./components/StatsBar";

type View = "log" | "projects";

export default function App() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [view, setView] = useState<View>("log");
  const [statsKey, setStatsKey] = useState(0);
  const [ready, setReady] = useState(false);

  // Bootstrap
  useEffect(() => {
    Promise.all([getEntries(), getProjects(), getRunningEntry()])
      .then(([e, p, r]) => {
        setEntries(e);
        setProjects(p);
        setRunning(r);
      })
      .catch(console.error)
      .finally(() => setReady(true));
  }, []);

  const handleStarted = (entry: TimeEntry) => {
    setRunning(entry);
    setEntries((prev) => [entry, ...prev]);
    setStatsKey((k) => k + 1);
  };

  const handleStopped = (stopped: TimeEntry) => {
    setRunning(null);
    setEntries((prev) => prev.map((e) => (e.id === stopped.id ? stopped : e)));
    setStatsKey((k) => k + 1);
  };

  const handleEntryDeleted = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setStatsKey((k) => k + 1);
  };

  const handleProjectCreated = (p: Project) => {
    setProjects((prev) => [...prev, p]);
  };

  const handleProjectDeleted = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  if (!ready) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.85rem",
          letterSpacing: "0.08em",
        }}
      >
        LOADING…
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Top bar: timer ──────────────────────────────────────────────── */}
      <TimerBar
        running={running}
        projects={projects}
        onStarted={handleStarted}
        onStopped={handleStopped}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          gap: 2,
          padding: "8px 24px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {(["log", "projects"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: "transparent",
              border: "none",
              padding: "5px 14px",
              borderRadius: 5,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              cursor: "pointer",
              color: view === v ? "var(--accent)" : "var(--muted)",
              background: view === v ? "var(--accent)16" : "transparent",
              transition: "color 0.15s, background 0.15s",
            }}
          >
            {v === "log" ? "Time Log" : "Projects"}
          </button>
        ))}
      </nav>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {view === "log" ? (
          <div
            style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}
          >
            <EntryList
              entries={entries}
              projects={projects}
              onDeleted={handleEntryDeleted}
            />
          </div>
        ) : (
          <div
            style={{ flex: 1, overflowY: "auto" }}
            className="fade-up"
          >
            <ProjectsPanel
              projects={projects}
              onCreated={handleProjectCreated}
              onDeleted={handleProjectDeleted}
            />
          </div>
        )}
      </div>

      {/* ── Stats footer ────────────────────────────────────────────────── */}
      <StatsBar projects={projects} refreshKey={statsKey} />
    </div>
  );
}