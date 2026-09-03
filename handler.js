// handler.js
// ============================================================
// BOT-API
// MANEJADOR PRINCIPAL DE MENSAJES
// ============================================================

import { loadCommands } from './controllers/cmdManager.js';
import { procesarMinijuegos } from './lib/minijuegos.js';
import { buscarAfk, quitarAfk, buscarAfkPorIds, obtenerIdentificadores, formatearTiempoAfk } from './lib/afk.js';

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
            '');
}

// ============================================================
// COMANDOS DE CONTROL
// ============================================================
//
// Estos comandos NO se bloquean.
//
// Así siempre puedes volver a activar una categoría.
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
// COMPROBAR CATEGORÍA DESACTIVADA
// ============================================================
//
// IMPORTANTE:
//
// La configuración es GLOBAL.
//
// NO importa si el mensaje viene de:
// - Grupo
// - Chat privado
//
// Si la categoría está desactivada,
// el comando queda bloqueado.
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
    // Sin JID no hacemos nada.
    // --------------------------------------------------------

    if (!jid) {
        return false;
    }

    // --------------------------------------------------------
    // Obtener categoría.
    // --------------------------------------------------------

    const categoria =
        obtenerCategoria(cmd);

    if (!categoria) {
        return false;
    }

    // --------------------------------------------------------
    // CONFIGURACIÓN GLOBAL
    // --------------------------------------------------------
    //
    // No se comprueba @g.us.
    //
    // Por eso funciona también en privados.
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
        // JID BOT
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
        // SISTEMA AFK
        // ====================================================
        //
        // Si el usuario estaba AFK y vuelve a escribir, se le
        // quita automáticamente el estado y se anuncia su regreso.
        // .afk se procesa más abajo como comando normal, por lo que
        // entrar en AFK no se cancela en el mismo mensaje.
        // ====================================================

        const textoInicial =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            '';

        const comandoEsAfk = /^\s*\.afk(?:\s|$)/i.test(String(textoInicial));

        // Solo el usuario que realmente envía un mensaje puede salir
        // de AFK. Los mensajes enviados por el propio bot NO cuentan.
        // En grupos usamos participant/participantAlt como identidad del
        // remitente; remoteJid es el JID del grupo y nunca debe usarse
        // como identidad del usuario que está escribiendo.
        const tieneContenidoDeUsuario = Boolean(
            msg.message?.conversation ||
            msg.message?.extendedTextMessage ||
            msg.message?.imageMessage ||
            msg.message?.videoMessage ||
            msg.message?.audioMessage ||
            msg.message?.documentMessage ||
            msg.message?.stickerMessage ||
            msg.message?.contactMessage ||
            msg.message?.contactsArrayMessage ||
            msg.message?.locationMessage ||
            msg.message?.liveLocationMessage ||
            msg.message?.buttonsResponseMessage ||
            msg.message?.listResponseMessage ||
            msg.message?.templateButtonReplyMessage ||
            msg.message?.interactiveResponseMessage
        );

        const tieneRemitenteReal = isGroup
            ? Boolean(msg?.key?.participant || msg?.key?.participantAlt)
            : Boolean(msg?.key?.remoteJid);

        if (!fromMe && !comandoEsAfk && tieneContenidoDeUsuario && tieneRemitenteReal) {
            const regreso = quitarAfk({ jid, msg });

            if (regreso) {
                const participante = msg?.key?.participant || msg?.key?.remoteJid || regreso.usuario;
                const numero = String(participante)
                    .split('@')[0]
                    .split(':')[0]
                    .replace(/\D/g, '');

                const frasesRegreso = [
                    'volvió de las profundidades 🌊',
                    'salió de las sombras 🌑',
                    'regresó al mundo real 🌎',
                    'ha vuelto de su viaje 🌀',
                    'regresó entre los vivos 👀',
                    'volvió a la civilización 🗿'
                ];

                const frase = frasesRegreso[Math.floor(Math.random() * frasesRegreso.length)];
                const tiempo = formatearTiempoAfk(regreso.desde);
                const menciones = numero ? [`${numero}@s.whatsapp.net`] : obtenerIdentificadores(msg);

                await sock.sendMessage(jid, {
                    text: `╭━━〔 🟢 *REGRESO* 〕━━⬣\n┃\n┃ 👋 @${numero || 'usuario'} ${frase}.\n┃ ⏱️ Estuvo AFK: *${tiempo}*\n┃\n╰━━━━━━━━━━━━━━━━⬣`,
                    mentions: menciones
                }, { quoted: msg });
            }
        }

        // ----------------------------------------------------
        // AVISAR SI ALGUIEN MENCIONA A UN USUARIO AFK
        // ----------------------------------------------------

        const mencionados =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
            msg.message?.imageMessage?.contextInfo?.mentionedJid ||
            msg.message?.videoMessage?.contextInfo?.mentionedJid ||
            [];

        if (Array.isArray(mencionados) && mencionados.length) {
            for (const mencionado of mencionados) {
                const afk = buscarAfkPorIds({
                    jid,
                    ids: [mencionado]
                });

                if (!afk) continue;

                const razon = afk.razon
                    ? `\n┃ 💬 Motivo: *${afk.razon}*`
                    : '';

                const numero = String(mencionado)
                    .split('@')[0]
                    .split(':')[0]
                    .replace(/\D/g, '');

                await sock.sendMessage(jid, {
                    text: `╭━━〔 💤 *USUARIO AFK* 〕━━⬣\n┃\n┃ 👤 @${numero || 'usuario'} está AFK.\n┃ ⏱️ Desde hace: *${formatearTiempoAfk(afk.desde)}*${razon}\n┃\n╰━━━━━━━━━━━━━━━━⬣`,
                    mentions: [mencionado]
                }, { quoted: msg });

                break;
            }
        }

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
        // .MENU 1
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