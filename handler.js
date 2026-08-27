
// handler.js
import { loadCommands } from './controllers/cmdManager.js';

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
        const isGroup = jid.endsWith('@g.us');

        const texto = msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text ||
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption ||
                     '';

        if (!texto) return;

        // FIX 1: ACEPTAR SOLO NUMERO EJ: "1"
        if (/^\d+$/.test(texto.trim())) {
            const num = parseInt(texto.trim());
            const mapa = global.menuMap?.[jid];
            if (mapa && mapa[num]) {
                const catSeleccionada = mapa[num];
                let cmdMenu = comandos.get('menu');
                if (!cmdMenu) cmdMenu = [...comandos.values()].find(c => c.alias?.includes('menu'));
                if (cmdMenu) {
                    return await cmdMenu.ejecutar({
                        sock, msg, argumento: catSeleccionada, listaComandos, prefijo,
                        fromMe, isGroup, jid, botJid, responder: {
                            texto: async (text) => { await sock.sendMessage(jid, { text }, { quoted: msg }); },
                            imagen: async (img, caption = '') => { await sock.sendMessage(jid, { image: img, caption }, { quoted: msg }); },
                            video: async (vid, caption = '') => { await sock.sendMessage(jid, { video: vid, caption }, { quoted: msg }); },
                            audio: async (aud, ptt = true) => { await sock.sendMessage(jid, { audio: aud, mimetype: 'audio/mpeg', ptt }, { quoted: msg }); }
                        }
                    });
                }
            }
        }

        if (!texto.startsWith(prefijo)) return;

        // Separar comando y argumento
        const sinPrefijo = texto.slice(prefijo.length).trim(); // <-- AQUI ESTABA EL ERROR
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

        const args = argumento? argumento.split(' ') : [];

        // FIX 2: ACEPTAR.menu 1
        if (nombreComando === 'menu' && args[0] &&!isNaN(args[0])) {
            const num = parseInt(args[0]);
            const mapa = global.menuMap?.[jid];
            if (mapa && mapa[num]) {
                const catSeleccionada = mapa[num];
                let cmdMenu = comandos.get('menu');
                if (!cmdMenu) cmdMenu = [...comandos.values()].find(c => c.alias?.includes('menu'));
                if (cmdMenu) {
                    return await cmdMenu.ejecutar({
                        sock, msg, argumento: catSeleccionada, listaComandos, prefijo,
                        fromMe, isGroup, jid, botJid, responder: {
                            texto: async (text) => { await sock.sendMessage(jid, { text }, { quoted: msg }); },
                            imagen: async (img, caption = '') => { await sock.sendMessage(jid, { image: img, caption }, { quoted: msg }); },
                            video: async (vid, caption = '') => { await sock.sendMessage(jid, { video: vid, caption }, { quoted: msg }); },
                            audio: async (aud, ptt = true) => { await sock.sendMessage(jid, { audio: aud, mimetype: 'audio/mpeg', ptt }, { quoted: msg }); }
                        }
                    });
                }
            }
        }

        // Buscar comando o alias normal
        let cmd = comandos.get(nombreComando);
        if (!cmd) {
            cmd = [...comandos.values()].find(c => c.alias?.includes(nombreComando));
        }
        if (!cmd) return;

        await cmd.ejecutar({
            sock, msg, argumento, listaComandos, prefijo,
            fromMe, isGroup, jid, botJid, responder: {
                texto: async (text) => { await sock.sendMessage(jid, { text }, { quoted: msg }); },
                imagen: async (img, caption = '') => { await sock.sendMessage(jid, { image: img, caption }, { quoted: msg }); },
                video: async (vid, caption = '') => { await sock.sendMessage(jid, { video: vid, caption }, { quoted: msg }); },
                audio: async (aud, ptt = true) => { await sock.sendMessage(jid, { audio: aud, mimetype: 'audio/mpeg', ptt }, { quoted: msg }); }
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error al manejar mensaje:', error);
        if (!msg.key.fromMe) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
}