use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn get_file_hash(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    let file_content = fs::read(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(file_content);
    let result = hasher.finalize();

    Ok(hex::encode(result))
}
