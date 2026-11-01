import { SupabaseClient } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
  total_xp: number;
}

/**
 * Calculates and updates user discipline streak upon login.
 * - Same day login: Maintains current streak.
 * - Consecutive day login (diff = 1 day): Increments streak by 1.
 * - Missed day (diff > 1 day): Resets streak to 1 for today's active day.
 */
export async function calculateAndUpdateStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, current_streak, longest_streak, last_login_date, total_xp')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.warn('Profile not found or fetch error:', error?.message);
      return null;
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD in UTC

    let newStreak = profile.current_streak ?? 0;
    let newLongest = profile.longest_streak ?? 0;

    if (!profile.last_login_date) {
      // First recorded login
      newStreak = 1;
      newLongest = Math.max(1, newLongest);
    } else {
      const lastLoginStr = new Date(profile.last_login_date).toISOString().slice(0, 10);

      if (lastLoginStr !== todayStr) {
        const todayDate = new Date(todayStr).getTime();
        const lastLoginDate = new Date(lastLoginStr).getTime();
        const diffDays = Math.round((todayDate - lastLoginDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day login
          newStreak += 1;
        } else if (diffDays > 1) {
          // Missed one or more days: reset streak to 1 for the new day
          newStreak = 1;
        }

        if (newStreak > newLongest) {
          newLongest = newStreak;
        }
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_login_date: now.toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update user profile streak:', updateError);
      return profile;
    }

    return updated;
  } catch (err) {
    console.error('Streak calculation error:', err);
    return null;
  }
}

