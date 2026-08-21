// ============================================================
// MENÚ PRINCIPAL - ALEX BOT
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// RUTAS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const MOTOR = 'Baileys';

const FOTO_MENU = path.join(
    __dirname,
    '../..',
    'media',
    'menu',
    'menu.jpg'
);

const ARCHIVO_CANAL = path.join(
    __dirname,
    '../..',
    'database',
    'canal.json'
);

// ============================================================
// CATEGORÍAS
// ============================================================

const CATEGORIAS = {
    Owner: '👑',
    Administrador: '🛡️',
    Moderación: '🛡️',
    Grupos: '👥',
    Economia: '💰',
    economia: '💰',
    IA: '🤖',
    Multimedia: '🎨',
    Descargas: '📥',
    Diversión: '🎮',
    Interacción: '💬',
    Utilidades: '🛠️',
    Sistema: '⚙️',
    Otros: '📦'
};

const NOMBRES_CATEGORIAS = {
    Owner: '𝐎𝐖𝐍𝐄𝐑',
    Administrador: '𝐀𝐃𝐌𝐈𝐍',
    Moderación: '𝐌𝐎𝐃𝐄𝐑𝐀𝐂𝐈Ó𝐍',
    Grupos: '𝐆𝐑𝐔𝐏𝐎𝐒',
    Economia: '𝐄𝐂𝐎𝐍𝐎𝐌Í𝐀',
    economia: '𝐄𝐂𝐎𝐍𝐎𝐌Í𝐀',
    IA: '𝐈𝐀',
    Multimedia: '𝐌𝐔𝐋𝐓𝐈𝐌𝐄𝐃𝐈𝐀',
    Descargas: '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒',
    Diversión: '𝐃𝐈𝐕𝐄𝐑𝐒𝐈Ó𝐍',
    Interacción: '𝐈𝐍𝐓𝐄𝐑𝐀𝐂𝐂𝐈Ó𝐍',
    Utilidades: '𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒',
    Sistema: '𝐒𝐈𝐒𝐓𝐄𝐌𝐀',
    Otros: '𝐎𝐓𝐑𝐎𝐒'
};

const ORDEN_CATEGORIAS = [
    'Owner',
    'Administrador',
    'Moderación',
    'Grupos',
    'Economia',
    'IA',
    'Multimedia',
    'Descargas',
    'Diversión',
    'Interacción',
    'Utilidades',
    'Sistema',
    'Otros'
];

// ============================================================
// OBTENER CANAL
// ============================================================

function obtenerCanal() {
    try {
        if (!fs.existsSync(ARCHIVO_CANAL)) {
            return null;
        }

        const datos = JSON.parse(
            fs.readFileSync(ARCHIVO_CANAL, 'utf8')
        );

        if (!datos || typeof datos !== 'object') {
            return null;
        }

        const enlace = String(
            datos.url ||
            datos.link ||
            datos.enlace ||
            ''
        ).trim();

        if (!enlace) {
            return null;
        }

        if (
            !enlace.startsWith('https://whatsapp.com/channel/') &&
            !enlace.startsWith('https://www.whatsapp.com/channel/')
        ) {
            return null;
        }

        return enlace;

    } catch (error) {
        console.error(
            '[MENU] Error leyendo canal.json:',
            error.message
        );

        return null;
    }
}

