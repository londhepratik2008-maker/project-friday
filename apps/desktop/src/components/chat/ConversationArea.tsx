import { useEffect, useRef, useState, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import ChatTypingIndicator from "./ChatTypingIndicator";
import PromptInput from "../center/PromptInput";
import type { DroppedFile } from "../../types";

type Message = {
  sender: "user" | "assistant";
  message: string;
  files?: DroppedFile[];
};

type ConversationAreaProps = {
  messages: Message[];
  isTyping: boolean;
  onSend: (text: string, files?: DroppedFile[]) => void;
  onStop?: () => void;
  onRegenerate?: (index: number) => void;
};

export default function ConversationArea({
  messages,
  isTyping,
  onSend,
  onStop,
  onRegenerate,
}: ConversationAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const droppedFiles: DroppedFile[] = files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }));

      // Read file contents for text-based files
      const textExtensions = [
        ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".jsx",
        ".py", ".java", ".c", ".cpp", ".h", ".css", ".html",
        ".xml", ".yaml", ".yml", ".toml", ".cfg", ".ini",
        ".sh", ".bash", ".ps1", ".bat", ".cmd", ".log",
        ".csv", ".sql", ".rb", ".go", ".rs", ".swift",
      ];

      const imageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

      const readPromises = droppedFiles.map((file) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();

        if (imageTypes.includes(file.type)) {
          // For images, read as base64
          return new Promise<DroppedFile>((resolve) => {
            const rawFile = files.find((f) => f.name === file.name);
            if (!rawFile) return resolve(file);
            const reader = new FileReader();
            reader.onload = () => {
              file.content = reader.result as string;
              resolve(file);
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(rawFile);
          });
        }

        if (textExtensions.includes(ext)) {
          // For text files, read as string
          return new Promise<DroppedFile>((resolve) => {
            const rawFile = files.find((f) => f.name === file.name);
            if (!rawFile) return resolve(file);
            const reader = new FileReader();
            reader.onload = () => {
              const content = reader.result as string;
              // Truncate very large files
              file.content = content.length > 15000
                ? content.slice(0, 15000) + "\n\n[...truncated]"
                : content;
              resolve(file);
            };
            reader.onerror = () => resolve(file);
            reader.readAsText(rawFile);
          });
        }

        return Promise.resolve(file);
      });

      Promise.all(readPromises).then((resolvedFiles) => {
        onSend("", resolvedFiles);
      });
    },
    [onSend]
  );

  return (
    <div
      className="flex h-full flex-col relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--friday-border)" }}
      >
        <div className="flex items-center gap-2">
          <div className="led" />
          <span className="hud-label">Communication Channel</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="annotation">MSG.{messages.length}</span>
          <div className="flex items-center gap-1">
            <div className="led led-green" style={{ width: 4, height: 4 }} />
            <span className="annotation">SECURE</span>
          </div>
        </div>
      </div>

      {/* Drop overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{
            background: "rgba(26, 35, 50, 0.9)",
            border: "2px dashed var(--friday-accent)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="text-center">
            <div
              className="hud-value text-2xl mb-2"
              style={{ color: "var(--friday-accent)" }}
            >
              ⊕
            </div>
            <span className="hud-accent" style={{ fontSize: 11, letterSpacing: "0.2em" }}>
              DROP FILES TO ANALYZE
            </span>
            <p className="annotation mt-1">
              PDF, Images, Code, Text, Markdown
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="hud-value text-xl mb-2">FRIDAY</div>
              <span className="hud-accent" style={{ fontSize: 10, letterSpacing: "0.3em" }}>
                AWAITING INPUT
              </span>
              <p className="annotation mt-3">
                Drop files or type a message
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            sender={msg.sender}
            message={msg.message}
            files={msg.files}
            index={index}
            isLast={index === messages.length - 1 && msg.sender === "assistant"}
            onRegenerate={onRegenerate}
          />
        ))}

        {isTyping && <ChatTypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Prompt Input */}
      <div className="px-5 pb-4">
        <PromptInput onSend={onSend} isTyping={isTyping} onStop={onStop} />
      </div>
    </div>
  );
}
