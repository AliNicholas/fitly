import { getDb } from './database';

export interface FavoriteExercise {
  id: number;
  name: string;
  category_name: string | null;
  log_count: number;
  max_reps: number | null;
  max_weight: number | null;
}

export interface DashboardStats {
  sessionCount: number;
  exerciseCount: number;
  activeDates: string[];
  currentStreak: number;
  favoriteExercises: FavoriteExercise[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();

  const sessionRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sessions');
  const sessionCount = sessionRes?.count || 0;

  const exerciseRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  const exerciseCount = exerciseRes?.count || 0;

  const favoriteExercises = await db.getAllAsync<FavoriteExercise>(`
    SELECT e.id, e.name, c.name as category_name, COUNT(se.id) as log_count, MAX(se.reps) as max_reps, MAX(se.weight) as max_weight
    FROM exercises e
    JOIN session_exercises se ON e.id = se.exercise_id
    LEFT JOIN categories c ON e.category_id = c.id
    GROUP BY e.id
    ORDER BY log_count DESC, e.name ASC
  `);

  const dateRows = await db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM sessions');
  const activeDates = dateRows.map((r) => r.date);

  const currentStreak = calculateCurrentStreak(activeDates);

  return {
    sessionCount,
    exerciseCount,
    activeDates,
    currentStreak,
    favoriteExercises
  };
}

function calculateCurrentStreak(activeDates: string[]): number {
  const todayKey = formatDateKey(new Date());
  const yesterday = parseDateKey(todayKey);

  if (!yesterday) {
    return 0;
  }

  yesterday.setDate(yesterday.getDate() - 1);

  const activeDateSet = new Set(
    activeDates.filter((date) => parseDateKey(date) && date <= todayKey)
  );

  let cursor = activeDateSet.has(todayKey)
    ? todayKey
    : activeDateSet.has(formatDateKey(yesterday))
      ? formatDateKey(yesterday)
      : null;
  let streak = 0;

  while (cursor && activeDateSet.has(cursor)) {
    streak++;
    const previousDate = parseDateKey(cursor);

    if (!previousDate) {
      break;
    }

    previousDate.setDate(previousDate.getDate() - 1);
    cursor = formatDateKey(previousDate);
  }

  return streak;
}

function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
