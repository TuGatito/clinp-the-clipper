#!/usr/bin/env python3
"""
Convierte TODOS los emojis a iconos Nerd Font en un archivo de localización.
Funciona línea por línea, reemplazando cualquier emoji conocido.
Uso: python nerdify_complete.py locales.source.js locales.nerd.js
"""

import sys
import unicodedata

# Diccionario completo de emojis -> código Nerd Font (carácter Unicode privado)
EMOJI_TO_NERD = {
    # Símbolos principales
    "🎬": "\uf008",   # film (clapper)
    "📁": "\uf07b",   # folder
    "📂": "\uf07c",   # folder-open
    "🏷️": "\uf02b",  # tag
    "▶️": "\uf04b",   # play
    "⏹️": "\uf04d",   # stop
    "✂️": "\uf0c4",   # cut (scissors)
    "📄": "\uf0f6",   # file-text
    "📊": "\uf080",   # chart-bar
    "🗑️": "\uf1f8",   # trash
    "✅": "\uf00c",   # check
    "❌": "\uf00d",   # times
    "⚠️": "\uf071",   # exclamation-triangle
    "🔄": "\uf021",   # sync
    "➕": "\uf067",   # plus
    "➖": "\uf068",   # minus
    "🎉": "\uf004",   # heart (como celebración)
    "🔍": "\uf002",   # search
    "⚙️": "\uf013",   # cog
    "🔧": "\uf0ad",   # wrench
    "💾": "\uf0c7",   # save
    "📎": "\uf0c6",   # paperclip
    "🔗": "\uf0c1",   # link
    "🌐": "\uf0ac",   # globe
    "🏠": "\uf015",   # home
    "📅": "\uf073",   # calendar
    "🕒": "\uf017",   # clock
    "👤": "\uf007",   # user
    "🔒": "\uf023",   # lock
    "🔓": "\uf09c",   # unlock
    "💡": "\uf0eb",   # lightbulb
    "📢": "\uf0f3",   # bullhorn
    "📌": "\uf08d",   # thumbtack
    # Variaciones de los mismos (sin selector de variación)
    "▶": "\uf04b",    # play sin variación
    "⏹": "\uf04d",    # stop sin variación
    "✂": "\uf0c4",    # scissors sin variación
    "✅": "\uf00c",    # check
    "❌": "\uf00d",    # cross
    "⚠": "\uf071",    # warning
    "🔄": "\uf021",    # sync
    "🎬": "\uf008",    # film
    "🏷": "\uf02b",    # tag sin variación
    "🗑": "\uf1f8",    # trash sin variación
    "📊": "\uf080",    # chart
    "📁": "\uf07b",    # folder
    "📂": "\uf07c",    # folder-open
    "📄": "\uf0f6",    # file
    "➕": "\uf067",    # plus
    "➖": "\uf068",    # minus
}

def normalize_emoji(text):
    """Normaliza caracteres Unicode (elimina marcadores de variación)."""
    return unicodedata.normalize('NFKC', text)

def replace_emojis_in_text(text):
    """Reemplaza cualquier emoji conocido por su icono Nerd Font."""
    result = text
    # Primero normalizamos el texto para tratar variaciones (ej: "▶️" vs "▶")
    normalized_result = normalize_emoji(result)
    for emoji, nerd in EMOJI_TO_NERD.items():
        # Normalizar el emoji también
        norm_emoji = normalize_emoji(emoji)
        # Reemplazar en el texto normalizado
        if norm_emoji in normalized_result:
            # Reemplazar en el texto original también
            result = result.replace(emoji, nerd)
            # Si el emoji normalizado es diferente, también reemplazar
            if norm_emoji != emoji:
                result = result.replace(norm_emoji, nerd)
    return result

def nerdify_file(input_path, output_path):
    """Lee el archivo línea por línea y reemplaza emojis en cada línea."""
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    replacements_count = 0
    for line in lines:
        new_line = replace_emojis_in_text(line)
        if new_line != line:
            replacements_count += 1
        new_lines.append(new_line)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"✅ Archivo procesado: {output_path}")
    print(f"   Líneas modificadas: {replacements_count} de {len(lines)}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python nerdify_complete.py <archivo_entrada> <archivo_salida>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    nerdify_file(input_file, output_file)