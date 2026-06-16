"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Truck,
  Users,
} from "lucide-react";

type CalendarEvent = {
  id: string;
  date: string; // ISO date
  title: string;
  type: "rfq_expiry" | "shipment" | "meeting" | "follow_up";
  time?: string;
};

type CalendarWidgetProps = {
  events?: CalendarEvent[];
  className?: string;
};

const EVENT_STYLES = {
  rfq_expiry: { icon: <FileText className="h-3 w-3" />, bg: "bg-amber-500", label: "RFQ Expiry" },
  shipment: { icon: <Truck className="h-3 w-3" />, bg: "bg-blue-500", label: "Shipment" },
  meeting: { icon: <Users className="h-3 w-3" />, bg: "bg-violet-500", label: "Meeting" },
  follow_up: { icon: <Clock className="h-3 w-3" />, bg: "bg-emerald-500", label: "Follow Up" },
};

// Generate demo events relative to today
function generateDemoEvents(): CalendarEvent[] {
  const today = new Date();
  const events: CalendarEvent[] = [];
  const types: CalendarEvent["type"][] = ["rfq_expiry", "shipment", "meeting", "follow_up"];
  const titles = {
    rfq_expiry: ["CNC Parts RFQ expires", "Steel Sheet RFQ deadline", "Forging RFQ closes"],
    shipment: ["Order #1042 delivery", "Sample shipment arrives", "Bulk order dispatch"],
    meeting: ["Supplier review call", "Quality audit meeting", "Vendor onboarding"],
    follow_up: ["Follow up on Quote #234", "Payment reminder", "Certificate renewal"],
  };

  for (let i = 0; i < 8; i++) {
    const offset = Math.floor(Math.random() * 28) - 5;
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const type = types[i % types.length];
    const titleList = titles[type];
    events.push({
      id: String(i),
      date: d.toISOString().split("T")[0],
      title: titleList[i % titleList.length],
      type,
      time: `${9 + (i % 8)}:00`,
    });
  }
  return events;
}

export function CalendarWidget({
  events: propEvents,
  className = "",
}: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const events = propEvents ?? generateDemoEvents();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function eventsForDate(ds: string) {
    return events.filter((e) => e.date === ds);
  }

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className={`ct-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="font-outfit text-lg font-bold text-ct-navy">Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-ct-navy">
            {currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} />;
            }
            const ds = dateStr(day);
            const dayEvents = eventsForDate(ds);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;

            return (
              <button
                key={ds}
                type="button"
                onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                className={`relative flex h-10 flex-col items-center justify-center rounded-lg text-sm transition-all ${
                  isSelected
                    ? "bg-ct-navy text-white shadow-sm"
                    : isToday
                    ? "bg-ct-gold/10 font-bold text-ct-gold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {day}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className={`h-1 w-1 rounded-full ${EVENT_STYLES[e.type].bg} ${
                          isSelected ? "opacity-80" : ""
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date events */}
      {selectedDate && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-slate-400">No events on this day</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => {
                const style = EVENT_STYLES[event.type];
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.bg} text-white`}
                    >
                      {style.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ct-navy">
                        {event.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {style.label}
                        {event.time && ` · ${event.time}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
