mod db;

use db::{init_db, search_dictionary, DbState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = init_db().expect("failed to initialize database");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(DbState(std::sync::Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![search_dictionary])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
