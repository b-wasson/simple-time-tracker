import { useState, useEffect, useRef } from "react";
import type { TimeEntry, Project } from "../api";
import { startTimer, stopTimer, formatDuration } from "../api";

interface Props {
  running: TimeEntry | null;
  projects: Project[];
  onStarted: (entry: TimeEntry) => void;
  onStopped: (entry: TimeEntry) => void;
}

export default function TimerBar({ running, projects, onStarted, onStopped }: Props) {
  const [desc, setDesc] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tick elapsed seconds when running
  useEffect(() => {
    if (!running) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - running.start_ms) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Populate fields when a timer is already running (app load)
  useEffect(() => {
    if (running) {
      setDesc(running.description);
      setSelectedProject(running.project_id);
    }
  }, []);

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const entry = await startTimer(desc.trim(), selectedProject);
      onStarted(entry);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const stopped = await stopTimer();
      if (stopped) {
        onStopped(stopped);
        setDesc("");
        setSelectedProject(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") running ? handleStop() : handleStart();
  };

  const project = projects.find((p) => p.id === selectedProject);

  return (
    <div
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
      className="px-6 py-4 flex items-center gap-4"
    >
      {/* Running indicator dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: running ? "var(--running)" : "var(--border-hi)",
          animation: running ? "pulse-dot 1.4s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />

      {/* Description input */}
      <input
        ref={inputRef}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={handleKey}
        placeholder="What are you working on?"
        disabled={!!running}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: running ? "var(--text)" : "var(--text)",
          fontSize: "1rem",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 500,
          opacity: running ? 0.7 : 1,
        }}
      />

      {/* Elapsed / project */}
      <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
        {project && (
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              background: project.color + "22",
              color: project.color,
              border: `1px solid ${project.color}44`,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {project.name}
          </span>
        )}

        {running && (
          <span
            className="mono text-lg"
            style={{ color: "var(--running)", minWidth: 72, textAlign: "right" }}
          >
            {formatDuration(elapsed)}
          </span>
        )}

        {/* Project picker (only when not running) */}
        {!running && (
          <select
            value={selectedProject ?? ""}
            onChange={(e) => setSelectedProject(e.target.value || null)}
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: selectedProject ? "var(--text)" : "var(--muted)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: "0.8rem",
              fontFamily: "'Syne', sans-serif",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {/* Start / Stop button */}
        <button
          onClick={running ? handleStop : handleStart}
          disabled={loading || (!running && desc.trim() === "")}
          style={{
            background: running ? "var(--danger)" : "var(--accent)",
            color: running ? "#fff" : "#0d0d0f",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "background 0.15s, opacity 0.15s",
          }}
        >
          {running ? "STOP" : "START"}
        </button>
      </div>
    </div>
  );
}