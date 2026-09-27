import { loadCommands } from './lib/cmdManager.js';
import { revisarAntilink, estaActivo as antilinkActivo } from './lib/antilink.js';
import { verificarPermisosAdmin } from './lib/grupos.js';
import { manejarMensajeTrivia } from './lib/trivia.js';
import { manejarMensajeTetris } from './lib/tetris.js';
import { manejarMensajeAdivinanza } from './lib/adivinanza.js';
import { manejarMensajeTTT } from './lib/ttt.js';
import { manejarMemoriaIA } from './lib/memoria.js';
import { categoriaActiva } from './lib/categoriaConfig.js';
import { obtenerAfk, quitarAfk } from './lib/afkStore.js';
import { fmtTiempo } from './lib/helpers.js';
import { obtenerMuteadoPorCandidatos } from './database/mutes.js';
import { estaActivo as modoadminActivo } from './database/modoadmin.js';
import { esAdminGrupo } from './lib/adminCheck.js';
import fs from 'fs';
import path from 'path';

const PREFIJO = '.';

let comandos = null;
let botJid = null;

const RUTA_TOP = path.join(process.cwd(), 'database', 'topComandos.json');
let topStats = null;
let topSaveTimer = null;

function cargarTopStats() {
    if (topStats) return topStats;
    try {
        topStats = fs.existsSync(RUTA_TOP)
            ? JSON.parse(fs.readFileSync(RUTA_TOP, 'utf8'))
            : { comandos: {}, usuarios: {}, total: 0 };
    } catch {
        topStats = { comandos: {}, usuarios: {}, total: 0 };
    }
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
            topSaveTimer = setTimeout(() => {
                topSaveTimer = null;
                guardarTopStats();
            }, 3000);
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

    const candidatos = [
        msg.key?.participant,
        msg.key?.senderPn,
        msg.key?.participantAlt,
        msg.key?.remoteJidAlt,
        msg.key?.sender,
        msg.key?.remoteJid
    ];

    for (const c of candidatos) {
        if (c && sessions[c]) {
            return { clave: c, session: sessions[c] };
        }
    }
    return null;
}

function extraerButtonId(msg) {
    try {
        if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
            return msg.message.buttonsResponseMessage.selectedButtonId;
        }

        if (msg.message?.templateButtonReplyMessage?.selectedId) {
            return msg.message.templateButtonReplyMessage.selectedId;
        }

        if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            const json = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            return json.id || json.selected_row_id || null;
        }

        if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            return msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        }
    } catch (e) {}

    return null;
}

function buscarArchivoPlay() {
    const base = path.join(process.cwd(), 'commands');

    function buscarEn(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const r = buscarEn(fullPath);
                    if (r) return r;
                } else if (entry.isFile() && entry.name.toLowerCase() === 'play.js') {
                    return fullPath;
                }
            }
        } catch (e) {}
        return null;
    }

    return buscarEn(base);
}

