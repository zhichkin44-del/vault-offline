use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

use tauri::Manager;

const VAULT_FILE: &str = "vault.vault";
const BACKUP_FILE: &str = "vault.vault.bak";
const TEMP_FILE: &str = "vault.vault.tmp";
const MAGIC: &str = "VAULTY1\n";
const MAX_SIZE: usize = 64 * 1024 * 1024;

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

fn read_opt(path: &Path) -> Result<Option<String>, String> {
    match fs::read_to_string(path) {
        Ok(s) if s.is_empty() => Ok(None),
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Writes the vault so that a crash or power loss never leaves a half-written
/// file: data goes to a temp file, is flushed to disk, the current file is kept
/// as `.bak`, and only then the temp file replaces it.
pub fn write_atomic(dir: &Path, data: &str) -> Result<(), String> {
    if !data.starts_with(MAGIC) {
        return Err("invalid-vault-format".into());
    }
    if data.len() > MAX_SIZE {
        return Err("vault-too-large".into());
    }
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let main = dir.join(VAULT_FILE);
    let tmp = dir.join(TEMP_FILE);
    {
        let mut f = File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    if main.exists() {
        fs::copy(&main, dir.join(BACKUP_FILE)).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &main).map_err(|e| e.to_string())
}

pub fn read_vault(dir: &Path, which: &str) -> Result<Option<String>, String> {
    let name = match which {
        "main" => VAULT_FILE,
        "backup" => BACKUP_FILE,
        _ => return Err("unknown-file".into()),
    };
    read_opt(&dir.join(name))
}

#[tauri::command]
fn vault_exists(app: tauri::AppHandle) -> Result<bool, String> {
    let dir = data_dir(&app)?;
    Ok(dir.join(VAULT_FILE).exists() || dir.join(BACKUP_FILE).exists())
}

#[tauri::command]
fn vault_read(app: tauri::AppHandle, which: String) -> Result<Option<String>, String> {
    read_vault(&data_dir(&app)?, &which)
}

#[tauri::command]
fn vault_write(app: tauri::AppHandle, data: String) -> Result<(), String> {
    write_atomic(&data_dir(&app)?, &data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![vault_exists, vault_read, vault_write])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("vault-test-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&d);
        d
    }

    #[test]
    fn writes_and_reads_back() {
        let d = temp_dir("rw");
        write_atomic(&d, "VAULTY1\n{\"a\":1}").unwrap();
        assert_eq!(read_vault(&d, "main").unwrap().as_deref(), Some("VAULTY1\n{\"a\":1}"));
        assert_eq!(read_vault(&d, "backup").unwrap(), None);
        assert!(!d.join(TEMP_FILE).exists());
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn keeps_previous_version_as_backup() {
        let d = temp_dir("bak");
        write_atomic(&d, "VAULTY1\none").unwrap();
        write_atomic(&d, "VAULTY1\ntwo").unwrap();
        assert_eq!(read_vault(&d, "main").unwrap().as_deref(), Some("VAULTY1\ntwo"));
        assert_eq!(read_vault(&d, "backup").unwrap().as_deref(), Some("VAULTY1\none"));
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn rejects_non_vault_data_and_unknown_files() {
        let d = temp_dir("bad");
        assert!(write_atomic(&d, "plaintext secrets").is_err());
        assert!(!d.join(VAULT_FILE).exists());
        assert!(read_vault(&d, "../etc/passwd").is_err());
        let _ = fs::remove_dir_all(&d);
    }
}
