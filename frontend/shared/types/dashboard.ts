

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

interface Meta {
  page:  number;
  limit: number;
  total: number;
  pages: number;
}

interface Utterance {
  speaker:   string;
  text:      string;
  start_ms:  number;
  end_ms:    number;
  sentiment: string | null;
}

interface Transcript {
  text:       string;
  utterances: Utterance[];
  language_code: string;
  confidence: number;
}

interface Keyword {
  term:      string;
  category:  string;
  frequency: number;
}

interface QAPair {
  question:  string;
  answer:    string;
  speaker_q: string;
  speaker_a: string;
}

interface SentimentBreakdown {
  overall:    string;
  score:      number;
  notes:      string;
  by_speaker: Record<string, { overall: string; score: number }>;
}

interface AIAnalysis {
  summary:           string;
  candidate_summary: string;
  sentiment:         SentimentBreakdown;
  keywords:          Keyword[];
  questions_answers: QAPair[];
  strengths:         string[];
  red_flags:         string[];
  model_used:        string;
  analysed_at:       string;
}

interface Interview {
  _id:              string;
  title:            string;
  original_name:    string;
  status:           string;
  file_type:        string;
  file_size:        number;
  duration_seconds: number | null;
  created_at:       string;
  updated_at:       string;
  transcript:       Transcript | null;
  ai_analysis:      AIAnalysis | null;
  tags:             string[];
}

export type { Interview, Metrics, Template, QueuedFile, Meta, Utterance, Transcript, Keyword, QAPair, SentimentBreakdown, AIAnalysis };