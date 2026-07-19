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
    };
  }
}
