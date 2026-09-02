// handler.js
// ============================================================
// BOT-API
// MANEJADOR PRINCIPAL DE MENSAJES
// ============================================================

import { loadCommands } from './controllers/cmdManager.js';
import { procesarMinijuegos } from './lib/minijuegos.js';

import {
    categoriaActivada
} from './lib/categoriaConfig.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PREFIJO = '.';

let comandos = null;
let botJid = null;

// ============================================================
// CARGAR COMANDOS
// ============================================================

export async function cargarComandosHandler() {

    if (!comandos) {

        comandos =
            await loadCommands();

        console.log(
            `[HANDLER] ✅ Comandos cargados: ${comandos.size}`
        );
    }

    return comandos;
}

// ============================================================
// OBTENER CATEGORÍA
// ============================================================

function obtenerCategoria(cmd) {

    if (!cmd) {
        return '';
    }

    return String(
        cmd.categoria || ''
    )
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        );
}

// ============================================================
// COMPROBAR COMANDO DE CONTROL
// ============================================================
//
// Estos comandos NO pueden ser bloqueados por el sistema
// de categorías, para que siempre sea posible volver a activar
// una categoría desactivada.
// ============================================================

function esComandoControl(
    nombreComando
) {

    return [
        'activar',
        'desactivar',
        'enable',
        'disable'
    ].includes(
        nombreComando
    );
}

// ============================================================
// COMPROBAR SI CATEGORÍA ESTÁ BLOQUEADA
// ============================================================

function comandoDesactivado(
    cmd,
    jid,
    nombreComando
) {

    // --------------------------------------------------------
    // Los comandos de control siempre funcionan.
    // --------------------------------------------------------

    if (
        esComandoControl(
            nombreComando
        )
    ) {
        return false;
    }

    // --------------------------------------------------------
    // Solo se aplica en grupos.
    // --------------------------------------------------------

    if (
        !jid ||
        !jid.endsWith('@g.us')
    ) {
        return false;
    }

    // --------------------------------------------------------
    // Obtener categoría del comando.
    // --------------------------------------------------------

    const categoria =
        obtenerCategoria(cmd);

    if (!categoria) {
        return false;
    }

    // --------------------------------------------------------
    // Comprobar configuración GLOBAL.
    // --------------------------------------------------------

    return !categoriaActivada(
        categoria
    );
}

// ============================================================
// MANEJAR MENSAJE
// ============================================================

