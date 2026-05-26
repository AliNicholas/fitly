import { getDb } from './database';

export interface Exercise {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  description: string | null;
  link: string | null;
}

export async function getExercises(): Promise<Exercise[]> {
  const db = await getDb();
  return await db.getAllAsync<Exercise>(`
    SELECT e.*, c.name as category_name 
    FROM exercises e 
    JOIN categories c ON e.category_id = c.id 
    ORDER BY e.name
  `);
}

export async function addExercise(
  name: string,
  category_id: number,
  description?: string | null,
  link?: string | null
): Promise<Exercise> {
  if (!name.trim() || !category_id) {
    throw new Error('Name and category_id are required');
  }
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO exercises (name, category_id, description, link) VALUES (?, ?, ?, ?)',
    [name.trim(), category_id, description || null, link || null]
  );
  return {
    id: result.lastInsertRowId,
    name: name.trim(),
    category_id,
    description: description || null,
    link: link || null
  };
}

export async function updateExercise(
  id: number,
  name: string,
  category_id: number,
  description?: string | null,
  link?: string | null
): Promise<Exercise> {
  if (!id || !name.trim() || !category_id) {
    throw new Error('id, name, and category_id are required');
  }
  const db = await getDb();
  await db.runAsync(
    'UPDATE exercises SET name = ?, category_id = ?, description = ?, link = ? WHERE id = ?',
    [name.trim(), category_id, description || null, link || null, id]
  );
  return {
    id,
    name: name.trim(),
    category_id,
    description: description || null,
    link: link || null
  };
}

export async function deleteExercise(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}
