// ============================================================
// COMANDO: MENU
// ALEX BOT / BOT-API
// Menú principal con botón dinámico "Ver canal"
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

const CANAL_FILE = path.join(
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

// ============================================================
// NOMBRES DE CATEGORÍAS
// ============================================================

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

// ============================================================
// ORDEN
// ============================================================

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
// LEER CANAL
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

        const url =
            typeof datos?.url === 'string'
                ? datos.url.trim()
                : '';

        if (!url) {
            return null;
        }

        return url;

    } catch (error) {

        console.error(
            '[MENU] Error leyendo canal.json:',
            error?.message || error
        );

        return null;
    }
}

// ============================================================
// COMANDO
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

            // ------------------------------------------------
            // 1. ORGANIZAR COMANDOS
            // ------------------------------------------------

            const grupos = {};

            for (const cmd of listaComandos) {

                const cat =
                    cmd.categoria ||
                    'Otros';

                if (!grupos[cat]) {
                    grupos[cat] = [];
                }

                grupos[cat].push(cmd);
            }

            // ------------------------------------------------
            // 2. ESTADÍSTICAS
            // ------------------------------------------------

            const totalComandos =
                listaComandos.length;

            const uptime =
                formatUptime(
                    process.uptime()
                );

            const mem =
                (
                    process
                        .memoryUsage()
                        .rss /
                    1024 /
                    1024
                ).toFixed(1);

            // ------------------------------------------------
            // 3. ENCABEZADO
            // ------------------------------------------------

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

            // ------------------------------------------------
            // 4. ORDENAR CATEGORÍAS
            // ------------------------------------------------

            const categoriasOrdenadas = [
                ...ORDEN_CATEGORIAS.filter(
                    cat => grupos[cat]
                ),

                ...Object.keys(grupos).filter(
                    cat =>
                        !ORDEN_CATEGORIAS.includes(cat)
                )
            ];

            // ------------------------------------------------
            // 5. MOSTRAR CATEGORÍAS
            // ------------------------------------------------

            for (const cat of categoriasOrdenadas) {

                const cmds =
                    grupos[cat];

                if (!cmds?.length) {
                    continue;
                }

                const icono =
                    CATEGORIAS[cat] ||
                    '📦';

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
                    '└───────────────────────────────┘\n\n';
            }

            // ------------------------------------------------
            // 6. PIE DEL MENÚ
            // ------------------------------------------------

            texto += `
╔═══════════════════════════════════╗
║         ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡         ║
║  🚀 Rápido • 🔒 Seguro • 💫 Evolutivo  ║
╚═══════════════════════════════════╝
`;

            // ------------------------------------------------
            // 7. OBTENER CANAL
            // ------------------------------------------------

            const canal =
                obtenerCanal();

            const jid =
                msg?.key?.remoteJid;

            if (!jid) {
                return;
            }

            // ------------------------------------------------
            // 8. ENVIAR MENÚ CON BOTÓN
            // ------------------------------------------------

            if (fs.existsSync(FOTO_MENU)) {

                const mensaje = {
                    image: {
                        url: FOTO_MENU
                    },

                    caption: texto
                };

                // ------------------------------------------------
                // SOLO AGREGAR BOTÓN SI HAY CANAL
                // ------------------------------------------------

                if (canal) {

                    mensaje.templateButtons = [
                        {
                            index: 1,
                            urlButton: {
                                displayText: 'Ver canal',
                                url: canal
                            }
                        }
                    ];
                }

                await sock.sendMessage(
                    jid,
                    mensaje,
                    {
                        quoted: msg,

                        mediaUploadTimeoutMs:
                            120000
                    }
                );

            } else {

                // ------------------------------------------------
                // SI NO EXISTE FOTO
                // ------------------------------------------------

                if (canal) {

                    await sock.sendMessage(
                        jid,
                        {
                            text: texto,

                            templateButtons: [
                                {
                                    index: 1,
                                    urlButton: {
                                        displayText: 'Ver canal',
                                        url: canal
                                    }
                                }
                            ]
                        },
                        {
                            quoted: msg
                        }
                    );

                } else {

                    await responder.texto(
                        texto
                    );
                }
            }

        } catch (error) {

            console.error(
                '[MENU] Error:',
                error?.stack ||
                error?.message ||
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
        Math.floor(
            seconds / 86400
        );

    const h =
        Math.floor(
            (seconds % 86400) / 3600
        );

    const m =
        Math.floor(
            (seconds % 3600) / 60
        );

    const s =
        Math.floor(
            seconds % 60
        );

    return `${d}d ${h}h ${m}m ${s}s`;
}