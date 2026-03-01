interface Interview {
  _id:          string;
  title:        string;
  original_name: string;
  status:       string;
  file_type:    string;
  file_size:    number;
  created_at:   string;
  duration_seconds: number | null;
  ai_analysis:  { sentiment: { overall: string } } | null;
}

interface Metrics {
  by_status:    Record<string, number>;
  by_sentiment: Record<string, number>;
  top_keywords: { term: string; count: number }[];
}

interface Template {
  _id:         string;
  name:        string;
  description: string;
  is_system:   boolean;
}

interface QueuedFile {
  id:       string;
  file:     File;
  title:    string;
  status:   "idle" | "uploading" | "success" | "error";
  error?:   string;
  resultId?: string;
}

export type { Interview, Metrics, Template, QueuedFile };