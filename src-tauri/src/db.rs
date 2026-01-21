use rusqlite::{params, Connection, Result};
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

pub fn init_db() -> Result<Connection> {
    let conn = Connection::open_in_memory()?;
    
    // Create FTS5 table
    conn.execute(
        "CREATE VIRTUAL TABLE dictionary USING fts5(word, definition)",
        [],
    )?;

    // Insert expanded dataset
    let entries = vec![
        ("Bank", "An institution for receiving, lending, exchanging, and safeguarding money."),
        ("Bank", "The land beside a body of water, such as a river."),
        ("Trace-based", "A method of optimization that uses execution traces to identify hot code paths."),
        ("Just-in-Time", "A method of executing computer code that involves compilation during execution rather than prior to execution."),
        ("Specialization", "The process of tailoring code for specific types or values to improve performance."),
        ("Dynamic", "Characterized by constant change, activity, or progress; in computing, referring to processes that occur during execution."),
        ("Compiler", "A program that translates source code into machine code or bytecode."),
        ("Interpreter", "A program that executes instructions directly without prior compilation."),
        ("Heuristic", "A technique designed for solving a problem more quickly when classic methods are too slow."),
        ("Deterministic", "A process that, given a particular input, will always produce the same output."),
        ("Optimization", "The action of making the best or most effective use of a resource."),
        ("Virtual Machine", "An emulation of a computer system providing the functionality of a physical computer."),
        ("Bytecode", "A form of instruction set designed for efficient execution by a software interpreter."),
        ("Type", "A category for a piece of data that determines what operations can be performed on it."),
        ("Pointer", "A variable that stores the memory address of another value."),
        ("Allocation", "The process of reserving a block of memory for data."),
        ("Garbage Collection", "Automatic memory management that reclaims space used by objects no longer in use."),
        ("Latency", "The time interval between a cause and its effect in a system."),
        ("Throughput", "The amount of data or processes handled within a specific period."),
    ];

    for (word, def) in entries {
        conn.execute(
            "INSERT INTO dictionary (word, definition) VALUES (?, ?)",
            params![word, def],
        )?;
    }

    Ok(conn)
}

#[tauri::command]
pub fn search_dictionary(word: &str, state: tauri::State<DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT definition FROM dictionary WHERE word MATCH ?")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map(params![word], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(results)
}
