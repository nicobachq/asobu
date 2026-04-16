import { Search, Bell, ChevronDown } from "lucide-react";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-5 sm:px-8 bg-background/80 backdrop-blur-lg border-b border-border">
      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search athletes, clubs, events..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/40 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-warm flex items-center justify-center">
            <span className="text-[9px] font-bold text-warm-foreground">3</span>
          </span>
        </button>

        {/* User */}
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-warm flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            NB
          </div>
          <span className="text-[13px] font-medium text-foreground hidden sm:inline">Nicolas</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
