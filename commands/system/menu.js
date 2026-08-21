// ============================================================
// MENU - BOT-API 2.0
// Menú principal del bot.
// ============================================================

import fs from 'fs';
import path from 'path';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const MOTOR = 'Baileys';

const FOTO_MENU = path.join(
    process.cwd(),
    'media',
    'menu',
    'menu.jpg'
);

const CANAL_FILE = path.join(
    process.cwd(),
    'database',
    'canal.json'
);

// ============================================================
// OBTENER TEXTO DEL MENSAJE
// ============================================================

function obtenerTexto(msg) {
    return (
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        ''
    );
}

// ============================================================
// OBTENER AUTOR
// ============================================================

function obtenerAutor(msg) {
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
            return candidato;
        }
    }

    return null;
}

// ============================================================
// CREAR MENCION
// ============================================================

function crearMencion(jid) {
    if (!jid) return null;

    const numero = String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');

    return numero
        ? `@${numero}`
        : null;
}

// ============================================================
// LEER CANAL
// ============================================================

function obtenerCanal() {
    try {
        if (!fs.existsSync(CANAL_FILE)) {
            return '';
        }

        const datos = JSON.parse(
            fs.readFileSync(
                CANAL_FILE,
                'utf8'
            )
        );

        return typeof datos.url === 'string'
            ? datos.url.trim()
            : '';

    } catch (error) {
        console.error(
            '[MENU] Error leyendo canal.json:',
            error?.message || error
        );

        return '';
    }
}

// ============================================================
// UPTIME
// ============================================================

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor(
        (seconds % 86400) / 3600
    );
    const m = Math.floor(
        (seconds % 3600) / 60
    );
    const s = Math.floor(
        seconds % 60
    );

    return `${d}d ${h}h ${m}m ${s}s`;
}

// ============================================================
// FECHA
// ============================================================

function obtenerFecha() {
    return new Intl.DateTimeFormat(
        'es-NI',
        {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }
    ).format(new Date());
}

// ============================================================
// HORA
// ============================================================

function obtenerHora() {
    return new Intl.DateTimeFormat(
        'es-NI',
        {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }
    ).format(new Date());
}

// ============================================================
// NORMALIZAR CATEGORÍA
// ============================================================

function normalizarCategoria(categoria) {
    return String(
        categoria || 'Otros'
    ).trim();
}

// ============================================================
// ICONOS
// ============================================================

function obtenerIcono(categoria) {
    const iconos = {
        Owner: '👑',
        owner: '👑',

        Administrador: '🛡️',
        administrador: '🛡️',

        Moderación: '🛡️',
        moderacion: '🛡️',

        Grupos: '👥',
        grupos: '👥',

        Economia: '💰',
        economia: '💰',

        IA: '🤖',
        ia: '🤖',

        Multimedia: '🎨',
        multimedia: '🎨',

        Descargas: '📥',
        descargas: '📥',

        Diversión: '🎮',
        diversion: '🎮',

        Interacción: '💬',
        interaccion: '💬',

        Utilidades: '🛠️',
        utilidades: '🛠️',

        Sistema: '⚙️',
        sistema: '⚙️',

        Otros: '📦',
        otros: '📦'
    };

    return (
        iconos[categoria] ||
        iconos[categoria.toLowerCase()] ||
        '📦'
    );
}

// ============================================================
// OBTENER COMANDOS
// ============================================================

