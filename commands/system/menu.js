// commands/system/menu.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const MOTOR = 'Baileys';

const FOTO_MENU = path.join(__dirname, '../..', 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(__dirname, '../..', 'database', 'canal.json');

// ============================================================
// CATEGORÍAS
// ============================================================

const CATEGORIAS = {
    Owner: '👑', Administrador: '🛡️', Moderación: '🛡️', Grupos: '👥',
    Economia: '💰', economia: '💰', IA: '🤖', Multimedia: '🎨',
    Descargas: '📥', Diversión: '🎮', Interacción: '💬',
    Utilidades: '🛠️', Sistema: '⚙️', Otros: '📦'
};

const NOMBRES_CATEGORIAS = {
    Owner: 'PRINCIPAL', Administrador: 'MODERACIÓN', Moderación: 'MODERACIÓN',
    Grupos: 'GRUPO', Economia: 'ECONOMIA', economia: 'ECONOMIA', IA: 'IA',
    Multimedia: 'MULTIMEDIA', Descargas: 'DESCARGAS', Diversión: 'FUN',
    Interacción: 'INTERACCIÓN', Utilidades: 'HERRAMIENTAS', Sistema: 'SISTEMA',
    Otros: 'OTROS'
};

const ORDEN_CATEGORIAS = [
    'Owner', 'Administrador', 'Moderación', 'Grupos', 'Economia', 'IA',
    'Multimedia', 'Descargas', 'Diversión', 'Interacción', 'Utilidades',
    'Sistema', 'Otros'
];

// ============================================================
// LEER CANAL
// ============================================================

function obtenerCanal() {
    try {
        if (!fs.existsSync(CANAL_FILE)) return null;
        const datos = JSON.parse(fs.readFileSync(CANAL_FILE, 'utf8'));
        const url = typeof datos?.url === 'string' ? datos.url.trim() : '';
        return url || null;
    } catch {
        return null;
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],
    descripcion: 'Muestra todos los comandos disponibles.',

    async ejecutar({ sock, msg, responder, listaComandos, prefijo }) {
        try {
            // 1. ORGANIZAR
            const grupos = {};
            for (const cmd of listaComandos) {
                const cat = cmd.categoria || 'Otros';
                if (!grupos[cat]) grupos[cat] = [];
                grupos[cat].push(cmd);
            }

            const uptime = formatUptime(process.uptime());
            const totalComandos = listaComandos.length;

            // 2. ENCABEZADO ESTILO RIN-TOHSAKA
            let texto = `> Hola *@${(msg.key.participant || '').split('@')[0]}* soy *BOT-API*, tu asistente virtual\n\n`;

            texto += `┏━❑ BOT-API ❑━┓\n`;
            texto += `┃ *Dia*       : _${new Date().toLocaleDateString('es-ES', { weekday: 'long' })}_\n`;
            texto += `┃ *Tipo*      : _Subbot Premium_\n`;
            texto += `┃ *Estado*    : _Publico_\n`;
            texto += `┃ *Version*   : _${VERSION}_\n`;
            texto += `┃ *Uptime*    : _${uptime}_\n`;
            texto += `┃ *Fecha*     : _${new Date().toLocaleDateString()}_\n`;
            texto += `┃ *Hora*      : _${new Date().toLocaleTimeString()}_\n`;
            texto += `┃ *Comandos*  : _${totalComandos}_\n`;
            texto += `┗━━━━━━━━━━━━━━┛\n\n`;

            // 3. CATEGORÍAS
            const categoriasOrdenadas = [
                ...ORDEN_CATEGORIAS.filter(cat => grupos[cat]),
                ...Object.keys(grupos).filter(cat => !ORDEN_CATEGORIAS.includes(cat))
            ];

            for (const cat of categoriasOrdenadas) {
                const cmds = grupos[cat];
                if (!cmds?.length) continue;

                const titulo = NOMBRES_CATEGORIAS[cat] || cat.toUpperCase();
                texto += `╭─❑ ${titulo} ❑\n`;

                for (const cmd of cmds) {
                    const alias = cmd.alias?.length > 0 ? `.${cmd.alias.join(' , .')}` : `.${cmd.nombre}`;
                    const desc = cmd.descripcion || 'Sin descripción';
                    texto += `│ .${cmd.nombre} , .${cmd.alias?.join(' , .') || cmd.nombre}\n`;
                    texto += `> ${desc}\n`;
                }

                texto += `╰────────────────\n\n`;
            }

            // 4. PIE
            texto += `╰━❑ ✨ Creado por Alex y Luis ✨ ❑━╯\n`;
            texto += `   ⚡ BOT-API v${VERSION} ⚡\n`;

            // 5. BOTÓN VER CANAL
            const canal = obtenerCanal();
            const jid = msg?.key?.remoteJid;
            if (!jid) return;

            if (fs.existsSync(FOTO_MENU)) {
                const mensaje = { image: { url: FOTO_MENU }, caption: texto };
                if (canal) {
                    mensaje.templateButtons = [
                        { index: 1, urlButton: { displayText: 'Ver canal', url: canal } }
                    ];
                }
                await sock.sendMessage(jid, mensaje, { quoted: msg, mediaUploadTimeoutMs: 120000 });
            } else {
                if (canal) {
                    await sock.sendMessage(jid, {
                        text: texto,
                        templateButtons: [{ index: 1, urlButton: { displayText: 'Ver canal', url: canal } }]
                    }, { quoted: msg });
                } else {
                    await responder.texto(texto);
                }
            }

        } catch (error) {
            console.error('[MENU] Error:', error);
            await responder.texto('❌ No se pudo mostrar el menú.');
        }
    }
};

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d} días, ${h} horas, ${m} minutos, ${s} segundos`;
}