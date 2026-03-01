"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Moon, Sun, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TITLES: Record<string, string> = {
  "/dashboard":            "Dashboard",
  "/dashboard/upload":     "Upload Interview",
  "/dashboard/interviews": "Interviews",
  "/dashboard/templates":  "Templates",
  "/dashboard/settings":   "Settings",
};

function getTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/dashboard/interviews/")) return "Interview Detail";
  return "HR Platform";
}

export function Header() {
  const { data: session }   = useSession();
  const { theme, setTheme } = useTheme();
  const pathname            = usePathname();
  const title               = getTitle(pathname);

  const user     = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-sm font-semibold">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground hover:text-foreground relative"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun  className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"  strokeWidth={1.5} />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.5} />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
                <AvatarFallback className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">
                {user?.name ?? user?.email ?? "Account"}
              </span>
              <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/dashboard/settings" className="flex items-center gap-2 text-sm cursor-pointer">
                <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-sm text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
