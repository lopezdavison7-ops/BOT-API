// commands/system/menu.js
// ============================================================
// MENÚ PRINCIPAL - ALEX BOT
// Diseño moderno estilo menú clásico
// Incluye:
// - Usuario
// - Usuarios registrados
// - Grupos
// - Comandos
// - Día y hora de ejecución
// - Uptime
// - Versión
// - Categorías dinámicas
// - Botón real para seguir el canal
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    generateWAMessageFromContent,
    proto,
    jidNormalizedUser
} from '@whiskeysockets/baileys';

// ============================================================
// RUTAS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANAL_FILE = path.join(
    __dirname,
    '../..',
    'database',
    'canal.json'
);

const PACKAGE_FILE = path.join(
    __dirname,
    '../..',
    'package.json'
);

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CREADOR = 'Luis González';
const NOMBRE_BOT = 'ALEX BOT';

// ============================================================
// CARGAR PACKAGE.JSON
// ============================================================

function obtenerPackage() {
    try {
        if (!fs.existsSync(PACKAGE_FILE)) {
            return {
                version: '2.0.0'
            };
        }

        return JSON.parse(
            fs.readFileSync(
                PACKAGE_FILE,
                'utf8'
            )
        );

    } catch (error) {

        console.error(
            '[MENU] Error leyendo package.json:',
            error.message
        );

        return {
            version: '2.0.0'
        };
    }
}

// ============================================================
// OBTENER CANAL
// ============================================================

function obtenerCanal() {

    try {

        if (!fs.existsSync(CANAL_FILE)) {
            return null;
        }

        const datos = JSON.parse(
            fs.readFileSync(
                CANAL_FILE,
                'utf8'
            )
        );

        const enlace =
            datos?.canal ||
            datos?.url ||
            datos?.link ||
            '';

        if (!enlace) {
            return null;
        }

        return String(enlace).trim();

    } catch (error) {

        console.error(
            '[MENU] Error leyendo canal.json:',
            error.message
        );

        return null;
    }
}

// ============================================================
// FORMATEAR UPTIME
// ============================================================

function formatUptime(seconds) {

    const h = Math.floor(
        seconds / 3600
    );

    const m = Math.floor(
        (seconds % 3600) / 60
    );

    const s = Math.floor(
        seconds % 60
    );

    return [
        h,
        m,
        s
    ]
        .map(
            valor =>
                String(valor).padStart(2, '0')
        )
        .join(':');
}

// ============================================================
// FECHA Y HORA DE NICARAGUA
// ============================================================

function obtenerFechaHora() {

    const ahora = new Date();

    const fecha = new Intl.DateTimeFormat(
        'es-NI',
        {
            timeZone: 'America/Managua',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }
    ).format(ahora);

    const hora = new Intl.DateTimeFormat(
        'es-NI',
        {
            timeZone: 'America/Managua',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }
    ).format(ahora);

    return {
        fecha,
        hora
    };
}

// ============================================================
// OBTENER NÚMERO DEL USUARIO
// ============================================================

function obtenerUsuario(msg) {

    const key = msg?.key || {};

    const candidatos = [
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt,
        key.participant,
        key.remoteJid
    ];

    for (const candidato of candidatos) {

        if (!candidato) continue;

        const numero = String(candidato)
            .split('@')[0]
            .split(':')[0]
            .replace(/\D/g, '');

        if (numero) {
            return {
                jid: candidato,
                numero
            };
        }
    }

    return {
        jid: null,
        numero: 'usuario'
    };
}

// ============================================================
// TOTAL DE COMANDOS
// ============================================================

function obtenerTotalComandos(listaComandos) {

    if (
        Array.isArray(listaComandos)
    ) {
        return listaComandos.length;
    }

    return 0;
}

// ============================================================
// OBTENER ESTADÍSTICAS OPCIONALES
// ============================================================

async function obtenerEstadisticas() {

    let usuarios = 0;
    let grupos = 0;

    try {

        if (
            global.User &&
            typeof global.User.countDocuments === 'function'
        ) {
            usuarios =
                await global.User.countDocuments();
        }

    } catch (error) {

        usuarios = 0;
    }

    try {

        if (
            global.Chat &&
            typeof global.Chat.countDocuments === 'function'
        ) {
            grupos =
                await global.Chat.countDocuments();
        }

    } catch (error) {

        grupos = 0;
    }

    return {
        usuarios,
        grupos
    };
}

// ============================================================
// OBTENER CATEGORÍA
// ============================================================

