#!/data/data/com.termux/files/usr/bin/bash

set -e

FILE="commands/sticker.js"
BACKUP="commands/sticker.js.bak-seguro"

echo "🔧 BOT-API — Reparador seguro de sticker"
echo "========================================"

if [ ! -f "$FILE" ]; then
    echo "❌ No existe $FILE"
    exit 1
fi

cp "$FILE" "$BACKUP"

echo "✅ Backup creado: $BACKUP"

if ! node --check "$FILE" >/dev/null 2>&1; then
    echo "❌ El archivo original ya tiene un error de sintaxis."
    echo "↩️ No se modificó nada."
    exit 1
fi

echo "✅ Sintaxis original correcta"

if ! grep -q "node-webpmux" "$FILE"; then
    sed -i "/import sharp from 'sharp';/a import webpmuxPkg from 'node-webpmux';" "$FILE"
fi

if ! grep -q "const { Image } = webpmuxPkg;" "$FILE"; then
    sed -i "/promisify(execFile);/a const { Image } = webpmuxPkg;" "$FILE"
fi

echo "✅ Dependencia node-webpmux preparada"

if ! node --check "$FILE" >/dev/null 2>&1; then
    echo "❌ El cambio produjo un error."
    cp "$BACKUP" "$FILE"
    echo "↩️ Archivo restaurado automáticamente."
    exit 1
fi

echo "✅ Sintaxis correcta después del cambio"
echo
echo "⚠️ El archivo NO fue reemplazado completo."
echo "⚠️ Tu comando .s sigue intacto."
echo
echo "Backup disponible en:"
echo "$BACKUP"
