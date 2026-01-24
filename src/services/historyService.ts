// History service with fallback to localStorage when SQLite is unavailable

export interface HistoryEntry {
    id?: number;
    file_id: string;
    query_text: string;
    ai_response_json: string;
    timestamp: number;
}

const STORAGE_KEY = 'neura_ai_history';

// Get all history from localStorage
const getLocalHistory = (): HistoryEntry[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

// Save all history to localStorage
const saveLocalHistory = (entries: HistoryEntry[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
        console.error('Failed to save to localStorage:', err);
    }
};

// Check if Tauri SQL is available
let sqlAvailable: boolean | null = null;
let db: any = null;

const checkSqlAvailable = async (): Promise<boolean> => {
    if (sqlAvailable !== null) return sqlAvailable;

    if (!(window as any).__TAURI__) {
        sqlAvailable = false;
        return false;
    }

    try {
        const Database = (await import('@tauri-apps/plugin-sql')).default;
        db = await Database.load('sqlite:neura_analysis.db');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS ai_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id TEXT NOT NULL,
                query_text TEXT NOT NULL,
                ai_response_json TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
        `);
        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_file_id ON ai_history(file_id)
        `);
        sqlAvailable = true;
        console.log('SQLite database initialized successfully');
        return true;
    } catch (err) {
        console.warn('SQLite not available, falling back to localStorage:', err);
        sqlAvailable = false;
        return false;
    }
};

export const initHistoryDb = async () => {
    await checkSqlAvailable();
};

export const saveHistoryEntry = async (entry: Omit<HistoryEntry, 'id'>) => {
    console.log('Saving history entry:', entry.query_text.substring(0, 50));

    const useSql = await checkSqlAvailable();

    if (useSql && db) {
        try {
            await db.execute(
                'INSERT INTO ai_history (file_id, query_text, ai_response_json, timestamp) VALUES ($1, $2, $3, $4)',
                [entry.file_id, entry.query_text, entry.ai_response_json, entry.timestamp]
            );
            console.log('Entry saved to SQLite');
        } catch (err) {
            console.error('SQLite save failed, falling back to localStorage:', err);
            const entries = getLocalHistory();
            entries.unshift({ ...entry, id: Date.now() });
            saveLocalHistory(entries);
        }
    } else {
        const entries = getLocalHistory();
        entries.unshift({ ...entry, id: Date.now() });
        saveLocalHistory(entries);
        console.log('Entry saved to localStorage');
    }
};

export const getHistoryForFile = async (fileId: string): Promise<HistoryEntry[]> => {
    console.log('Getting history for file:', fileId);

    const useSql = await checkSqlAvailable();

    if (useSql && db) {
        try {
            const result = await db.select(
                'SELECT * FROM ai_history WHERE file_id = $1 ORDER BY timestamp DESC',
                [fileId]
            ) as HistoryEntry[];
            console.log('Fetched from SQLite:', result.length, 'entries');
            return result;
        } catch (err) {
            console.error('SQLite fetch failed, falling back to localStorage:', err);
        }
    }

    const entries = getLocalHistory().filter(e => e.file_id === fileId);
    console.log('Fetched from localStorage:', entries.length, 'entries');
    return entries;
};

// Get all history (for debugging)
export const getAllHistory = async (): Promise<HistoryEntry[]> => {
    const useSql = await checkSqlAvailable();

    if (useSql && db) {
        try {
            return await db.select(
                'SELECT * FROM ai_history ORDER BY timestamp DESC'
            ) as HistoryEntry[];
        } catch (err) {
            console.error('SQLite fetch all failed:', err);
        }
    }

    return getLocalHistory();
};