function normalizarCategoria(categoria) {

    if (!categoria) {
        return 'GENERAL';
    }

    const texto =
        String(categoria).trim();

    const equivalencias = {
        owner: 'OWNER',
        administrador: 'ADMINISTRADOR',
        admin: 'ADMINISTRADOR',
        moderacion: 'MODERACIÓN',
        moderación: 'MODERACIÓN',
        grupos: 'GRUPOS',
        economia: 'ECONOMÍA',
        economía: 'ECONOMÍA',
        ia: 'IA',
        multimedia: 'MULTIMEDIA',
        descargas: 'DESCARGAS',
        diversión: 'DIVERSIÓN',
        diversion: 'DIVERSIÓN',
        interacción: 'INTERACCIÓN',
        interaccion: 'INTERACCIÓN',
        utilidades: 'UTILIDADES',
        sistema: 'SISTEMA',
        stickers: 'STICKERS',
        otros: 'OTROS',
        general: 'GENERAL'
    };

    const clave =
        texto.toLowerCase();

    return equivalencias[clave] ||
        texto.toUpperCase();
}

// ============================================================
// ORDEN DE CATEGORÍAS
// ============================================================

const ORDEN_CATEGORIAS = [
    'OWNER',
    'ADMINISTRADOR',
    'MODERACIÓN',
    'GRUPOS',
    'ECONOMÍA',
    'IA',
    'MULTIMEDIA',
    'DESCARGAS',
    'DIVERSIÓN',
    'INTERACCIÓN',
    'UTILIDADES',
    'SISTEMA',
    'STICKERS',
    'OTROS',
    'GENERAL'
];

// ============================================================
// ICONOS
// ============================================================

const ICONOS = {

    OWNER: '👑',

    ADMINISTRADOR: '🛡️',

    MODERACIÓN: '🛡️',

    GRUPOS: '👥',

    'ECONOMÍA': '💰',

    IA: '🤖',

    MULTIMEDIA: '🎨',

    DESCARGAS: '📥',

    'DIVERSIÓN': '🎮',

    'INTERACCIÓN': '💬',

    UTILIDADES: '🛠️',

    SISTEMA: '⚙️',

    STICKERS: '🎨',

    OTROS: '📦',

    GENERAL: '📦'
};

// ============================================================
// CREAR TEXTO DEL MENÚ
// ============================================================

function construirMenu({
    listaComandos,
    usuario,
    estadisticas,
    prefijo,
    version
}) {

    const {
        fecha,
        hora
    } = obtenerFechaHora();

    const totalComandos =
        obtenerTotalComandos(
            listaComandos
        );

    // --------------------------------------------------------
    // AGRUPAR COMANDOS
    // --------------------------------------------------------

    const categorias = {};

    for (const comando of listaComandos) {

        if (!comando) continue;

        const categoria =
            normalizarCategoria(
                comando.categoria
            );

        if (!categorias[categoria]) {
            categorias[categoria] = [];
        }

        categorias[categoria].push(
            comando
        );
    }

    // --------------------------------------------------------
    // CABECERA
    // --------------------------------------------------------

    let texto = `

〔 Hello, my name is ${NOMBRE_BOT} 〕
➥ ⋄ 𝚄𝚜𝚞𝚊𝚛𝚒𝚘 : @${usuario.numero}
➥ ⋄ 𝚄𝚜𝚞𝚊𝚛𝚒𝚘𝚜: ${estadisticas.usuarios}
➥ ⋄ 𝙶𝚛𝚞𝚙𝚘𝚜  : ${estadisticas.grupos}
➥ ⋄ 𝙲𝚘𝚖𝚊𝚗𝚍𝚘𝚜: ${totalComandos}
➥ ⋄ 𝙳í𝚊     : ${fecha}
➥ ⋄ 𝙷𝚘𝚛𝚊    : ${hora}
➥ ⋄ 𝚄𝚙𝚝𝚒𝚖𝚎  : ${formatUptime(process.uptime())}
➥ ⋄ 𝚅𝚎𝚛𝚜𝚒ó𝚗  : ${version}

Sʏsᴛᴇᴍ ALEX BOT

`;

    // --------------------------------------------------------
    // CATEGORÍAS
    // --------------------------------------------------------

    const categoriasOrdenadas = [
        ...ORDEN_CATEGORIAS.filter(
            categoria =>
                categorias[categoria]
        ),

        ...Object.keys(categorias).filter(
            categoria =>
                !ORDEN_CATEGORIAS.includes(
                    categoria
                )
        )
    ];

    for (
        const categoria of categoriasOrdenadas
    ) {

        const comandos =
            categorias[categoria];

        if (
            !Array.isArray(comandos) ||
            comandos.length === 0
        ) {
            continue;
        }

        const icono =
            ICONOS[categoria] || '📦';

        texto +=
            `┌──「 *${icono} ${categoria}* 」──\n`;

        for (
            const comando of comandos
        ) {

            if (!comando.nombre) {
                continue;
            }

            texto +=
                `┃ ♛ *${prefijo}${comando.nombre}*`;

            if (
                Array.isArray(
                    comando.alias
                ) &&
                comando.alias.length > 0
            ) {

                texto +=
                    ` (${comando.alias.join(', ')})`;
            }

            texto += '\n';
        }

        texto +=
            `└───────────────\n\n`;
    }

    // --------------------------------------------------------
    // PIE
    // --------------------------------------------------------

    texto +=
        `> © Powered by ${CREADOR}.`;

    return {
        texto,
        usuario
    };
}