function organizarComandos(listaComandos) {
    const categorias = {};

    for (const comando of listaComandos || []) {
        if (!comando) continue;

        const nombre = comando.nombre;

        if (!nombre) continue;

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

    return categorias;
}

// ============================================================
// TEXTO DEL MENÚ
// ============================================================

function construirMenu({
    autor,
    prefijo,
    listaComandos
}) {
    const mencion =
        crearMencion(autor) ||
        '@usuario';

    const categorias =
        organizarComandos(
            listaComandos
        );

    const totalComandos =
        Array.isArray(listaComandos)
            ? listaComandos.length
            : 0;

    let texto = '';

    // --------------------------------------------------------
    // PRESENTACIÓN
    // --------------------------------------------------------

    texto += `╭━━〔 🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 〕━━⬣
┃
┃ 👋 𝐇𝐎𝐋𝐀 ${mencion}
┃ 📅 𝐅𝐄𝐂𝐇𝐀 › ${obtenerFecha()}
┃ 🕐 𝐇𝐎𝐑𝐀 › ${obtenerHora()}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

`;

    // --------------------------------------------------------
    // INFORMACIÓN
    // --------------------------------------------------------

    texto += `╭━━〔 ⚡ 𝐈𝐍𝐅𝐎 〕━━⬣
┃
┃ 👨‍💻 𝐂𝐑𝐄𝐀𝐃𝐎𝐑 › ${CREADOR}
┃ 📦 𝐕𝐄𝐑𝐒𝐈Ó𝐍 › ${VERSION}
┃ ⚙️ 𝐌𝐎𝐓𝐎𝐑 › ${MOTOR}
┃ 📚 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 › ${totalComandos}
┃ 🟢 𝐄𝐒𝐓𝐀𝐃𝐎 › Online
┃ 🔧 𝐏𝐑𝐄𝐅𝐈𝐉𝐎 › ${prefijo}
┃ ⏱️ 𝐔𝐏𝐓𝐈𝐌𝐄 › ${formatUptime(process.uptime())}
┃ 💾 𝐑𝐀𝐌 › ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

`;

    // --------------------------------------------------------
    // INSTRUCCIONES
    // --------------------------------------------------------

    texto += `╭━━〔 📋 𝐌𝐄𝐍Ú 〕━━⬣
┃
┃ ✦ Usa *${prefijo}menu* para volver
┃   a abrir este menú.
┃
┃ ✦ Usa *${prefijo}menu <categoría>*
┃   para consultar una categoría.
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

`;

    // --------------------------------------------------------
    // CATEGORÍAS
    // --------------------------------------------------------

    const nombresCategorias =
        Object.keys(categorias);

    for (const categoria of nombresCategorias) {
        const comandos =
            categorias[categoria];

        if (!comandos?.length) {
            continue;
        }

        const icono =
            obtenerIcono(categoria);

        texto += `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣
┃
`;

        for (const comando of comandos) {
            const nombre =
                comando.nombre;

            const descripcion =
                comando.descripcion ||
                'Sin descripción';

            texto += `┃ ✦ *${prefijo}${nombre}*
┃   ↳ ${descripcion}
`;
        }

        texto += `┃
╰━━━━━━━━━━━━━━━━━━━━⬣

`;
    }

    // --------------------------------------------------------
    // PIE
    // --------------------------------------------------------

    texto += `╭━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━⬣
┃
┃ 🚀 Rápido
┃ 🔒 Seguro
┃ 💫 Evolutivo
┃
╰━━━━━━━━━━━━━━━━━━━━⬣`;

    return {
        texto,
        mencion
    };
}

// ============================================================
// COMANDO PRINCIPAL
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
            const autor =
                obtenerAutor(msg);

            const {
                texto,
                mencion
            } = construirMenu({
                autor,
                prefijo,
                listaComandos
            });

            const canal =
                obtenerCanal();

            const jid =
                msg?.key?.remoteJid;

            if (!jid) {
                return responder.texto(
                    texto
                );
            }

            const menciones =
                autor
                    ? [autor]
                    : [];

            // ----------------------------------------------------
            // MENÚ CON IMAGEN + BOTÓN DEL CANAL
            // ----------------------------------------------------

            if (
                canal &&
                fs.existsSync(FOTO_MENU)
            ) {
                try {
                    await sock.sendMessage(
                        jid,
                        {
                            image: {
                                url: FOTO_MENU
                            },
                            caption: texto,
                            mentions: menciones,

                            templateButtons: [
                                {
                                    index: 1,
                                    urlButton: {
                                        displayText:
                                            '📢 VER CANAL',
                                        url: canal
                                    }
                                }
                            ]
                        },
                        {
                            quoted: msg,
                            mediaUploadTimeoutMs:
                                120000
                        }
                    );

                    return;
                } catch (error) {
                    console.error(
                        '[MENU] Error enviando botón:',
                        error?.message || error
                    );
                }
            }

            // ----------------------------------------------------
            // MENÚ CON IMAGEN SIN BOTÓN
            // ----------------------------------------------------

            if (
                fs.existsSync(FOTO_MENU)
            ) {
                await sock.sendMessage(
                    jid,
                    {
                        image: {
                            url: FOTO_MENU
                        },
                        caption: texto,
                        mentions: menciones
                    },
                    {
                        quoted: msg,
                        mediaUploadTimeoutMs:
                            120000
                    }
                );

                return;
            }

            // ----------------------------------------------------
            // MENÚ SOLO TEXTO
            // ----------------------------------------------------

            await sock.sendMessage(
                jid,
                {
                    text: texto,
                    mentions: menciones
                },
                {
                    quoted: msg
                }
            );

        } catch (error) {
            console.error(
                '[MENU] Error:',
                error?.message || error
            );

            await responder.texto(
                `╭━━〔 ❌ 𝐌𝐄𝐍Ú 〕━━⬣
┃
┃ No se pudo mostrar el menú.
┃
┃ ⚠️ ${error?.message || 'Error desconocido'}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣`
            );
        }
    }
};