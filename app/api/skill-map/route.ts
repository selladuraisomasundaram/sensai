import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import type { SkillMapConcept, SkillMapSummary } from '@/types/course';
import { getNextRankTitle, getRankTier, type RankTitle } from '@/lib/ranks';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user from Supabase Access Token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // 2. Fetch User Profile (Current Belt)
    let currentBelt: RankTitle = 'Initiate';
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('belt_rank, total_xp')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.belt_rank) {
        currentBelt = profile.belt_rank as RankTitle;
      }
    }

    const nextBelt = getNextRankTitle(currentBelt);
    const nextTierReqs = nextBelt ? getRankTier(nextBelt) : null;
    const requiredMasteredForNext = nextTierReqs?.requiredMasteredConcepts || 0;

    // 3. Query Concepts & Courses
    let conceptsQuery = supabase
      .from('concepts')
      .select('id, course_id, module_id, name, summary, start_sec, end_sec, courses(id, youtube_url, video_title, user_id)')
      .order('created_at', { ascending: false });

    // If authenticated, prefer user's own courses; otherwise fetch latest
    if (userId) {
      const { data: userCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', userId);

      const courseIds = userCourses?.map((c) => c.id) || [];
      if (courseIds.length > 0) {
        conceptsQuery = conceptsQuery.in('course_id', courseIds);
      }
    }

    const { data: rawConcepts, error: conceptsErr } = await conceptsQuery.limit(60);

    if (conceptsErr) {
      console.warn('Skill map concepts fetch warning:', conceptsErr.message);
    }

    const conceptList = rawConcepts || [];
    const conceptIds = conceptList.map((c) => c.id);

    // 4. Query Mastery Records for this user
    let masteryMap = new Map<string, any>();
    if (userId && conceptIds.length > 0) {
      const { data: masteryRecords } = await supabase
        .from('concept_mastery')
        .select('concept_id, mastery_score, ease_factor, interval_days, repetitions, due_at, last_reviewed_at')
        .eq('user_id', userId)
        .in('concept_id', conceptIds);

      if (masteryRecords) {
        masteryRecords.forEach((m) => masteryMap.set(m.concept_id, m));
      }
    }

    // 5. Aggregate Skill Map Concepts
    const nowTime = Date.now();
    let masteredCount = 0;
    let reinforcingCount = 0;
    let atRiskCount = 0;
    let unlearnedCount = 0;
    let totalMasteryScore = 0;
    let learnedCount = 0;

    const skillMapConcepts: SkillMapConcept[] = conceptList.map((c: any) => {
      const course = c.courses;
      const mastery = masteryMap.get(c.id);

      let status: 'mastered' | 'reinforcing' | 'at_risk' | 'unlearned' = 'unlearned';
      let masteryScore = 0;
      let intervalDays = 1;
      let repetitions = 0;
      let dueAt: string | undefined = undefined;
      let lastReviewedAt: string | undefined = undefined;

      if (mastery) {
        masteryScore = Number(mastery.mastery_score || 0);
        intervalDays = Number(mastery.interval_days || 1);
        repetitions = Number(mastery.repetitions || 0);
        dueAt = mastery.due_at;
        lastReviewedAt = mastery.last_reviewed_at;

        totalMasteryScore += masteryScore;
        learnedCount += 1;

        const isOverdue = dueAt ? new Date(dueAt).getTime() <= nowTime : false;

        if (masteryScore >= 70 && !isOverdue) {
          status = 'mastered';
          masteredCount += 1;
        } else if (isOverdue || masteryScore < 30) {
          status = 'at_risk';
          atRiskCount += 1;
        } else {
          status = 'reinforcing';
          reinforcingCount += 1;
        }
      } else {
        unlearnedCount += 1;
      }

      return {
        id: c.id,
        name: c.name,
        summary: c.summary || undefined,
        start_sec: Number(c.start_sec || 0),
        end_sec: Number(c.end_sec || 60),
        course_id: c.course_id,
        video_title: course?.video_title || 'Deconstructed Target',
        youtube_url: course?.youtube_url || '',
        mastery_score: masteryScore,
        status,
        interval_days: intervalDays,
        repetitions,
        due_at: dueAt,
        last_reviewed_at: lastReviewedAt,
      };
    });

    const retentionRate =
      learnedCount > 0 ? Math.round(totalMasteryScore / learnedCount) : 0;

    const examReady =
      Boolean(nextBelt) && masteredCount >= requiredMasteredForNext;

    const summary: SkillMapSummary = {
      concepts: skillMapConcepts,
      totalConcepts: skillMapConcepts.length,
      masteredCount,
      reinforcingCount,
      atRiskCount,
      unlearnedCount,
      retentionRate,
      currentBelt,
      nextBelt,
      examReady,
      requiredConcepts: requiredMasteredForNext,
    };

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error('Skill map generation exception:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to assemble skill map.' },
      { status: 500 }
    );
  }
}
