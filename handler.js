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
import fs from 'fs';
import path from 'path';

const PREFIJO = '.';

let comandos = null;
let botJid = null;

export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }
    return comandos;
}

// ============================================================
// 🔑 BUSCAR SESIÓN DE PLAY (por cualquier JID del sender)
// ============================================================
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

// ============================================================
// 🔑 EXTRAER ID DE BOTÓN (TODAS las fuentes posibles)
// ============================================================
function extraerButtonId(msg) {
    try {
        // 1. Botones tradicionales
        if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
            return msg.message.buttonsResponseMessage.selectedButtonId;
        }

        // 2. Template buttons (el que está usando tu fork)
        if (msg.message?.templateButtonReplyMessage?.selectedId) {
            return msg.message.templateButtonReplyMessage.selectedId;
        }

        // 3. Native flow / interactive
        if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            const json = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            return json.id || json.selected_row_id || null;
        }

        // 4. Lista
        if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            return msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        }
    } catch (e) {}

    return null;
}

// ============================================================
// 🔑 BUSCAR RUTA REAL DEL ARCHIVO PLAY.JS
// ============================================================
function buscarArchivoPlay() {
    const rutas = [
        './commands/downloader/play.js',
        './commands/downloader/play2.js',
        './commands/play/play.js',
        './commands/musica/play.js',
        './commands/music/play.js',
        './commands/youtube/play.js',
        './commands/media/play.js'
    ];

    for (const ruta of rutas) {
        const abs = path.resolve(process.cwd(), ruta);
        if (fs.existsSync(abs)) return abs;
    }
    return null;
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

        // ============================================
        // AFK
        // ============================================
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

        // ============================================
        // ANTILINK
        // ============================================
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

        // ============================================
        // SACAR TEXTO
        // ============================================
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

        // 🔑 ID del botón presionado
        const buttonId = extraerButtonId(msg);

        // ============================================
        // 🎵 PLAY SESSIONS (ANTES que juegos/memoria)
        // ============================================
        if (!fromMe && (texto || buttonId)) {
            const textoLimpio = String(texto || '').trim().toLowerCase();
            const btnIdLimpio = String(buttonId || '').trim().toLowerCase();

            // 🔑 Aceptar TODOS los formatos posibles
            const esAudio =
                btnIdLimpio === 'playaudio' ||      // ← el que manda tu fork
                btnIdLimpio === 'play_audio' ||
                textoLimpio === 'playaudio' ||
                textoLimpio === 'play_audio' ||
                textoLimpio === '1' ||
                textoLimpio === '🎵 audio' ||
                textoLimpio === 'audio';

            const esVideo =
                btnIdLimpio === 'playvideo' ||      // ← el que manda tu fork
                btnIdLimpio === 'play_video' ||
                textoLimpio === 'playvideo' ||
                textoLimpio === 'play_video' ||
                textoLimpio === '2' ||
                textoLimpio === '🎬 video' ||
                textoLimpio === 'video';

            if (esAudio || esVideo) {
                const encontrada = buscarSesionPlay(msg);

                console.log(
                    '[PLAY-DEBUG] texto:', JSON.stringify(texto),
                    '| buttonId:', buttonId,
                    '| esAudio:', esAudio,
                    '| esVideo:', esVideo,
                    '| sesión:', encontrada ? 'SÍ' : 'NO'
                );

                if (encontrada) {
                    const { clave, session } = encontrada;

                    if (Date.now() - session.timestamp < 600000) {
                        try {
                            // 🔑 Buscar ruta real del archivo play.js
                            const rutaPlay = buscarArchivoPlay();

                            if (!rutaPlay) {
                                console.error('[PLAY-SESSION] ❌ No se encontró play.js en ninguna ruta conocida');
                                console.log('[PLAY-SESSION] Rutas buscadas: commands/downloader/play.js, commands/play/play.js, etc.');

                                // Fallback: buscar en todos los subdirectorios de commands
                                const dirs = fs.readdirSync(path.join(process.cwd(), 'commands'));
                                for (const dir of dirs) {
                                    const subDir = path.join(process.cwd(), 'commands', dir);
                                    if (fs.statSync(subDir).isDirectory()) {
                                        const archivos = fs.readdirSync(subDir).filter(f => f.toLowerCase().includes('play'));
                                        if (archivos.length > 0) {
                                            console.log(`[PLAY-SESSION] 📂 Archivos con "play" en commands/${dir}/:`, archivos);
                                        }
                                    }
                                }

                                delete global.playSessions[clave];
                                return;
                            }

                            console.log('[PLAY-SESSION] 📂 Importando:', rutaPlay);
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

                            delete global.playSessions[clave];
                            return;
                        } catch (e) {
                            console.error('[PLAY-SESSION] Error:', e?.message || e);
                            console.error('[PLAY-SESSION] Stack:', e?.stack);
                        }
                    } else {
                        delete global.playSessions[clave];
                    }
                }
            }
        }

        // ============================================
        // JUEGOS ACTIVADOS
        // ============================================
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

        // ============================================
        // MEMORIA IA
        // ============================================
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
                            '╭━━〔 🔴 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀 𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n' +
                            '┃\n' +
                            '┃ 📂 Categoría: *' + catCmd.toUpperCase() + '*\n' +
                            '┃ 🚫 Comando: .' + nombreComando + '\n' +
                            '┃\n' +
                            '┃ 🟢 Reactiva con:\n' +
                            '┃ ➪ .activar ' + catCmd + '\n' +
                            '┃\n' +
                            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    }, { quoted: msg });
                    return;
                }
            }
        } catch (e) {
            console.error('[CATEGORIAS] Error en bloqueo:', e?.message || e);
        }

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