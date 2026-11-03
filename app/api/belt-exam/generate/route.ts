import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getNextRankTitle, getRankTier, type RankTitle } from '@/lib/ranks';
import type { BeltExamQuestion, BeltExamSession } from '@/types/course';

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

    // 2. Fetch User Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('belt_rank, total_xp')
      .eq('id', user.id)
      .maybeSingle();

    const currentBelt: RankTitle = (profile?.belt_rank as RankTitle) || 'Initiate';
    const targetRank = getNextRankTitle(currentBelt);

    if (!targetRank) {
      return NextResponse.json(
        { error: 'You have achieved the ultimate Sensai Crimson Belt tier.' },
        { status: 400 }
      );
    }

    const targetTier = getRankTier(targetRank);
    const targetCount = targetRank === 'Ronin' ? 5 : targetRank === 'Shinobi' ? 8 : 10;

    // 3. Query Concepts from user's courses
    const { data: userCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', user.id);

    const courseIds = userCourses?.map((c) => c.id) || [];
    let conceptsQuery = supabase.from('concepts').select('id, name, summary, metadata');

    if (courseIds.length > 0) {
      conceptsQuery = conceptsQuery.in('course_id', courseIds);
    }

    const { data: availableConcepts } = await conceptsQuery.limit(30);

    const conceptList = availableConcepts || [];
    if (conceptList.length === 0) {
      return NextResponse.json(
        { error: 'No concepts found in your courses. Deconstruct video targets in Sensai first.' },
        { status: 400 }
      );
    }

    const conceptIds = conceptList.map((c) => c.id);

    // 4. Query Diagnostic Questions
    const { data: questionsData } = await supabase
      .from('concept_questions')
      .select('id, concept_id, prompt, options, correct_answer, explanation')
      .in('concept_id', conceptIds);

    const questionsMap = new Map(questionsData?.map((q) => [q.concept_id, q]) || []);

    const examQuestions: BeltExamQuestion[] = [];

    // Shuffle and pick up to targetCount
    const shuffledConcepts = [...conceptList].sort(() => Math.random() - 0.5);

    for (const c of shuffledConcepts) {
      const q = questionsMap.get(c.id);
      const checkQ = (c.metadata as any)?.check_question;

      const prompt = q?.prompt || checkQ?.question || `Explain the core mechanism behind ${c.name}:`;
      let options: string[] = [];
      if (q?.options && Array.isArray(q.options) && q.options.length > 0) {
        options = q.options;
      } else if (checkQ?.options && Array.isArray(checkQ.options) && checkQ.options.length > 0) {
        options = checkQ.options;
      } else {
        options = [
          c.summary || 'Fundamental structural rule governing this system.',
          'Superficial decoration without operational consequence.',
          'Legacy pattern deprecated in modern production releases.',
          'External binary required for cloud execution.',
        ];
      }

      const correctAnswer =
        q?.correct_answer ||
        (checkQ && typeof checkQ.correct_answer_index === 'number'
          ? checkQ.options[checkQ.correct_answer_index]
          : options[0]);

      examQuestions.push({
        question_id: q?.id || `synth-${c.id}`,
        concept_id: c.id,
        concept_name: c.name,
        prompt,
        options,
        correct_answer: correctAnswer,
        explanation: q?.explanation || checkQ?.explanation || c.summary,
      });

      if (examQuestions.length >= targetCount) break;
    }

    const examSession: BeltExamSession = {
      exam_id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      target_rank: targetRank,
      questions: examQuestions,
      total_questions: examQuestions.length,
      passing_score: Math.ceil(examQuestions.length * 0.8), // 80% passing threshold
      reward_xp: targetTier.examRewardXp,
    };

    return NextResponse.json({
      success: true,
      examSession,
    });
  } catch (err: any) {
    console.error('Belt exam creation exception:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize Belt Trial.' },
      { status: 500 }
    );
  }
}