export async function handleMessage(
    sock,
    msg,
    prefijo = '.',
    listaComandos = []
) {

    try {

        // ----------------------------------------------------
        // CARGAR COMANDOS
        // ----------------------------------------------------

        if (!comandos) {

            comandos =
                await loadCommands();
        }

        // ----------------------------------------------------
        // JID DEL BOT
        // ----------------------------------------------------

        if (!botJid) {
            botJid =
                sock.user.id;
        }

        // ----------------------------------------------------
        // VALIDACIONES
        // ----------------------------------------------------

        if (!msg.message) {
            return;
        }

        if (
            msg.key.remoteJid ===
            'status@broadcast'
        ) {
            return;
        }

        const jid =
            msg.key.remoteJid;

        const fromMe =
            msg.key.fromMe;

        const isGroup =
            jid.endsWith('@g.us');

        // ====================================================
        // MINIJUEGOS
        // ====================================================

        const fueMinijuego =
            await procesarMinijuegos(
                sock,
                msg
            );

        if (fueMinijuego) {
            return;
        }

        // ====================================================
        // OBTENER TEXTO
        // ====================================================

        let texto = '';

        if (
            msg.message
                ?.conversation
        ) {

            texto =
                msg.message
                    .conversation;

        } else if (
            msg.message
                ?.extendedTextMessage
                ?.text
        ) {

            texto =
                msg.message
                    .extendedTextMessage
                    .text;

        } else if (
            msg.message
                ?.imageMessage
                ?.caption
        ) {

            texto =
                msg.message
                    .imageMessage
                    .caption;

        } else if (
            msg.message
                ?.videoMessage
                ?.caption
        ) {

            texto =
                msg.message
                    .videoMessage
                    .caption;

        } else if (
            msg.message
                ?.interactiveResponseMessage
                ?.nativeFlowResponseMessage
                ?.paramsJson
        ) {

            try {

                const json =
                    JSON.parse(
                        msg.message
                            .interactiveResponseMessage
                            .nativeFlowResponseMessage
                            .paramsJson
                    );

                texto =
                    json.id || '';

            } catch {}

        } else if (
            msg.message
                ?.listResponseMessage
                ?.singleSelectReply
                ?.selectedRowId
        ) {

            texto =
                msg.message
                    .listResponseMessage
                    .singleSelectReply
                    .selectedRowId;
        }

        if (!texto) {
            return;
        }

        // ====================================================
        // MENÚ POR NÚMERO
        // ====================================================

        if (
            /^\d+$/.test(
                texto.trim()
            )
        ) {

            const num =
                parseInt(
                    texto.trim()
                );

            const mapa =
                global.menuMap?.[jid];

            if (
                mapa &&
                mapa[num]
            ) {

                const catSeleccionada =
                    mapa[num];

                texto =
                    `${prefijo}menu ${catSeleccionada}`;
            }
        }

        // ====================================================
        // PREFIJO
        // ====================================================

        if (
            !texto.startsWith(
                prefijo
            )
        ) {
            return;
        }

        // ====================================================
        // SEPARAR COMANDO
        // ====================================================

        const sinPrefijo =
            texto
                .slice(
                    prefijo.length
                )
                .trim();

        const indiceEspacio =
            sinPrefijo.search(
                /\s/
            );

        const nombreComando =
            (
                indiceEspacio === -1
                    ? sinPrefijo
                    : sinPrefijo.slice(
                        0,
                        indiceEspacio
                    )
            ).toLowerCase();

        const argumento =
            indiceEspacio === -1
                ? ''
                : sinPrefijo.slice(
                    indiceEspacio + 1
                );

        const args =
            argumento
                ? argumento.split(' ')
                : [];

        // ====================================================
        // FIX: .menu 1
        // ====================================================

        if (
            nombreComando === 'menu' &&
            args[0] &&
            !isNaN(args[0])
        ) {

            const num =
                parseInt(
                    args[0]
                );

            const mapa =
                global.menuMap?.[jid];

            if (
                mapa &&
                mapa[num]
            ) {

                args[0] =
                    mapa[num];
            }
        }

        // ====================================================
        // BUSCAR COMANDO
        // ====================================================

        let cmd =
            comandos.get(
                nombreComando
            );

        if (!cmd) {

            cmd =
                [
                    ...comandos.values()
                ].find(
                    c =>
                        c.alias?.includes(
                            nombreComando
                        )
                );
        }

        if (!cmd) {
            return;
        }

        // ====================================================
        // COMPROBAR CATEGORÍA GLOBAL
        // ====================================================

        if (
            comandoDesactivado(
                cmd,
                jid,
                nombreComando
            )
        ) {

            const categoria =
                cmd.categoria ||
                'desconocida';

            await sock.sendMessage(
                jid,
                {
                    text:
                        '╭━━〔 🔒 𝐂𝐎𝐌𝐀𝐍𝐃𝐎 𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐎 〕━━⬣\n' +
                        '┃\n' +
                        `┃ 📂 Categoría: *${categoria}*\n` +
                        '┃\n' +
                        '┃ 🔴 Esta categoría está\n' +
                        '┃ desactivada globalmente.\n' +
                        '┃\n' +
                        '┃ Un administrador puede\n' +
                        `┃ activarla con:\n` +
                        `┃ › .activar ${categoria}\n` +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣'
                },
                {
                    quoted: msg
                }
            );

            return;
        }

        // ====================================================
        // EJECUTAR COMANDO
        // ====================================================

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

                texto: async (
                    text
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            text
                        },
                        {
                            quoted: msg
                        }
                    );
                },

                imagen: async (
                    img,
                    caption = ''
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            image: img,
                            caption
                        },
                        {
                            quoted: msg
                        }
                    );
                },

                video: async (
                    vid,
                    caption = ''
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            video: vid,
                            caption
                        },
                        {
                            quoted: msg
                        }
                    );
                },

                audio: async (
                    aud,
                    ptt = true
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            audio: aud,
                            mimetype: 'audio/mpeg',
                            ptt
                        },
                        {
                            quoted: msg
                        }
                    );
                }
            }
        });

    } catch (error) {

        console.error(
            '[HANDLER] Error al manejar mensaje:',
            error
        );

        if (
            !msg.key.fromMe
        ) {

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        `❌ Error: ${error.message}`
                },
                {
                    quoted: msg
                }
            );
        }
    }
}