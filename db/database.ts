import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('fitly.db');
  }
  return dbInstance;
}

export async function runWriteTransaction(
  task: (tx: SQLite.SQLiteDatabase) => Promise<void>
): Promise<void> {
  const db = await getDb();

  if (Platform.OS === 'web') {
    await db.withTransactionAsync(() => task(db));
    return;
  }

  await db.withExclusiveTransactionAsync(task);
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

  await ensureColumn(db, 'exercises', 'description', 'description TEXT');
  await ensureColumn(db, 'exercises', 'link', 'link TEXT');
  await ensureColumn(db, 'session_exercises', 'is_time', 'is_time INTEGER DEFAULT 0');
  await ensureColumn(db, 'session_exercises', 'order', '"order" INTEGER');

  // Seed default categories if none exist
  try {
    const countRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
    if (!countRes || countRes.count === 0) {
      await db.execAsync(`
        INSERT INTO categories (name) VALUES 
        ('Chest'), ('Back'), ('Legs'), ('Shoulders'), ('Arms'), ('Core'), ('Cardio');
      `);
    }
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);

  if (!columns.some((column) => column.name === columnName)) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
  }
}