// ============================================================
// CREAR MENSAJE INTERACTIVO
// ============================================================

async function enviarMenuInteractivo({
    sock,
    msg,
    texto,
    canal,
    usuarioJid
}) {

    const jid =
        msg.key.remoteJid;

    // --------------------------------------------------------
    // SI NO HAY CANAL
    // --------------------------------------------------------

    if (!canal) {

        await sock.sendMessage(
            jid,
            {
                text: texto,
                mentions: usuarioJid
                    ? [usuarioJid]
                    : []
            },
            {
                quoted: msg
            }
        );

        return;
    }

    // --------------------------------------------------------
    // MENSAJE INTERACTIVO WHATSAPP
    // --------------------------------------------------------

    try {

        const mensaje =
            generateWAMessageFromContent(
                jid,
                {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage:
                                proto.Message.InteractiveMessage.create(
                                    {
                                        body:
                                            proto.Message.InteractiveMessage.Body.create(
                                                {
                                                    text: texto
                                                }
                                            ),

                                        footer:
                                            proto.Message.InteractiveMessage.Footer.create(
                                                {
                                                    text:
                                                        'ALEX BOT • Bot-API'
                                                }
                                            ),

                                        nativeFlowMessage:
                                            proto.Message.InteractiveMessage.NativeFlowMessage.create(
                                                {
                                                    buttons: [
                                                        {
                                                            name:
                                                                'cta_url',

                                                            buttonParamsJson:
                                                                JSON.stringify(
                                                                    {
                                                                        display_text:
                                                                            'SEGUIR CANAL',

                                                                        url:
                                                                            canal,

                                                                        merchant_url:
                                                                            canal
                                                                    }
                                                                )
                                                        }
                                                    ]
                                                }
                                            ),

                                        contextInfo: {
                                            mentionedJid:
                                                usuarioJid
                                                    ? [usuarioJid]
                                                    : []
                                        }
                                    }
                                )
                        }
                    }
                },
                {
                    userJid:
                        sock.user?.id,
                    quoted: msg
                }
            );

        await sock.relayMessage(
            jid,
            mensaje.message,
            {
                messageId:
                    mensaje.key.id
            }
        );

    } catch (error) {

        console.error(
            '[MENU] Error enviando botón:',
            error?.message || error
        );

        // ----------------------------------------------------
        // FALLBACK
        // ----------------------------------------------------

        await sock.sendMessage(
            jid,
            {
                text:
                    `${texto}\n\n🔗 Canal: ${canal}`,
                mentions: usuarioJid
                    ? [usuarioJid]
                    : []
            },
            {
                quoted: msg
            }
        );
    }
}

// ============================================================
// COMANDO MENU
// ============================================================

export default {

    nombre: 'menu',

    categoria: 'Sistema',

    alias: [
        'ayuda',
        'help'
    ],

    descripcion:
        'Muestra todos los comandos disponibles.',

    async ejecutar({
        sock,
        msg,
        responder,
        listaComandos,
        prefijo
    }) {

        try {

            console.log(
                '[MENU] Ejecutando menú...'
            );

            // ------------------------------------------------
            // DATOS
            // ------------------------------------------------

            const usuario =
                obtenerUsuario(msg);

            const packageData =
                obtenerPackage();

            const version =
                packageData.version ||
                '2.0.0';

            const estadisticas =
                await obtenerEstadisticas();

            // ------------------------------------------------
            // CONSTRUIR MENÚ
            // ------------------------------------------------

            const resultado =
                construirMenu({
                    listaComandos:
                        Array.isArray(
                            listaComandos
                        )
                            ? listaComandos
                            : [],

                    usuario,

                    estadisticas,

                    prefijo:
                        prefijo || '.',

                    version
                });

            // ------------------------------------------------
            // CANAL
            // ------------------------------------------------

            const canal =
                obtenerCanal();

            // ------------------------------------------------
            // ENVIAR
            // ------------------------------------------------

            await enviarMenuInteractivo({
                sock,

                msg,

                texto:
                    resultado.texto,

                canal,

                usuarioJid:
                    usuario.jid
            });

        } catch (error) {

            console.error(
                '[MENU] Error:',
                error
            );

            try {

                await responder.texto(
                    `❌ *MENÚ*\n\n` +
                    `No se pudo mostrar el menú.\n\n` +
                    `⚠️ ${error?.message || 'Error desconocido'}`
                );

            } catch (errorResponder) {

                console.error(
                    '[MENU] Error enviando respuesta:',
                    errorResponder
                );
            }
        }
    }
};