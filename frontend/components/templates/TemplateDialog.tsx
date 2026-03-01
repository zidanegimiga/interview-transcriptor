"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { EMPTY_FORM, Template, TemplateFormData } from "@/shared/types/dashboard";

const TemplateDialog = ({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open:    boolean;
  editing: Template | null;
  onClose: () => void;
  onSaved: (t: Template) => void;
}) => {
  const { toast }              = useToast();
  const [form, setForm]        = useState<TemplateFormData>(EMPTY_FORM);
  const [saving, setSaving]    = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name:        editing.name,
        description: editing.description,
        prompt:      editing.prompt,
        focus_areas: editing.focus_areas?.join(", ") ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  function set(field: keyof TemplateFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.prompt.trim()) {
      toast({
        title:       "Required fields missing",
        description: "Name and prompt are required.",
        variant:     "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        prompt:      form.prompt.trim(),
        focus_areas: form.focus_areas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      let result: any;
      if (editing) {
        result = await api.templates.update(editing._id, payload);
      } else {
        result = await api.templates.create(payload);
      }

      toast({ title: editing ? "Template updated" : "Template created" });
      onSaved(result.data);
      onClose();
    } catch (e: any) {
      toast({
        title:       "Save failed",
        description: e.message,
        variant:     "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: any) => !o && onClose()}>
      <DialogContent className="glass border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {editing ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. Senior Engineer Interview"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="bg-white/5 border-white/10 focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Description</Label>
            <Input
              placeholder="Short description of this template's purpose"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="bg-white/5 border-white/10 focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Focus Areas
              <span className="ml-1 text-muted-foreground/60">(comma separated)</span>
            </Label>
            <Input
              placeholder="e.g. system design, leadership, problem solving"
              value={form.focus_areas}
              onChange={(e) => set("focus_areas", e.target.value)}
              className="bg-white/5 border-white/10 focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Analysis Prompt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Instructions for the AI analysis. e.g. 'Focus on the candidate's system design ability and communication clarity. Pay special attention to how they break down complex problems.'"
              value={form.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              className="bg-white/5 border-white/10 focus:border-emerald-500/50 min-h-[120px] resize-none font-mono text-xs"
              rows={6}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-white/10 hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />}
            {editing ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default TemplateDialog;