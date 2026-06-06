import json
import os
import platform
import shutil
import subprocess
import sys
import webbrowser
import webview

class API:
    """
    API class providing utility functions for the ClinpClipper application.

    This class handles interactions with the operating system, file system,
    configuration management, and external dependencies like FFmpeg.
    """

    def set_window(self, window):
        self.window = window

    def open_url(self, url):
        """
        Opens a specified URL in the default web browser.

        Args:
            url (str): The URL to open.
        """
        webbrowser.open(url)

    def file_exists(self, path: str) -> bool:
        """
        Checks if a file or directory exists at the given path.

        Args:
            path (str): The path to check.

        Returns:
            bool: True if the path exists, False otherwise.
        """
        return os.path.exists(path)

    def get_config_path(self):
        """
        Determines and creates the appropriate configuration file path based on the OS.

        Returns:
            str: The full path to the configuration file (config.json).
        """
        if platform.system() == "Windows":
            # Config directory for Windows (APPDATA)
            config_dir = os.path.join(os.environ.get("APPDATA"), "ClinpClipper")
        else:
            # Config directory for Unix-like systems (~/.config)
            config_dir = os.path.join(
                os.path.expanduser("~"), ".config", "clinpclipper"
            )
        os.makedirs(config_dir, exist_ok=True)
        return os.path.join(config_dir, "config.json")

    def read_config(self):
        """
        Reads the application configuration from the JSON file.

        If the file does not exist, it uses default settings.

        Returns:
            dict: The application configuration dictionary, merged with defaults.
        """
        path = self.get_config_path()
        default = {"lang": "en", "theme": "dracula"}
        print(f"Reading config file from: {path}")

        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    default.update(data)
                    print("Config file read successfully and updated.")
            except Exception as e:
                print(f"Error reading config file: {e}")
        else:
            print("Config file does not exist, using default settings.")

        return default

    def save_config(self, config):
        """
        Saves the provided configuration into the JSON file, merging it with existing data.

        Args:
            config (dict): The configuration data to save.
        """
        path = self.get_config_path()
        print(f"Attempting to save config to: {path}")
        # Read existing data to avoid overwriting other keys
        existing = self.read_config()
        existing.update(config)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)
        print("Config saved successfully.")

    def _get_ffmpeg_path(self):
        """
        Returns the path to the FFmpeg executable based on the operating system
        and execution context (frozen vs. script).
        """
        os_type = self.get_os()
        if os_type in ["windows", "linux"]:
            if getattr(sys, "frozen", False):
                base_dir = sys._MEIPASS
            else:
                base_dir = os.path.dirname(__file__)
            
            if os_type == "windows":
                return os.path.join(base_dir, "bin", "windows", "ffmpeg.exe")
            else:
                linux_path = os.path.join(base_dir, "bin", "linux", "ffmpeg")
                if os.path.exists(linux_path):
                    try:
                        os.chmod(linux_path, 0o755)
                    except Exception:
                        pass
                return linux_path
        elif os_type == "macos":
            if shutil.which("/opt/homebrew/bin/ffmpeg"):
                return "/opt/homebrew/bin/ffmpeg"
            elif shutil.which("/usr/local/bin/ffmpeg"):
                return "/usr/local/bin/ffmpeg"
            else:
                return "ffmpeg"
        return "ffmpeg"

    def check_ffmpeg(self):
        """
        Checks if FFmpeg is installed and accessible in the system PATH.

        Returns:
            dict: A dictionary containing installation status and path information.
        """
        ffmpeg_path = self._get_ffmpeg_path()
        if os.path.exists(ffmpeg_path) or (ffmpeg_path == "ffmpeg" and shutil.which("ffmpeg")):
            return {"installed": True, "path": ffmpeg_path}
        return {"installed": False, "path": ""}

    def get_os(self) -> str:
        """
        Returns a standardized string representation of the current operating system.

        Returns:
            str: 'windows', 'macos', 'linux', or 'unknown'.
        """
        os_name = platform.system().lower()
        if os_name.startswith("win"):
            return "windows"
        elif os_name == "darwin":
            return "macos"
        elif os_name == "linux":
            return "linux"
        else:
            return "unknown"

    def select_video_file(self) -> str:
        """
        Opens a system dialog to allow the user to select a source video file.

        Returns:
            str: The full path to the selected video file.

        Raises:
            RuntimeError: If the operating system is not supported or the required
            dialog utility (zenity/kdialog) is missing on Linux.
        """
        file_types = ("Video Files (*.mp4;*.mkv;*.avi;*.mov)", "All files (*.*)")
        res = self.window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types) 
        return res[0].strip() if res else ""

    def select_text_file(self) -> str:
        """
        Opens a system dialog to allow the user to select a text file containing time stamps.

        Returns:
            str: The full path to the selected text file.

        Raises:
            RuntimeError: If the operating system is not supported or the required
            dialog utility (zenity/kdialog) is missing on Linux.
        """
        file_types = ("Text File (*.txt)", "All files (*.*)")
        res = self.window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types) 
        return res[0].strip() if res else ""

    def select_directory(self) -> str:
        """
        Opens a system dialog to allow the user to select a destination directory.

        Returns:
            str: The full path to the selected directory.

        Raises:
            RuntimeError: If the operating system is not supported or the required
            dialog utility (zenity/kdialog) is missing on Linux.
        """
        res = self.window.create_file_dialog(webview.FileDialog.FOLDER) # 2 es webview.FOLDER_DIALOG
        return res.strip() if res else ""

    def create_clip_ffmpeg(
        self,
        base_video_path: str,
        output_dir: str,
        clip_name: str,
        start: str,
        end: str,
    ) -> str:
        """
        Creates a video clip using FFmpeg.

        Args:
            base_video_path (str): Path to the source video.
            output_dir (str): Directory where the clip will be saved.
            clip_name (str): Output file name (without extension).
            start (str): Start time in HH:MM:SS format.
            end (str): End time in HH:MM:SS format.

        Returns:
            str: The full path to the created video clip.

        Raises:
            RuntimeError: If FFmpeg fails to execute or if the directory creation fails.
            ValueError: If the paths or clip name contain invalid characters.
        """
        def has_control_chars(s: str) -> bool:
            return any(ord(c) < 32 or ord(c) == 127 for c in s)

        base_video_path = os.path.abspath(base_video_path)
        output_dir = os.path.abspath(output_dir)

        if has_control_chars(base_video_path) or has_control_chars(output_dir) or has_control_chars(clip_name):
            raise ValueError("Paths and clip names cannot contain control characters.")

        # Ensure the directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Construct output path
        output_path = os.path.join(output_dir, f"{clip_name}.mp4")

        # FFmpeg command
        command = [
            self._get_ffmpeg_path(),
            "-y",  # Overwrite without asking
            "-i",
            base_video_path,
            "-ss",
            start,
            "-to",
            end,
            "-c",
            "copy",  # Copy without re-encoding (fast)
            output_path,
        ]

        # Note: The original code had a missing 'result' definition here.
        # Assuming subprocess.run is called and 'result' captures the output.
        try:
            process = subprocess.Popen(
                command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            self.current_process = process
            stdout, stderr = process.communicate()
            if process.returncode != 0:
                raise RuntimeError(f"FFmpeg error: {stderr}")
            return output_path
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"FFmpeg error: {e.stderr}")

    def kill_current_process(self):
        """
        Kills the currently running FFmpeg process if one is active.
        """
        if hasattr(self, "current_process") and self.current_process.poll() is None:
            self.current_process.kill()

    def parse_time_ranges_from_file(self, file_path: str) -> str:
        """
        Reads a text file and extracts time range intervals.

        The expected format is HH:MM:SS, MM:SS, M:S, H:M:S joined by '-'.
        Example: "01:30-30:21", "1:30:21-3:20:21"

        Args:
            file_path (str): Path to the text file.

        Returns:
            str: The content of the file (time ranges).
        """
        content = ""
        with open(file_path, "r", encoding="utf-8") as f:
            content += f.read()

        return content
