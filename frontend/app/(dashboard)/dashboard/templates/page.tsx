"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Template } from "@/shared/types/dashboard";
import TemplateCard from "@/components/templates/TemplateCard";
import TemplateDialog from "@/components/templates/TemplateDialog";



export default function TemplatesPage() {
  const { toast } = useToast();

  const [templates, setTemplates]       = useState<Template[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editing, setEditing]           = useState<Template | null>(null);

  useEffect(() => {
    api.templates.list()
      .then((res: any) => setTemplates(res.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleEdit(template: Template) {
    setEditing(template);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditing(null);
  }

  function handleSaved(saved: Template) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t._id === saved._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  }

  async function handleDelete(id: string) {
    try {
      await api.templates.delete(id);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      toast({ title: "Template deleted" });
    } catch (e: any) {
      toast({
        title:       "Delete failed",
        description: e.message,
        variant:     "destructive",
      });
    }
  }

  const systemTemplates = templates.filter((t) => t.is_system);
  const userTemplates   = templates.filter((t) => !t.is_system);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Customise AI analysis prompts for different interview types
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium">Failed to load templates</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User templates */}
          {userTemplates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Your Templates
              </h3>
              <AnimatePresence mode="popLayout">
                {userTemplates.map((t) => (
                  <TemplateCard
                    key={t._id}
                    template={t}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {userTemplates.length > 0 && systemTemplates.length > 0 && (
            <Separator />
          )}

          {/* System templates */}
          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                System Templates
              </h3>
              <AnimatePresence mode="popLayout">
                {systemTemplates.map((t) => (
                  <TemplateCard
                    key={t._id}
                    template={t}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {templates.length === 0 && (
            <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium">No templates yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a template to customise AI analysis for specific interview types
              </p>
              <Button
                onClick={handleCreate}
                size="sm"
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                Create your first template
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <TemplateDialog
        open={dialogOpen}
        editing={editing}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </div>
  );
}