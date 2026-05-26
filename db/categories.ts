import { getDb } from './database';

export interface Category {
  id: number;
  name: string;
  exercise_count: number;
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  return await db.getAllAsync<Category>(`
    SELECT c.*, COUNT(e.id) as exercise_count 
    FROM categories c 
    LEFT JOIN exercises e ON c.id = e.category_id 
    GROUP BY c.id 
    ORDER BY c.name
  `);
}

export async function addCategory(name: string): Promise<Category> {
  if (!name.trim()) {
    throw new Error('Category name is required');
  }
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO categories (name) VALUES (?)', [name.trim()]);
  return { id: result.lastInsertRowId, name: name.trim(), exercise_count: 0 };
}

export async function updateCategory(id: number, name: string): Promise<{ id: number; name: string }> {
  if (!name.trim()) {
    throw new Error('Category name is required');
  }
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [name.trim(), id]);
  return { id, name: name.trim() };
}

export interface DeleteCategoryResult {
  success?: boolean;
  warning?: boolean;
  exerciseCount?: number;
  message?: string;
}

export async function deleteCategory(id: number, force: boolean = false): Promise<DeleteCategoryResult> {
  const db = await getDb();

  // Check how many exercises use this category
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises WHERE category_id = ?', [id]);
  const exerciseCount = result?.count || 0;

  if (exerciseCount > 0) {
    if (!force) {
      return {
        warning: true,
        exerciseCount,
        message: `This category has ${exerciseCount} exercise(s). Deleting it will also remove those exercises.`
      };
    }
    // Force delete: remove exercises first (handled by ON DELETE CASCADE, but we make it explicit if needed)
    // The web app did an explicit delete, although SQLite's ON DELETE CASCADE will handle it too.
    await db.runAsync('DELETE FROM exercises WHERE category_id = ?', [id]);
  }

  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  return { success: true };
}
