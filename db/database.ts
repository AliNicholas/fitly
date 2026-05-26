import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('fitly.db');
  }
  return dbInstance;
}

export async function initDb() {
  const db = await getDb();

  // Enable foreign keys and create tables
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      description TEXT,
      link TEXT,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS session_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight REAL,
      is_time INTEGER DEFAULT 0,
      "order" INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migrate existing tables
  try {
    await db.execAsync('ALTER TABLE session_exercises ADD COLUMN is_time INTEGER DEFAULT 0;');
    console.log('Migrated: added is_time column successfully.');
  } catch (e) {
    // Column already exists, ignore
  }

  // Seed default categories if none exist
  try {
    const countRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
    if (!countRes || countRes.count === 0) {
      await db.execAsync(`
        INSERT INTO categories (name) VALUES 
        ('Chest'), ('Back'), ('Legs'), ('Shoulders'), ('Arms'), ('Core'), ('Cardio');
      `);
      console.log('Seeded default categories successfully.');
    }
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
}
