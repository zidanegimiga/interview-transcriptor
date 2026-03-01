"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  User,
  Mail,
  Shield,
  Moon,
  Sun,
  Monitor,
  Bell,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function ThemeOption({
  value,
  label,
  icon: Icon,
  current,
  onClick,
}: {
  value: string;
  label: string;
  icon: any;
  current: string | undefined;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 w-full",
        active
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
          : "glass hover:border-white/20 text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={1.5} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Separator />
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const { toast } = useToast();

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleNotifications = () => {
    setNotifications(!notifications);
    toast({
      title: notifications ? "Notifications disabled" : "Notifications enabled",
      description: notifications
        ? "You will no longer receive notifications."
        : "You will receive notifications.",
      variant: "default",
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <Section title="Profile" description="Your account information">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
            <AvatarFallback className="text-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{user?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              Role: {(session?.user as any)?.role ?? "hr_manager"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
            <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-muted-foreground">Full name</p>
              <p className="text-sm font-medium">{user?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
            <Mail className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-muted-foreground">Email address</p>
              <p className="text-sm font-medium">{user?.email ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
            <Shield
              className="w-4 h-4 text-muted-foreground"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-xs text-muted-foreground">Account role</p>
              <p className="text-sm font-medium capitalize">
                {(session?.user as any)?.role ?? "hr_manager"}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Choose how the interface looks">
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption
            value="light"
            label="Light"
            icon={Sun}
            current={theme}
            onClick={() => setTheme("light")}
          />
          <ThemeOption
            value="dark"
            label="Dark"
            icon={Moon}
            current={theme}
            onClick={() => setTheme("dark")}
          />
          <ThemeOption
            value="system"
            label="System"
            icon={Monitor}
            current={theme}
            onClick={() => setTheme("system")}
          />
        </div>
      </Section>

      {/* Notifications */}
      <Section
        title="Notifications"
        description="Control real-time update behaviour"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notifications ? (
              <Bell className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
            ) : (
              <BellOff
                className="w-4 h-4 text-muted-foreground"
                strokeWidth={1.5}
              />
            )}
            <div>
              <p className="text-sm font-medium">Real-time updates</p>
              <p className="text-xs text-muted-foreground">
                Get notified when transcription and analysis complete
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNotifications}
            className={cn(
              "border-white/10 transition-colors",
              notifications
                ? "hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                : "hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20",
            )}
          >
            {notifications ? "Disable" : "Enable"}
          </Button>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="text-foreground font-medium">
              HR Interview Platform
            </span>
          </div>
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-foreground font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Transcription</span>
            <span className="text-foreground font-medium">Deepgram Nova-2</span>
          </div>
          <div className="flex justify-between">
            <span>Analysis</span>
            <span className="text-foreground font-medium">GPT-4o-mini</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
