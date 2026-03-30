import { useEffect, useState } from "react";
import type { Project } from "../api";
import { getTodayByProject, formatDuration } from "../api";

interface Props {
  projects: Project[];
  /** increment to force a refresh (pass a counter from parent) */
  refreshKey: number;
}

interface ProjectSummary {
  project_id: string | null;
  project_name: string;
  total_secs: number;
}

export default function StatsBar({ projects, refreshKey }: Props) {
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const totalSecs = summaries.reduce((s, p) => s + p.total_secs, 0);

  useEffect(() => {
    getTodayByProject().then(setSummaries).catch(console.error);
  }, [refreshKey]);

  // Re-fetch every minute automatically
  useEffect(() => {
    const id = setInterval(() => {
      getTodayByProject().then(setSummaries).catch(console.error);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (summaries.length === 0) return null;

  const sorted = [...summaries].sort((a, b) => b.total_secs - a.total_secs);

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        overflowX: "auto",
      }}
    >
      {/* Today total */}
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <span style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
          Today
        </span>
        <span className="mono" style={{ color: "var(--accent)", fontSize: "1.15rem", fontWeight: 500 }}>
          {formatDuration(totalSecs)}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: "var(--border)", flexShrink: 0 }} />

      {/* Per-project bars */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
        {sorted.map((s) => {
          const project = projects.find((p) => p.id === s.project_id);
          const color = project?.color ?? "var(--muted)";
          const pct = totalSecs > 0 ? (s.total_secs / totalSecs) * 100 : 0;

          return (
            <div
              key={s.project_id ?? "__none__"}
              style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 80 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.project_name}
                </span>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                  {formatDuration(s.total_secs)}
                </span>
              </div>
              {/* Mini progress bar */}
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 2,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}