// ============================================================
// MENÚ
// ============================================================

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],
    descripcion: 'Muestra todos los comandos disponibles.',

    async ejecutar({
        sock,
        msg,
        responder,
        listaComandos,
        prefijo
    }) {

        try {

            // ====================================================
            // ORGANIZAR COMANDOS
            // ====================================================

            const grupos = {};

            for (const cmd of listaComandos) {

                const cat =
                    cmd.categoria || 'Otros';

                if (!grupos[cat]) {
                    grupos[cat] = [];
                }

                grupos[cat].push(cmd);
            }

            // ====================================================
            // ESTADÍSTICAS
            // ====================================================

            const totalComandos =
                listaComandos.length;

            const uptime =
                formatUptime(process.uptime());

            const mem =
                (
                    process.memoryUsage().rss /
                    1024 /
                    1024
                ).toFixed(1);

            // ====================================================
            // ENCABEZADO
            // ====================================================

            let texto = `
╔═══════════════════════════════════╗
║        🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 🚀        ║
║       𝐄𝐋 𝐌𝐄𝐉𝐎𝐑 𝐌𝐄𝐍𝐔́        ║
╚═══════════════════════════════════╝

┌─── ⚡ 𝐄𝐒𝐓𝐀𝐃Í𝐒𝐓𝐈𝐂𝐀𝐒 ───┐
│ 👨‍💻 Creador: ${CREADOR}
│ 📦 Versión: ${VERSION}
│ ⚙️ Motor: ${MOTOR}
│ 📚 Comandos: ${totalComandos}
│ 🟢 Estado: Online
│ 🔧 Prefijo: ${prefijo}
│ ⏱️ Uptime: ${uptime}
│ 💾 RAM: ${mem} MB
└───────────────────────────────┘

┌─── 📋 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀𝐒 ───┐
│ 📌 Usa ${prefijo}help para ver este menú nuevamente.
└───────────────────────────────┘

`;

            // ====================================================
            // CATEGORÍAS
            // ====================================================

            const categoriasOrdenadas = [
                ...ORDEN_CATEGORIAS.filter(
                    c => grupos[c]
                ),

                ...Object.keys(grupos).filter(
                    c => !ORDEN_CATEGORIAS.includes(c)
                )
            ];

            for (const cat of categoriasOrdenadas) {

                const cmds = grupos[cat];

                if (!cmds?.length) {
                    continue;
                }

                const icono =
                    CATEGORIAS[cat] || '📦';

                const titulo =
                    NOMBRES_CATEGORIAS[cat] ||
                    cat.toUpperCase();

                texto += `
╔═══════════════════════════════════╗
║   ${icono} ${titulo}   ║
╚═══════════════════════════════════╝
`;

                for (const cmd of cmds) {

                    const desc =
                        cmd.descripcion ||
                        'Sin descripción';

                    texto +=
                        `│ ✦ ${prefijo}${cmd.nombre}\n`;

                    texto +=
                        `│   ↳ ${desc}\n`;
                }

                texto +=
                    `└───────────────────────────────┘\n\n`;
            }

            // ====================================================
            // PIE DEL MENÚ
            // ====================================================

            texto += `
╔═══════════════════════════════════╗
║         ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡         ║
║  🚀 Rápido • 🔒 Seguro • 💫 Evolutivo  ║
╚═══════════════════════════════════╝
`;

            // ====================================================
            // CANAL
            // ====================================================

            const canal = obtenerCanal();

            // ====================================================
            // SI HAY CANAL:
            // ENVIAR BOTÓN REAL DE WHATSAPP
            // ====================================================

            if (canal) {

                const mensaje = {
                    caption: texto,

                    // ------------------------------------------------
                    // BOTÓN REAL
                    // ------------------------------------------------
                    templateButtons: [
                        {
                            index: 1,
                            urlButton: {
                                displayText: '𝐕𝐄𝐑 𝐂𝐀𝐍𝐀𝐋',
                                url: canal
                            }
                        }
                    ]
                };

                // ------------------------------------------------
                // IMAGEN DEL MENÚ
                // ------------------------------------------------

                if (fs.existsSync(FOTO_MENU)) {

                    mensaje.image = {
                        url: FOTO_MENU
                    };

                }

                await sock.sendMessage(
                    msg.key.remoteJid,
                    mensaje,
                    {
                        quoted: msg,
                        mediaUploadTimeoutMs: 120000
                    }
                );

                return;
            }

            // ====================================================
            // SI NO HAY CANAL
            // MENÚ NORMAL SIN BOTÓN
            // ====================================================

            if (fs.existsSync(FOTO_MENU)) {

                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        image: {
                            url: FOTO_MENU
                        },
                        caption: texto
                    },
                    {
                        quoted: msg,
                        mediaUploadTimeoutMs: 120000
                    }
                );

            } else {

                await responder.texto(texto);

            }

        } catch (error) {

            console.error(
                '[MENU] Error:',
                error
            );

            await responder.texto(
                `❌ *MENÚ*\n\n` +
                `No se pudo mostrar el menú.\n\n` +
                `Usa ${prefijo}help nuevamente.`
            );
        }
    }
};

// ============================================================
// FORMATEAR UPTIME
// ============================================================

function formatUptime(seconds) {

    const d =
        Math.floor(seconds / 86400);

    const h =
        Math.floor(
            (seconds % 86400) / 3600
        );

    const m =
        Math.floor(
            (seconds % 3600) / 60
        );

    const s =
        Math.floor(seconds % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
}