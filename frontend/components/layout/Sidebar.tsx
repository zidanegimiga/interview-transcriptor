"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  FileAudio,
  BookTemplate,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload", href: "/dashboard/upload", icon: Upload },
  { label: "Interviews", href: "/dashboard/interviews", icon: FileAudio },
  { label: "Templates", href: "/dashboard/templates", icon: BookTemplate },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center">
          {theme === "light" ? (
            <Image src="/light.png" alt="Logo" width={80} height={80} />
          ) : (
            <Image src="/dark.png" alt="Logo" width={80} height={80} />
          )}
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
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
                      : "text-muted-foreground group-hover:text-foreground",
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
        <Link href="/dashboard/settings" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent">
            <Settings className="w-4 h-4" strokeWidth={1.5} />
            Settings
          </div>
        </Link>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-card border-r border-border md:hidden"
            >
              <NavContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
