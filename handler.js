import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { crearRespondedor } from './lib/responder.js';
import { registrarUso } from './lib/estadisticas.js';
import { esOwner } from './lib/owner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREFIJO = '.';

// ============================================================
// CARGAR COMANDOS
// ============================================================

export async function cargarComandos() {
    const carpeta = path.join(__dirname, 'commands');

    const archivos = fs
        .readdirSync(carpeta)
        .filter(f => f.endsWith('.js'));

    const mapaComandos = new Map();
    const listaComandos = [];

    for (const archivo of archivos) {
        try {
            const modulo = await import(`./commands/${archivo}`);
            const cmd = modulo.default;

            if (!cmd || !cmd.nombre || typeof cmd.ejecutar !== 'function') {
                console.warn(
                    `⚠️ Comando ignorado: ${archivo} (formato inválido)`
                );
                continue;
            }

            mapaComandos.set(cmd.nombre.toLowerCase(), cmd);

            for (const alias of cmd.alias || []) {
                mapaComandos.set(alias.toLowerCase(), cmd);
            }

            listaComandos.push(cmd);

        } catch (error) {
            console.error(
                `❌ No se pudo cargar ${archivo}:`,
                error.message
            );
        }
    }

    return {
        mapaComandos,
        listaComandos
    };
}

// ============================================================
// MANEJADOR DE MENSAJES
// ============================================================

export function crearManejador(
    sock,
    mapaComandos,
    listaComandos
) {
    return async ({ messages }) => {

        const msg = messages?.[0];

        if (!msg?.message || msg.key?.fromMe) {
            return;
        }

        // ----------------------------------------------------
        // IGNORAR MENSAJES ANTIGUOS
        // ----------------------------------------------------

        const marcaTiempo =
            (msg.messageTimestamp?.low ??
                msg.messageTimestamp ??
                0) * 1000;

        if (
            marcaTiempo &&
            Date.now() - marcaTiempo > 10000
        ) {
            return;
        }

        // ----------------------------------------------------
        // OBTENER TEXTO
        // ----------------------------------------------------

        const texto =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

        if (!texto.startsWith(PREFIJO)) {
            return;
        }

        const partes = texto
            .slice(PREFIJO.length)
            .trim()
            .split(/\s+/);

        const comandoCrudo = partes.shift() || '';

        const nombreComando =
            comandoCrudo.toLowerCase();

        const argumento =
            partes.join(' ').trim();

        const responder =
            crearRespondedor(sock, msg);

        // ----------------------------------------------------
        // BUSCAR COMANDO
        // ----------------------------------------------------

        const cmd =
            mapaComandos.get(nombreComando);

        if (!cmd) {
            if (nombreComando) {
                await responder.texto(
                    `❌ Comando no reconocido.\n\nEscribe *${PREFIJO}menu* para ver los comandos.`
                );
            }

            return;
        }

        // ----------------------------------------------------
        // COMPROBAR OWNER
        // ----------------------------------------------------

        if (cmd.owner === true && !esOwner(msg)) {

            await responder.texto(
                '⛔ Este comando es exclusivo del Owner.'
            );

            return;
        }

        // ----------------------------------------------------
        // EJECUTAR COMANDO
        // ----------------------------------------------------

        try {

            await cmd.ejecutar({
                sock,
                msg,
                responder,
                argumento,
                listaComandos,
                prefijo: PREFIJO,
                esOwner: esOwner(msg)
            });

            registrarUso(cmd.nombre);

        } catch (error) {

            console.error(
                `[COMANDO ${nombreComando}]`,
                error
            );

            await responder.texto(
                '⚠️ Ocurrió un error procesando tu solicitud.'
            );
        }
    };
}
