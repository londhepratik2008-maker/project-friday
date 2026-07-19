import { useState, useEffect, useRef, useCallback } from "react";
import AICore from "./components/center/AICore";
import ConversationArea from "./components/chat/ConversationArea";
import MemoryPanel from "./components/memory/MemoryPanel";
import SystemMonitor from "./components/monitor/SystemMonitor";
import SessionsPanel from "./components/sessions/SessionsPanel";
import Sidebar from "./components/layout/Sidebar";
import CommandPalette from "./components/common/CommandPalette";
import type { DroppedFile } from "./types";

type Session = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
};

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      title: "New Session",
      lastMessage: "",
      timestamp: new Date(),
    },
  ]);
  const [activeSession, setActiveSession] = useState<string>("1");
  const [messages, setMessages] = useState<
    { sender: "user" | "assistant"; message: string; files?: DroppedFile[] }[]
  >([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[]
  >([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState<Record<string, any>>({});

  // Load API config from Electron on mount
  useEffect(() => {
    if (window.friday?.getApiConfig) {
      window.friday.getApiConfig().then((cfg) => setApiConfig(cfg || {}));
    }
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for custom events
  useEffect(() => {
    const handleNewSessionEvent = () => handleNewSession();
    const handleClearChat = () => { setMessages([]); setChatHistory([]); };

    document.addEventListener("friday:new-session", handleNewSessionEvent);
    document.addEventListener("friday:clear-chat", handleClearChat);
    document.addEventListener("friday:open-command-palette", () => setIsCommandPaletteOpen(true));

    return () => {
      document.removeEventListener("friday:new-session", handleNewSessionEvent);
      document.removeEventListener("friday:clear-chat", handleClearChat);
      document.removeEventListener("friday:open-command-palette", () => setIsCommandPaletteOpen(true));
    };
  }, []);

  const handleNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `Session ${sessions.length + 1}`,
      lastMessage: "",
      timestamp: new Date(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSession(newSession.id);
    setChatHistory([]);
    setMessages([]);
  };

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTyping(false);
    }
  }, []);

  const sendToAI = useCallback(
    async (history: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[], hasImagesInMessage: boolean) => {
      let reply = "";

      const systemMsg = {
        role: "system",
        content: hasImagesInMessage
          ? "You are FRIDAY, a helpful AI with vision capabilities. When you receive an image, describe EXACTLY what you see in detail: the UI layout, visible text/content, buttons, icons, colors, design style, any errors or issues. Be specific and concrete — describe real elements you observe, not generic guesses. If it's a screenshot of code, read and explain the code. If it's a UI, describe every visible component."
          : "You are FRIDAY, a helpful personal AI assistant. Be concise and friendly. Reply in short paragraphs. Use markdown for formatting when appropriate.",
      };

      // Always normalize history to text-only for API calls
      const textHistory = history.map((m) => ({
        role: m.role,
        content: typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? m.content.filter((c) => c.type === "text").map((c) => c.text || "").join("\n")
            : "",
      })).filter((m) => m.content.trim() !== "");

      if (window.friday?.chat?.send && !hasImagesInMessage) {
        const result = await window.friday.chat.send(textHistory);
        reply = result.reply;
      } else {
        const nvidiaKey = apiConfig.nvidia?.key || "";
        const nvidiaModel = apiConfig.nvidia?.model || "nvidia/llama-3.3-nemotron-super-49b-v1";
        const orKey = apiConfig.openrouter?.key || "";
        const orVisionModel = apiConfig.openrouter?.visionModel || "nvidia/nemotron-nano-12b-v2-vl:free";
        const orTextModel = apiConfig.openrouter?.textModel || "openrouter/free";

        const textProviders = [
          {
            name: "NVIDIA",
            url: "https://integrate.api.nvidia.com/v1/chat/completions",
            key: nvidiaKey,
            model: nvidiaModel,
            headers: (k: string) => ({
              "Content-Type": "application/json",
              Authorization: `Bearer ${k}`,
            }),
            vision: false,
          },
          {
            name: "OpenRouter-Vision",
            url: "https://openrouter.ai/api/v1/chat/completions",
            key: orKey,
            model: orVisionModel,
            headers: (k: string) => ({
              "Content-Type": "application/json",
              Authorization: `Bearer ${k}`,
              "HTTP-Referer": "http://localhost:5173",
              "X-Title": "FRIDAY AI Assistant",
            }),
            vision: true,
          },
          {
            name: "OpenRouter",
            url: "https://openrouter.ai/api/v1/chat/completions",
            key: orKey,
            model: orTextModel,
            headers: (k: string) => ({
              "Content-Type": "application/json",
              Authorization: `Bearer ${k}`,
              "HTTP-Referer": "http://localhost:5173",
              "X-Title": "FRIDAY AI Assistant",
            }),
            vision: false,
          },
        ];

        // If current message has images → try vision provider, then text providers as fallback
        // If no images → try text providers only
        const providers = hasImagesInMessage
          ? [...textProviders.filter((p) => p.vision), ...textProviders.filter((p) => !p.vision)]
          : textProviders.filter((p) => !p.vision);

        const controller = abortControllerRef.current;
        let lastError = "";
        for (const p of providers) {
          if (controller?.signal.aborted) throw new Error("Aborted");
          try {
            const messages = hasImagesInMessage && p.vision
              ? [systemMsg, ...history.filter((m) => typeof m.content === "string" || (Array.isArray(m.content) && m.content.some((c) => c.type === "image_url")))]
              : [systemMsg, ...textHistory];

            const res = await fetch(p.url, {
              method: "POST",
              headers: p.headers(p.key),
              body: JSON.stringify({
                model: p.model,
                max_tokens: 1024,
                messages,
              }),
              signal: controller?.signal,
            });
            const data = await res.json();
            if (data.error) {
              lastError = data.error.message;
              continue;
            }
            reply = data.choices[0].message.content;
            break;
          } catch (e) {
            if ((e as Error).name === "AbortError") throw e;
            lastError = (e as Error).message;
            continue;
          }
        }
        if (!reply) throw new Error(lastError || "All providers failed");
      }
      return reply;
    },
    []
  );

  const handleSend = useCallback(
    async (text: string, files?: DroppedFile[]) => {
      const hasFiles = files && files.length > 0;
      const hasImages = hasFiles && files.some((f) => f.type.startsWith("image/"));

      const userMessage = {
        sender: "user" as const,
        message: text || (hasFiles ? `Analyzing ${files.length} file(s)...` : ""),
        files: hasFiles ? files : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      // Build multimodal or text content for AI
      let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

      if (hasImages) {
        // Multimodal format for vision models
        const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

        // Add text prompt
        const textParts: string[] = [];
        if (text) textParts.push(text);

        // Add non-image file descriptions
        const nonImageFiles = files.filter((f) => !f.type.startsWith("image/"));
        if (nonImageFiles.length > 0) {
          const descs = nonImageFiles.map((f) => {
            let desc = `[File: ${f.name} (${f.type || "unknown"}, ${f.size} bytes)]`;
            if (f.content) desc += `\n\`\`\`\n${f.content}\n\`\`\``;
            return desc;
          });
          textParts.push(descs.join("\n\n"));
        }

        content.push({
          type: "text",
          text: textParts.length > 0
            ? textParts.join("\n\n")
            : `Please analyze this image in detail. Describe what you see including: layout, UI elements, text content, colors, and any notable features.`,
        });

        // Add images
        const imageFiles = files.filter((f) => f.type.startsWith("image/") && f.content);
        for (const img of imageFiles) {
          content.push({
            type: "image_url",
            image_url: { url: img.content! },
          });
        }

        userContent = content;
      } else if (hasFiles) {
        // Text-only file content
        const fileDescriptions = files.map((f) => {
          let desc = `[File: ${f.name} (${f.type || "unknown"}, ${f.size} bytes)]`;
          if (f.content) desc += `\n\`\`\`\n${f.content}\n\`\`\``;
          return desc;
        });
        userContent = text
          ? `${text}\n\n${fileDescriptions.join("\n\n")}`
          : `Please analyze the following file(s):\n\n${fileDescriptions.join("\n\n")}`;
      } else {
        userContent = text;
      }

      const updatedHistory = [...chatHistory, { role: "user", content: userContent }];
      setChatHistory(updatedHistory);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession
            ? {
                ...s,
                lastMessage: (text || `File: ${files?.[0]?.name}`).slice(0, 50) + "...",
                title:
                  s.title.startsWith("Session") && s.lastMessage === ""
                    ? (text || files?.[0]?.name || "New Session").slice(0, 28) + "..."
                    : s.title,
              }
            : s
        )
      );

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const reply = await sendToAI(updatedHistory, !!hasImages);
        if (!controller.signal.aborted) {
          const assistantMessage = { sender: "assistant" as const, message: reply };
          setMessages((prev) => [...prev, assistantMessage]);
          setChatHistory([...updatedHistory, { role: "assistant", content: reply }]);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError" && !controller.signal.aborted) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              message: "Something went wrong. Please try again.",
            },
          ]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTyping(false);
        }
        abortControllerRef.current = null;
      }
    },
    [chatHistory, activeSession, sendToAI]
  );

  const handleRegenerate = useCallback(
    async (index: number) => {
      // Find the last user message before this assistant message
      let userMsgIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i].sender === "user") {
          userMsgIndex = i;
          break;
        }
      }
      if (userMsgIndex === -1) return;

      // Remove the assistant message and everything after it
      const newMessages = messages.slice(0, index);
      setMessages(newMessages);

      // Rebuild history up to the user message
      const newHistory = chatHistory.slice(0, Math.floor(userMsgIndex / 2) + 1);
      setChatHistory(newHistory);

      setIsTyping(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const reply = await sendToAI(newHistory, false);
        if (!controller.signal.aborted) {
          const assistantMessage = { sender: "assistant" as const, message: reply };
          setMessages((prev) => [...prev, assistantMessage]);
          setChatHistory([...newHistory, { role: "assistant", content: reply }]);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError" && !controller.signal.aborted) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              message: "Something went wrong. Please try again.",
            },
          ]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTyping(false);
        }
        abortControllerRef.current = null;
      }
    },
    [messages, chatHistory, sendToAI]
  );

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  const formatDate = (d: Date) =>
    d
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
      .toUpperCase();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden p-3 gap-3">
      {/* Top System Status Bar */}
      <div className="panel flex items-center justify-between px-4 py-2 rounded">
        <div className="flex items-center gap-4">
          <span
            className="hud-value"
            style={{ fontSize: 10, letterSpacing: "0.15em" }}
          >
            FRIDAY
          </span>
          <div className="divider-v mx-1" />
          <span className="annotation">SYS.STATUS: OPERATIONAL</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="led led-green" />
            <span className="annotation">NVIDIA NIM</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="led led-green" />
            <span className="annotation">OPENROUTER</span>
          </div>
          <div className="divider-v mx-1" />
          <span className="hud-accent" style={{ fontSize: 9 }}>
            {formatDate(currentTime)}
          </span>
          <span className="hud-value" style={{ fontSize: 10 }}>
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Main Content: 3 panels side by side */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Left Panel: Sidebar + Memory */}
        <div
          className="panel flex flex-col rounded overflow-hidden"
          style={{ width: 280, flexShrink: 0 }}
        >
          <div className="flex flex-col gap-0 flex-1 overflow-hidden">
            <div className="px-4 py-3">
              <Sidebar />
            </div>
            <div className="divider-h mx-3" />
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <MemoryPanel />
            </div>
          </div>
        </div>

        {/* Center Panel: AI Core + Chat */}
        <div className="flex flex-col flex-1 gap-3 min-w-0">
          {/* AI Core Section */}
          <div
            className="panel rounded overflow-hidden"
            style={{ height: 320, flexShrink: 0 }}
          >
            <AICore />
          </div>

          {/* Chat Section */}
          <div className="panel rounded overflow-hidden flex-1 min-h-0">
            <ConversationArea
              messages={messages}
              isTyping={isTyping}
              onSend={handleSend}
              onStop={handleStop}
              onRegenerate={handleRegenerate}
            />
          </div>
        </div>

        {/* Right Panel: Sessions + System Monitor */}
        <div
          className="panel flex flex-col rounded overflow-hidden"
          style={{ width: 260, flexShrink: 0 }}
        >
          <div className="px-4 py-3 flex-1 overflow-y-auto">
            <SessionsPanel
              sessions={sessions}
              activeSession={activeSession}
              onSelectSession={setActiveSession}
              onNewSession={handleNewSession}
            />
          </div>
          <div className="divider-h mx-3" />
          <div className="px-4 py-3" style={{ height: 300, flexShrink: 0 }}>
            <SystemMonitor />
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenApp={(app) => console.log("Open app:", app)}
      />
    </div>
  );
}
