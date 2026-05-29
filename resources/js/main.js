function AppInit() {
  return {
    sourceVideoPath: "/home/user/video.mp4",
    saveDirPath: "/home/user/clips/",
    base_name: "clip",
    clips: [{ id: 1, start: "01:00", end: "02:30" }],
    text_file: "example.txt",
    logs: [{ id: Date.now(), info: "💬 Log: Primer Log...", status: true }],

    currentClipName: "",
    progressCurrent: 0,
    progressTotal: 0,
    isProcessing: false,
    lang: "es",

    t: function (key, params = {}) {
      let text = (locales[this.lang] && locales[this.lang][key]) || key;
      // Reemplazar placeholders {nombre}
      Object.keys(params).forEach((k) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), params[k]);
      });
      return text;
    },

    async init() {
      let retries = 0;
      while (!window.pywebview && retries < 30) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      if (!window.pywebview) {
        this.addLog("Error: pywebview no inicializado", true);
        return;
      }

      // ⬇️ DECLARA LA VARIABLE AQUÍ
      let savedLang = null;

      try {
        const config = await window.pywebview.api.read_config();
        savedLang = config.lang; // ahora sí funciona
      } catch (e) {
        console.warn(e);
      }

      if (savedLang && this.isSupportedLang(savedLang)) {
        this.lang = savedLang;
      } else {
        const browserLang = navigator.language.slice(0, 2);
        this.lang = this.isSupportedLang(browserLang) ? browserLang : "en";
      }

      const ffmpegStatus = await window.pywebview.api.check_ffmpeg();
      if (!ffmpegStatus.installed) {
        this.addLog(
          this.t("log_ffmpeg_not_found", { path: ffmpegStatus.path }),
          true,
        );
        this.showFFmpegPrompt();
      } else {
        this.addLog(this.t("log_ffmpeg_detected", { path: ffmpegStatus.path }));
      }
    },

    isSupportedLang(lang) {
      const supported = [
        "es",
        "en",
        "fr",
        "pt",
        "it",
        "de",
        "ru",
        "zh",
        "ja",
        "ko",
        "hi",
        "pl",
        "nl",
      ];
      return supported.includes(lang);
    },

    setLang(lang) {
      if (this.isSupportedLang(lang)) {
        this.lang = lang;
        window.pywebview.api
          .save_config({ lang: lang })
          .catch((e) => console.warn(e));
        this.addLog(this.t("log_lang_changed", { lang: lang.toUpperCase() }));
      }
    },

    cancelGeneration() {
      if (this.isProcessing) {
        this.addLog(this.t("log_cancelling", { clip: this.currentClipName }));
      }
    },

    showFFmpegPrompt() {
      // Usar confirm nativo (o un modal bonito si prefieres)
      const userChoice = confirm(this.t("prompt_ffmpeg_missing"));

      if (userChoice) {
        this.installFFmpeg();
      } else {
        this.showManualDownloadGuide();
      }
    },

    async installFFmpeg() {
      this.addLog(this.t("log_installing_ffmpeg"));
      const result = await window.pywebview.api.install_ffmpeg();

      if (result.success) {
        this.addLog(this.t("log_install_success", { message: result.message }));
        // Verificar nuevamente
        const ffmpegStatus = await window.pywebview.api.check_ffmpeg();
        if (ffmpegStatus.installed) {
          this.addLog(this.t("log_install_ready"));
        } else {
          this.addLog(this.t("log_install_not_detected"), true);
        }
      } else {
        this.addLog(
          this.t("log_install_failed", { message: result.message }),
          true,
        );
        this.showManualDownloadGuide();
      }
    },

    async showManualDownloadGuide() {
      const os = await window.pywebview.api.get_os();
      let url = "https://ffmpeg.org/download.html";
      const instructions = this.t(`instructions_${os}`);

      const confirmOpen = confirm(
        this.t("prompt_manual_guide", { os, instructions }),
      );
      if (confirmOpen) {
        window.pywebview.api.open_url(url);
      }
    },

    // Método para generar la barra visual (ejemplo: 20 caracteres)
    progressBar() {
      if (this.progressTotal === 0) return this.t("progress_bar_empty");
      const percent = this.progressCurrent / this.progressTotal;
      const barLength = 20; // longitud total de la barra
      const filled = Math.round(barLength * percent);
      const empty = barLength - filled;
      return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
    },

    // Método para obtener el texto "3/5 clips (60%)"
    progressStatus() {
      if (this.progressTotal === 0) return "0/0 clips (0%)";
      const percent = Math.round(
        (this.progressCurrent / this.progressTotal) * 100,
      );
      return this.t("progress_status", {
        current: this.progressCurrent,
        total: this.progressTotal,
        percent,
      });
    },

    async chooseSourceVideo() {
      this.addLog(this.t("log_start_dialog"));

      try {
        const path = await window.pywebview.api.select_video_file();
        if (path) {
          this.sourceVideoPath = path;
          this.addLog(this.t("log_video_selected", { path }));
        } else {
          this.addLog(this.t("log_no_video"), true);
        }
      } catch (error) {
        this.addLog(`Falló el clip: ${error.message || error}`, true);
      }
    },

    async chooseSaveDir() {
      try {
        const path = await window.pywebview.api.select_directory();
        if (path) {
          this.saveDirPath = path;
          this.addLog(this.t("log_select_dest", { path }));
        } else {
          this.addLog(this.t("log_no_dest"));
        }
      } catch (error) {
        this.addLog(
          this.t("log_fail_dest", { error: error.message || error }),
          true,
        );
      }
    },

    async generateClips() {
      if (this.isProcessing) {
        this.addLog(this.t("log_already_in_process"), true);
        return;
      }

      if (!this.sourceVideoPath || !this.saveDirPath) {
        this.addLog(this.t("log_missing_paths"), true);
        return;
      }

      const exists = await window.pywebview.api.file_exists(
        this.sourceVideoPath,
      );

      if (!exists) {
        this.addLog(this.t("log_file_not_exist"), true);
        return;
      }

      this.validateBaseName();

      this.progressTotal = this.clips.length;
      this.progressCurrent = 0;

      this.addLog(
        this.t("log_start_processing", { total: this.progressTotal }),
      );

      this.isProcessing = true;
      for (const clip of this.clips) {
        const clipName = `${this.base_name}_${clip.id}`;
        this.currentClipName = clipName;

        if (!this.isProcessing) {
          this.addLog(this.t("log_cancelled"));
          break;
        }

        if (!clip.start || !clip.end) {
          this.addLog(this.t("log_clip_empty_time", { name: clipName }), true);
          this.progressCurrent++;
          continue;
        }

        try {
          // Intentar llamar a la API de Python de forma segura
          const response = await window.pywebview.api.create_clip_ffmpeg(
            this.sourceVideoPath,
            this.saveDirPath,
            clipName,
            this.normalizeTime(clip.start),
            this.normalizeTime(clip.end),
          );

          // Si todo sale bien
          this.addLog(this.t("log_clip_created", { name: clipName }));
        } catch (error) {
          // Si el backend de Python truena o FFmpeg falla dramáticamente
          this.addLog(
            this.t("log_clip_failed", {
              name: clipName,
              error: error.message || error,
            }),
            true,
          );
        } finally {
          // Pase lo que pase, el contador avanza para no trabar la UI
          this.progressCurrent++;
        }
      }

      this.currentClipName = "";
      this.isProcessing = false;
      this.addLog(this.t("log_processing_finished"));
    },

    addNewClip() {
      const clipCount = this.clips.length;
      const newClip = {
        id: clipCount + 1,
        start: "00:00",
        end: "00:00",
      };
      this.clips.push(newClip);
      this.addLog(
        this.t("log_clip_added", { id: newClip.id, total: clipCount }),
      );
    },

    deleteClip(index) {
      const deletedClip = this.clips.splice(index, 1);
      if (deletedClip.length > 0) {
        this.addLog(
          this.t("log_clip_deleted", {
            id: deletedClip[0].id,
            total: this.clips.length,
          }),
        );
        for (let i = index; i < this.clips.length; i++) {
          this.clips[i].id = i + 1;
        }
      } else {
        this.addLog(this.t("log_no_clip_to_delete"), true);
      }
    },

    deleteLastClip() {
      if (this.clips.length > 0) {
        const deletedClip = this.clips.pop();
        this.addLog(
          this.t("log_last_clip_deleted", {
            id: deletedClip.id,
            total: this.clips.length,
          }),
        );
      } else {
        this.addLog(this.t("log_empty_clipboard"), true);
      }
    },

    async readTextFile() {
      const textFilePath = await window.pywebview.api.select_text_file();
      this.text_file = textFilePath;
      try {
        const rawText =
          await window.pywebview.api.parse_time_ranges_from_file(textFilePath);
        this.parseTimeRanges(rawText);
        this.addLog(this.t("log_text_file_loaded", { path: textFilePath }));
      } catch (error) {
        this.addLog(
          this.t("log_text_file_failed", {
            path: textFilePath,
            error: error.message || error,
          }),
          true,
        );
      }
    },

    parseTimeRanges(input, replace = true) {
      if (replace) this.clips = [];

      const regex =
        /(\d{1,2}:\d{1,2}(?::\d{1,2})?)-(\d{1,2}:\d{1,2}(?::\d{1,2})?)/g;
      let match;

      while ((match = regex.exec(input)) !== null) {
        const clip = {
          id: this.clips.length + 1,
          start: match[1],
          end: match[2],
        };
        try {
          // Añade el clip al array
          this.clips.push(clip);
        } catch (error) {
          this.addLog(
            this.t("log_parsing_error", { id: clip.id, error: error.message }),
            true,
          );
        }
      }

      this.addLog(this.t("log_parsed_clips", { count: this.clips.length }));
    },

    normalizeTime(timeStr) {
      // Dividimos por ":" para obtener las partes
      const parts = timeStr.split(":").map(Number);

      let hours = 0,
        minutes = 0,
        seconds = 0;

      if (parts.length === 3) {
        // Formato HH:MM:SS o H:M:S
        [hours, minutes, seconds] = parts;
      } else if (parts.length === 2) {
        // Formato MM:SS
        [minutes, seconds] = parts;
      } else if (parts.length === 1) {
        // Solo segundos (raro, pero lo contemplamos)
        [seconds] = parts;
      }

      if (hours >= 24 || minutes >= 60 || seconds >= 60) {
        throw new Error(this.t("log_invalid_parsing_time", { time: timeStr }));
      }

      // Función auxiliar para rellenar con ceros
      const pad = (num) => String(num).padStart(2, "0");

      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    },

    addLog(message, isError = false) {
      const prefix = isError ? "❌ Error" : "✅ Log";

      this.logs.push({
        id: Date.now() + Math.random(), // Evita colisiones de ID si ocurren rápido
        info: `${prefix}: ${message}`,
        status: !isError, // true para OK (éxito), false para errores
      });

      // Opcional: Mantener solo los últimos 5 logs para cuidar el espacio visual de la TUI
      if (this.logs.length > 5) {
        this.logs.shift();
      }
    },

    clearLogs() {
      this.logs = [];
      this.addLog(this.t("log_logs_cleared"));
    },

    validateBaseName() {
      if (!this.base_name.trim()) {
        this.addLog(this.t("log_base_name_empty"), true);
        return;
      }

      const forbiddenChars = /[<>:"/\\|?*]/g;
      if (this.base_name.match(forbiddenChars)) {
        this.addLog(
          this.t("log_base_name_invalid", { name: this.base_name }),
          true,
        );
        // Optionally, you can sanitize the name or reject it
        this.base_name = this.base_name.replace(forbiddenChars, "_");
        this.addLog(this.t("log_base_name_changed", { name: this.base_name }));
      } else {
        this.addLog(this.t("log_base_name_valid", { name: this.base_name }));
      }
    },
  };
}
