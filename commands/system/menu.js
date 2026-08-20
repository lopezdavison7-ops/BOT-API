// commands/system/menu.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

const CATEGORIAS = {
    'Owner': '👑',
    'Administrador': '🛡️',
    'Moderación': '🛡️',
    'Grupos': '👥',
    'Economia': '💰',
    'economia': '💰',
    'IA': '🤖',
    'Multimedia': '🎨',
    'Descargas': '📥',
    'Diversión': '🎮',
    'Interacción': '💬',
    'Utilidades': '🛠️',
    'Sistema': '⚙️',
    'Otros': '📦'
};

const NOMBRES_CATEGORIAS = {
    'Owner': '𝐎𝐖𝐍𝐄𝐑',
    'Administrador': '𝐀𝐃𝐌𝐈𝐍',
    'Moderación': '𝐌𝐎𝐃𝐄𝐑𝐀𝐂𝐈Ó𝐍',
    'Grupos': '𝐆𝐑𝐔𝐏𝐎𝐒',
    'Economia': '𝐄𝐂𝐎𝐍𝐎𝐌Í𝐀',
    'economia': '𝐄𝐂𝐎𝐍𝐎𝐌Í𝐀',
    'IA': '𝐈𝐀',
    'Multimedia': '𝐌𝐔𝐋𝐓𝐈𝐌𝐄𝐃𝐈𝐀',
    'Descargas': '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒',
    'Diversión': '𝐃𝐈𝐕𝐄𝐑𝐒𝐈Ó𝐍',
    'Interacción': '𝐈𝐍𝐓𝐄𝐑𝐀𝐂𝐂𝐈Ó𝐍',
    'Utilidades': '𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒',
    'Sistema': '𝐒𝐈𝐒𝐓𝐄𝐌𝐀',
    'Otros': '𝐎𝐓𝐑𝐎𝐒'
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

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],
    descripcion: 'Muestra todos los comandos disponibles.',

    async ejecutar({ sock, msg, responder, listaComandos, prefijo }) {
        try {
            // 1. Organizar comandos por categoría
            const grupos = {};
            for (const cmd of listaComandos) {
                const cat = cmd.categoria || 'Otros';
                if (!grupos[cat]) grupos[cat] = [];
                grupos[cat].push(cmd);
            }

            // 2. Estadísticas
            const totalComandos = listaComandos.length;
            const uptime = formatUptime(process.uptime());
            const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

            // 3. Encabezado premium
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

            // 4. Categorías premium
            const categoriasOrdenadas = [
                ...ORDEN_CATEGORIAS.filter(c => grupos[c]),
                ...Object.keys(grupos).filter(c => !ORDEN_CATEGORIAS.includes(c))
            ];

            for (const cat of categoriasOrdenadas) {
                const cmds = grupos[cat];
                if (!cmds?.length) continue;

                const icono = CATEGORIAS[cat] || '📦';
                const titulo = NOMBRES_CATEGORIAS[cat] || cat.toUpperCase();

                texto += `
╔═══════════════════════════════════╗
║   ${icono} ${titulo}   ║
╚═══════════════════════════════════╝
`;
                for (const cmd of cmds) {
                    const desc = cmd.descripcion || 'Sin descripción';
                    texto += `│ ✦ ${prefijo}${cmd.nombre}\n`;
                    texto += `│   ↳ ${desc}\n`;
                }
                texto += `└───────────────────────────────┘\n\n`;
            }

            // 5. Pie de página moderno
            texto += `
╔═══════════════════════════════════╗
║         ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡         ║
║  🚀 Rápido • 🔒 Seguro • 💫 Evolutivo  ║
╚═══════════════════════════════════╝
`;

            // 6. Enviar con imagen (si existe)
            if (fs.existsSync(FOTO_MENU)) {
                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        image: { url: FOTO_MENU },
                        caption: texto
                    },
                    { quoted: msg, mediaUploadTimeoutMs: 120000 }
                );
            } else {
                await responder.texto(texto);
            }

        } catch (error) {
            console.error('[MENU] Error:', error);
            await responder.texto(
                `❌ *MENÚ*\n\nNo se pudo mostrar el menú.\n\nUsa ${prefijo}help nuevamente.`
            );
        }
    }
};

// ============================================================
// FUNCIÓN PARA FORMATEAR UPTIME
// ============================================================

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}