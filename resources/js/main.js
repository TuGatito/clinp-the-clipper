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
    theme: "matrix",

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

      let savedLang = null;

      try {
        const config = await window.pywebview.api.read_config();
        savedLang = config.lang; // ahora sí funciona
        this.theme = config.theme || this.theme;
        this.applyTheme(this.theme);
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

    applyTheme(newTheme) {
      this.theme = newTheme;
      document.body.className = `theme-${newTheme}`;
      window.pywebview.api.save_config({ lang: this.lang, theme: newTheme }).catch((e) => console.warn(e));
      this.addLog(`theme changed to ${newTheme.toUpperCase()}`);
    },

    /**
     * Checks if a given language code is supported by the application.
     * @param {string} lang - The language code (e.g., "en", "es").
     * @returns {boolean} True if the language is supported, false otherwise.
     */
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

    /**
     * Sets the application language and persists the configuration.
     * @param {string} lang - The new language code.
     * @returns {void}
     */
    setLang(lang) {
      if (this.isSupportedLang(lang)) {
        this.lang = lang;
        window.pywebview.api
          .save_config({ lang: lang, theme: this.theme })
          .catch((e) => console.warn(e));
        this.addLog(this.t("log_lang_changed", { lang: lang.toUpperCase() }));
      }
    },

    /**
     * Cancels the ongoing clip generation process if it is active.
     * @returns {void}
     */
    async cancelGeneration() {
      if (this.isProcessing) {
        this.addLog(this.t("log_cancelling", { clip: this.currentClipName }));
        this.isProcessing = false;
        try {
          await window.pywebview.api.kill_current_process();
        } catch (e) {
          this.addLog(
            this.t("log_cancel_error", { error: e.message || e }),
            true,
          );
        }
      }
    },

    /**
     * Displays a prompt to the user regarding missing FFmpeg and guides them to the Homebrew formula if confirmed.
     * @returns {void}
     */
    showFFmpegPrompt() {
      // Usar confirm nativo (o un modal bonito si prefieres)
      const userChoice = confirm(this.t("prompt_ffmpeg_missing"));

      if (userChoice) {
        window.pywebview.api.open_url("https://formulae.brew.sh/formula/ffmpeg");
      }
    },

    /**
     * Generates a visual progress bar string representation.
     * @returns {string} The formatted progress bar string.
     */
    progressBar() {
      if (this.progressTotal === 0) return this.t("progress_bar_empty");
      const percent = this.progressCurrent / this.progressTotal;
      const barLength = 20; // longitud total de la barra
      const filled = Math.round(barLength * percent);
      const empty = barLength - filled;
      return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
    },

    /**
     * Retrieves the current progress status in a human-readable format.
     * @returns {string} A string showing current/total clips and percentage (e.g., "3/5 clips (60%)").
     */
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

    /**
     * Asynchronously prompts the user to select the source video file.
     * @returns {Promise<void>}
     */
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

    /**
     * Asynchronously prompts the user to select the destination directory for saving clips.
     * @returns {Promise<void>}
     */
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

    /**
     * Initiates the clip generation process by iterating over all defined clips
     * and calling the backend API for processing.
     * @returns {void}
     */
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

    /**
     * Adds a new default clip (start="00:00", end="00:00") to the clips array.
     * @returns {void}
     */
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

    /**
     * Deletes a clip at the specified index. Re-indexes subsequent clips.
     * @param {number} index - The index of the clip to delete.
     * @returns {void}
     */
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

    /**
     * Deletes the last clip in the clips array.
     * @returns {void}
     */
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

    /**
     * Asynchronously prompts the user to select a text file and parses time ranges from it.
     * @returns {Promise<void>}
     */
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

    /**
     * Parses time range strings from input text and populates the clips array.
     * @param {string} input - The raw text containing time ranges (e.g., "01:00-02:30").
     * @param {boolean} [replace=true] - If true, existing clips are cleared before parsing.
     * @returns {void}
     */
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

    /**
     * Normalizes various time string formats (e.g., "1:30", "01:30:05") into the standard "HH:MM:SS" format.
     * @param {string} timeStr - The time string to normalize.
     * @returns {string} The standardized time string "HH:MM:SS".
     * @throws {Error} If the time string is invalid or out of bounds.
     */
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

    /**
     * Adds a new log entry to the internal logs array.
     * @param {string} message - The message content for the log.
     * @param {boolean} [isError=false] - Flag to mark the log as an error.
     * @returns {void}
     */
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

    /**
     * Clears all entries from the internal logs array.
     * @returns {void}
     */
    clearLogs() {
      this.logs = [];
      this.addLog(this.t("log_logs_cleared"));
    },

    /**
     * Validates the base name. If it contains forbidden characters, it sanitizes the name.
     * @returns {void}
     */
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


