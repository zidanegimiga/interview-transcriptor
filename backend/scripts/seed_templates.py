#!/usr/bin/env python3
"""Seed system interview templates into MongoDB."""

import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

TEMPLATES = [
    {
        "name":        "Technical Interview",
        "description": "For software engineering and technical roles. Focuses on coding ability, system design, and problem-solving approach.",
        "prompt":      "Focus on the candidate's technical depth and problem-solving methodology. Assess their ability to explain complex concepts clearly, their knowledge of data structures and algorithms, and their system design thinking. Note any gaps in technical knowledge and how they handle questions they don't know the answer to.",
        "focus_areas": ["coding", "algorithms", "system design", "problem solving", "technical depth"],
        "is_system":   True,
    },
    {
        "name":        "Behavioural Interview",
        "description": "STAR-method focused. Evaluates soft skills, culture fit, and past behaviour as a predictor of future performance.",
        "prompt":      "Analyse the candidate's responses using the STAR method (Situation, Task, Action, Result). Focus on how they handle conflict, failure, and ambiguity. Evaluate communication clarity, emotional intelligence, and alignment with collaborative work values. Note any repeated themes across their stories.",
        "focus_areas": ["STAR method", "soft skills", "culture fit", "communication", "emotional intelligence"],
        "is_system":   True,
    },
    {
        "name":        "Sales Interview",
        "description": "For sales and business development roles. Assesses objection handling, closing ability, and pipeline thinking.",
        "prompt":      "Evaluate the candidate's sales methodology and instincts. Look for evidence of structured pipeline management, effective objection handling techniques, and closing confidence. Assess their ability to build rapport quickly and their resilience in the face of rejection. Note any quantified achievements (quota attainment, deal sizes).",
        "focus_areas": ["objection handling", "closing", "pipeline", "quota", "rapport building"],
        "is_system":   True,
    },
    {
        "name":        "Customer Success Interview",
        "description": "For CS and account management roles. Focuses on empathy, retention strategies, and relationship management.",
        "prompt":      "Assess the candidate's approach to customer relationships and churn prevention. Look for evidence of proactive communication, empathy in difficult situations, and data-driven account management. Evaluate their ability to balance customer advocacy with business objectives. Note any specific retention or expansion metrics they mention.",
        "focus_areas": ["empathy", "retention", "account management", "churn prevention", "expansion"],
        "is_system":   True,
    },
    {
        "name":        "Leadership Interview",
        "description": "For management and senior leadership roles. Evaluates team management, decision-making, and strategic vision.",
        "prompt":      "Focus on the candidate's leadership philosophy and management style. Assess how they build and develop teams, make decisions under uncertainty, and drive organisational change. Look for evidence of strategic thinking beyond their immediate scope. Evaluate how they handle underperformance and how they create psychological safety. Note any measurable team or business outcomes they drove.",
        "focus_areas": ["team management", "decision making", "vision", "organisational change", "coaching"],
        "is_system":   True,
    },
]

async def seed():
    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    db_name   = os.getenv("MONGODB_DB_NAME", "hrinterview")

    if not mongo_url:
        print(" MONGODB_URL not set in .env")
        return

    client = AsyncIOMotorClient(mongo_url)
    db     = client[db_name]
    col    = db["interview_templates"]

    inserted = 0
    skipped  = 0

    for tmpl in TEMPLATES:
        existing = await col.find_one({"name": tmpl["name"], "is_system": True})
        if existing:
            skipped += 1
            continue

        await col.insert_one({
            **tmpl,
            "user_id":    None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
        inserted += 1
        print(f"  ✓ Inserted: {tmpl['name']}")

    print(f"\n Done — {inserted} inserted, {skipped} already existed.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
