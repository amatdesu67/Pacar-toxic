import { prisma } from '@/lib/prisma';
import type { GoalWithProgress } from '@/lib/types';

export async function getGoalsWithProgress(
  userId: string,
  days: number = 7,
): Promise<GoalWithProgress[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const goals = await prisma.goal.findMany({
    where: { userId },
    include: {
      progressLogs: {
        where: { completedAt: { gte: since } },
      },
    },
  });

  return goals.map((goal) => {
    // Unique dates yang ada completionnya (format YYYY-MM-DD)
    const completedDates = [
      ...new Set(
        goal.progressLogs.map((log) =>
          new Date(log.completedAt).toISOString().slice(0, 10),
        ),
      ),
    ].sort();

    // Hitung streak saat ini (hari berturut-turut dari hari ini ke belakang)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days + 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (!completedDates.includes(dateStr)) break;
      streak++;
    }

    return {
      id: goal.id,
      title: goal.title,
      completedDates,
      completionsLast7Days: completedDates.length,
      currentStreak: streak,
    };
  });
}

// Nilai 0-1: seberapa konsisten user menyelesaikan goals (7 hari terakhir)
export function calculateStreakScore(goals: GoalWithProgress[]): number {
  if (goals.length === 0) return 0;
  const totalPossible = goals.length * 7;
  const totalDone = goals.reduce((sum, g) => sum + g.completionsLast7Days, 0);
  return Math.min(totalDone / totalPossible, 1);
}

export function formatProgressText(goals: GoalWithProgress[]): string {
  if (goals.length === 0) return 'Belum ada goals yang di-tracking.';
  return goals
    .map((g) => `• ${g.title}: ${g.completionsLast7Days}/7 hari terselesaikan`)
    .join('\n');
}

export function formatStreakText(goals: GoalWithProgress[]): string {
  if (goals.length === 0) return 'Belum ada data streak.';
  return goals
    .map((g) =>
      g.currentStreak > 0
        ? `• ${g.title}: 🔥 ${g.currentStreak} hari streak`
        : `• ${g.title}: streak 0 hari (belum mulai hari ini)`,
    )
    .join('\n');
}
