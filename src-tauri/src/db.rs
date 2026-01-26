use rusqlite::{params, Connection, Result};
use serde::Deserialize;
use std::fs;
use std::sync::Mutex;
use tauri::Manager;

pub struct DbState(pub Mutex<Connection>);

#[derive(Deserialize)]
struct DictionaryEntry {
    word: String,
    definition: String,
}

#[derive(Deserialize)]
struct DictionaryData {
    words: Vec<DictionaryEntry>,
}

/// Initialize the database - loads from bundled dictionary.json
pub fn init_db(app_handle: Option<&tauri::AppHandle>) -> Result<Connection> {
    // Use persistent database in app data directory if available, otherwise in-memory
    let conn = if let Some(handle) = app_handle {
        if let Some(app_dir) = handle.path().app_data_dir().ok() {
            let _ = fs::create_dir_all(&app_dir);
            let db_path = app_dir.join("dictionary.db");
            Connection::open(&db_path)?
        } else {
            Connection::open_in_memory()?
        }
    } else {
        Connection::open_in_memory()?
    };

    // Create tables if they don't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS dictionary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL COLLATE NOCASE,
            definition TEXT NOT NULL
        )",
        [],
    )?;

    // Create index for faster lookups
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_word ON dictionary(word COLLATE NOCASE)",
        [],
    )?;

    // Check if dictionary is already populated
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM dictionary", [], |row| row.get(0))?;

    // If the dictionary has fewer than 2000 entries, assume it's the old/fallback one and reload
    if count < 2000 {
        println!(
            "Dictionary count is {}, reloading full dictionary...",
            count
        );
        conn.execute("DELETE FROM dictionary", [])?;
        load_dictionary_data(&conn, app_handle)?;
    }

    Ok(conn)
}

/// Load dictionary data from JSON file or use embedded fallback
fn load_dictionary_data(conn: &Connection, app_handle: Option<&tauri::AppHandle>) -> Result<()> {
    let mut loaded = false;

    // Try to load from bundled resource
    if let Some(handle) = app_handle {
        if let Ok(resource_path) = handle.path().resolve(
            "resources/dictionary.json",
            tauri::path::BaseDirectory::Resource,
        ) {
            if let Ok(json_content) = fs::read_to_string(&resource_path) {
                if let Ok(data) = serde_json::from_str::<DictionaryData>(&json_content) {
                    insert_entries(conn, &data.words)?;
                    loaded = true;
                    println!(
                        "Loaded {} dictionary entries from bundled file",
                        data.words.len()
                    );
                }
            }
        }
    }

    // Fallback to embedded data if bundled file not found
    if !loaded {
        let fallback_entries = get_fallback_entries();
        insert_entries(conn, &fallback_entries)?;
        println!(
            "Loaded {} fallback dictionary entries",
            fallback_entries.len()
        );
    }

    Ok(())
}

fn insert_entries(conn: &Connection, entries: &[DictionaryEntry]) -> Result<()> {
    for entry in entries {
        conn.execute(
            "INSERT INTO dictionary (word, definition) VALUES (?, ?)",
            params![entry.word.to_lowercase(), entry.definition],
        )?;
    }
    Ok(())
}

fn get_fallback_entries() -> Vec<DictionaryEntry> {
    vec![
        DictionaryEntry {
            word: "algorithm".to_string(),
            definition: "A step-by-step procedure for solving a problem.".to_string(),
        },
        DictionaryEntry {
            word: "api".to_string(),
            definition: "Application Programming Interface; protocols for building software."
                .to_string(),
        },
        DictionaryEntry {
            word: "array".to_string(),
            definition: "A data structure containing a collection of elements.".to_string(),
        },
        DictionaryEntry {
            word: "bank".to_string(),
            definition: "An institution for handling money; also, the land beside water."
                .to_string(),
        },
        DictionaryEntry {
            word: "boolean".to_string(),
            definition: "A data type with only two values: true or false.".to_string(),
        },
        DictionaryEntry {
            word: "buffer".to_string(),
            definition: "Temporary storage for data being transferred.".to_string(),
        },
        DictionaryEntry {
            word: "cache".to_string(),
            definition: "Storage for faster future data access.".to_string(),
        },
        DictionaryEntry {
            word: "class".to_string(),
            definition: "A blueprint for creating objects in OOP.".to_string(),
        },
        DictionaryEntry {
            word: "compiler".to_string(),
            definition: "A program that translates source code into machine code.".to_string(),
        },
        DictionaryEntry {
            word: "database".to_string(),
            definition: "An organized collection of structured data.".to_string(),
        },
        DictionaryEntry {
            word: "debug".to_string(),
            definition: "To find and fix errors in software.".to_string(),
        },
        DictionaryEntry {
            word: "function".to_string(),
            definition: "A reusable block of code that performs a task.".to_string(),
        },
        DictionaryEntry {
            word: "interpreter".to_string(),
            definition: "A program that executes instructions directly.".to_string(),
        },
        DictionaryEntry {
            word: "loop".to_string(),
            definition: "A construct that repeats a block of code.".to_string(),
        },
        DictionaryEntry {
            word: "memory".to_string(),
            definition: "Storage for data and instructions.".to_string(),
        },
        DictionaryEntry {
            word: "object".to_string(),
            definition: "An instance of a class with data and methods.".to_string(),
        },
        DictionaryEntry {
            word: "pointer".to_string(),
            definition: "A variable storing a memory address.".to_string(),
        },
        DictionaryEntry {
            word: "recursion".to_string(),
            definition: "A technique where a function calls itself.".to_string(),
        },
        DictionaryEntry {
            word: "string".to_string(),
            definition: "A sequence of characters representing text.".to_string(),
        },
        DictionaryEntry {
            word: "variable".to_string(),
            definition: "A named storage location for data.".to_string(),
        },
    ]
}

#[tauri::command]
pub fn search_dictionary(word: &str, state: tauri::State<DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().unwrap();
    let search_term = word.trim().to_lowercase();

    // First try exact match
    let mut stmt = conn
        .prepare("SELECT definition FROM dictionary WHERE word = ? COLLATE NOCASE")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![&search_term], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut results: Vec<String> = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }

    // If no exact match, try prefix match
    if results.is_empty() {
        let mut stmt = conn
            .prepare("SELECT definition FROM dictionary WHERE word LIKE ? COLLATE NOCASE LIMIT 3")
            .map_err(|e| e.to_string())?;

        let pattern = format!("{}%", search_term);
        let rows = stmt
            .query_map(params![&pattern], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;

        for row in rows {
            results.push(row.map_err(|e| e.to_string())?);
        }
    }

    Ok(results)
}
