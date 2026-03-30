import { useState } from "react";
import type { TimeEntry, Project } from "../api";
import { deleteEntry, formatDuration, formatTime, formatDate } from "../api";

interface Props {
  entries: TimeEntry[];
  projects: Project[];
  onDeleted: (id: string) => void;
}

interface DayGroup {
  label: string;
  dateMs: number;
  entries: TimeEntry[];
  totalSecs: number;
}

function groupByDay(entries: TimeEntry[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const e of entries) {
    const label = formatDate(e.start_ms);
    if (!map.has(label)) {
      map.set(label, { label, dateMs: e.start_ms, entries: [], totalSecs: 0 });
    }
    const group = map.get(label)!;
    group.entries.push(e);
    const dur = e.end_ms
      ? Math.floor((e.end_ms - e.start_ms) / 1000)
      : Math.floor((Date.now() - e.start_ms) / 1000);
    group.totalSecs += dur;
  }

  return Array.from(map.values()).sort((a, b) => b.dateMs - a.dateMs);
}

export default function EntryList({ entries, projects, onDeleted }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteEntry(id);
      onDeleted(id);
    } finally {
      setDeleting(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: "80px 0", color: "var(--muted)" }}
      >
        <div className="mono" style={{ fontSize: "2.5rem", marginBottom: 12, opacity: 0.3 }}>
          00:00:00
        </div>
        <p style={{ fontSize: "0.9rem", letterSpacing: "0.06em" }}>
          NO ENTRIES YET — START YOUR FIRST TIMER
        </p>
      </div>
    );
  }

  const groups = groupByDay(entries);

  return (
    <div style={{ padding: "0 0 40px" }}>
      {groups.map((group, gi) => (
        <div key={group.label} className={`fade-up stagger-${Math.min(gi + 1, 4)}`}>
          {/* Day header */}
          <div
            className="flex items-center justify-between"
            style={{
              padding: "20px 24px 10px",
              borderBottom: "1px solid var(--border)",
              position: "sticky",
              top: 0,
              background: "var(--bg)",
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              {group.label}
            </span>
            <span
              className="mono"
              style={{ color: "var(--accent)", fontSize: "0.9rem", fontWeight: 500 }}
            >
              {formatDuration(group.totalSecs)}
            </span>
          </div>

          {/* Entries */}
          {group.entries.map((entry) => {
            const project = projects.find((p) => p.id === entry.project_id);
            const durSecs = entry.end_ms
              ? Math.floor((entry.end_ms - entry.start_ms) / 1000)
              : Math.floor((Date.now() - entry.start_ms) / 1000);
            const isRunning = !entry.end_ms;

            return (
              <EntryRow
                key={entry.id}
                entry={entry}
                project={project}
                durSecs={durSecs}
                isRunning={isRunning}
                isDeleting={deleting === entry.id}
                onDelete={() => handleDelete(entry.id)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Single row ────────────────────────────────────────────────────────────────

interface RowProps {
  entry: TimeEntry;
  project: Project | undefined;
  durSecs: number;
  isRunning: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}

function EntryRow({ entry, project, durSecs, isRunning, isDeleting, onDelete }: RowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 24px",
        borderBottom: "1px solid var(--border)",
        background: hovered ? "var(--surface)" : "transparent",
        transition: "background 0.12s",
        opacity: isDeleting ? 0.4 : 1,
        animation: "slideIn 0.2s ease both",
      }}
    >
      {/* Running indicator */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isRunning ? "var(--running)" : "var(--border-hi)",
          animation: isRunning ? "pulse-dot 1.4s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />

      {/* Description */}
      <span
        style={{
          flex: 1,
          fontSize: "0.92rem",
          color: entry.description ? "var(--text)" : "var(--muted)",
          fontStyle: entry.description ? "normal" : "italic",
        }}
      >
        {entry.description || "No description"}
      </span>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex gap-1" style={{ flexShrink: 0 }}>
          {entry.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "0.68rem",
                padding: "2px 7px",
                borderRadius: 4,
                background: "var(--border)",
                color: "var(--muted)",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Project chip */}
      {project ? (
        <span
          style={{
            fontSize: "0.72rem",
            padding: "3px 9px",
            borderRadius: 4,
            background: project.color + "18",
            color: project.color,
            border: `1px solid ${project.color}33`,
            fontWeight: 700,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {project.name}
        </span>
      ) : (
        <span style={{ width: 60, flexShrink: 0 }} />
      )}

      {/* Time range */}
      <span
        className="mono"
        style={{ color: "var(--muted)", fontSize: "0.78rem", flexShrink: 0, minWidth: 110, textAlign: "right" }}
      >
        {formatTime(entry.start_ms)} – {entry.end_ms ? formatTime(entry.end_ms) : "now"}
      </span>

      {/* Duration */}
      <span
        className="mono"
        style={{
          color: isRunning ? "var(--running)" : "var(--text)",
          fontSize: "0.92rem",
          fontWeight: 500,
          flexShrink: 0,
          minWidth: 72,
          textAlign: "right",
        }}
      >
        {formatDuration(durSecs)}
      </span>

      {/* Delete button */}
      <button
        onClick={onDelete}
        disabled={isDeleting}
        style={{
          background: "transparent",
          border: "none",
          color: hovered ? "var(--danger)" : "transparent",
          cursor: "pointer",
          fontSize: "1rem",
          transition: "color 0.15s",
          padding: "0 4px",
          flexShrink: 0,
        }}
        title="Delete entry"
      >
        ×
      </button>
    </div>
  );
}