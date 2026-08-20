// handler.js
import { loadCommands } from './controllers/cmdManager.js';

const PREFIJO = '.';

let comandos = null;

export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }
    return comandos;
}

export async function handleMessage(sock, msg) {
    try {
        if (!comandos) {
            comandos = await loadCommands();
        }

        const texto = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     '';

        if (!texto.startsWith(PREFIJO)) return;

        const args = texto.slice(PREFIJO.length).trim().split(/\s+/);
        const nombreComando = args.shift().toLowerCase();
        const argumento = args.join(' ').trim();

        const cmd = comandos.get(nombreComando);
        if (!cmd) return;

        await cmd.ejecutar({
            sock,
            msg,
            argumento,
            responder: {
                texto: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                },
                imagen: async (img, caption) => {
                    await sock.sendMessage(msg.key.remoteJid, { image: img, caption }, { quoted: msg });
                },
                video: async (vid, caption) => {
                    await sock.sendMessage(msg.key.remoteJid, { video: vid, caption }, { quoted: msg });
                }
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error al manejar mensaje:', error);
    }
}