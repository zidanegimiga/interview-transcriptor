// Runs when MongoDB starts for the first time
// Creates all indexes and seeds the 5 system interview templates

db = db.getSiblingDB("hr_interviews");

db.createCollection("interviews");
db.interviews.createIndex({ user_id: 1, created_at: -1 });
db.interviews.createIndex({ status: 1 });
db.interviews.createIndex({ deepgram_job_id: 1 }, { sparse: true });
db.interviews.createIndex({ "ai_analysis.keywords.term": 1 }, { sparse: true });
db.interviews.createIndex({ tags: 1 }, { sparse: true });
db.interviews.createIndex(
  { "transcript.text": "text", title: "text", original_name: "text" },
  { name: "interviews_fulltext", weights: { title: 10, "transcript.text": 5 } },
);

db.createCollection("interview_templates");
db.interview_templates.createIndex({ user_id: 1 });
db.interview_templates.createIndex({ is_system: 1 });

db.interview_templates.insertMany([
  {
    name: "General HR Screen",
    is_system: true,
    user_id: null,
    description: "Balanced overview for initial HR screening.",
    prompt:
      "Provide a balanced analysis covering communication, experience, motivation, and culture fit.",
    focus_areas: ["communication", "experience", "motivation", "culture fit"],
    created_at: new Date(),
  },
  {
    name: "Technical Engineering",
    is_system: true,
    user_id: null,
    description: "Deep technical assessment for software engineering roles.",
    prompt:
      "Focus on technical depth, problem-solving, system design, and specific technologies mentioned.",
    focus_areas: [
      "technical depth",
      "problem solving",
      "system design",
      "coding skills",
    ],
    created_at: new Date(),
  },
  {
    name: "Leadership & Management",
    is_system: true,
    user_id: null,
    description: "For manager and director level roles.",
    prompt:
      "Evaluate leadership style, team management, decision-making, and strategic vision.",
    focus_areas: [
      "leadership",
      "team management",
      "decision making",
      "strategy",
    ],
    created_at: new Date(),
  },
  {
    name: "Culture & Values Fit",
    is_system: true,
    user_id: null,
    description: "Focused on values alignment and collaboration style.",
    prompt:
      "Assess values alignment, collaboration, adaptability, and communication style.",
    focus_areas: ["values", "collaboration", "adaptability", "communication"],
    created_at: new Date(),
  },
  {
    name: "Sales & Business Development",
    is_system: true,
    user_id: null,
    description: "For sales, BD, and account management roles.",
    prompt:
      "Focus on sales methodology, objection handling, target achievement, and client relationships.",
    focus_areas: [
      "sales methodology",
      "objection handling",
      "target achievement",
    ],
    created_at: new Date(),
  },
]);

print("MongoDB: indexes and system templates created.");
