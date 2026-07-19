import { useState, useEffect, useCallback } from "react";

type MemoryEntry = {
  id: string;
  content: string;
  category: string;
  pinned: boolean;
  timestamp: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "var(--friday-steel)",
  context: "var(--friday-accent)",
  reminder: "#EF4444",
  note: "var(--friday-text-muted)",
  project: "#22C55E",
};

export default function MemoryPanel() {
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [newNote, setNewNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.friday?.memory?.getAll);
    loadMemory();
  }, []);

  const loadMemory = async () => {
    if (window.friday?.memory?.getAll) {
      const memories = await window.friday.memory.getAll();
      if (Array.isArray(memories)) {
        setMemory(memories.map((m) => ({
          id: m.id || Date.now().toString(),
          content: m.content || "",
          category: m.category || "general",
          pinned: m.pinned || false,
          timestamp: m.timestamp || new Date().toISOString(),
        })));
      }
    }
  };

  const filtered = memory.filter((m) =>
    (m.content || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter((m) => m.pinned);
  const unpinned = filtered.filter((m) => !m.pinned);

  const handleAdd = useCallback(async () => {
    if (!newNote.trim()) return;

    if (isElectron && window.friday?.memory?.save) {
      await window.friday.memory.save({
        content: newNote.trim(),
        category: selectedCategory,
        pinned: false,
      });
      await loadMemory();
    } else {
      const newEntry: MemoryEntry = {
        id: Date.now().toString(),
        content: newNote.trim(),
        category: selectedCategory,
        pinned: false,
        timestamp: new Date().toISOString(),
      };
      setMemory((prev) => [newEntry, ...prev]);
    }
    setNewNote("");
  }, [newNote, selectedCategory, isElectron]);

  const handleDelete = useCallback(async (id: string) => {
    if (isElectron && window.friday?.memory?.delete) {
      await window.friday.memory.delete(id);
      await loadMemory();
    } else {
      setMemory((prev) => prev.filter((m) => m.id !== id));
    }
  }, [isElectron]);

  const handlePin = useCallback(async (id: string) => {
    if (isElectron && window.friday?.memory?.pin) {
      await window.friday.memory.pin(id);
      await loadMemory();
    } else {
      setMemory((prev) => prev.map((m) => m.id === id ? { ...m, pinned: !m.pinned } : m));
    }
  }, [isElectron]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderMemoryEntry = (entry: MemoryEntry) => (
    <div
      key={entry.id}
      className="relative pl-4 py-2 group"
      style={{
        borderLeft: `2px solid ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general}`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="hud-accent"
            style={{ fontSize: 7, color: CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general }}
          >
            {entry.category.toUpperCase()}
          </span>
          {entry.pinned && (
            <span className="hud-accent" style={{ fontSize: 7, color: "#F59E0B" }}>
              PINNED
            </span>
          )}
        </div>
        <span className="annotation">{formatTime(entry.timestamp)}</span>
      </div>
      <p style={{ fontSize: 11, color: "var(--friday-text)", lineHeight: 1.5 }}>
        {entry.content}
      </p>
      {/* Action buttons */}
      <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handlePin(entry.id)}
          className="hud-btn rounded px-1.5 py-0.5"
          style={{ fontSize: 7 }}
        >
          {entry.pinned ? "UNPIN" : "PIN"}
        </button>
        <button
          onClick={() => handleDelete(entry.id)}
          className="hud-btn-danger rounded px-1.5 py-0.5"
          style={{ fontSize: 7 }}
        >
          DEL
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="led" />
          <span className="hud-label">Memory</span>
        </div>
        <span className="hud-accent" style={{ fontSize: 8 }}>{memory.length} ENTRIES</span>
      </div>

      <div className="divider-h" />

      {/* Search */}
      <input
        type="text"
        placeholder="Search memory..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="friday-input rounded px-3 py-1.5"
        style={{ fontSize: 11 }}
      />

      {/* Memory timeline */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {pinned.length > 0 && (
          <>
            <span className="hud-label" style={{ fontSize: 8, color: "#F59E0B" }}>
              PINNED
            </span>
            {pinned.map(renderMemoryEntry)}
            {unpinned.length > 0 && <div className="divider-h my-1" />}
          </>
        )}
        {unpinned.map(renderMemoryEntry)}
        {filtered.length === 0 && (
          <p className="annotation text-center py-4">
            {search ? "No results found" : "No memories saved"}
          </p>
        )}
      </div>

      <div className="divider-h" />

      {/* Category selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {Object.keys(CATEGORY_COLORS).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="rounded px-2 py-0.5 transition-all"
            style={{
              fontSize: 8,
              background: selectedCategory === cat
                ? `${CATEGORY_COLORS[cat]}22`
                : "transparent",
              border: `1px solid ${selectedCategory === cat ? CATEGORY_COLORS[cat] : "var(--friday-border)"}`,
              color: selectedCategory === cat ? CATEGORY_COLORS[cat] : "var(--friday-text-muted)",
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          className="friday-input rounded px-3 py-1.5 flex-1"
          style={{ fontSize: 11 }}
        />
        <button
          onClick={handleAdd}
          disabled={!newNote.trim()}
          className="friday-btn-accent rounded px-3 py-1.5 disabled:opacity-30"
          style={{ fontSize: 10 }}
        >
          ADD
        </button>
      </div>
    </div>
  );
}
