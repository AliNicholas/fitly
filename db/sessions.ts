import { getDb } from './database';

export interface SessionExercise {
  id?: number;
  session_id?: number;
  exercise_id: number;
  name?: string;
  category_name?: string;
  sets: number | null;
  reps: number | null;
  weight: number | null; // null/0 indicates bodyweight (BW)
  order: number;
}

export interface Session {
  id: number;
  date: string;
  notes: string | null;
  exercises: SessionExercise[];
}

export async function getSessions(): Promise<Session[]> {
  const db = await getDb();
  const sessions = await db.getAllAsync<{ id: number; date: string; notes: string | null }>(
    'SELECT * FROM sessions ORDER BY date DESC, id DESC'
  );
  
  const populatedSessions: Session[] = [];

  for (const s of sessions) {
    const exercises = await db.getAllAsync<SessionExercise>(`
      SELECT se.*, e.name, c.name as category_name
      FROM session_exercises se
      JOIN exercises e ON se.exercise_id = e.id
      JOIN categories c ON e.category_id = c.id
      WHERE se.session_id = ?
      ORDER BY se."order" ASC
    `, [s.id]);

    populatedSessions.push({
      ...s,
      exercises
    });
  }

  return populatedSessions;
}

export async function addSession(
  date: string,
  notes: string | null,
  exercises: Omit<SessionExercise, 'order'>[]
): Promise<number> {
  if (!date) {
    throw new Error('Date is required');
  }

  const db = await getDb();
  let insertedSessionId = 0;

  await db.withTransactionAsync(async () => {
    const sessionResult = await db.runAsync(
      'INSERT INTO sessions (date, notes) VALUES (?, ?)',
      [date, notes || null]
    );
    insertedSessionId = sessionResult.lastInsertRowId;

    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await db.runAsync(
          'INSERT INTO session_exercises (session_id, exercise_id, sets, reps, weight, "order") VALUES (?, ?, ?, ?, ?, ?)',
          [
            insertedSessionId,
            ex.exercise_id,
            ex.sets || null,
            ex.reps || null,
            ex.weight !== null && ex.weight !== undefined && String(ex.weight) !== '' ? parseFloat(ex.weight.toString()) : null,
            i
          ]
        );
      }
    }
  });

  return insertedSessionId;
}

export async function updateSession(
  id: number,
  date: string,
  notes: string | null,
  exercises: Omit<SessionExercise, 'order'>[]
): Promise<void> {
  if (!id || !date) {
    throw new Error('id and date are required');
  }

  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE sessions SET date = ?, notes = ? WHERE id = ?', [date, notes || null, id]);
    
    // Delete old exercises and re-insert
    await db.runAsync('DELETE FROM session_exercises WHERE session_id = ?', [id]);
    
    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await db.runAsync(
          'INSERT INTO session_exercises (session_id, exercise_id, sets, reps, weight, "order") VALUES (?, ?, ?, ?, ?, ?)',
          [
            id,
            ex.exercise_id,
            ex.sets || null,
            ex.reps || null,
            ex.weight !== null && ex.weight !== undefined && String(ex.weight) !== '' ? parseFloat(ex.weight.toString()) : null,
            i
          ]
        );
      }
    }
  });
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM session_exercises WHERE session_id = ?', [id]);
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
  });
}
