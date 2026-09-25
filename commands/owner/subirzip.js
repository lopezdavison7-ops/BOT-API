// commands/owner/subirzip.js
// ============================================================
// BOT-API — OWNER ONLY
// Sube el contenido de un ZIP citado a GitHub.
// Solo sube archivos NUEVOS o MODIFICADOS (no borra).
// ============================================================

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { downloadMediaMessage } from 'baileys';

// Importar sistema de owners
import { esOwner } from '../../lib/owner.js';

const exec = promisify(spawn);

// ───────────── CONFIGURACIÓN ─────────────
const REPO = 'lopezdavison7-ops/BOT-API';
const BRANCH = 'main';
const API = 'https://api.github.com';

// 🔑 Token desde variable de entorno
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const IGNORED_DIRS = new Set([
    'node_modules', 'dist', 'build', '.git', '.cache',
    'sessions', 'session', 'auth_info', '.DS_Store'
]);
// ───────────────────────────────────────────

function headers() {
    if (!GITHUB_TOKEN) {
        throw new Error('❌ Falta GITHUB_TOKEN en el archivo .env\n\nAgrega esto a .env:\nGITHUB_TOKEN=ghp_tu_token_aqui');
    }
    return {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'BOT-API-SubirZip'
    };
}

async function ghError(res, action) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch {}
    if (res.status === 401) return new Error(`Token rechazado (401). ${detail}`);
    if (res.status === 403 || res.status === 429) return new Error(`GitHub bloqueó (${res.status}). ${detail}`);
    if (res.status === 404) return new Error(`No se encontró ${action} (404). ${detail}`);
    if (res.status === 422) return new Error(`Conflicto (422). ${detail}`);
    return new Error(`Error al ${action}: ${res.status} ${detail}`);
}

function localBlobSha(abs) {
    try {
        const data = fs.readFileSync(abs);
        return crypto.createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex');
    } catch {
        return null;
    }
}

async function getRemoteTree() {
    const res = await fetch(`${API}/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, { headers: headers() });
    if (!res.ok) throw await ghError(res, 'leer el árbol del repo');
    const data = await res.json();
    const map = new Map();
    for (const item of data.tree || []) {
        if (item.type === 'blob') map.set(item.path, item.sha);
    }
    return map;
}

async function uploadFile(repoPath, absPath, message, sha) {
    const body = {
        message,
        content: fs.readFileSync(absPath).toString('base64'),
        branch: BRANCH
    };
    if (sha) body.sha = sha;

    const url = `${API}/repos/${REPO}/contents/${repoPath.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw await ghError(res, `subir ${repoPath}`);
}

// ───────────── EXTRAER ZIP ─────────────
async function extraerZip(zipPath, destino) {
    fs.mkdirSync(destino, { recursive: true });

    // Intento 1: adm-zip (si está instalado)
    try {
        const AdmZip = (await import('adm-zip')).default;
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(destino, true);
        console.log('[ZIP] Extraído con adm-zip');
        return;
    } catch (e) {
        console.log('[ZIP] adm-zip no disponible, usando unzip del sistema');
    }

    // Intento 2: unzip del sistema (Linux/Mac)
    try {
        await new Promise((resolve, reject) => {
            const p = spawn('unzip', ['-o', '-q', zipPath, '-d', destino]);
            let err = '';
            p.stderr.on('data', d => err += d.toString());
            p.on('close', code => code === 0 ? resolve() : reject(new Error('unzip: ' + err)));
            p.on('error', reject);
        });
        console.log('[ZIP] Extraído con unzip del sistema');
        return;
    } catch (e) {
        console.log('[ZIP] unzip falló:', e.message);
    }

    throw new Error('No se pudo extraer el ZIP. Instala adm-zip: npm install adm-zip');
}

function walkDir(dir) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        let entries;
        try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
        for (const entry of entries) {
            const abs = path.join(current, entry.name);
            if (IGNORED_DIRS.has(entry.name)) continue;
            if (entry.isDirectory()) {
                stack.push(abs);
            } else if (entry.isFile()) {
                out.push(abs);
            }
        }
    }
    return out;
}

