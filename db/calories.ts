import { getDb } from './database';

export interface CalorieEntry {
  id: number;
  date: string; // YYYY-MM-DD
  photo_uri: string | null;
  text_input: string | null;
  food_name: string;
  status: 'processing' | 'completed';
  ingredients: string; // JSON array of strings
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  created_at: string;
}

export async function getCalorieEntries(): Promise<CalorieEntry[]> {
  const db = await getDb();
  return await db.getAllAsync<CalorieEntry>('SELECT * FROM calorie_entries ORDER BY date DESC, id DESC');
}

export async function getCalorieEntriesByDate(date: string): Promise<CalorieEntry[]> {
  const db = await getDb();
  return await db.getAllAsync<CalorieEntry>('SELECT * FROM calorie_entries WHERE date = ? ORDER BY id DESC', [date]);
}

export async function addCalorieEntry(entry: Omit<CalorieEntry, 'id' | 'created_at'>): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO calorie_entries (date, photo_uri, text_input, food_name, status, ingredients, calories, protein, fat, carbohydrates)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.date,
      entry.photo_uri,
      entry.text_input,
      entry.food_name,
      entry.status,
      entry.ingredients,
      entry.calories,
      entry.protein,
      entry.fat,
      entry.carbohydrates
    ]
  );
  return result.lastInsertRowId;
}

export async function updateCalorieEntry(id: number, entry: Partial<CalorieEntry>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(entry).forEach(([key, val]) => {
    fields.push(`${key} = ?`);
    values.push(val);
  });
  
  if (fields.length === 0) return;
  
  values.push(id);
  await db.runAsync(
    `UPDATE calorie_entries SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteCalorieEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM calorie_entries WHERE id = ?', [id]);
}

export async function getCalorieStatsForDate(date: string): Promise<{
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    total_calories: number | null;
    total_protein: number | null;
    total_fat: number | null;
    total_carbs: number | null;
  }>(
    `SELECT 
      SUM(calories) as total_calories,
      SUM(protein) as total_protein,
      SUM(fat) as total_fat,
      SUM(carbohydrates) as total_carbs
     FROM calorie_entries 
     WHERE date = ? AND status = 'completed'`,
    [date]
  );
  
  return {
    calories: row?.total_calories || 0,
    protein: row?.total_protein || 0,
    fat: row?.total_fat || 0,
    carbohydrates: row?.total_carbs || 0,
  };
}

export async function getCalorieDatesWithIntake(): Promise<{ date: string; calories: number }[]> {
  const db = await getDb();
  return await db.getAllAsync<{ date: string; calories: number }>(
    `SELECT date, SUM(calories) as calories 
     FROM calorie_entries 
     WHERE status = 'completed' 
     GROUP BY date`
  );
}
