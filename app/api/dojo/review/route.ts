import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { calculateSM2, calculateGradeFromResponse } from '@/lib/spacedRepetition';
import { calculateRankProgress } from '@/lib/ranks';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from Supabase Access Token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Dojo Discipline Protocol: Missing Authorization bearer token.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Session invalid or expired.' },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => null);
    const conceptId = body?.concept_id || body?.conceptId;
    const questionId = body?.question_id || body?.questionId;
    const wasCorrect = Boolean(body?.was_correct ?? body?.wasCorrect);
    const responseTimeMs = Number(body?.response_time_ms ?? body?.responseTimeMs ?? 0);

    if (!conceptId) {
      return NextResponse.json(
        { error: 'Missing parameter: concept_id is required.' },
        { status: 400 }
      );
    }

    // Determine grade (0-5)
    let grade = typeof body?.grade === 'number' ? body.grade : null;
    if (grade === null || isNaN(grade) || grade < 0 || grade > 5) {
      grade = calculateGradeFromResponse(wasCorrect, responseTimeMs);
    }

    // 3. Fetch existing concept_mastery record
    const { data: existingMastery, error: fetchErr } = await supabase
      .from('concept_mastery')
      .select('id, ease_factor, interval_days, repetitions, mastery_score')
      .eq('user_id', user.id)
      .eq('concept_id', conceptId)
      .maybeSingle();

    const currentRepetitions = existingMastery?.repetitions ?? 0;
    const currentEase = existingMastery ? Number(existingMastery.ease_factor) : 2.5;
    const currentInterval = existingMastery?.interval_days ?? 1;

    // 4. Compute updated SM-2 parameters
    const sm2Result = calculateSM2({
      grade,
      repetitions: currentRepetitions,
      easeFactor: currentEase,
      intervalDays: currentInterval,
    });

    // 5. Upsert into concept_mastery
    const nowIso = new Date().toISOString();
    const { data: upsertedMastery, error: masteryErr } = await supabase
      .from('concept_mastery')
      .upsert(
        {
          user_id: user.id,
          concept_id: conceptId,
          mastery_score: sm2Result.masteryScore,
          ease_factor: sm2Result.easeFactor,
          interval_days: sm2Result.intervalDays,
          repetitions: sm2Result.repetitions,
          due_at: sm2Result.dueAt.toISOString(),
          last_reviewed_at: nowIso,
        },
        { onConflict: 'user_id,concept_id' }
      )
      .select()
      .single();

    if (masteryErr) {
      console.error('Failed to upsert concept mastery:', masteryErr);
    }

    // 6. Record in review_logs
    const { error: logErr } = await supabase.from('review_logs').insert([
      {
        user_id: user.id,
        concept_id: conceptId,
        question_id: questionId || null,
        grade,
        was_correct: wasCorrect,
        reviewed_at: nowIso,
      },
    ]);

    if (logErr) {
      console.warn('Failed to insert review log:', logErr.message);
    }

    // 7. Award XP to User Profile
    const earnedXp = wasCorrect ? 15 : 5; // 15 XP for recall, 5 XP for effort
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, total_xp')
      .eq('id', user.id)
      .single();

    let newTotalXp = (profile?.total_xp ?? 0) + earnedXp;

    const { data: updatedProfile, error: profileUpdateErr } = await supabase
      .from('profiles')
      .update({ total_xp: newTotalXp })
      .eq('id', user.id)
      .select('total_xp')
      .single();

    if (!profileUpdateErr && updatedProfile) {
      newTotalXp = updatedProfile.total_xp;
    }

    const rankProgress = calculateRankProgress(newTotalXp);

    return NextResponse.json({
      success: true,
      conceptId,
      grade,
      wasCorrect,
      masteryScore: sm2Result.masteryScore,
      easeFactor: sm2Result.easeFactor,
      intervalDays: sm2Result.intervalDays,
      repetitions: sm2Result.repetitions,
      dueAt: sm2Result.dueAt.toISOString(),
      earnedXp,
      totalXp: newTotalXp,
      rankProgress,
    });
  } catch (err: any) {
    console.error('Dojo review evaluation exception:', err);
    return NextResponse.json(
      { error: err.message || 'Fatal error evaluating concept review.' },
      { status: 500 }
    );
  }
}