// ───────────── COMANDO ─────────────
export default {
    nombre: 'subirzip',
    categoria: 'owner',
    alias: ['zipsubir', 'pushzip', 'uploadzip'],
    descripcion: 'Sube el contenido de un ZIP a GitHub (solo archivos nuevos/modificados).',
    uso: '.subirzip (citando un archivo ZIP)',

    ejecutar: async ({ sock, msg, responder }) => {
        // 🔑 CORRECCIÓN: Pasar el objeto msg completo, no solo el JID
        if (!esOwner(msg)) {
            return await responder.texto('🚫 Solo los owners pueden usar este comando.');
        }

        const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐒𝐔𝐁𝐈𝐑 𝐙𝐈𝐏 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cita un archivo ZIP primero.\n' +
                '┃\n' +
                '┃ 📖 Uso:\n' +
                '┃ 1️⃣ Envía un ZIP al chat\n' +
                '┃ 2️⃣ Responde al ZIP con:\n' +
                '┃    .subirzip\n' +
                '┃\n' +
                '┃ 💡 El comando escanea el ZIP\n' +
                '┃    y sube solo lo NUEVO a GitHub\n' +
                '┃    (no borra archivos existentes).\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Validar que sea un documento
        if (!quoted.documentMessage) {
            return await responder.texto('❌ Debes citar un archivo (documento ZIP).');
        }

        const fileName = quoted.documentMessage.fileName || '';
        const mime = quoted.documentMessage.mimetype || '';

        if (!/\.zip$/i.test(fileName) && !/zip/i.test(mime)) {
            return await responder.texto('❌ El archivo citado no parece ser un ZIP.');
        }

        try {
            // PASO 1: Descargar el ZIP
            await responder.texto('⬇️ [1/5] Descargando ZIP...');

            const mensajeCompleto = {
                key: {
                    remoteJid: msg.key.remoteJid,
                    fromMe: false,
                    id: msg.key.id,
                    participant: msg.key.participant
                },
                message: { documentMessage: quoted.documentMessage }
            };

            const buffer = await downloadMediaMessage(mensajeCompleto, 'buffer', {}, { logger: undefined });

            if (!buffer || !buffer.length) {
                throw new Error('No se pudo descargar el ZIP.');
            }

            console.log(`[ZIP] Descargado: ${(buffer.length / 1024).toFixed(1)} KB`);

            // PASO 2: Guardar ZIP y extraer
            const tmpBase = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bot-zip-'));
            const zipPath = path.join(tmpBase, 'archivo.zip');
            const extractPath = path.join(tmpBase, 'extracted');

            await fs.promises.writeFile(zipPath, buffer);

            await responder.texto('📦 [2/5] Extrayendo ZIP...');
            await extraerZip(zipPath, extractPath);

            // PASO 3: Listar archivos del ZIP
            const archivosZip = walkDir(extractPath);

            if (archivosZip.length === 0) {
                await fs.promises.rm(tmpBase, { recursive: true, force: true }).catch(() => {});
                throw new Error('El ZIP está vacío o no contiene archivos.');
            }

            await responder.texto(`🔍 [3/5] Escaneando ${archivosZip.length} archivos del ZIP...`);

            // PASO 4: Obtener árbol remoto de GitHub
            const remote = await getRemoteTree();

            // PASO 5: Comparar y subir solo lo nuevo/modificado
            const toUpload = [];
            const sinCambios = [];

            for (const absPath of archivosZip) {
                const relPath = path.relative(extractPath, absPath).split(path.sep).join('/');

                // Saltar archivos ignorados por convención
                if (IGNORED_DIRS.has(path.basename(relPath))) continue;
                if (relPath.startsWith('.git/')) continue;

                const shaLocal = localBlobSha(absPath);
                const shaRemoto = remote.get(relPath);

                if (shaRemoto !== shaLocal) {
                    toUpload.push({ rel: relPath, abs: absPath, esNuevo: !shaRemoto });
                } else {
                    sinCambios.push(relPath);
                }
            }

            if (toUpload.length === 0) {
                await fs.promises.rm(tmpBase, { recursive: true, force: true }).catch(() => {});
                return await responder.texto(
                    '╭━━〔 ✅ 𝐒𝐈𝐍 𝐂𝐀𝐌𝐁𝐈𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ El ZIP no contiene archivos\n' +
                    '┃ nuevos ni modificados.\n' +
                    '┃\n' +
                    '┃ 📦 Revisados: ' + archivosZip.length + ' archivos\n' +
                    '┃ ✅ Todos iguales al repo\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            await responder.texto(`⬆️ [4/5] Subiendo ${toUpload.length} archivos a GitHub...`);

            const ok = [];
            const failed = [];
            const nuevos = [];
            const actualizados = [];

            for (const { rel, abs, esNuevo } of toUpload) {
                try {
                    await uploadFile(
                        rel,
                        abs,
                        `${esNuevo ? 'Nuevo' : 'Actualizado'} desde ZIP (.subirzip)`,
                        remote.get(rel)
                    );
                    ok.push(rel);
                    if (esNuevo) nuevos.push(rel);
                    else actualizados.push(rel);
                } catch (e) {
                    console.error('[ZIP] Falló', rel, ':', e.message);
                    failed.push({ rel, error: e.message });
                }
            }

            // PASO 6: Limpiar tmp
            try { await fs.promises.rm(tmpBase, { recursive: true, force: true }); } catch {}

            // PASO 7: Reporte final
            const previewNuevos = nuevos.slice(0, 6).map(p => '┃ 🆕 ' + p);
            const previewAct = actualizados.slice(0, 6).map(p => '┃ ✏️ ' + p);
            const previewFail = failed.slice(0, 4).map(f => '┃ ❌ ' + f.rel + ' — ' + f.error.slice(0, 50));

            const todoOk = failed.length === 0;

            let texto =
                '╭━━〔 ' + (todoOk ? '✅' : '⚠️') + ' 𝐙𝐈𝐏 𝐒𝐔𝐁𝐈𝐃𝐎 𝐀 𝐆𝐈𝐓𝐇𝐔𝐁 〕━━⬣\n' +
                '┃\n' +
                '┃ 📦 ZIP: *' + fileName + '*\n' +
                '┃ 📊 Total en ZIP: ' + archivosZip.length + ' archivos\n' +
                '┃\n' +
                '┃ 🆕 Nuevos: *' + nuevos.length + '*\n' +
                '┃ ✏️ Actualizados: *' + actualizados.length + '*\n' +
                '┃ ✅ Sin cambios: *' + sinCambios.length + '*\n' +
                '┃ ❌ Fallidos: *' + failed.length + '*\n' +
                '┃\n' +
                '┃ 🌐 Repo: ' + REPO + '\n' +
                '┃ 🌿 Rama: ' + BRANCH + '\n';

            if (previewNuevos.length) {
                texto += '┃\n┣━━〔 🆕 𝐍𝐔𝐄𝐕𝐎𝐒 〕━━⬣\n' + previewNuevos.join('\n') + '\n';
                if (nuevos.length > 6) texto += '┃ … y ' + (nuevos.length - 6) + ' más\n';
            }

            if (previewAct.length) {
                texto += '┃\n┣━━〔 ✏️ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐃𝐎𝐒 〕━━⬣\n' + previewAct.join('\n') + '\n';
                if (actualizados.length > 6) texto += '┃ … y ' + (actualizados.length - 6) + ' más\n';
            }

            if (previewFail.length) {
                texto += '┃\n┣━━〔 ❌ 𝐅𝐀𝐋𝐋𝐈𝐃𝐎𝐒 〕━━⬣\n' + previewFail.join('\n') + '\n';
            }

            texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(texto);

        } catch (error) {
            console.error('[subirzip] Error:', error);
            await responder.texto('❌ Error: ' + (error?.message || error));
        }
    }
};