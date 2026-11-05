use base64::{engine::general_purpose::STANDARD, Engine as _};
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

const INBOX_REL: &str = "DropBuddy/inbox";
const SCAN_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "tif", "tiff", "pdf"];

struct InboxState {
  watcher: Mutex<Option<RecommendedWatcher>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InboxFile {
  name: String,
  path: String,
  modified_ms: u64,
  size: u64,
}

fn inbox_dir() -> Result<PathBuf, String> {
  let home = dirs::home_dir().ok_or_else(|| "Could not resolve home directory".to_string())?;
  Ok(home.join(INBOX_REL))
}

fn ensure_inbox_dir() -> Result<PathBuf, String> {
  let dir = inbox_dir()?;
  fs::create_dir_all(&dir).map_err(|e| format!("Failed to create inbox: {e}"))?;
  Ok(dir)
}

fn is_scan_file(path: &Path) -> bool {
  path
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| SCAN_EXTENSIONS.iter().any(|ok| e.eq_ignore_ascii_case(ok)))
    .unwrap_or(false)
}

fn file_to_inbox(path: &Path) -> Option<InboxFile> {
  if !path.is_file() || !is_scan_file(path) {
    return None;
  }
  let meta = fs::metadata(path).ok()?;
  let modified_ms = meta
    .modified()
    .ok()
    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
    .map(|d| d.as_millis() as u64)
    .unwrap_or(0);
  Some(InboxFile {
    name: path.file_name()?.to_string_lossy().into_owned(),
    path: path.to_string_lossy().into_owned(),
    modified_ms,
    size: meta.len(),
  })
}

#[tauri::command]
fn ensure_inbox() -> Result<String, String> {
  let dir = ensure_inbox_dir()?;
  Ok(dir.to_string_lossy().into_owned())
}

#[tauri::command]
fn list_inbox_files() -> Result<Vec<InboxFile>, String> {
  let dir = ensure_inbox_dir()?;
  let mut files = Vec::new();
  for entry in fs::read_dir(&dir).map_err(|e| format!("Failed to read inbox: {e}"))? {
    let entry = entry.map_err(|e| format!("Failed to read inbox entry: {e}"))?;
    if let Some(file) = file_to_inbox(&entry.path()) {
      files.push(file);
    }
  }
  files.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms));
  Ok(files)
}

#[tauri::command]
fn read_inbox_file(path: String) -> Result<String, String> {
  let dir = ensure_inbox_dir()?;
  let candidate = PathBuf::from(&path);
  let canonical = candidate
    .canonicalize()
    .map_err(|e| format!("Invalid scan path: {e}"))?;
  let inbox_canonical = dir
    .canonicalize()
    .map_err(|e| format!("Invalid inbox path: {e}"))?;
  if !canonical.starts_with(&inbox_canonical) {
    return Err("Scan path must be inside the DropBuddy inbox".into());
  }
  if !is_scan_file(&canonical) {
    return Err("Unsupported scan file type".into());
  }
  let bytes = fs::read(&canonical).map_err(|e| format!("Failed to read scan: {e}"))?;
  let mime = match canonical
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("")
    .to_ascii_lowercase()
    .as_str()
  {
    "png" => "image/png",
    "webp" => "image/webp",
    "tif" | "tiff" => "image/tiff",
    "pdf" => "application/pdf",
    _ => "image/jpeg",
  };
  Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

#[tauri::command]
fn open_inbox_folder() -> Result<String, String> {
  let dir = ensure_inbox_dir()?;
  Command::new("open")
    .arg(&dir)
    .status()
    .map_err(|e| format!("Failed to open inbox: {e}"))?;
  Ok(dir.to_string_lossy().into_owned())
}

/// Opens macOS Image Capture so the user can run the ES-50.
/// (DropBuddy watches the inbox; it does not drive the USB scanner itself.)
#[tauri::command]
fn open_scanner_app() -> Result<String, String> {
  let _ = ensure_inbox_dir()?;
  // Prefer Image Capture — Epson Scan 2 on this machine installs as an ICA device (ES017E),
  // not a standalone "Epson Scan 2.app".
  let status = Command::new("open")
    .arg("-a")
    .arg("Image Capture")
    .status()
    .map_err(|e| format!("Failed to open Image Capture: {e}"))?;
  if !status.success() {
    return Err("Image Capture did not launch successfully".into());
  }
  Ok("Opened Image Capture — select Epson ES-50, set destination to ~/DropBuddy/inbox, then Scan".into())
}

fn start_inbox_watcher(app: AppHandle, state: &InboxState) -> Result<(), String> {
  let dir = ensure_inbox_dir()?;
  let app_for_watch = app.clone();
  let mut watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
    match res {
      Ok(event) => {
        let interesting = matches!(
          event.kind,
          EventKind::Create(_) | EventKind::Modify(_) | EventKind::Any
        );
        if !interesting {
          return;
        }
        for path in event.paths {
          if let Some(file) = file_to_inbox(&path) {
            let _ = app_for_watch.emit("inbox://file", file);
          }
        }
      }
      Err(err) => log::warn!("inbox watcher error: {err}"),
    }
  })
  .map_err(|e| format!("Failed to create inbox watcher: {e}"))?;

  watcher
    .watch(&dir, RecursiveMode::NonRecursive)
    .map_err(|e| format!("Failed to watch inbox: {e}"))?;

  *state.watcher.lock().map_err(|_| "Watcher lock poisoned")? = Some(watcher);
  let _ = app.emit("inbox://ready", dir.to_string_lossy().to_string());
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(InboxState {
      watcher: Mutex::new(None),
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let handle = app.handle().clone();
      let state = app.state::<InboxState>();
      if let Err(err) = start_inbox_watcher(handle, &state) {
        log::error!("inbox watcher setup failed: {err}");
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      ensure_inbox,
      list_inbox_files,
      read_inbox_file,
      open_inbox_folder,
      open_scanner_app
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
