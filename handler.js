import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

import { loadCommands } from './controllers/cmdManager.js';
import { revisarAntilink } from './lib/antilink.js';
import { verificarPermisosAdmin } from './lib/grupos.js';
import { manejarMensajeTrivia } from './lib/trivia.js';
import { manejarMensajeTetris } from './lib/tetris.js';
import { manejarMensajeAdivinanza } from './lib/adivinanza.js';
import { manejarMemoriaIA } from './lib/memoria.js';

const PREFIJO = '.';
const RUTA_AFK = path.join(process.cwd(), 'database', 'afk.json');

if (!existsSync(path.dirname(RUTA_AFK))) {
    mkdirSync(path.dirname(RUTA_AFK), { recursive: true });
}

let comandos = null;

async function leerAfk() {
    try {
        const data = await fs.readFile(RUTA_AFK, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function guardarAfk(db) {
    try {
        await fs.writeFile(RUTA_AFK, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error('[AFK] Error guardando archivo:', e);
    }
}

function fmtTiempo(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d) return `${d}d${h}h`;
    if (h) return `${h}h${m}m`;
    if (m) return `${m}m${sec}s`;
    return `${sec}s`;
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
        if (!comandos) comandos = await loadCommands();

        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const jid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isGroup = jid?.endsWith('@g.us');
        const botJid = sock.user?.id;

        const texto = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            (() => {
                try {
                    return JSON.parse(msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}').id;
                } catch { return null; }
            })() ||
            msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            '';

        if (!fromMe) {
            try {
                const esComandoAfk = /^\.afk/i.test(texto.trim());
                if (!esComandoAfk) {
                    const db = await leerAfk();
                    const sender = msg.key.participant || msg.key.senderPn || msg.key.participantAlt || jid;

                    if (db[sender]) {
                        const data = db[sender];
                        delete db[sender];
                        await guardarAfk(db);

                        let textoUser = `@${String(sender).split('@')[0].replace(/\D/g, '')}`;
                        let mentions = [sender];

                        try {
                            if (sender.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                                const pn = await sock.signalRepository.lidMapper.getPNForLid(sender);
                                if (pn) {
                                    const pj = pn.includes('@') ? pn : `${pn}@s.whatsapp.net`;
                                    textoUser = `@${pj.split('@')[0]}`;
                                    mentions = [pj];
                                }
                            }
                        } catch {}

                        if (textoUser.startsWith('@2599') || textoUser.includes('2599')) {
                            const nombreLimpio = String(data.nombre || '').replace(/[*_~`┃╭╰⬣@\n\r]/g, '').trim().slice(0, 25);
                            if (nombreLimpio) textoUser = `*${nombreLimpio}*`;
                        }

                        await sock.sendMessage(jid, {
                            text: `╭━━〔 ✅ 𝐕𝐎𝐋𝐕𝐈𝐒𝐓𝐄 〕━━⬣\n┃\n┃ 🎉 ${textoUser} ya regresaste!\n┃\n┃ 💤 Estuviste AFK: *${fmtTiempo(Date.now() - data.tiempo)}*\n${data.razon ? `┃ 📝 Razón: ${data.razon}\n` : ''}┃\n┃ 🎈 Bienvenido de vuelta\n┃\n╰━━━━━━━━━━━━━━━━⬣`,
                            mentions
                        }, { quoted: msg });
                    }
                }
            } catch (e) {
                console.error('[AFK] Error en detector:', e?.message || e);
            }
        }

        if (isGroup && !fromMe) {
            let esAdmin = false;
            try {
                const permiso = await verificarPermisosAdmin(sock, msg, jid);
                esAdmin = Boolean(permiso?.ok);
            } catch {}

            if (await revisarAntilink(sock, msg, esAdmin)) return;
        }

        if (!fromMe) {
            if (await manejarMensajeTrivia(sock, msg)) return;
            if (await manejarMensajeTetris(sock, msg)) return;
            if (await manejarMensajeAdivinanza(sock, msg)) return;
            if (await manejarMemoriaIA(sock, msg)) return;
        }

        if (!texto) return;

        let txtProcesado = texto.trim();

        if (/^\d+$/.test(txtProcesado)) {
            const num = parseInt(txtProcesado);
            const mapa = global.menuMap?.[jid];
            if (mapa?.[num]) {
                txtProcesado = `${prefijo}menu ${mapa[num]}`;
            }
        }

        if (!txtProcesado.startsWith(prefijo)) return;

        const sinPrefijo = txtProcesado.slice(prefijo.length).trim();
        const indiceEspacio = sinPrefijo.search(/\s/);

        const nombreComando = (indiceEspacio === -1 ? sinPrefijo : sinPrefijo.slice(0, indiceEspacio)).toLowerCase();
        const argumento = indiceEspacio === -1 ? '' : sinPrefijo.slice(indiceEspacio + 1);
        const args = argumento ? argumento.split(' ') : [];

        if (nombreComando === 'menu' && args[0] && !isNaN(args[0])) {
            const num = parseInt(args[0]);
            const mapa = global.menuMap?.[jid];
            if (mapa?.[num]) args[0] = mapa[num];
        }

        let cmd = comandos.get(nombreComando) || [...comandos.values()].find(c => c.alias?.includes(nombreComando));
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
                texto: async (text) => sock.sendMessage(jid, { text }, { quoted: msg }),
                imagen: async (img, caption = '') => sock.sendMessage(jid, { image: img, caption }, { quoted: msg }),
                video: async (vid, caption = '') => sock.sendMessage(jid, { video: vid, caption }, { quoted: msg }),
                audio: async (aud, ptt = true) => sock.sendMessage(jid, { audio: aud, mimetype: 'audio/mpeg', ptt }, { quoted: msg })
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error al manejar mensaje:', error);
        if (!msg.key.fromMe) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg }).catch(() => {});
        }
    }
}
