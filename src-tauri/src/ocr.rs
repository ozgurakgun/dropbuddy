use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

const SCAN_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "tif", "tiff", "pdf"];

fn inbox_dir() -> Result<PathBuf, String> {
  let home = dirs::home_dir().ok_or_else(|| "Could not resolve home directory".to_string())?;
  Ok(home.join("DropBuddy/inbox"))
}

fn assert_inbox_path(path: &Path) -> Result<PathBuf, String> {
  let dir = inbox_dir()?
    .canonicalize()
    .map_err(|e| format!("Invalid inbox path: {e}"))?;
  let canonical = path
    .canonicalize()
    .map_err(|e| format!("Invalid scan path: {e}"))?;
  if !canonical.starts_with(&dir) {
    return Err("OCR path must be inside the DropBuddy inbox".into());
  }
  let ext_ok = canonical
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| SCAN_EXTENSIONS.iter().any(|ok| e.eq_ignore_ascii_case(ok)))
    .unwrap_or(false);
  if !ext_ok {
    return Err("Unsupported scan file type for OCR".into());
  }
  Ok(canonical)
}

fn run_checked(cmd: &mut Command, label: &str) -> Result<String, String> {
  let output = cmd
    .output()
    .map_err(|e| format!("Failed to run {label}: {e}"))?;
  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr);
    return Err(format!("{label} failed: {stderr}"));
  }
  Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn render_pdf_pages(pdf: &Path, work: &Path) -> Result<Vec<PathBuf>, String> {
  fs::create_dir_all(work).map_err(|e| format!("Failed to create OCR work dir: {e}"))?;
  let prefix = work.join("page");
  run_checked(
    Command::new("pdftoppm")
      .args(["-png", "-r", "200"])
      .arg(pdf)
      .arg(&prefix),
    "pdftoppm",
  )?;
  let mut pages = Vec::new();
  for entry in fs::read_dir(work).map_err(|e| format!("Failed to read OCR work dir: {e}"))? {
    let entry = entry.map_err(|e| format!("Failed to read OCR page: {e}"))?;
    let path = entry.path();
    if path
      .extension()
      .and_then(|e| e.to_str())
      .is_some_and(|e| e.eq_ignore_ascii_case("png"))
    {
      pages.push(path);
    }
  }
  pages.sort();
  if pages.is_empty() {
    return Err("pdftoppm produced no pages".into());
  }
  Ok(pages)
}

fn tesseract_image(image: &Path) -> Result<(String, f32), String> {
  let text = run_checked(
    Command::new("tesseract")
      .arg(image)
      .arg("stdout")
      .args(["-l", "eng", "--psm", "6"]),
    "tesseract",
  )?;
  // Tesseract CLI doesn't always emit a single confidence; use a simple proxy.
  let confidence = if text.len() > 80 {
    0.75
  } else if text.len() > 20 {
    0.55
  } else {
    0.2
  };
  Ok((text, confidence))
}

/// Run local OCR (pdftoppm for PDFs + tesseract). Requires Homebrew tools on PATH.
pub fn ocr_inbox_file(path: &str) -> Result<(String, f32), String> {
  let canonical = assert_inbox_path(Path::new(path))?;
  let work = inbox_dir()?.join(".ocr-work");
  let images = if canonical
    .extension()
    .and_then(|e| e.to_str())
    .is_some_and(|e| e.eq_ignore_ascii_case("pdf"))
  {
    // Fresh work dir for this PDF to avoid stale pages.
    if work.exists() {
      let _ = fs::remove_dir_all(&work);
    }
    render_pdf_pages(&canonical, &work)?
  } else {
    vec![canonical]
  };

  let mut texts = Vec::new();
  let mut confidences = Vec::new();
  for image in images {
    let (text, conf) = tesseract_image(&image)?;
    if !text.is_empty() {
      texts.push(text);
      confidences.push(conf);
    }
  }
  if texts.is_empty() {
    return Err("OCR produced no text".into());
  }
  let avg_conf = confidences.iter().sum::<f32>() / confidences.len() as f32;
  Ok((texts.join("\n\n--- page break ---\n\n"), avg_conf))
}
