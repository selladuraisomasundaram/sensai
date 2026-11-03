import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getRankTier, calculateRankProgress, type RankTitle } from '@/lib/ranks';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from Supabase Access Token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Belt Trial Protocol: Missing Authorization bearer token.' },
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
    const targetRank: RankTitle = body?.target_rank || body?.targetRank;
    const score = Number(body?.score ?? 0);
    const totalQuestions = Number(body?.total_questions ?? body?.totalQuestions ?? 1);
    const missedConceptIds: string[] = Array.isArray(body?.missed_concept_ids)
      ? body.missed_concept_ids
      : [];

    if (!targetRank) {
      return NextResponse.json(
        { error: 'Missing parameter: target_rank is required.' },
        { status: 400 }
      );
    }

    const targetTier = getRankTier(targetRank);
    const passingThreshold = Math.ceil(totalQuestions * 0.8); // 80% passing standard
    const passed = score >= passingThreshold;

    let earnedXp = 0;
    let newTotalXp = 0;

    // 3. Update User Profile if Passed
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, total_xp, belt_rank')
      .eq('id', user.id)
      .single();

    const currentXp = profile?.total_xp ?? 0;

    if (passed) {
      earnedXp = targetTier.examRewardXp;
      newTotalXp = currentXp + earnedXp;

      // Update belt_rank and total_xp
      const { error: profileUpdateErr } = await supabase
        .from('profiles')
        .update({
          belt_rank: targetRank,
          total_xp: newTotalXp,
          belt_exam_passed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileUpdateErr) {
        console.warn('Profile belt rank update warning:', profileUpdateErr.message);
        // Fallback: update total_xp only if belt_rank column not added yet
        await supabase
          .from('profiles')
          .update({ total_xp: newTotalXp })
          .eq('id', user.id);
      }
    } else {
      newTotalXp = currentXp;
    }

    // 4. Log Exam Result to belt_exams table (non-blocking)
    try {
      await supabase.from('belt_exams').insert([
        {
          user_id: user.id,
          target_rank: targetRank,
          score,
          total_questions: totalQuestions,
          passed,
          concept_ids: missedConceptIds,
        },
      ]);
    } catch (examLogErr: any) {
      console.warn('Belt exam table write skipped:', examLogErr?.message);
    }

    const rankProgress = calculateRankProgress(newTotalXp);

    return NextResponse.json({
      success: true,
      passed,
      score,
      totalQuestions,
      passingThreshold,
      targetRank,
      beltColor: targetTier.beltColor,
      earnedXp,
      newTotalXp,
      rankProgress,
      feedback: passed
        ? `Honor to the practitioner. You have demonstrated rigorous mastery and are officially promoted to the ${targetTier.beltColor} ${targetRank} tier.`
        : `Sensei's Guidance: Your execution was close (${score}/${totalQuestions}), but ninja advancement demands precision. Reinforce the missed concepts in the Dojo before facing the trial again.`,
    });
  } catch (err: any) {
    console.error('Belt exam submission exception:', err);
    return NextResponse.json(
      { error: err.message || 'Fatal error evaluating Belt Trial.' },
      { status: 500 }
    );
  }
}
