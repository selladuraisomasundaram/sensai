import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { dispatchLLMJson, parseSanitizedJson } from '@/lib/llm';
import { calculateSM2 } from '@/lib/spacedRepetition';
import { calculateRankProgress } from '@/lib/ranks';
import type { TeachBackEvaluation } from '@/types/course';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve LLM API Key (Header or BYOK)
    const apiKey =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Zero-Trust Protocol: Missing LLM API key. Provide API key in header.' },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => null);
    const conceptId = body?.concept_id || body?.conceptId;
    const explanation = body?.explanation;

    if (!conceptId || !explanation || typeof explanation !== 'string' || explanation.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a substantive explanation of at least 10 characters.' },
        { status: 400 }
      );
    }

    // 3. Authenticate user if token provided
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      // If the token is not an LLM key (e.g. JWT token), verify with Supabase
      if (!token.startsWith('AIza') && !token.startsWith('sk-')) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      }
    }

    // 4. Fetch Concept Record & Origin Context
    const { data: concept, error: conceptErr } = await supabase
      .from('concepts')
      .select('id, course_id, module_id, name, summary, start_sec, end_sec, courses(id, video_title, domain_type), modules(id, content)')
      .eq('id', conceptId)
      .single();

    if (conceptErr || !concept) {
      return NextResponse.json(
        { error: 'Target concept record not found.' },
        { status: 404 }
      );
    }

    const course = (concept as any).courses;
    const moduleRecord = (concept as any).modules;
    const moduleContent = moduleRecord?.content || {};

    const lessonContext =
      moduleContent?.architectural_objective ||
      moduleContent?.context ||
      moduleContent?.real_world_application ||
      moduleContent?.workflow_objective ||
      concept.summary ||
      '';

    // 5. Construct Feynman Evaluation Prompt
    const systemInstruction = `You are Sensai, a strict, insightful, and pedagogical master evaluating an apprentice's explanation of a technical concept using the Feynman Technique.
The Feynman Technique demands explaining a complex idea in plain, lucid, and intuitively accurate language as if teaching a beginner, avoiding empty buzzwords.

Output strictly valid JSON adhering to this schema:
{
  "accuracy_score": 85,
  "grade": 4,
  "mastery_verdict": "Mastered" | "Solid Understanding" | "Partial Understanding" | "Critical Gaps",
  "strengths": ["Specific nuance 1 student explained correctly", "Specific nuance 2"],
  "knowledge_gaps": ["Key mechanic or condition the student missed or stated inaccurately"],
  "sensei_coaching": "1-2 sentence crisp master advice directly addressing how to strengthen their intuition.",
  "simplified_analogy": "A memorable real-world analogy illuminating the core mechanic."
}

Scoring and Grade Guidelines:
- Grade 5 (Score 90-100): Flawless intuition, clear explanation of cause-and-effect, no major missing links.
- Grade 4 (Score 75-89): Solid grasp, covers the principle accurately with minor omission of edge cases.
- Grade 3 (Score 60-74): Pass with effort; fundamental idea is present but somewhat vague or imprecise.
- Grade 2 (Score 40-59): Struggling; significant confusion or missing essential mechanics.
- Grade 1 (Score 0-39): Critical misconceptions or off-topic explanation.`;

    const userPrompt = `=== CONCEPT TO EVALUATE ===
Concept Name: ${concept.name}
Verified Definition/Rule: ${concept.summary || 'Fundamental technical rule'}
Domain/Discipline: ${course?.domain_type || 'technical'}
Context from Source Video Lesson: ${lessonContext}

=== APPRENTICE'S FEYNMAN EXPLANATION ===
"${explanation.trim()}"

Evaluate the apprentice's explanation strictly against the verified concept. Return ONLY RFC 8259 JSON.`;

    // 6. Invoke LLM
    const rawOutput = await dispatchLLMJson(apiKey, systemInstruction, userPrompt);
    const parsed = parseSanitizedJson<any>(rawOutput);

    const accuracyScore = Math.max(0, Math.min(100, Number(parsed.accuracy_score || 70)));
    const grade = Math.max(0, Math.min(5, Number(parsed.grade || 3)));
    const masteryVerdict = parsed.mastery_verdict || (accuracyScore >= 75 ? 'Solid Understanding' : 'Partial Understanding');
    const strengths: string[] = Array.isArray(parsed.strengths) ? parsed.strengths : ['Good effort attempting the explanation.'];
    const knowledgeGaps: string[] = Array.isArray(parsed.knowledge_gaps) ? parsed.knowledge_gaps : [];
    const senseiCoaching = parsed.sensei_coaching || 'Review the timestamp checkpoint to solidify the missing mechanics.';
    const simplifiedAnalogy = parsed.simplified_analogy || 'Consider this concept as a system pipeline connecting causes to effects.';

    // 7. Spaced Repetition Integration (If user authenticated)
    let earnedXp = accuracyScore >= 60 ? 35 : 15; // High XP reward for Feynman recall
    let newTotalXp: number | undefined;
    let rankProgress: any;

    if (userId) {
      // Fetch existing mastery
      const { data: existingMastery } = await supabase
        .from('concept_mastery')
        .select('ease_factor, interval_days, repetitions')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .maybeSingle();

      const sm2Result = calculateSM2({
        grade,
        repetitions: existingMastery?.repetitions ?? 0,
        easeFactor: existingMastery ? Number(existingMastery.ease_factor) : 2.5,
        intervalDays: existingMastery?.interval_days ?? 1,
      });

      // Upsert concept_mastery
      await supabase.from('concept_mastery').upsert(
        {
          user_id: userId,
          concept_id: conceptId,
          mastery_score: sm2Result.masteryScore,
          ease_factor: sm2Result.easeFactor,
          interval_days: sm2Result.intervalDays,
          repetitions: sm2Result.repetitions,
          due_at: sm2Result.dueAt.toISOString(),
          last_reviewed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,concept_id' }
      );

      // Log teach-back submission (non-blocking)
      try {
        await supabase.from('teach_back_submissions').insert([
          {
            user_id: userId,
            concept_id: conceptId,
            explanation: explanation.trim(),
            accuracy_score: accuracyScore,
            strengths,
            knowledge_gaps: knowledgeGaps,
            sensei_coaching: senseiCoaching,
            simplified_analogy: simplifiedAnalogy,
          },
        ]);
      } catch (logErr: any) {
        console.warn('Teach-back submissions table write skipped:', logErr?.message);
      }

      // Award XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', userId)
        .single();

      newTotalXp = (profile?.total_xp ?? 0) + earnedXp;

      await supabase
        .from('profiles')
        .update({ total_xp: newTotalXp })
        .eq('id', userId);

      rankProgress = calculateRankProgress(newTotalXp);
    }

    const evaluation: TeachBackEvaluation = {
      accuracy_score: accuracyScore,
      grade,
      mastery_verdict: masteryVerdict,
      strengths,
      knowledge_gaps: knowledgeGaps,
      sensei_coaching: senseiCoaching,
      simplified_analogy: simplifiedAnalogy,
      earnedXp,
      newTotalXp,
      rankProgress,
    };

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (err: any) {
    console.error('Teach-back evaluation exception:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to evaluate Feynman explanation.' },
      { status: 500 }
    );
  }
}
