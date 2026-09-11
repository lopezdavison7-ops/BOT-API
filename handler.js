import { loadCommands } from './controllers/cmdManager.js';
import { revisarAntilink } from './lib/antilink.js';
import { verificarPermisosAdmin } from './lib/grupos.js';
import fs from 'fs';
import path from 'path';

const PREFIJO = '.';
const RUTA_AFK = path.join(process.cwd(), 'database', 'afk.json');

let comandos = null;
let botJid = null;

function leerAfk() {
    try { return JSON.parse(fs.readFileSync(RUTA_AFK, 'utf8')); } catch (e) { return {}; }
}
function guardarAfk(db) {
    fs.mkdirSync(path.dirname(RUTA_AFK), { recursive: true });
    fs.writeFileSync(RUTA_AFK, JSON.stringify(db, null, 2), 'utf8');
}
function fmtTiempo(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + sec + 's';
    return sec + 's';
}

export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }
    return comandos;
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
        // 🔥 DETECTOR AFK AUTÓNOMO
        // ============================================
        if (!fromMe) {
            try {
                const textoMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const esComandoAfk = /^\.afk/i.test(textoMsg.trim());

                if (!esComandoAfk) {
                    const db = leerAfk();
                    const sender = msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;

                    if (db[sender]) {
                        const data = db[sender];
                        delete db[sender];
                        guardarAfk(db);

                        const numero = String(sender).split('@')[0].split(':')[0].replace(/\D/g, '');

                        await sock.sendMessage(jid, {
                            text:
                                `╭━━〔 ✅ 𝐕𝐎𝐋𝐕𝐈𝐒𝐓𝐄 〕━━⬣\n` +
                                `┃\n` +
                                `┃ 🎉 @${numero} ya regresaste!\n` +
                                `┃\n` +
                                `┃ 💤 Estuviste AFK: *${fmtTiempo(Date.now() - data.tiempo)}*\n` +
                                (data.razon ? `┃ 📝 Razón: ${data.razon}\n` : '') +
                                `┃\n` +
                                `┃ 🎈 Bienvenido de vuelta\n` +
                                `┃\n` +
                                `╰━━━━━━━━━━━━━━━━⬣`,
                            mentions: numero ? [`${numero}@s.whatsapp.net`] : []
                        }, { quoted: msg });
                    }
                }
            } catch (e) {
                console.error('[AFK] Error en detector:', e?.message || e);
            }
        }

        // ============================================
        // ANTILINK — SOLO ENLACES DE WHATSAPP
        // ============================================
        if (isGroup && !fromMe) {
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
                texto = json.id || '';
            } catch {}
        }
        else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            texto = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
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