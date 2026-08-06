import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { crearRespondedor } from './lib/responder.js';
import { registrarUso } from './lib/estadisticas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREFIJO = '.';

// Lee todos los archivos de /commands y los carga en un mapa nombre -> comando
export async function cargarComandos() {
    const carpeta = path.join(__dirname, 'commands');
    const archivos = fs.readdirSync(carpeta).filter(f => f.endsWith('.js'));
    const mapaComandos = new Map();
    const listaComandos = [];

    for (const archivo of archivos) {
        const modulo = await import(`./commands/${archivo}`);
        const cmd = modulo.default;
        mapaComandos.set(cmd.nombre, cmd);
        (cmd.alias || []).forEach(a => mapaComandos.set(a, cmd));
        listaComandos.push(cmd);
    }

    return { mapaComandos, listaComandos };
}

// Crea la función que se ejecuta cada vez que llega un mensaje
export function crearManejador(sock, mapaComandos, listaComandos) {
    return async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // Ignora mensajes viejos (ej. que llegaron de golpe al reconectar el bot)
        const marcaTiempo = (msg.messageTimestamp?.low ?? msg.messageTimestamp ?? 0) * 1000;
        if (marcaTiempo && Date.now() - marcaTiempo > 10000) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!texto.startsWith(PREFIJO)) return;

        const [comandoCrudo, ...resto] = texto.slice(PREFIJO.length).trim().split(' ');
        const nombreComando = comandoCrudo.toLowerCase();
        const argumento = resto.join(' ').trim();
        const responder = crearRespondedor(sock, msg);

        const cmd = mapaComandos.get(nombreComando);
        if (!cmd) {
            if (nombreComando) await responder.texto(`Comando no reconocido. Escribe *${PREFIJO}menu* para ver todos los comandos.`);
            return;
        }

        try {
            await cmd.ejecutar({ sock, msg, responder, argumento, listaComandos, prefijo: PREFIJO });
            registrarUso(cmd.nombre);
        } catch (e) {
            console.error(`[COMANDO ${nombreComando}]`, e.message);
            await responder.texto('⚠️ Ocurrió un error procesando tu solicitud. Intenta de nuevo.');
        }
    };
}
