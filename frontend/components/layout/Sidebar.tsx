"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  FileAudio,
  BookTemplate,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href:  "/dashboard",
    icon:  LayoutDashboard,
  },
  {
    label: "Upload",
    href:  "/dashboard/upload",
    icon:  Upload,
  },
  {
    label: "Interviews",
    href:  "/dashboard/interviews",
    icon:  FileAudio,
  },
  {
    label: "Templates",
    href:  "/dashboard/templates",
    icon:  BookTemplate,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-card/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Sparkles className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">HR Platform</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Interview Analysis</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                  />
                )}
                <Icon
                  className={cn(
                    "w-4 h-4 relative z-10 transition-colors",
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  strokeWidth={1.5}
                />
                <span className="relative z-10">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border">
        <Link href="/dashboard/settings">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}>
            <Settings className="w-4 h-4" strokeWidth={1.5} />
            Settings
          </div>
        </Link>
      </div>
    </aside>
  );
}