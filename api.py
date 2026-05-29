import platform
import subprocess
import shutil
import os
import webbrowser
import json


class API:
    def open_url(self, url):
        webbrowser.open(url)

    def file_exists(self, path: str) -> bool:
        return os.path.exists(path)

    def get_config_path(self):
        if platform.system() == "Windows":
            config_dir = os.path.join(os.environ.get("APPDATA"), "ClinpClipper")
        else:
            config_dir = os.path.join(
                os.path.expanduser("~"), ".config", "clinpclipper"
            )
        os.makedirs(config_dir, exist_ok=True)
        return os.path.join(config_dir, "config.json")

    def read_config(self):
        path = self.get_config_path()
        default = {"lang": "en"}
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
        path = self.get_config_path()
        print(f"Attempting to save config to: {path}")
        # Leer existente para no sobrescribir otras claves
        existing = self.read_config()
        existing.update(config)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)
        print("Config saved successfully.")

    def check_ffmpeg(self):
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"], capture_output=True, text=True
            )
            if result.returncode == 0:
                return {"installed": True, "path": "ffmpeg (en PATH)"}
            return {"installed": False, "path": ""}
        except FileNotFoundError:
            return {"installed": False, "path": ""}

    def get_os(self) -> str:
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
        os_type = self.get_os()

        if os_type == "windows":
            # Usar diálogo de Explorer
            ps_script = """
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Title = "Seleccionar video fuente"
        $dialog.Filter = "Archivos de video (*.mp4;*.avi;*.mov;*.mkv)|*.mp4;*.avi;*.mov;*.mkv"
        $dialog.ShowDialog() | Out-Null
        $dialog.FileName
        """

            result = subprocess.run(
                ["powershell", "-Command", ps_script], capture_output=True, text=True
            )
            return result.stdout.strip()

        elif os_type == "macos":
            script = 'tell application "System Events" to choose file of type {"public.movie"}'
            result = subprocess.run(
                ["osascript", "-e", script], capture_output=True, text=True
            )
            return result.stdout.strip()

        elif os_type == "linux":
            if shutil.which("zenity"):
                result = subprocess.run(
                    ["zenity", "--file-selection", "--title=Seleccionar video"],
                    capture_output=True,
                    text=True,
                )
                return result.stdout.strip()
            elif shutil.which("kdialog"):
                result = subprocess.run(
                    ["kdialog", "--getopenfilename"], capture_output=True, text=True
                )
                return result.stdout.strip()
            else:
                raise RuntimeError("No se encontró ni zenity ni kdialog en el sistema.")

        else:
            raise RuntimeError("Sistema operativo no soportado.")

    def select_text_file(self) -> str:
        os_type = self.get_os()

        if os_type == "windows":
            ps_script = """
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Title = "Seleccionar archivo de texto con tiempos"
        $dialog.Filter = "Archivos de texto (*.txt)|*.txt|Todos los archivos (*.*)|*.*"
        $dialog.ShowDialog() | Out-Null
        $dialog.FileName
        """
            result = subprocess.run(
                ["powershell", "-command", ps_script], capture_output=True, text=True
            )
            return result.stdout.strip()

        elif os_type == "macos":
            script = 'tell application "System Events" to choose file of type {"public.plain-text"}'
            result = subprocess.run(
                ["osascript", "-e", script], capture_output=True, text=True
            )
            return result.stdout.strip()

        elif os_type == "linux":
            if shutil.which("zenity"):
                result = subprocess.run(
                    ["zenity", "--file-selection", "--title=Seleccionar texto"],
                    capture_output=True,
                    text=True,
                )
                return result.stdout.strip()
            elif shutil.which("kdialog"):
                result = subprocess.run(
                    ["kdialog", "--getopenfilename"], capture_output=True, text=True
                )
                return result.stdout.strip()
            else:
                raise RuntimeError("No se encontró ni zenity ni kdialog en el sistema.")

        else:
            raise RuntimeError("Sistema operativo no soportado.")

    def select_directory(self) -> str:
        os_type = self.get_os()

        if os_type == "windows":
            ps_script = """
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = "Seleccione la carpeta de destino"
        $dialog.ShowDialog() | Out-Null
        $dialog.SelectedPath
        """
            result = subprocess.run(
                ["powershell", "-command", ps_script], capture_output=True, text=True
            )
            return result.stdout.strip()

        elif os_type == "macos":
            script = 'tell application "System Events" to choose folder'
            result = subprocess.run(
                ["osascript", "-e", script], capture_output=True, text=True
            )
            return result.stdout.strip()

        elif os_type == "linux":
            if shutil.which("zenity"):
                result = subprocess.run(
                    [
                        "zenity",
                        "--file-selection",
                        "--directory",
                        "--title=Seleccionar carpeta",
                    ],
                    capture_output=True,
                    text=True,
                )
                return result.stdout.strip()
            elif shutil.which("kdialog"):
                result = subprocess.run(
                    ["kdialog", "--getexistingdirectory"],
                    capture_output=True,
                    text=True,
                )
                return result.stdout.strip()
            else:
                raise RuntimeError("No se encontró ni zenity ni kdialog en el sistema.")

        else:
            raise RuntimeError("Sistema operativo no soportado.")

    def create_clip_ffmpeg(
        self,
        base_video_path: str,
        output_dir: str,
        clip_name: str,
        start: str,
        end: str,
    ) -> str:
        """
        Crea un clip de video usando FFmpeg.

        Parámetros:
            base_video_path (str): Ruta al video fuente.
            output_dir (str): Directorio donde se guardará el clip.
            clip_name (str): Nombre del archivo de salida (sin extensión).
            start (str): Tiempo de inicio en formato HH:MM:SS.
            end (str): Tiempo de fin en formato HH:MM:SS.
        """
        # Asegurar que el directorio existe
        os.makedirs(output_dir, exist_ok=True)

        # Construir ruta de salida
        output_path = os.path.normpath(os.path.join(output_dir, f"{clip_name}.mp4"))

        # Comando FFmpeg
        command = [
            "ffmpeg",
            "-y",  # sobrescribir sin preguntar
            "-i",
            os.path.normpath(base_video_path),
            "-ss",
            start,
            "-to",
            end,
            "-c",
            "copy",  # copia sin recodificar (rápido)
            output_path,
        ]

        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {result.stderr}")
        return output_path

    def parse_time_ranges_from_file(self, file_path: str) -> str:
        """
        Lee un archivo de texto y extrae intervalos de tiempo en formato:
        HH:MM:SS, MM:SS, M:S, H:M:S unidos por '-'.
        Ejemplo: "01:30-30:21", "1:30:21-3:20:21"
        """
        content = ""
        with open(file_path, "r", encoding="utf-8") as f:
            content += f.read()

        return content

    def install_ffmpeg(self):
        os_type = self.get_os()
        try:
            if os_type == "windows":
                # Verificar si Chocolatey está instalado
                choco_check = subprocess.run(["where", "choco"], capture_output=True)
                if choco_check.returncode == 0:
                    subprocess.run(["choco", "install", "ffmpeg", "-y"], check=True)
                    return {
                        "success": True,
                        "message": "FFmpeg instalado via Chocolatey",
                    }
                else:
                    return {
                        "success": False,
                        "message": "Chocolatey no está instalado. Visita https://chocolatey.org/install",
                    }

            elif os_type == "macos":
                # Verificar Homebrew
                brew_check = subprocess.run(["which", "brew"], capture_output=True)
                if brew_check.returncode == 0:
                    subprocess.run(["brew", "install", "ffmpeg"], check=True)
                    return {"success": True, "message": "FFmpeg instalado via Homebrew"}
                else:
                    return {
                        "success": False,
                        "message": "Homebrew no está instalado. Visita https://brew.sh",
                    }

            elif os_type == "linux":
                # Detectar distribuciones
                if shutil.which("apt"):
                    subprocess.run(["sudo", "apt", "update"], check=True)
                    subprocess.run(
                        ["sudo", "apt", "install", "-y", "ffmpeg"], check=True
                    )
                    return {"success": True, "message": "FFmpeg instalado via apt"}
                elif shutil.which("dnf"):
                    subprocess.run(
                        ["sudo", "dnf", "install", "-y", "ffmpeg"], check=True
                    )
                    return {"success": True, "message": "FFmpeg instalado via dnf"}
                elif shutil.which("pacman"):
                    subprocess.run(
                        ["sudo", "pacman", "-S", "--noconfirm", "ffmpeg"], check=True
                    )
                    return {"success": True, "message": "FFmpeg instalado via pacman"}
                else:
                    return {
                        "success": False,
                        "message": "Gestor de paquetes no reconocido. Instala FFmpeg manualmente",
                    }

            else:
                return {
                    "success": False,
                    "message": "Sistema operativo no soportado para instalación automática",
                }

        except subprocess.CalledProcessError as e:
            return {
                "success": False,
                "message": f"Error durante la instalación: {str(e)}",
            }
