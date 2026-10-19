import { loadCommands } from './lib/cmdManager.js';
import { revisarAntilink, estaActivo as antilinkActivo } from './lib/antilink.js';
import { verificarPermisosAdmin } from './lib/grupos.js';
import { manejarMensajeTrivia } from './lib/trivia.js';
import { manejarMensajeTetris } from './lib/tetris.js';
import { manejarMensajeAdivinanza } from './lib/adivinanza.js';
import { manejarMensajeTTT } from './lib/ttt.js';
import { manejarRespuestaAhorcado } from './commands/economy/ahorcado.js';
import { categoriaActiva } from './lib/categoriaConfig.js';
import { obtenerAfk, quitarAfk } from './lib/afkStore.js';
import { fmtTiempo } from './lib/helpers.js';
import { estaMuteado } from './database/mutes.js';
import { estaActivo as modoadminActivo } from './database/modoadmin.js';
import { esAdminGrupo } from './lib/adminCheck.js';
import { aplicarEstilo } from './lib/estilos.js'; // <-- IMPORTADO AQUÍ
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_CONFIG = path.join(__dirname, 'database', 'config.json');

const OWNERS_PRINCIPALES = ['50578391933', '50577455383', '50368309162'];

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esOwner(sock, msg) {
    const candidatos = [msg.key.participant, msg.key.senderPn, msg.key.participantAlt, msg.key.sender, msg.key.remoteJid].filter(Boolean);
    for (const c of candidatos) {
        if (OWNERS_PRINCIPALES.includes(numeroVisible(c))) return true;
    }
    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn && OWNERS_PRINCIPALES.includes(numeroVisible(pn))) return true;
            }
        }
    } catch (e) {}
    return false;
}

let _prefijoCache = '.';
let _prefijoLeidoEn = 0;
const PREFIJO_TTL_MS = 5000;

function obtenerPrefijoActual() {
    const ahora = Date.now();
    if (ahora - _prefijoLeidoEn < PREFIJO_TTL_MS) return _prefijoCache;
    _prefijoLeidoEn = ahora;
    try {
        const config = JSON.parse(fs.readFileSync(RUTA_CONFIG, 'utf8'));
        _prefijoCache = config.prefijo || '.';
    } catch (e) {}
    return _prefijoCache;
}

let comandos = null;
let botJid = null;
const RUTA_TOP = path.join(__dirname, 'database', 'topComandos.json');
let topStats = null;
let topSaveTimer = null;

function cargarTopStats() {
    if (topStats) return topStats;
    try {
        topStats = fs.existsSync(RUTA_TOP) ? JSON.parse(fs.readFileSync(RUTA_TOP, 'utf8')) : { comandos: {}, usuarios: {}, total: 0 };
    } catch { topStats = { comandos: {}, usuarios: {}, total: 0 }; }
    return topStats;
}

function guardarTopStats() {
    try {
        fs.mkdirSync(path.dirname(RUTA_TOP), { recursive: true });
        fs.writeFileSync(RUTA_TOP, JSON.stringify(topStats, null, 2), 'utf8');
    } catch (e) {}
}

function registrarUsoComando(nombreCmd, senderNum) {
    try {
        const db = cargarTopStats();
        db.comandos[nombreCmd] = (db.comandos[nombreCmd] || 0) + 1;
        db.total = (db.total || 0) + 1;
        if (senderNum) db.usuarios[senderNum] = (db.usuarios[senderNum] || 0) + 1;
        if (!topSaveTimer) {
            topSaveTimer = setTimeout(() => { topSaveTimer = null; guardarTopStats(); }, 3000);
        }
    } catch (e) {}
}

export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }
    return comandos;
}

function buscarSesionPlay(msg) {
    const sessions = global.playSessions;
    if (!sessions) return null;
    const candidatos = [msg.key?.participant, msg.key?.senderPn, msg.key?.participantAlt, msg.key?.remoteJidAlt, msg.key?.sender, msg.key?.remoteJid];
    for (const c of candidatos) { if (c && sessions[c]) return { clave: c, session: sessions[c] }; }
    return null;
}

function extraerButtonId(msg) {
    try {
        if (msg.message?.buttonsResponseMessage?.selectedButtonId) return msg.message.buttonsResponseMessage.selectedButtonId;
        if (msg.message?.templateButtonReplyMessage?.selectedId) return msg.message.templateButtonReplyMessage.selectedId;
        if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            const json = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            return json.id || json.selected_row_id || null;
        }
        if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    } catch (e) {}
    return null;
}

let _rutaPlayCache = null;
function buscarArchivoPlay() {
    if (_rutaPlayCache) return _rutaPlayCache;
    const base = path.join(__dirname, 'commands');
    function buscarEn(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) { const r = buscarEn(fullPath); if (r) return r; } 
                else if (entry.isFile() && entry.name.toLowerCase() === 'play.js') return fullPath;
            }
        } catch (e) {}
        return null;
    }
    const encontrado = buscarEn(base);
    if (encontrado) _rutaPlayCache = encontrado;
    return encontrado;
}