export async function handleMessage(sock, msg, prefijo = '.', listaComandos = []) {
    try {
        if (!comandos) {
            comandos = await loadCommands();
        }

        if (!botJid) botJid = sock.user.id;

        if (!msg.message) return;
        if (msg.key.remoteJid === 'status@broadcast') return;

        const jid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isGroup = jid?.endsWith('@g.us');

        if (!fromMe) {
            try {
                const textoMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const esComandoAfk = /^\.afk/i.test(textoMsg.trim());

                if (!esComandoAfk) {
                    const sender = msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;
                    const data = obtenerAfk(sender);

                    if (data) {
                        quitarAfk(sender);

                        let textoUser = '@' + String(sender).split('@')[0].replace(/\D/g, '');
                        let mentions = [sender];

                        try {
                            if (sender.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                                const pn = await sock.signalRepository.lidMapper.getPNForLid(sender);
                                if (pn) {
                                    const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                                    textoUser = '@' + pj.split('@')[0];
                                    mentions = [pj];
                                }
                            }
                        } catch (e) {}

                        if (textoUser.startsWith('@2599') || textoUser.includes('2599')) {
                            const nombreLimpio = String(data.nombre || '').replace(/[*_~`┃╭╰⬣@\n\r]/g, '').trim().slice(0, 25);
                            if (nombreLimpio) textoUser = '*' + nombreLimpio + '*';
                        }

                        await sock.sendMessage(jid, {
                            text:
                                `╭━━〔 ✅ 𝐕𝐎𝐋𝐕𝐈𝐒𝐓𝐄 〕━━⬣\n` +
                                `┃\n` +
                                `┃ 🎉 ${textoUser} ya regresaste!\n` +
                                `┃\n` +
                                `┃ 💤 Estuviste AFK: *${fmtTiempo(Date.now() - data.tiempo)}*\n` +
                                (data.razon ? `┃ 📝 Razón: ${data.razon}\n` : '') +
                                `┃\n` +
                                `┃ 🎈 Bienvenido de vuelta\n` +
                                `┃\n` +
                                `╰━━━━━━━━━━━━━━━━⬣`,
                            mentions
                        }, { quoted: msg });
                    }
                }
            } catch (e) {
                console.error('[AFK] Error en detector:', e?.message || e);
            }
        }

        if (!fromMe && isGroup) {
            const candidatos = [
                msg.key.participant,
                msg.key.senderPn,
                msg.key.participantAlt
            ];

            const muteado = obtenerMuteadoPorCandidatos(jid, candidatos);

            if (muteado) {
                try {
                    await sock.sendMessage(jid, {
                        delete: {
                            remoteJid: jid,
                            fromMe: false,
                            id: msg.key.id,
                            participant: msg.key.participant
                        }
                    });
                } catch (e) {}
                return;
            }
        }

        if (isGroup && !fromMe && antilinkActivo(jid)) {
            let esAdmin = false;

            try {
                const permiso = await verificarPermisosAdmin(sock, msg, jid);
                esAdmin = Boolean(permiso?.ok);
            } catch (error) {
                console.error('[ANTILINK] Error comprobando admin:', error?.message || error);
            }

            const bloqueado = await revisarAntilink(sock, msg, esAdmin);

            if (bloqueado) return;
        }

        let texto = '';

        if (msg.message?.conversation) {
            texto = msg.message.conversation;
        }
        else if (msg.message?.extendedTextMessage?.text) {
            texto = msg.message.extendedTextMessage.text;
        }
        else if (msg.message?.imageMessage?.caption) {
            texto = msg.message.imageMessage.caption;
        }
        else if (msg.message?.videoMessage?.caption) {
            texto = msg.message.videoMessage.caption;
        }
        else if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const json = JSON.parse(
                    msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
                );
                texto = json.id || json.display_text || '';
            } catch {}
        }
        else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            texto = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        }

        const buttonId = extraerButtonId(msg);

        if (!fromMe && (texto || buttonId)) {
            const textoLimpio = String(texto || '').trim().toLowerCase();
            const btnIdLimpio = String(buttonId || '').trim().toLowerCase();

            const esAudio =
                btnIdLimpio === 'playaudio' ||
                btnIdLimpio === 'play_audio' ||
                textoLimpio === 'playaudio' ||
                textoLimpio === 'play_audio' ||
                textoLimpio === '1' ||
                textoLimpio === '🎵 audio' ||
                textoLimpio === 'audio';

            const esVideo =
                btnIdLimpio === 'playvideo' ||
                btnIdLimpio === 'play_video' ||
                textoLimpio === 'playvideo' ||
                textoLimpio === 'play_video' ||
                textoLimpio === '2' ||
                textoLimpio === '🎬 video' ||
                textoLimpio === 'video';

            if (esAudio || esVideo) {
                const encontrada = buscarSesionPlay(msg);

                if (encontrada) {
                    const { clave, session } = encontrada;

                    if (Date.now() - session.timestamp < 600000) {
                        try {
                            const rutaPlay = buscarArchivoPlay();

                            if (rutaPlay) {
                                const playMod = await import(rutaPlay);
                                const { procesarAudio, procesarVideo } = playMod;

                                const responder = {
                                    texto: async (t) => {
                                        await sock.sendMessage(jid, { text: t }, { quoted: msg });
                                    }
                                };

                                if (esAudio) {
                                    await procesarAudio(sock, msg, session.video, responder);
                                } else {
                                    await procesarVideo(sock, msg, session.video, responder);
                                }
                            }

                            delete global.playSessions[clave];
                            return;
                        } catch (e) {
                            console.error('[PLAY-SESSION] Error:', e?.message || e);
                        }
                    } else {
                        delete global.playSessions[clave];
                    }
                }
            }
        }

        if (!fromMe) {
            const fueTrivia = await manejarMensajeTrivia(sock, msg);
            if (fueTrivia) return;

            const fueTetris = await manejarMensajeTetris(sock, msg);
            if (fueTetris) return;

            const fueAdivinanza = await manejarMensajeAdivinanza(sock, msg);
            if (fueAdivinanza) return;

            const fueTTT = await manejarMensajeTTT(sock, msg);
            if (fueTTT) return;
        }

        if (!fromMe) {
            const fueMemoria = await manejarMemoriaIA(sock, msg);
            if (fueMemoria) return;
        }

        if (!texto) return;

        if (/^\d+$/.test(texto.trim())) {
            const num = parseInt(texto.trim());
            const mapa = global.menuMap?.[jid];
            if (mapa && mapa[num]) {
                const catSeleccionada = mapa[num];
                texto = `${prefijo}menu ${catSeleccionada}`;
            }
        }

        if (!texto.startsWith(prefijo)) return;

        if (isGroup && modoadminActivo(jid)) {
            const esAdmin = await esAdminGrupo(sock, msg, jid);
            if (!esAdmin) return;
        }

        const sinPrefijo = texto.slice(prefijo.length).trim();
        const indiceEspacio = sinPrefijo.search(/\s/);

        const nombreComando = (
            indiceEspacio === -1
                ? sinPrefijo
                : sinPrefijo.slice(0, indiceEspacio)
        ).toLowerCase();

        const argumento =
            indiceEspacio === -1
                ? ''
                : sinPrefijo.slice(indiceEspacio + 1);

        const args = argumento ? argumento.split(' ') : [];

        if (nombreComando === 'menu' && args[0]) {
            if (!isNaN(args[0])) {
                const num = parseInt(args[0]);
                const mapa = global.menuMap?.[jid];
                if (mapa && mapa[num]) {
                    args[0] = mapa[num];
                }
            }
        }

        let cmd = comandos.get(nombreComando);
        if (!cmd) {
            cmd = [...comandos.values()].find(
                c => c.alias?.includes(nombreComando)
            );
        }
        if (!cmd) return;

        try {
            const catCmd = String(cmd.categoria || '').toLowerCase().trim();

            if (catCmd && catCmd !== 'system' && catCmd !== 'owner') {
                if (!categoriaActiva(jid, catCmd)) {
                    await sock.sendMessage(jid, {
                        text:
                            '╭━━〔 🔴 𝐂𝐓𝐄𝐆𝐎𝐑Í𝐀 𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n' +
                            '┃\n' +
                            '┃ 📂 Categoría: *' + catCmd.toUpperCase() + '*\n' +
                            '┃ 🚫 Comando: .' + nombreComando + '\n' +
                            '┃\n' +
                            '┃ 🟢 Reactiva con:\n' +
                            '┃ ➪ .activar ' + catCmd + '\n' +
                            '┃\n' +
                            '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    }, { quoted: msg });
                    return;
                }
            }
        } catch (e) {
            console.error('[CATEGORIAS] Error en bloqueo:', e?.message || e);
        }

        registrarUsoComando(
            cmd.nombre || nombreComando,
            String(msg.key.participant || msg.key.senderPn || msg.key.remoteJid || '')
                .split('@')[0].replace(/\D/g, '')
        );

        await cmd.ejecutar({
            sock,
            msg,
            args,
            argumento,
            listaComandos,
            prefijo,
            fromMe,
            isGroup,
            jid,
            botJid,
            responder: {
                texto: async (text) => {
                    await sock.sendMessage(
                        jid,
                        { text },
                        { quoted: msg }
                    );
                },
                imagen: async (img, caption = '') => {
                    await sock.sendMessage(
                        jid,
                        { image: img, caption },
                        { quoted: msg }
                    );
                },
                video: async (vid, caption = '') => {
                    await sock.sendMessage(
                        jid,
                        { video: vid, caption },
                        { quoted: msg }
                    );
                },
                audio: async (aud, ptt = true) => {
                    await sock.sendMessage(
                        jid,
                        {
                            audio: aud,
                            mimetype: 'audio/mpeg',
                            ptt
                        },
                        { quoted: msg }
                    );
                }
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error al manejar mensaje:', error);

        if (!msg.key.fromMe) {
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `❌ Error: ${error.message}`
                },
                { quoted: msg }
            );
        }
    }
}