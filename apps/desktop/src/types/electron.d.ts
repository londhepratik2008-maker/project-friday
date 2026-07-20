export {};

declare global {
  interface Window {
    friday: {
      ping: () => Promise<{
        status: string;
        message: string;
        timestamp: number;
      }>;
      chat: {
        send: (messages: { role: string; content: string }[]) => Promise<{
          success: boolean;
          reply: string;
        }>;
      };
      memory: {
        getAll: () => Promise<{
          id: number;
          text: string;
          date: string;
        }[]>;
        delete: (id: number) => Promise<{
          id: number;
          text: string;
          date: string;
        }[]>;
      };
      system: {
        getInfo: () => Promise<{
          hostname: string;
          platform: string;
          arch: string;
          cpu: string;
          cpuCores: number;
          totalMemory: number;
          freeMemory: number;
          uptime: number;
        }>;
      };
      calendar: {
        isConnected: () => Promise<boolean>;
        authenticate: () => Promise<boolean>;
        disconnect: () => Promise<boolean>;
        getUpcoming: (maxResults?: number) => Promise<{
          id: string;
          title: string;
          start: string;
          end: string;
          date: string;
        }[]>;
      };
      getApiConfig: () => Promise<Record<string, any>>;

      // Phase 3: Desktop Control
      clipboard: {
        read: () => Promise<{ text: string; html: string; image: string | null }>;
        write: (text: string) => Promise<{ success: boolean }>;
        readImage: () => Promise<{ data: string | null }>;
      };
      volume: {
        get: () => Promise<{ volume: number; muted: boolean }>;
        set: (level: number) => Promise<{ success: boolean; volume: number }>;
        toggleMute: () => Promise<{ success: boolean }>;
      };
      brightness: {
        get: () => Promise<{ brightness: number; supported: boolean }>;
        set: (level: number) => Promise<{ success: boolean; brightness: number }>;
      };
      desktop: {
        launchApp: (appName: string) => Promise<{ success: boolean; app: string; error?: string }>;
        launchUrl: (url: string) => Promise<{ success: boolean; url: string; error?: string }>;
        openFolder: (path?: string) => Promise<{ success: boolean; error?: string }>;
        listApps: () => Promise<{ name: string; path: string; icon: string; fullPath: string }[]>;
        screenshot: () => Promise<{ success: boolean; data?: string; width?: number; height?: number; error?: string }>;
        execCommand: (command: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      };
    };
  }
}
