// ============================================================
// COMANDO MEDIAFIRE (.mf)
// ============================================================

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE = '/api/downloader/mediafire';

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
                    text: `❌ *URL inválida*\n\n> Usa: *${prefijo}mf <link de MediaFire>*`
                }, { quoted: msg });
            }

            // ── MENSAJE DE ESPERA ──
            const esperaTexto = `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n` +
                `              📥  *MEDIAFIRE*  📥\n` +
                `           · · ·  𝐷𝐸𝒮𝒞𝒜𝑅𝒢𝒜  · · ·\n\n` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n` +
                `  ⏳  Procesando enlace...\n` +
                `  🔗  ${url.slice(0, 50)}...\n\n` +
                `  💬  *Descargando...*\n\n` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            const esperaMsg = await sock.sendMessage(jid, { text: esperaTexto }, { quoted: msg });

            // ── LLAMAR API ──
            const encodedUrl = encodeURIComponent(url);
            const res = await fetch(`${API_BASE}?url=${encodedUrl}`);
            const data = await res.json();

            if (!data.status || !data.directDownloadUrl) {
                throw new Error('No se pudo obtener el enlace de descarga');
            }

            const { fileName, fileSize, fileExtension, directDownloadUrl } = data;

            // ── DESCARGAR ARCHIVO ──
            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const filePath = path.join(tempDir, fileName || `mediafire_${Date.now()}.${fileExtension || 'rar'}`);

            const fileRes = await fetch(directDownloadUrl);
            const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
            fs.writeFileSync(filePath, fileBuffer);

            // ── MENSAJE FINAL CON ARCHIVO ──
            const finalTexto = `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n` +
                `              ✅  *COMPLETADO*  ✅\n` +
                `           · · ·  𝐿𝐼𝒮𝒯𝒪  · · ·\n\n` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n` +
                `  📄  *Nombre*    ▸  ${fileName}\n` +
                `  📦  *Tamaño*    ▸  ${fileSize}\n` +
                `  🗂️  *Formato*   ▸  ${fileExtension}\n\n` +
                `  💾  *Archivo enviado abajo* ⬇️\n\n` +
                `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            // Enviar mensaje de confirmación
            await sock.sendMessage(jid, { text: finalTexto }, { quoted: msg });

            // Enviar el archivo como documento
            await sock.sendMessage(jid, {
                document: fs.readFileSync(filePath),
                fileName: fileName,
                mimetype: 'application/octet-stream',
                caption: `📥 *${fileName}*\n> Tamaño: ${fileSize}`
            }, { quoted: msg });

            // Limpiar temporal
            try { fs.unlinkSync(filePath); } catch {}

        } catch (error) {
            console.error('[MF] Error:', error);
            await sock.sendMessage(jid, {
                text: `❌ *Error al descargar*\n\n> ${error.message}\n\n💡 Usa: *${prefijo}mf <link de MediaFire>*`
            }, { quoted: msg });
        }
    }
};
