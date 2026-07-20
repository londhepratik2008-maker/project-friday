import { useState, useEffect, useRef, useCallback } from "react";
import AICore from "./components/center/AICore";
import ConversationArea from "./components/chat/ConversationArea";
import MemoryPanel from "./components/memory/MemoryPanel";
import Sidebar from "./components/layout/Sidebar";
import CommandPalette from "./components/common/CommandPalette";
import RightPanel from "./components/common/RightPanel";
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
          ? `You are FRIDAY, an advanced AI with vision capabilities — like the FRIDAY AI from the MCU analyzing Stark tech.

When you receive an image, perform a comprehensive analysis:

VISUAL ANALYSIS:
- Describe the overall layout, composition, and design language
- Identify every visible element: text, buttons, icons, menus, panels, colors
- Note the UI framework/style (web, mobile, desktop, terminal, etc.)
- Detect any visible errors, bugs, warnings, or issues
- Measure relative sizes and spacing if relevant

CODE/TEXT EXTRACTION:
- If the image contains code: read it line by line, explain what it does, identify bugs, suggest improvements
- If the image contains text: extract and organize all readable text
- If it's a screenshot of an error: diagnose the root cause and provide solutions

TECHNICAL DEPTH:
- Name specific technologies, frameworks, libraries, or patterns you recognize
- Explain WHY things are designed a certain way, not just WHAT you see
- Provide actionable recommendations when applicable

Keep your FRIDAY personality — sharp, professional, a bit witty. Format responses with clear headers and structure.`
          : `You are FRIDAY, an advanced AI personal assistant inspired by the MCU's FRIDAY AI.

PERSONALITY:
- Confident, sharp, and slightly witty
- Professional but with personality; never generic
- Proactive — anticipate needs and offer helpful follow-ups

CAPABILITIES:
- Write, debug, review, and explain code in any language
- Analyze files, images, and documents thoroughly
- Break down complex concepts into clear explanations
- Provide real-world context and practical suggestions

RESPONSE STYLE:
- Be detailed and thorough; use markdown formatting (headers, code blocks, bullet points)
- Match detail level to question complexity
- When analyzing code: explain what it does, highlight issues, suggest improvements
- Keep your wit and personality in technical responses`,
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

        {/* Right Panel: Tabbed (Sessions / Monitor / Control) */}
        <RightPanel
          sessions={sessions}
          activeSession={activeSession}
          onSelectSession={setActiveSession}
          onNewSession={handleNewSession}
          onScreenshot={(dataUrl) => {
            const screenshotFile: DroppedFile = {
              name: "screenshot.png",
              size: dataUrl.length,
              type: "image/png",
              content: dataUrl,
            };
            handleSend("Analyze this screenshot — describe what you see in detail.", [screenshotFile]);
          }}
        />
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
