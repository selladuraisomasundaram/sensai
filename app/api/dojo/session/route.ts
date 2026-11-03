import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import type { DojoSessionItem } from '@/types/course';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user from Supabase Access Token (Optional: guest fallback supported)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    const items: DojoSessionItem[] = [];
    const MAX_SESSION_ITEMS = 7;

    // 2. Branch A: Authenticated User with Spaced Repetition Due Concepts
    if (userId) {
      // Query concepts currently due for review
      const { data: dueMasteryList, error: masteryErr } = await supabase
        .from('concept_mastery')
        .select('concept_id, mastery_score, ease_factor, interval_days, repetitions, due_at')
        .eq('user_id', userId)
        .lte('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })
        .limit(MAX_SESSION_ITEMS);

      const dueConceptIds = dueMasteryList?.map((m) => m.concept_id) || [];
      const masteryMap = new Map(dueMasteryList?.map((m) => [m.concept_id, m]) || []);

      // If we need more items, look for newly learned concepts not yet reviewed
      let candidateConceptIds = [...dueConceptIds];
      if (candidateConceptIds.length < MAX_SESSION_ITEMS) {
        // Find concepts from courses owned by this user
        const { data: userCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('user_id', userId)
          .limit(10);

        const courseIds = userCourses?.map((c) => c.id) || [];
        if (courseIds.length > 0) {
          const { data: unreviewedConcepts } = await supabase
            .from('concepts')
            .select('id')
            .in('course_id', courseIds)
            .limit(20);

          if (unreviewedConcepts && unreviewedConcepts.length > 0) {
            // Check which of these are already in concept_mastery
            const allUnrevIds = unreviewedConcepts.map((c) => c.id);
            const { data: existingMastery } = await supabase
              .from('concept_mastery')
              .select('concept_id')
              .eq('user_id', userId)
              .in('concept_id', allUnrevIds);

            const reviewedSet = new Set(existingMastery?.map((m) => m.concept_id) || []);
            for (const c of unreviewedConcepts) {
              if (!reviewedSet.has(c.id) && !candidateConceptIds.includes(c.id)) {
                candidateConceptIds.push(c.id);
                if (candidateConceptIds.length >= MAX_SESSION_ITEMS) break;
              }
            }
          }
        }
      }

      // If still empty (e.g. user just signed up), pick latest general concepts so they can train
      if (candidateConceptIds.length === 0) {
        const { data: recentConcepts } = await supabase
          .from('concepts')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(MAX_SESSION_ITEMS);
        if (recentConcepts) {
          candidateConceptIds = recentConcepts.map((c) => c.id);
        }
      }

      if (candidateConceptIds.length > 0) {
        // Fetch full concept records
        const { data: conceptsData } = await supabase
          .from('concepts')
          .select('id, course_id, module_id, name, summary, start_sec, end_sec, metadata, courses(id, youtube_url, video_title)')
          .in('id', candidateConceptIds);

        // Fetch associated diagnostic questions
        const { data: questionsData } = await supabase
          .from('concept_questions')
          .select('id, concept_id, prompt, options, correct_answer, explanation')
          .in('concept_id', candidateConceptIds);

        const questionMap = new Map(questionsData?.map((q) => [q.concept_id, q]) || []);

        if (conceptsData) {
          for (const c of conceptsData) {
            const mastery = masteryMap.get(c.id);
            const q = questionMap.get(c.id);
            const checkQ = (c.metadata as any)?.check_question;
            const course = (c as any).courses;

            // Resolve question prompt and options
            const prompt = q?.prompt || checkQ?.question || `What is the core principle governing ${c.name}?`;
            let options: string[] = [];
            if (q?.options && Array.isArray(q.options) && q.options.length > 0) {
              options = q.options;
            } else if (checkQ?.options && Array.isArray(checkQ.options) && checkQ.options.length > 0) {
              options = checkQ.options;
            } else {
              options = [
                c.summary || 'Fundamental functional mechanism as demonstrated in this lesson.',
                'Superficial syntax pattern without operational consequence.',
                'Alternative legacy standard deprecated in modern releases.',
                'External dependency required for global execution.',
              ];
            }

            const correctAnswer =
              q?.correct_answer ||
              (checkQ && typeof checkQ.correct_answer_index === 'number'
                ? checkQ.options[checkQ.correct_answer_index]
                : options[0]);

            const explanation =
              q?.explanation ||
              checkQ?.explanation ||
              c.summary ||
              'Review the corresponding timestamp segment to reinforce this concept.';

            items.push({
              concept_id: c.id,
              concept_name: c.name,
              concept_summary: c.summary || undefined,
              start_sec: Number(c.start_sec || 0),
              end_sec: Number(c.end_sec || 60),
              course_id: c.course_id,
              video_url: course?.youtube_url || '',
              video_title: course?.video_title || 'Dojo Master Lesson',
              question_id: q?.id || undefined,
              question: prompt,
              options,
              correct_answer: correctAnswer,
              explanation,
              current_mastery: mastery ? Number(mastery.mastery_score) : 0,
              ease_factor: mastery ? Number(mastery.ease_factor) : 2.5,
              interval_days: mastery ? Number(mastery.interval_days) : 1,
              repetitions: mastery ? Number(mastery.repetitions) : 0,
              is_new: !mastery,
            });
          }
        }
      }
    } else {
      // 2. Branch B: Guest / Unauthenticated Operative (Provide exploration demo session)
      const { data: demoConcepts } = await supabase
        .from('concepts')
        .select('id, course_id, module_id, name, summary, start_sec, end_sec, metadata, courses(id, youtube_url, video_title)')
        .limit(MAX_SESSION_ITEMS);

      if (demoConcepts && demoConcepts.length > 0) {
        const demoIds = demoConcepts.map((c) => c.id);
        const { data: questionsData } = await supabase
          .from('concept_questions')
          .select('id, concept_id, prompt, options, correct_answer, explanation')
          .in('concept_id', demoIds);

        const questionMap = new Map(questionsData?.map((q) => [q.concept_id, q]) || []);

        for (const c of demoConcepts) {
          const q = questionMap.get(c.id);
          const checkQ = (c.metadata as any)?.check_question;
          const course = (c as any).courses;

          const prompt = q?.prompt || checkQ?.question || `What is the core principle governing ${c.name}?`;
          let options: string[] = [];
          if (q?.options && Array.isArray(q.options) && q.options.length > 0) {
            options = q.options;
          } else if (checkQ?.options && Array.isArray(checkQ.options) && checkQ.options.length > 0) {
            options = checkQ.options;
          } else {
            options = [
              c.summary || 'Fundamental functional mechanism as demonstrated in this lesson.',
              'Superficial syntax pattern without operational consequence.',
              'Alternative legacy standard deprecated in modern releases.',
              'External dependency required for global execution.',
            ];
          }

          const correctAnswer =
            q?.correct_answer ||
            (checkQ && typeof checkQ.correct_answer_index === 'number'
              ? checkQ.options[checkQ.correct_answer_index]
              : options[0]);

          items.push({
            concept_id: c.id,
            concept_name: c.name,
            concept_summary: c.summary || undefined,
            start_sec: Number(c.start_sec || 0),
            end_sec: Number(c.end_sec || 60),
            course_id: c.course_id,
            video_url: course?.youtube_url || '',
            video_title: course?.video_title || 'Dojo Master Lesson',
            question_id: q?.id || undefined,
            question: prompt,
            options,
            correct_answer: correctAnswer,
            explanation: q?.explanation || checkQ?.explanation || c.summary,
            current_mastery: 0,
            ease_factor: 2.5,
            interval_days: 1,
            repetitions: 0,
            is_new: true,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      items,
      totalDue: items.length,
      isGuest: !userId,
    });
  } catch (err: any) {
    console.error('Dojo session retrieval error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to assemble Dojo session.' },
      { status: 500 }
    );
  }
}

