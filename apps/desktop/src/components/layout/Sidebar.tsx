import CalendarWidget from "../calendar/CalendarWidget";

export default function Sidebar() {
  return (
    <div className="flex flex-col gap-3">
      {/* Date & Time */}
      <CalendarWidget />
    </div>
  );
}
