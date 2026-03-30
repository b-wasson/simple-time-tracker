import { useState } from "react";
import type { Project } from "../api";
import { createProject, deleteProject } from "../api";

const PRESET_COLORS = [
  "#e8ff47", "#47ffb2", "#ff7847", "#4787ff",
  "#ff47d6", "#47d6ff", "#ffb847", "#b847ff",
];

interface Props {
  projects: Project[];
  onCreated: (p: Project) => void;
  onDeleted: (id: string) => void;
}

export default function ProjectsPanel({ projects, onCreated, onDeleted }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setError("");
    setLoading(true);
    try {
      const p = await createProject(name.trim(), color);
      onCreated(p);
      setName("");
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProject(id);
      onDeleted(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.12em",
            color: "var(--muted)",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          Projects
        </h2>

        {/* Create form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New project name…"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 12px",
              color: "var(--text)",
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.85rem",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-hi)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />

          {/* Color picker */}
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: c,
                  border: color === c ? "2px solid var(--text)" : "2px solid transparent",
                  cursor: "pointer",
                  outline: color === c ? "2px solid var(--bg)" : "none",
                  outlineOffset: 1,
                  transition: "transform 0.1s",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            style={{
              background: "var(--accent)",
              color: "#0d0d0f",
              border: "none",
              borderRadius: 6,
              padding: "8px 0",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.78rem",
              letterSpacing: "0.07em",
              cursor: loading || !name.trim() ? "not-allowed" : "pointer",
              opacity: loading || !name.trim() ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            + CREATE
          </button>
        </div>
      </div>

      {/* Project list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {projects.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
            No projects yet
          </p>
        )}
        {projects.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            isDeleting={deletingId === p.id}
            onDelete={() => handleDelete(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  isDeleting,
  onDelete,
}: {
  project: Project;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2"
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        background: hovered ? "var(--border)" : "transparent",
        transition: "background 0.12s",
        opacity: isDeleting ? 0.4 : 1,
        cursor: "default",
      }}
    >
      {/* Color dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: project.color,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, fontSize: "0.88rem", fontWeight: 500 }}>{project.name}</span>
      <button
        onClick={onDelete}
        style={{
          background: "transparent",
          border: "none",
          color: hovered ? "var(--danger)" : "transparent",
          cursor: "pointer",
          fontSize: "1rem",
          transition: "color 0.15s",
          lineHeight: 1,
        }}
        title="Delete project"
      >
        ×
      </button>
    </div>
  );
}