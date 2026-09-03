// ============================================================
// handler.js
// ============================================================
// BOT-API
// MANEJADOR PRINCIPAL DE MENSAJES
//
// Incluye:
// - Comandos
// - AFK
// - Minijuegos
// - Categorías
// - Sistema de niveles / XP
//
// IMPORTANTE:
// La XP NO se entrega por mensajes normales.
// La XP se entrega desde lib/minijuegos.js únicamente cuando
// un jugador participa realmente en un minijuego.
// ============================================================

import { loadCommands } from './controllers/cmdManager.js';
import { procesarMinijuegos } from './lib/minijuegos.js';

import {
    quitarAfk,
    buscarAfkPorIds,
    obtenerIdentificadores,
    formatearTiempoAfk
} from './lib/afk.js';

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
// COMANDOS DE CONTROL
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

function comandoDesactivado(
    cmd,
    jid,
    nombreComando
) {

    if (
        esComandoControl(
            nombreComando
        )
    ) {
        return false;
    }

    if (!jid) {
        return false;
    }

    const categoria =
        obtenerCategoria(cmd);

    if (!categoria) {
        return false;
    }

    return !categoriaActivada(
        categoria
    );
}

// ============================================================
// OBTENER IDENTIDAD DEL REMITENTE
// ============================================================
//
// En grupos:
//
// participant
// participantAlt
//
// En privado:
//
// participant
// remoteJid
// remoteJidAlt
//
// Nunca usamos remoteJid del grupo como usuario.
// ============================================================

function obtenerRemitente(
    msg,
    isGroup,
    jid
) {

    if (isGroup) {

        return (
            msg?.key?.participant ||
            msg?.key?.participantAlt ||
            null
        );
    }

    return (
        msg?.key?.participant ||
        msg?.key?.remoteJid ||
        msg?.key?.remoteJidAlt ||
        jid ||
        null
    );
}

// ============================================================
// COMPROBAR SI ES MENSAJE REAL DEL USUARIO
// ============================================================