export async function handleMessage(sock, msg, _ignorado = null, listaComandos = []) {
    
    // ══ INTERCEPTOR GLOBAL: Aplica estilo a CUALQUIER mensaje de texto o imagen que envíe el bot ══
    if (!sock._stylePatched) {
        const originalSend = sock.sendMessage.bind(sock);
        sock.sendMessage = async function(jid, message, options = {}) {
            if (message && message.text) {
                message.text = aplicarEstilo(message.text);
            }
            if (message && message.caption) {
                message.caption = aplicarEstilo(message.caption);
            }
            return originalSend(jid, message, options);
        };
        sock._stylePatched = true;
        console.log('[HANDLER] ✅ Interceptor de estilos global activado');
    }

    const prefijo = obtenerPrefijoActual();
    try {
        if (!comandos) comandos = await loadCommands();
        if (!botJid) botJid = sock.user.id;
        if (!msg.message) return;
        if (msg.key.remoteJid === 'status@broadcast') return;

        const jid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isGroup = jid?.endsWith('@g.us');

        if (!isGroup) {
            let antiPrivadoActivo = false;
            try {
                const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'database', 'antiprivado.json'), 'utf8'));
                antiPrivadoActivo = config.activo;
            } catch {}
            if (antiPrivadoActivo && !(await esOwner(sock, msg))) return;
        }

        let texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
        if (!texto && msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try { const json = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson); texto = json.id || json.display_text || ''; } catch {}
        }
        if (!texto && msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            texto = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        }

        const buttonId = extraerButtonId(msg);

        if (!fromMe && (texto || buttonId)) {
            const textoLimpio = String(texto || '').trim().toLowerCase();
            const btnIdLimpio = String(buttonId || '').trim().toLowerCase();
            const esAudio = btnIdLimpio === 'playaudio' || btnIdLimpio === 'play_audio' || textoLimpio === 'playaudio' || textoLimpio === 'play_audio' || textoLimpio === '1' || textoLimpio === '🎵 audio' || textoLimpio === 'audio';
            const esVideo = btnIdLimpio === 'playvideo' || btnIdLimpio === 'play_video' || textoLimpio === 'playvideo' || textoLimpio === 'play_video' || textoLimpio === '2' || textoLimpio === '🎬 video' || textoLimpio === 'video';
            
            if (esAudio || esVideo) {
                const encontrada = buscarSesionPlay(msg);
                if (encontrada && Date.now() - encontrada.session.timestamp < 600000) {
                    try {
                        const rutaPlay = buscarArchivoPlay();
                        if (rutaPlay) {
                            const playMod = await import(rutaPlay);
                            const responder = { texto: async (t) => { await sock.sendMessage(jid, { text: t }, { quoted: msg }); } };
                            if (esAudio) await playMod.procesarAudio(sock, msg, encontrada.session.video, responder);
                            else await playMod.procesarVideo(sock, msg, encontrada.session.video, responder);
                        }
                        delete global.playSessions[encontrada.clave];
                        return;
                    } catch (e) { console.error('[PLAY-SESSION] Error:', e?.message); }
                } else if (encontrada) { delete global.playSessions[encontrada.clave]; }
            }
        }

        if (!fromMe) {
            if (await manejarRespuestaAhorcado(sock, msg)) return;
            if (await manejarMensajeTrivia(sock, msg)) return;
            if (await manejarMensajeTetris(sock, msg)) return;
            if (await manejarMensajeAdivinanza(sock, msg)) return;
            if (await manejarMensajeTTT(sock, msg)) return;
        }

        if (!texto) return;
        if (/^\d+$/.test(texto.trim()) && global.menuMap?.[jid]?.[parseInt(texto.trim())]) {
            texto = `${prefijo}menu ${global.menuMap[jid][parseInt(texto.trim())]}`;
        }
        if (!texto.startsWith(prefijo)) return;

        if (isGroup && modoadminActivo(jid) && !(await esAdminGrupo(sock, msg, jid))) return;

        const sinPrefijo = texto.slice(prefijo.length).trim();
        const indiceEspacio = sinPrefijo.search(/\s/);
        const nombreComando = (indiceEspacio === -1 ? sinPrefijo : sinPrefijo.slice(0, indiceEspacio)).toLowerCase();
        const argumento = indiceEspacio === -1 ? '' : sinPrefijo.slice(indiceEspacio + 1);
        const args = argumento ? argumento.split(' ') : [];

        if (nombreComando === 'menu' && args[0] && !isNaN(args[0]) && global.menuMap?.[jid]?.[parseInt(args[0])]) {
            args[0] = global.menuMap[jid][parseInt(args[0])];
        }

        const cmd = comandos.get(nombreComando);
        if (!cmd) return;

        try {
            const catCmd = String(cmd.categoria || '').toLowerCase().trim();
            if (catCmd && catCmd !== 'system' && catCmd !== 'owner' && !categoriaActiva(jid, catCmd)) {
                await sock.sendMessage(jid, { text: `╭━━〔 🔴 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀 𝐃𝐄𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n┃\n┃ 📂 Categoría: *${catCmd.toUpperCase()}*\n┃ 🚫 Comando: ${prefijo}${nombreComando}\n┃\n┃ 🟢 Reactiva con:\n┃ ➪ ${prefijo}activar ${catCmd}\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣` }, { quoted: msg });
                return;
            }
        } catch (e) { console.error('[CATEGORIAS] Error:', e?.message); }

        registrarUsoComando(cmd.nombre || nombreComando, String(msg.key.participant || msg.key.remoteJid || '').split('@')[0].replace(/\D/g, ''));

        await cmd.ejecutar({
            sock, msg, args, argumento, listaComandos, prefijo, fromMe, isGroup, jid, botJid,
            responder: {
                texto: async (text) => { await sock.sendMessage(jid, { text }, { quoted: msg }); },
                imagen: async (img, caption = '') => { await sock.sendMessage(jid, { image: img, caption }, { quoted: msg }); },
                video: async (vid, caption = '') => { await sock.sendMessage(jid, { video: vid, caption }, { quoted: msg }); },
                audio: async (aud, ptt = true) => { await sock.sendMessage(jid, { audio: aud, mimetype: 'audio/mpeg', ptt }, { quoted: msg }); }
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error:', error);
        if (!msg.key.fromMe) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
}