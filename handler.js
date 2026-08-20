// handler.js
import { loadCommands } from './controllers/cmdManager.js';

const PREFIJO = '.';
let mapaComandos = null;

// Cargar comandos una sola vez al inicio
export async function inicializarComandos() {
    if (!mapaComandos) {
        mapaComandos = await loadCommands();
        console.log(`[HANDLER] ✅ Mapa de comandos cargado (${mapaComandos.size} comandos)`);
    }
    return mapaComandos;
}

export function handleMessage(sock, msg) {
    try {
        const texto = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     '';

        if (!texto.startsWith(PREFIJO)) return;

        const args = texto.slice(PREFIJO.length).trim().split(/\s+/);
        const nombreComando = args.shift().toLowerCase();
        const argumento = args.join(' ').trim();

        if (!mapaComandos) {
            console.error('[HANDLER] ❌ Mapa de comandos no inicializado.');
            return;
        }

        const cmd = mapaComandos.get(nombreComando);
        if (!cmd) {
            // Comando no encontrado (ignorar silenciosamente o responder)
            // sock.sendMessage(msg.key.remoteJid, { text: `❌ Comando "${nombreComando}" no reconocido.` });
            return;
        }

        // Ejecutar el comando
        cmd.ejecutar({
            sock,
            msg,
            responder: {
                texto: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                },
                imagen: async (img, caption) => {
                    await sock.sendMessage(msg.key.remoteJid, { image: img, caption }, { quoted: msg });
                }
            },
            argumento
        });

    } catch (error) {
        console.error('[HANDLER] Error:', error);
    }
}