import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, Calendar as CalIcon,
} from "lucide-react";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = Array.from({ length: 35 }, (_, i) => {
    const day = i - 2;
    return { day: day >= 1 && day <= 30 ? day : null, hasEvent: [5, 12, 18, 22, 28].includes(day) };
  });

  const events = [
    { title: "Team Training Session", time: "09:00 – 11:00", location: "Training Ground", type: "Training", color: "bg-primary/10 text-primary" },
    { title: "League Match vs Real Madrid", time: "20:00 – 22:00", location: "Camp Nou Stadium", type: "Match", color: "bg-warm/10 text-warm" },
    { title: "Fitness Assessment", time: "14:00 – 15:30", location: "Medical Center", type: "Assessment", color: "bg-primary/10 text-primary" },
    { title: "Open Tryouts U18", time: "10:00 – 16:00", location: "Training Facility B", type: "Tryout", color: "bg-warm/10 text-warm" },
  ];

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Calendar</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Your upcoming events and schedule</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-brand text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Calendar */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-base font-semibold text-foreground">April 2026</h2>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-3 py-1 rounded-lg text-[11px] font-medium text-primary hover:bg-primary/8 transition-colors">Today</button>
                <button className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {days.map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {dates.map((date, i) => (
                <button
                  key={i}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                    date.day === 14
                      ? "bg-primary text-primary-foreground font-semibold"
                      : date.day
                      ? "text-foreground hover:bg-muted/40"
                      : "text-muted-foreground/30"
                  }`}
                >
                  {date.day || ""}
                  {date.hasEvent && date.day !== 14 && (
                    <div className="w-1 h-1 rounded-full bg-warm mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Upcoming</h3>
            {events.map((event, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4 hover:elevation-1 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                    <CalIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-medium text-foreground truncate">{event.title}</h4>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" /> {event.time}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {event.location}
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium ${event.color}`}>
                      {event.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
