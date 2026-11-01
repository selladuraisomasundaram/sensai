import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { calculateRankProgress } from '@/lib/ranks';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from Supabase Access Token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Discipline Protocol: Missing Authorization bearer token.' },
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

    // 2. Parse request parameters
    const body = await req.json().catch(() => null);
    const moduleId = body?.module_id || body?.moduleId;
    const courseId = body?.course_id || body?.courseId;
    const quizScore = Number(body?.quiz_score ?? 0);
    const totalQuestions = Number(body?.total_questions ?? 0);

    if (!moduleId || !courseId) {
      return NextResponse.json(
        { error: 'Missing parameters: module_id and course_id are required.' },
        { status: 400 }
      );
    }

    // 3. Verify Course Ownership
    const { data: course, error: courseFetchErr } = await supabase
      .from('courses')
      .select('id, user_id')
      .eq('id', courseId)
      .single();

    if (courseFetchErr || !course) {
      return NextResponse.json(
        { error: 'Course target not found.' },
        { status: 404 }
      );
    }

    if (course.user_id && course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not hold clearance for this course.' },
        { status: 403 }
      );
    }

    // 4. Retrieve Module Record
    const { data: moduleRecord, error: moduleFetchErr } = await supabase
      .from('modules')
      .select('id, course_id, is_completed, module_quiz')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleFetchErr || !moduleRecord) {
      return NextResponse.json(
        { error: 'Module record not found within this course.' },
        { status: 404 }
      );
    }

    const wasAlreadyCompleted = Boolean(moduleRecord.is_completed);

    // 5. Server-Enforced XP Calculation
    let earnedXp = 0;

    if (!wasAlreadyCompleted) {
      const BASE_MODULE_XP = 10;
      let quizXp = 0;

      if (totalQuestions > 0) {
        if (quizScore >= totalQuestions) {
          // Perfect score reward
          quizXp = 40;
        } else if (quizScore > 0) {
          // Proportional reward
          quizXp = Math.round((quizScore / totalQuestions) * 40);
        }
      }

      earnedXp = BASE_MODULE_XP + quizXp;
    }

    // 6. Update Module Completion State
    if (!wasAlreadyCompleted) {
      const { error: moduleUpdateErr } = await supabase
        .from('modules')
        .update({ is_completed: true })
        .eq('id', moduleId);

      if (moduleUpdateErr) {
        console.error('Failed to update module is_completed:', moduleUpdateErr);
      }
    }

    // 7. Update User Profile XP
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, total_xp, current_streak')
      .eq('id', user.id)
      .single();

    let newTotalXp = (profile?.total_xp ?? 0) + earnedXp;

    if (earnedXp > 0) {
      const { data: updatedProfile, error: profileUpdateErr } = await supabase
        .from('profiles')
        .update({ total_xp: newTotalXp })
        .eq('id', user.id)
        .select('total_xp, current_streak')
        .single();

      if (!profileUpdateErr && updatedProfile) {
        newTotalXp = updatedProfile.total_xp;
      }
    }

    const rankProgress = calculateRankProgress(newTotalXp);

    return NextResponse.json({
      success: true,
      earnedXp,
      totalXp: newTotalXp,
      wasAlreadyCompleted,
      rankProgress,
    });
  } catch (err: any) {
    console.error('Progression calculation exception:', err);
    return NextResponse.json(
      { error: err.message || 'Fatal progression error.' },
      { status: 500 }
    );
  }
}