function tieneContenidoDeUsuario(
    msg
) {

    return Boolean(

        msg.message?.conversation ||

        msg.message
            ?.extendedTextMessage ||

        msg.message
            ?.imageMessage ||

        msg.message
            ?.videoMessage ||

        msg.message
            ?.audioMessage ||

        msg.message
            ?.documentMessage ||

        msg.message
            ?.stickerMessage ||

        msg.message
            ?.contactMessage ||

        msg.message
            ?.contactsArrayMessage ||

        msg.message
            ?.locationMessage ||

        msg.message
            ?.liveLocationMessage ||

        msg.message
            ?.buttonsResponseMessage ||

        msg.message
            ?.listResponseMessage ||

        msg.message
            ?.templateButtonReplyMessage ||

        msg.message
            ?.interactiveResponseMessage
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
                sock.user?.id ||
                null;
        }

        // ----------------------------------------------------
        // VALIDACIONES
        // ----------------------------------------------------

        if (!msg?.message) {
            return;
        }

        if (
            msg.key?.remoteJid ===
            'status@broadcast'
        ) {
            return;
        }

        const jid =
            msg.key?.remoteJid;

        if (!jid) {
            return;
        }

        const fromMe =
            Boolean(
                msg.key?.fromMe
            );

        const isGroup =
            jid.endsWith(
                '@g.us'
            );

        // ====================================================
        // SISTEMA AFK
        // ====================================================

        const textoInicial =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            '';

        const comandoEsAfk =
            /^\s*\.afk(?:\s|$)/i.test(
                String(
                    textoInicial
                )
            );

        // ----------------------------------------------------
        // Solo el usuario que realmente manda un mensaje
        // puede salir de AFK.
        //
        // Los mensajes del bot NO cancelan AFK.
        // Las menciones tampoco cancelan AFK.
        // ----------------------------------------------------

        const contenidoUsuario =
            tieneContenidoDeUsuario(
                msg
            );

        const remitenteReal =
            obtenerRemitente(
                msg,
                isGroup,
                jid
            );

        if (
            !fromMe &&
            !comandoEsAfk &&
            contenidoUsuario &&
            remitenteReal
        ) {

            const regreso =
                quitarAfk({
                    jid,
                    msg
                });

            if (regreso) {

                const participante =
                    remitenteReal ||
                    regreso.usuario;

                const numero =
                    String(
                        participante
                    )
                        .split('@')[0]
                        .split(':')[0]
                        .replace(
                            /\D/g,
                            ''
                        );

                const frasesRegreso = [

                    'volvió de las profundidades 🌊',

                    'salió de las sombras 🌑',

                    'regresó al mundo real 🌎',

                    'ha vuelto de su viaje 🌀',

                    'regresó entre los vivos 👀',

                    'volvió a la civilización 🗿'
                ];

                const frase =
                    frasesRegreso[
                        Math.floor(
                            Math.random() *
                            frasesRegreso.length
                        )
                    ];

                const tiempo =
                    formatearTiempoAfk(
                        regreso.desde
                    );

                const menciones =
                    numero
                        ? [
                            `${numero}@s.whatsapp.net`
                        ]
                        : obtenerIdentificadores(
                            msg
                        );

                await sock.sendMessage(
                    jid,
                    {
                        text:
                            `╭━━〔 🟢 *REGRESO* 〕━━⬣\n` +
                            `┃\n` +
                            `┃ 👋 @${numero || 'usuario'} ${frase}.\n` +
                            `┃ ⏱️ Estuvo AFK: *${tiempo}*\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━⬣`,
                        mentions:
                            menciones
                    },
                    {
                        quoted: msg
                    }
                );
            }
        }

        // ====================================================
        // AVISAR SI ALGUIEN MENCIONA A UN USUARIO AFK
        // ====================================================

        const mencionados =
            msg.message
                ?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid ||

            msg.message
                ?.imageMessage
                ?.contextInfo
                ?.mentionedJid ||

            msg.message
                ?.videoMessage
                ?.contextInfo
                ?.mentionedJid ||

            [];

        if (
            Array.isArray(
                mencionados
            ) &&
            mencionados.length
        ) {

            for (
                const mencionado
                of mencionados
            ) {

                const afk =
                    buscarAfkPorIds({
                        jid,
                        ids: [
                            mencionado
                        ]
                    });

                if (!afk) {
                    continue;
                }

                const razon =
                    afk.razon
                        ? `\n┃ 💬 Motivo: *${afk.razon}*`
                        : '';

                const numero =
                    String(
                        mencionado
                    )
                        .split('@')[0]
                        .split(':')[0]
                        .replace(
                            /\D/g,
                            ''
                        );

                await sock.sendMessage(
                    jid,
                    {
                        text:
                            `╭━━〔 💤 *USUARIO AFK* 〕━━⬣\n` +
                            `┃\n` +
                            `┃ 👤 @${numero || 'usuario'} está AFK.\n` +
                            `┃ ⏱️ Desde hace: *${formatearTiempoAfk(afk.desde)}*` +
                            `${razon}\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━⬣`,
                        mentions: [
                            mencionado
                        ]
                    },
                    {
                        quoted: msg
                    }
                );

                break;
            }
        }

        // ====================================================
        // MINIJUEGOS
        // ====================================================
        //
        // IMPORTANTE:
        //
        // Aquí se procesa la participación en los juegos.
        //
        // lib/minijuegos.js se encarga de entregar XP SOLO
        // cuando uno de los juegos devuelve true.
        //
        // Por eso un mensaje normal NO genera XP.
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
                        '┃ activarla con:\n' +
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

        // ============================================================
// EJECUTAR COMANDO
// ============================================================

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

    if (!msg?.key?.fromMe) {

        try {

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

        } catch (sendError) {

            console.error(
                '[HANDLER] No se pudo enviar el error:',
                sendError
            );
        }
    }
}
}
       
                  
 
      
        
                
        
             
    
                