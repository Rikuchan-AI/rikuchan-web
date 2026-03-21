"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Plus } from "lucide-react";
import type { Task, TaskPriority, RosterMember, RosterContextFile } from "@/lib/mc/types-project";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { FileDropzone } from "@/components/shared/file-dropzone";

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskType = "task" | "bug" | "spike" | "story" | "tech_debt";

interface CreateTaskModalProps {
  projectId: string;
  roster: RosterMember[];
  onClose: () => void;
}

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "feature", label: "Feature", titleHint: "Implement [feature]", defaultLabels: ["feature"], type: "task" as TaskType },
  { id: "bug", label: "Bug", titleHint: "Bug: [description]", defaultLabels: ["bug"], type: "bug" as TaskType },
  { id: "spike", label: "Spike", titleHint: "Spike: [topic]", defaultLabels: ["spike", "research"], type: "spike" as TaskType },
  { id: "refactor", label: "Refactor", titleHint: "Refactor: [component]", defaultLabels: ["tech-debt"], type: "tech_debt" as TaskType },
  { id: "review", label: "Code Review", titleHint: "Review: [PR/code]", defaultLabels: ["review"], type: "task" as TaskType },
];

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "spike", label: "Spike" },
  { value: "story", label: "Story" },
  { value: "tech_debt", label: "Tech Debt" },
];

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateTaskModal({ projectId, roster, onClose }: CreateTaskModalProps) {
  const createTask = useProjectsStore((s) => s.createTask);

  // Form state
  const [title, setTitle] = useState("");
  const [titlePlaceholder, setTitlePlaceholder] = useState("Task title");
  const [taskType, setTaskType] = useState<TaskType>("task");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [description, setDescription] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [contextNote, setContextNote] = useState("");
  const [contextFiles, setContextFiles] = useState<RosterContextFile[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Focus title on mount
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Template selection
  const handleTemplateChange = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;

    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setTitlePlaceholder(template.titleHint);
    setLabels(template.defaultLabels);
    setTaskType(template.type);
  }, []);

  // Label management
  const addLabel = useCallback(() => {
    const trimmed = labelInput.trim().toLowerCase();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels((prev) => [...prev, trimmed]);
    }
    setLabelInput("");
  }, [labelInput, labels]);

  const removeLabel = useCallback((label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  }, []);

  // Acceptance criteria management
  const addCriterion = useCallback(() => {
    setAcceptanceCriteria((prev) => [...prev, ""]);
  }, []);

  const updateCriterion = useCallback((index: number, value: string) => {
    setAcceptanceCriteria((prev) => prev.map((c, i) => (i === index ? value : c)));
  }, []);

  const removeCriterion = useCallback((index: number) => {
    setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const now = Date.now();
    const assignedMember = assignedAgentId ? roster.find((m) => m.agentId === assignedAgentId) : null;

    // Build tags: type tag + labels
    const typeTags = taskType !== "task" ? [taskType.replace("_", "-")] : [];
    const allTags = [...new Set([...typeTags, ...labels])];

    // Build description with acceptance criteria
    const acFiltered = acceptanceCriteria.filter((c) => c.trim());
    let fullDescription = description.trim();
    if (acFiltered.length > 0) {
      const acSection = "\n\n**Acceptance Criteria:**\n" + acFiltered.map((c) => `- [ ] ${c}`).join("\n");
      fullDescription += acSection;
    }

    const task: Task = {
      id: `task-${now}-${Math.random().toString(16).slice(2, 6)}`,
      projectId,
      title: title.trim(),
      description: fullDescription,
      status: "backlog",
      priority,
      assignedAgentId: assignedMember?.agentId ?? null,
      assignedAgentName: assignedMember?.agentName,
      createdBy: "user",
      subtasks: [],
      tags: allTags,
      attachments: [],
      contextNote: contextNote.trim() || undefined,
      contextFiles: contextFiles.length > 0 ? contextFiles : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await createTask(projectId, task);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label="Create new task">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-surface z-10 rounded-t-xl">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            New Task
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Template selector */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none transition-colors"
            >
              <option value="">None</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Basic info */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                Title <span className="text-danger">*</span>
              </label>
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={titlePlaceholder}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-accent/40 focus:outline-none transition-colors"
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">Type</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {TASK_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTaskType(t.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      taskType === t.value
                        ? "bg-accent-soft text-accent border border-accent/15"
                        : "text-foreground-muted hover:text-foreground hover:bg-surface-strong border border-transparent"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority selector */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">Priority</label>
              <div className="flex items-center gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      priority === p
                        ? "bg-accent-soft text-accent border border-accent/15"
                        : "text-foreground-muted hover:text-foreground hover:bg-surface-strong border border-transparent"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task (markdown supported)"
                rows={4}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-accent/40 focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            {/* Agent dropdown */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">Assign Agent</label>
              <select
                value={assignedAgentId}
                onChange={(e) => setAssignedAgentId(e.target.value)}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none transition-colors"
              >
                <option value="">Auto-assign (lead decides)</option>
                {roster.map((m) => (
                  <option key={m.agentId} value={m.agentId}>
                    {m.agentName} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">Labels</label>
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map((label) => (
                    <span
                      key={label}
                      className="flex items-center gap-1 rounded-full bg-surface-strong border border-line-strong px-2.5 py-0.5 text-xs text-foreground-muted"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="ml-0.5 text-foreground-muted/60 hover:text-foreground transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={labelInputRef}
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLabel();
                  }
                }}
                placeholder="Type a label and press Enter"
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-accent/40 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Context: Acceptance criteria */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Acceptance Criteria</label>
              <button
                type="button"
                onClick={addCriterion}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-deep transition-colors"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
            {acceptanceCriteria.length > 0 ? (
              <div className="space-y-2">
                {acceptanceCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={criterion}
                      onChange={(e) => updateCriterion(index, e.target.value)}
                      placeholder={`Criterion ${index + 1}`}
                      className="flex-1 rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-accent/40 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:text-danger hover:bg-danger-soft transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground-muted/60">No acceptance criteria defined</p>
            )}
          </div>

          {/* Context for agent */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                Context Note
              </label>
              <textarea
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder="Additional context for the agent — links, decisions, constraints, prior art..."
                rows={3}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-accent/40 focus:outline-none resize-none transition-colors"
              />
              <p className="mt-1 text-[11px] text-foreground-muted">
                Injected alongside the task description when delegating to an agent.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                Context Files {contextFiles.length > 0 && `(${contextFiles.length})`}
              </label>
              <FileDropzone
                files={contextFiles}
                onChange={setContextFiles}
                id="task-context-files"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line sticky bottom-0 bg-surface rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-deep disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
