import { useEffect, useState } from "react";
import type { GoalProgress, GoalPeriod, Project } from "../api";
import { getGoals, createGoal, deleteGoal, formatDuration } from "../api";

interface Props {
  projects: Project[];
  /** bump to trigger a refresh when entries change */
  refreshKey: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function secsFromHM(h: number, m: number) {
  return h * 3600 + m * 60;
}

function secsToHM(secs: number): { h: number; m: number } {
  return { h: Math.floor(secs / 3600), m: Math.floor((secs % 3600) / 60) };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function GoalsPanel({ projects, refreshKey }: Props) {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [label, setLabel] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [period, setPeriod] = useState<GoalPeriod>("daily");
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    getGoals()
      .then(setGoals)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  const handleCreate = async () => {
    const targetSecs = secsFromHM(hours, minutes);
    if (!label.trim()) { setError("Label is required"); return; }
    if (targetSecs === 0) { setError("Target must be at least 1 minute"); return; }
    setError("");
    setCreating(true);
    try {
      await createGoal(label.trim(), targetSecs, period, projectId || null);
      setLabel("");
      setHours(1);
      setMinutes(0);
      setProjectId("");
      load();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteGoal(id).catch(console.error);
    setGoals((prev) => prev.filter((g) => g.goal.id !== id));
  };

  const daily = goals.filter((g) => g.goal.period === "daily");
  const weekly = goals.filter((g) => g.goal.period === "weekly");

  return (
    <div style={{ padding: "24px 24px 48px", maxWidth: 640 }}>

      {/* ── Create form ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: "0.68rem", letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>
          New Goal
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Label */}
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Goal label, e.g. Deep work"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-hi)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />

          <div style={{ display: "flex", gap: 10 }}>
            {/* Project */}
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">Any / No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Period */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
              style={{ ...inputStyle, width: 110 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          {/* Target hours / minutes */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Target:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ ...inputStyle, width: 64, textAlign: "center" }}
              />
              <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>h</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                style={{ ...inputStyle, width: 64, textAlign: "center" }}
              />
              <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>m</span>
            </div>
          </div>

          {error && <p style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{error}</p>}

          <button
            onClick={handleCreate}
            disabled={creating || !label.trim() || secsFromHM(hours, minutes) === 0}
            style={{
              background: "var(--accent)", color: "#0d0d0f",
              border: "none", borderRadius: 6, padding: "9px 0",
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: "0.78rem", letterSpacing: "0.07em",
              cursor: creating ? "wait" : "pointer",
              opacity: creating || !label.trim() || secsFromHM(hours, minutes) === 0 ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            + ADD GOAL
          </button>
        </div>
      </section>

      {/* ── Goal lists ───────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", fontFamily: "'DM Mono', monospace" }}>Loading…</p>
      ) : goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
          <div className="mono" style={{ fontSize: "2rem", opacity: 0.2, marginBottom: 10 }}>0 / 0</div>
          <p style={{ fontSize: "0.82rem", letterSpacing: "0.06em" }}>NO GOALS YET</p>
        </div>
      ) : (
        <>
          {daily.length > 0 && (
            <GoalSection title="Daily" goals={daily} projects={projects} onDelete={handleDelete} />
          )}
          {weekly.length > 0 && (
            <GoalSection title="Weekly" goals={weekly} projects={projects} onDelete={handleDelete} />
          )}
        </>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function GoalSection({
  title, goals, projects, onDelete,
}: {
  title: string;
  goals: GoalProgress[];
  projects: Project[];
  onDelete: (id: string) => void;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: "0.68rem", letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {goals.map((gp) => (
          <GoalCard key={gp.goal.id} gp={gp} projects={projects} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function GoalCard({
  gp, projects, onDelete,
}: {
  gp: GoalProgress;
  projects: Project[];
  onDelete: (id: string) => void;
}) {
  const { goal, logged_secs, percent } = gp;
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const project = projects.find((p) => p.id === goal.project_id);
  const color = project?.color ?? "var(--muted)";
  const pct = Math.min(percent, 100);
  const done = percent >= 100;

  const { h: th, m: tm } = secsToHM(goal.target_secs);
  const targetLabel = tm > 0 ? `${th}h ${tm}m` : `${th}h`;

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(goal.id);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--surface)",
        border: `1px solid ${done ? color + "55" : "var(--border)"}`,
        borderRadius: 8,
        padding: "14px 16px",
        opacity: deleting ? 0.4 : 1,
        transition: "border-color 0.2s, opacity 0.15s",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>

        {/* Done checkmark or color dot */}
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          background: done ? color : "transparent",
          border: `2px solid ${color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
        }}>
          {done && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="#0d0d0f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        {/* Label + project */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: "0.92rem", color: done ? color : "var(--text)" }}>
              {goal.label}
            </span>
            {project && (
              <span style={{
                fontSize: "0.68rem", padding: "2px 7px", borderRadius: 4,
                background: project.color + "18", color: project.color,
                border: `1px solid ${project.color}33`, fontWeight: 700, letterSpacing: "0.04em",
              }}>
                {project.name}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
            <span className="mono" style={{ fontSize: "0.78rem", color: done ? "var(--running)" : "var(--text)" }}>
              {formatDuration(logged_secs)}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              of {targetLabel}
            </span>
          </div>
        </div>

        {/* Percent + delete */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span className="mono" style={{
            fontSize: "0.9rem", fontWeight: 500,
            color: done ? "var(--running)" : percent > 75 ? "var(--accent)" : "var(--muted)",
          }}>
            {Math.round(percent)}%
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "transparent", border: "none",
              color: hovered ? "var(--danger)" : "transparent",
              cursor: "pointer", fontSize: "1.1rem",
              transition: "color 0.15s", lineHeight: 1, padding: "0 2px",
            }}
          >×</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: done ? "var(--running)" : color,
          borderRadius: 2,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

// ── shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  color: "var(--text)",
  fontFamily: "'Syne', sans-serif",
  fontSize: "0.85rem",
  outline: "none",
  width: "100%",
  transition: "border-color 0.15s",
};