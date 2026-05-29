# 🎬 Clinp The Clipper

**Cut multiple clips from a single video file – fast, with a retro terminal interface.**

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/tuusuario/Clinp-The-Clipper)](https://github.com/tuusuario/Clinp-The-Clipper/releases)
[![Build status](https://github.com/tuusuario/Clinp-The-Clipper/actions/workflows/build.yml/badge.svg)](https://github.com/tuusuario/Clinp-The-Clipper/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Clinp The Clipper** is a desktop application that lets you quickly cut multiple segments from a long video file using [FFmpeg](https://ffmpeg.org).  
It features a clean **TUI‑style interface** (terminal look) built with Python + PyWebView + Alpine.js, and is available for **Windows, Linux and macOS**.

![Screenshot placeholder](Logo-Clinp.png)

---

## ✨ Features

- 🎬 **Multi‑clip cutting** – define as many start/end points as you need.
- ⌨️ **Manual editing** – add, remove or reorder clips in the table.
- 📄 **Load from text file** – import time ranges from a simple `.txt` file (e.g. `01:30-02:45`).
- 🏷️ **Custom output naming** – set a base name; clips are saved as `base_1.mp4`, `base_2.mp4`, etc.
- ⚡ **Fast processing** – uses FFmpeg’s stream copy mode (`-c copy`), no re‑encoding.
- 📊 **Progress bar** – shows which clip is being processed and overall progress.
- 🌍 **Multi‑language** – interface available in **English, Spanish, French, Portuguese, Italian, German, Russian, Chinese, Japanese, Korean, Hindi, Polish and Dutch** (detected from your system or manually chosen).
- 💾 **Remembers your settings** – last used language is saved.
- 🧹 **Clear logs** – built‑in log panel with error highlighting.

---

## 🖥️ System requirements

- **OS**: Windows 7/10/11, Linux (with GTK3), macOS 10.13+
- **FFmpeg** must be installed and available in your `PATH`.  
  The app will guide you to install it automatically if missing (Windows: Chocolatey, macOS: Homebrew, Linux: package manager).

---

## 📥 Download & install

### Pre‑compiled executables (recommended)

Go to the **[Releases page](https://github.com/TuGatito/clinp-the-clipper/releases)** and download the package for your operating system:

| OS       | File name                          |
|----------|------------------------------------|
| Windows  | `ClinpClipper-Windows.zip`         |
| Linux    | `ClinpClipper-Linux.zip`               |
| macOS    | `ClinpClipper-macOS.zip`               |

After downloading:
- **Windows**: double‑click the `.exe`.
- **Linux**: make it executable `chmod +x ClinpClipper-Linux` and run it.
- **macOS**: right‑click the binary and select **Open** (first time only).

> ⚠️ The macOS version is **not signed** – you may see a security warning.  
> To run it, right‑click → **Open** → confirm.

---

## 🛠️ Usage

1. **Select source video** – click `📁 Select` and choose your video file.
2. **Choose output folder** – where the clips will be saved.
3. **Set base name** – all clips will be named `yourbase_1.mp4`, `yourbase_2.mp4`…
4. **Define clips**:
   - Add manually using `[+] Add clip`.
   - Remove rows with `[x] Delete`.
   - Or **load from a text file** (one `start-end` per line, e.g. `00:10-00:45`).
5. **Click `▶️ Generate clips`** – the progress bar and logs will show the process.
6. **Cancel** at any time with the `⏹️ Cancel` button.

The output files will appear in your destination folder in seconds.

---

## ⌨️ Time format

You can enter times in the following formats:
- `HH:MM:SS` (e.g. `01:23:45`)
- `MM:SS` (e.g. `05:30` – treated as minutes:seconds)
- `SS` (seconds only – not recommended for long videos)

The app automatically normalises them to `HH:MM:SS`.

---

## 🌍 Changing language

Use the language selector in the top‑right corner.  
Your choice is remembered between sessions.

Supported languages:
🇪🇸 🇬🇧 🇫🇷 🇵🇹 🇮🇹 🇩🇪 🇷🇺 🇨🇳 🇯🇵 🇰🇷 🇮🇳 🇵🇱 🇳🇱

---

## 🧪 Building from source (for developers)

If you want to compile the app yourself, follow these steps.

### 1. Clone the repository

```bash
git clone https://github.com/TuGatito/clinp-the-clipper.git
cd Clinp-The-Clipper
```

### 2. Set up a virtual environment

```bash
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install pywebview
```

### 4. Run the app in development mode

```bash
python main.py
```

### 5. Build standalone executables

We use **PyInstaller**. The repository includes a **GitHub Actions workflow** that automatically compiles for Windows, Linux and macOS when you push a tag.

To build manually:

```bash
pip install pyinstaller
pyinstaller --onefile \
  --add-data "resources:resources" \
  --hidden-import pywebview \
  --hidden-import pywebview.platforms.gtk \
  --name "ClinpClipper" main.py
```

For Windows add `--windowed` and use `--add-data "resources;resources"`.  
For macOS add `--windowed` and `--hidden-import pywebview.platforms.cocoa`.

---

## 📜 License

This project is licensed under the **MIT License**.  
You are free to use, modify and distribute it, provided the original copyright notice is retained.

FFmpeg is used as an external tool and is **not bundled** with the application – it is subject to its own license (LGPL/GPL).

---

## 🙏 Acknowledgements

- [FFmpeg](https://ffmpeg.org) – the backbone of video processing.
- [PyWebView](https://pywebview.flowrl.com/) – Python + native GUI.
- [Alpine.js](https://alpinejs.dev/) – lightweight reactive frontend.
- [Nerd Fonts](https://www.nerdfonts.com/) – beautiful terminal icons.

---

## 📧 Contact & support

Open an [issue](https://github.com/TuGatito/clinp-the-clipper/issues) on GitHub for bug reports or feature requests.

Happy clipping! ✂️
```