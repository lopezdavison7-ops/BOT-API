// ============================================================
// COMANDO MEDIAFIRE (.mf)
// ============================================================

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://api.neosoft.best/api/downloader/mediafire';

export default {
    nombre: 'mf',
    categoria: 'Descargas',
    alias: ['mediafire', 'mfire', 'mfdown'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;

        try {
            // ── VALIDAR URL ──
            const url = args.join(' ').trim();
            if (!url || !url.includes('mediafire.com')) {
                return await sock.sendMessage(jid, {
                    text: `❌ *URL inválida*

> Usa: *${prefijo}mf <link de MediaFire>*`
                }, { quoted: msg });
            }

            // ── MENSAJE DE ESPERA ──
            const esperaTexto = `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

` +
                `              📥  *MEDIAFIRE*  📥
` +
                `           · · ·  𝐷𝐸𝒮𝒞𝒜𝑅𝒢𝒜  · · ·

` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

` +
                `  ⏳  Procesando enlace...
` +
                `  🔗  ${url.slice(0, 45)}...

` +
                `  💬  *Descargando...*

` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: esperaTexto }, { quoted: msg });

            // ── LLAMAR API ──
            const encodedUrl = encodeURIComponent(url);
            const res = await fetch(`${API_BASE}?url=${encodedUrl}`);

            if (!res.ok) {
                throw new Error(`API respondió ${res.status}`);
            }

            const data = await res.json();

            if (!data.status || !data.directDownloadUrl) {
                throw new Error('No se pudo obtener el enlace de descarga');
            }

            const { fileName, fileSize, fileExtension, directDownloadUrl } = data;

            // ── DESCARGAR ARCHIVO ──
            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const safeName = fileName || `archivo_${Date.now()}.${fileExtension || 'rar'}`;
            const filePath = path.join(tempDir, safeName);

            const fileRes = await fetch(directDownloadUrl);

            if (!fileRes.ok) {
                throw new Error('Error al descargar el archivo');
            }

            const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
            fs.writeFileSync(filePath, fileBuffer);

            // ── MENSAJE FINAL ──
            const finalTexto = `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

` +
                `              ✅  *COMPLETADO*  ✅
` +
                `           · · ·  𝐿𝐼𝒮𝒯𝒪  · · ·

` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

` +
                `  📄  *Nombre*    ▸  ${safeName}
` +
                `  📦  *Tamaño*    ▸  ${fileSize || 'Desconocido'}
` +
                `  🗂️  *Formato*   ▸  ${fileExtension || 'Desconocido'}

` +
                `  💾  *Archivo enviado abajo* ⬇️

` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            // Enviar mensaje de confirmación
            await sock.sendMessage(jid, { text: finalTexto }, { quoted: msg });

            // Enviar el archivo como documento
            await sock.sendMessage(jid, {
                document: fs.readFileSync(filePath),
                fileName: safeName,
                mimetype: 'application/octet-stream',
                caption: `📥 *${safeName}*
> Tamaño: ${fileSize || 'Desconocido'}`
            }, { quoted: msg });

            // Limpiar temporal
            try { fs.unlinkSync(filePath); } catch {}

        } catch (error) {
            console.error('[MF] Error:', error);
            await sock.sendMessage(jid, {
                text: `❌ *Error al descargar*

> ${error.message}

💡 Usa: *${prefijo}mf <link de MediaFire>*`
            }, { quoted: msg });
        }
    }
};
