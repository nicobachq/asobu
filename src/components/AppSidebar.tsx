import {
  Home, Compass, User, Users, Calendar, MessageCircle,
  Settings, ChevronLeft, ChevronRight, Trophy,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

const mainNav = [
  { title: "Feed", url: "/feed", icon: Home, badge: 0 },
  { title: "Discover", url: "/discover", icon: Compass, badge: 0 },
  { title: "Profile", url: "/profile", icon: User, badge: 0 },
  { title: "Organizations", url: "/organizations", icon: Users, badge: 0 },
  { title: "Calendar", url: "/calendar", icon: Calendar, badge: 2 },
  { title: "Messages", url: "/messages", icon: MessageCircle, badge: 3 },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-[4.5rem]" : "w-[15.5rem]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
          <Trophy className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-heading text-lg font-bold text-sidebar-foreground tracking-tight">
            Asobu
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                  active ? "text-sidebar-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                }`}
              />
              {!collapsed && <span>{item.title}</span>}
              {item.badge > 0 && (
                <span className={`${collapsed ? "" : "ml-auto"} w-5 h-5 rounded-full bg-warm flex items-center justify-center`}>
                  <span className="text-[10px] font-bold text-warm-foreground">{item.badge}</span>
                </span>
              )}
              {active && !collapsed && item.badge === 0 && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary/80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-[18px] h-[18px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-warm shrink-0 flex items-center justify-center text-[11px] font-semibold text-primary-foreground">
            NB
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-sidebar-foreground truncate">Nicolas Bachmann</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">@nicolasb</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
