import { useState, useEffect, useCallback, useRef } from "react";

type CommandItem = {
  id: string;
  name: string;
  category: "app" | "file" | "action" | "memory";
  icon: string;
  description?: string;
  action: () => void;
};

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  memories?: { id: string; content: string; category: string }[];
  onOpenApp?: (appName: string) => void;
};

export default function CommandPalette({
  isOpen,
  onClose,
  memories = [],
  onOpenApp,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const defaultApps: CommandItem[] = [
    { id: "friday", name: "FRIDAY AI", category: "app", icon: "◉", description: "Open AI assistant", action: () => onOpenApp?.("friday") },
    { id: "terminal", name: "Terminal", category: "app", icon: ">_", description: "Open terminal", action: () => onOpenApp?.("terminal") },
    { id: "files", name: "File Explorer", category: "app", icon: "📁", description: "Browse files", action: () => onOpenApp?.("files") },
    { id: "settings", name: "Settings", category: "app", icon: "⚙", description: "System settings", action: () => onOpenApp?.("settings") },
  ];

  const defaultActions: CommandItem[] = [
    { id: "new-session", name: "New Session", category: "action", icon: "✚", description: "Start a new chat session", action: () => { document.dispatchEvent(new CustomEvent("friday:new-session")); onClose(); } },
    { id: "clear-chat", name: "Clear Chat", category: "action", icon: "⌫", description: "Clear current conversation", action: () => { document.dispatchEvent(new CustomEvent("friday:clear-chat")); onClose(); } },
    { id: "toggle-sidebar", name: "Toggle Sidebar", category: "action", icon: "◧", description: "Show/hide sidebar", action: () => { document.dispatchEvent(new CustomEvent("friday:toggle-sidebar")); onClose(); } },
  ];

  const memoryItems: CommandItem[] = memories.map((m) => ({
    id: `mem-${m.id}`,
    name: m.content.slice(0, 50) + (m.content.length > 50 ? "..." : ""),
    category: "memory" as const,
    icon: "📝",
    description: m.category,
    action: () => { navigator.clipboard.writeText(m.content); onClose(); },
  }));

  const allItems = [...defaultApps, ...defaultActions, ...memoryItems];

  const filteredItems = query
    ? allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeItem = useCallback(
    (item: CommandItem) => {
      item.action();
      onClose();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            executeItem(filteredItems[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredItems, selectedIndex, executeItem, onClose]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          document.dispatchEvent(new CustomEvent("friday:open-command-palette"));
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryColors: Record<string, string> = {
    app: "var(--friday-accent)",
    file: "var(--friday-steel)",
    action: "#22C55E",
    memory: "#F59E0B",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded"
        style={{
          background: "var(--friday-bg-secondary)",
          border: "1px solid var(--friday-border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--friday-border)" }}
        >
          <span className="annotation">CMD</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontSize: 14,
              color: "var(--friday-text)",
              fontFamily: "var(--font-body)",
            }}
          />
          <kbd
            className="rounded px-1.5 py-0.5"
            style={{
              fontSize: 9,
              background: "var(--friday-bg)",
              border: "1px solid var(--friday-border)",
              color: "var(--friday-text-muted)",
              fontFamily: "var(--font-hud)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filteredItems.length === 0 && (
            <div className="px-4 py-6 text-center">
              <span className="annotation">No results found</span>
            </div>
          )}

          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => executeItem(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
              style={{
                background: index === selectedIndex ? "rgba(255, 157, 46, 0.08)" : "transparent",
              }}
            >
              <span
                className="flex items-center justify-center w-7 h-7 rounded"
                style={{
                  background: `${categoryColors[item.category]}15`,
                  color: categoryColors[item.category],
                  fontSize: 12,
                }}
              >
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, color: "var(--friday-text)" }}>
                  {item.name}
                </p>
                {item.description && (
                  <p className="annotation">{item.description}</p>
                )}
              </div>
              <span
                className="hud-label"
                style={{ fontSize: 7, color: categoryColors[item.category] }}
              >
                {item.category.toUpperCase()}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: "1px solid var(--friday-border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="annotation">
              <kbd className="rounded px-1" style={{ background: "var(--friday-bg)", border: "1px solid var(--friday-border)" }}>↑↓</kbd>
              {" "}Navigate
            </span>
            <span className="annotation">
              <kbd className="rounded px-1" style={{ background: "var(--friday-bg)", border: "1px solid var(--friday-border)" }}>↵</kbd>
              {" "}Select
            </span>
          </div>
          <span className="annotation">{filteredItems.length} results</span>
        </div>
      </div>
    </div>
  );
}
