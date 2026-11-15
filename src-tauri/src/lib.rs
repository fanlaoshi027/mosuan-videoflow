use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
struct CatalogEntry {
    page: String,
    question: String,
    title: String,
}

#[derive(Serialize)]
struct FileEntry {
    name: String,
    path: String,
    size: u64,
}

#[derive(Serialize)]
struct ScanResult {
    files: Vec<FileEntry>,
    skipped: usize,
    truncated: bool,
}

fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("videoflow.sqlite"))
}

fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS catalog (
           course TEXT NOT NULL,
           page TEXT NOT NULL,
           question TEXT NOT NULL,
           title TEXT NOT NULL,
           PRIMARY KEY(course, page, question)
         );
         CREATE INDEX IF NOT EXISTS idx_catalog_course_page ON catalog(course,page);",
    ).map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
fn save_catalog(app: tauri::AppHandle, course: String, entries: Vec<CatalogEntry>) -> Result<usize, String> {
    if course.trim().is_empty() { return Err("课程名称不能为空".into()); }
    let mut conn = open_db(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM catalog WHERE course=?1", params![course]).map_err(|e| e.to_string())?;
    let mut count = 0;
    for e in entries {
        if e.page.trim().is_empty() || e.title.trim().is_empty() { continue; }
        tx.execute("INSERT INTO catalog(course,page,question,title) VALUES (?1,?2,?3,?4)",
            params![course,e.page,e.question,e.title]).map_err(|e| e.to_string())?;
        count += 1;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
fn load_catalog(app: tauri::AppHandle, course: String) -> Result<Vec<CatalogEntry>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn.prepare("SELECT page,question,title FROM catalog WHERE course=?1 ORDER BY page,question")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![course], |r| Ok(CatalogEntry {
        page: r.get(0)?, question: r.get(1)?, title: r.get(2)?
    })).map_err(|e| e.to_string())?;
    rows.map(|r| r.map_err(|e| e.to_string())).collect()
}

// Read-only scan: only filenames and basic metadata; never opens video streams.
#[tauri::command]
async fn scan_folder(folder: String) -> Result<ScanResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = std::path::Path::new(&folder);
        if !root.is_dir() { return Err("文件夹不可访问（NAS 可能已断开）".into()); }
        let mut output = Vec::new();
        let mut skipped = 0usize;
        let mut truncated = false;
        let entries = std::fs::read_dir(root).map_err(|e| e.to_string())?;
        for item in entries {
            let item = match item { Ok(item) => item, Err(_) => { skipped += 1; continue; } };
            let path = item.path();
            let ext = path.extension().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase();
            if !["mp4", "mov", "mkv", "m4v", "avi"].contains(&ext.as_str()) { continue; }
            let metadata = match item.metadata() { Ok(meta) => meta, Err(_) => { skipped += 1; continue; } };
            if !metadata.is_file() { continue; }
            output.push(FileEntry {
                name: item.file_name().to_string_lossy().into_owned(),
                path: path.to_string_lossy().into_owned(),
                size: metadata.len()
            });
            if output.len() >= 100_000 { truncated = true; break; }
        }
        output.sort_unstable_by(|a, b| a.name.cmp(&b.name));
        Ok(ScanResult { files: output, skipped, truncated })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn app_version() -> &'static str { env!("CARGO_PKG_VERSION") }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_version, save_catalog, load_catalog, scan_folder])
        .run(tauri::generate_context!())
        .expect("failed to start VideoFlow");
}
