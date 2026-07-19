import { useEffect, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  date: string;
};

export default function CalendarWidget() {
  const [now, setNow] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkCalendarConnection();
  }, []);

  const checkCalendarConnection = async () => {
    try {
      if (!window.friday?.calendar?.isConnected) return;
      const connected = await window.friday.calendar.isConnected();
      setIsConnected(connected);
      if (connected) {
        fetchEvents();
      }
    } catch {
      setIsConnected(false);
    }
  };

  const fetchEvents = async () => {
    try {
      if (!window.friday?.calendar?.getUpcoming) return;
      const calendarEvents = await window.friday.calendar.getUpcoming(5);
      setEvents(calendarEvents);
    } catch {
      console.error("Failed to fetch calendar events");
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (!window.friday?.calendar?.authenticate) return;
      await window.friday.calendar.authenticate();
      setIsConnected(true);
      await fetchEvents();
    } catch (err) {
      console.error("Calendar auth failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!window.friday?.calendar?.disconnect) return;
      await window.friday.calendar.disconnect();
      setIsConnected(false);
      setEvents([]);
    } catch (err) {
      console.error("Calendar disconnect failed:", err);
    }
  };

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const monthDay = now.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  }).toUpperCase();
  const year = now.getFullYear();
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formatEventTime = (start: string) => {
    const date = new Date(start);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Date & Time */}
      <div>
        <p className="annotation" style={{ letterSpacing: "0.2em" }}>
          {dayName}
        </p>
        <p className="hud-accent" style={{ fontSize: 14 }}>
          {monthDay} · {year}
        </p>
        <p className="hud-value" style={{ fontSize: 18, marginTop: 2 }}>
          {time}
        </p>
      </div>

      <div className="divider-h" />

      {/* Google Calendar */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`led ${isConnected ? "led-green" : "led-dim"}`} />
            <span className="hud-label">Calendar</span>
          </div>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="hud-btn rounded px-2 py-0.5"
              style={{ fontSize: 8 }}
            >
              {isConnecting ? "..." : "CONNECT"}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="hud-btn-danger rounded px-2 py-0.5"
              style={{ fontSize: 8 }}
            >
              DISCONNECT
            </button>
          )}
        </div>

        {isConnected && events.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2">
            {events.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="px-2 py-1.5 rounded"
                style={{
                  background: "rgba(255, 157, 46, 0.05)",
                  border: "1px solid var(--friday-border)",
                }}
              >
                <p
                  className="truncate"
                  style={{ fontSize: 11, color: "var(--friday-text)" }}
                >
                  {event.title}
                </p>
                <p className="annotation">
                  {formatEventTime(event.start)}
                </p>
              </div>
            ))}
          </div>
        )}

        {isConnected && events.length === 0 && (
          <p className="annotation mt-2">No upcoming events</p>
        )}

        {!isConnected && (
          <p className="annotation mt-2">Connect to see events</p>
        )}
      </div>
    </div>
  );
}
