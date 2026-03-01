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

export type { Interview, Metrics };