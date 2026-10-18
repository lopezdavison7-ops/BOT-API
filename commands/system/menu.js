import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { aplicarEstilo } from '../../lib/estilos.js';
import { generateWAMessageFromContent } from 'baileys';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';
const BOT_NAME = 'BOT-API';
const CANAL_URL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';

const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');

// Mapa para reconocer cualquier variación de las categorías
const ALIAS_CATEGORIAS = {
    'descargas': 'Descargas', 'downloads': 'Descargas', 'dl': 'Descargas',
    'juegos': 'Diversión', 'fun': 'Diversión', 'diversion': 'Diversión', 'diversión': 'Diversión',
    'economia': 'Economía', 'economy': 'Economía',
    'utilidades': 'Utilidades', 'utils': 'Utilidades', 'tools': 'Utilidades', 'utility': 'Utilidades',
    'grupos': 'Grupos', 'groups': 'Grupos', 'grupo': 'Grupos',
    'moderacion': 'Moderación', 'moderación': 'Moderación', 'mod': 'Moderación', 'mods': 'Moderación',
    'owner': 'Owner', 'propietario': 'Owner', 'dueño': 'Owner', 'admin': 'Owner',
    'sistema': 'Sistema', 'system': 'Sistema', 'sys': 'Sistema',
    'interaccion': 'Interacción', 'interacción': 'Interacción', 'interact': 'Interacción',
    'multimedia': 'Multimedia', 'media': 'Multimedia', 'audio': 'Multimedia', 'video': 'Multimedia',
    'ia': 'IA', 'ai': 'IA', 'inteligencia': 'IA',
    'otros': 'Otros', 'random': 'Otros', 'otro': 'Otros'
};

const ICONOS = {
    Owner: '👑', Economía: '💸', Diversión: '🎉', Sistema: '⚙️',
    Otros: '📦', Descargas: '📥', Utilidades: '🛠️', IA: '🧠',
    Multimedia: '🎨', Grupos: '👥', Interacción: '🎭', Moderación: '🛡️'
};

function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [key.participant, key.remoteJid, key.senderPn, key.participantAlt];
    for (const c of candidatos) {
        if (!c || typeof c !== 'string') continue;
        const n = String(c).split('@')[0].split(':')[0].replace(/\D/g, '');
        if (n && n.length >= 7) {
            return { jid: c.includes('@') ? c : `${c}@s.whatsapp.net`, num: n };
        }
    }
    return null;
}

function formatUptime(s) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m`;
}

function normalizarCategoria(c) {
    if (!c) return 'Otros';
    const raw = String(c).trim().toLowerCase();
    return ALIAS_CATEGORIAS[raw] || raw.replace(/^\w/, ch => ch.toUpperCase());
}

function obtenerIcono(c) {
    return ICONOS[c] || '📦';
}

function organizarComandos(lista) {
    const cats = {};
    for (const cmd of lista || []) {
        if (!cmd || !cmd.nombre) continue;
        const cat = normalizarCategoria(cmd.categoria);
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(cmd);
    }
    return cats;
}

function generarMenuFiltrado(categoriaReal, cmds, prefijo, botName) {
    const icono = obtenerIcono(categoriaReal);
    let texto = '';

    texto += `╭━━━〔 ⚡ ${BOT_NAME} ⚡ 〕━━━⬣\n\n`;
    texto += `┃  📂 *CATEGORÍA:* ${categoriaReal.toUpperCase()}\n`;
    texto += `┃  📦 *COMANDOS:* ${cmds.length}\n`;
    texto += `┃\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n\n`;

    for (const cmd of cmds.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
        const alias = cmd.alias?.length ? ` (${cmd.alias.join(', ')})` : '';
        texto += `┃  ▸ *${prefijo}${cmd.nombre}*${alias}\n`;
        
        if (cmd.descripcion && cmd.descripcion !== 'Sin descripción') {
            const desc = cmd.descripcion.length > 45 ? cmd.descripcion.slice(0, 45) + '...' : cmd.descripcion;
            texto += `┃  > ${desc}\n`;
        }
        texto += `\n`;
    }

    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n\n`;
    texto += `💡 Usa *${prefijo}menu* para ver todas las categorías.\n`;
    texto += `\n${CANAL_URL}`; // Enlace al final para la preview

    return texto;
}

function generarMenuCompleto(categorias, prefijo, mencionTexto, botName) {
    const totalCmds = Object.values(categorias).flat().length;
    const totalCats = Object.keys(categorias).length;
    const now = moment.tz(ZONA_HORARIA);

    let texto = '';

    texto += `╭━━━〔 ⚡ ${BOT_NAME} ⚡ 〕━━━⬣\n\n`;
    texto += `┃  👋 ¡Hola ${mencionTexto}!\n`;
    texto += `┃\n`;
    texto += `┃  📊 *INFO DEL BOT*\n`;
    texto += `┃  ▸ Creador: ${CREADOR}\n`;
    texto += `┃  ▸ Versión: ${VERSION}\n`;
    texto += `┃  ▸ Comandos: ${totalCmds}\n`;
    texto += `┃  ▸ Categorías: ${totalCats}\n`;
    texto += `┃  ▸ Uptime: ${formatUptime(process.uptime())}\n`;
    texto += `┃  ▸ ${now.format('DD/MM/YYYY HH:mm')}\n`;
    texto += `┃\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;

    const catsOrdenadas = Object.keys(categorias).sort();
    
    for (const cat of catsOrdenadas) {
        const icono = obtenerIcono(cat);
        const cmds = categorias[cat];

        texto += `\n╭━━〔 ${icono} *${cat.toUpperCase()}* 〕━━⬣\n`;

        for (const cmd of cmds) {
            const alias = cmd.alias?.length ? ` (${cmd.alias.join(', ')})` : '';
            texto += `\n`;
            texto += `┃  ▸ *${prefijo}${cmd.nombre}*${alias}\n`;
            
            if (cmd.descripcion && cmd.descripcion !== 'Sin descripción') {
                const desc = cmd.descripcion.length > 45 ? cmd.descripcion.slice(0, 45) + '...' : cmd.descripcion;
                texto += `┃  > ${desc}\n`;
            }
        }

        texto += `\n`;
        texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;
    }

    texto += `\n\n${CANAL_URL}`;
    return texto;
}

async function obtenerImagenBuffer() {
    try {
        if (fs.existsSync(FOTO_MENU)) {
            return fs.readFileSync(FOTO_MENU);
        }
    } catch (e) {}
    return null;
}

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help', 'comandos', 'cmds'],

    async ejecutar({ sock, msg, listaComandos, prefijo, args }) {
        try {
            const jid = msg?.key?.remoteJid;
            if (!jid) return;

            const autor = obtenerAutor(msg);
            const mencionTexto = autor ? `@${autor.num}` : 'usuario';
            const menciones = autor ? [autor.jid] : [];
            const botName = global.botname || BOT_NAME;

            const categorias = organizarComandos(listaComandos);
            
            // 1. Obtener la búsqueda (primer argumento) y normalizarla (quitar acentos y minúsculas)
            const busqueda = args && args[0] 
                ? args[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
                : null;

            let menuTextoBase = '';

            // 2. Lógica de filtrado
            if (busqueda && ALIAS_CATEGORIAS[busqueda]) {
                // Si busca una categoría válida
                const categoriaReal = ALIAS_CATEGORIAS[busqueda];
                const cmdsDeCategoria = categorias[categoriaReal] || [];
                
                if (cmdsDeCategoria.length > 0) {
                    menuTextoBase = generarMenuFiltrado(categoriaReal, cmdsDeCategoria, prefijo, botName);
                } else {
                    menuTextoBase = `❌ No hay comandos registrados en la categoría *${categoriaReal}*.`;
                }
            } else if (busqueda && !ALIAS_CATEGORIAS[busqueda]) {
                // Si busca algo que no es una categoría válida
                const categoriasDisponibles = Object.values(ALIAS_CATEGORIAS)
                    .filter((v, i, a) => a.indexOf(v) === i) // Quitar duplicados
                    .map(c => `• ${c}`)
                    .join('\n');
                
                menuTextoBase = 
                    `╭━━〔 ❌ *CATEGORÍA NO ENCONTRADA* 〕━━⬣\n\n` +
                    `┃ La categoría "*${args[0]}*" no existe.\n` +
                    `┃\n` +
                    `┃ *Categorías disponibles:*\n` +
                    `┃ ${categoriasDisponibles}\n` +
                    `┃\n` +
                    `┃ 💡 Ejemplo: *${prefijo}menu descargas*\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n\n` +
                    `${CANAL_URL}`;
            } else {
                // Si no hay búsqueda, mostrar menú completo
                menuTextoBase = generarMenuCompleto(categorias, prefijo, mencionTexto, botName);
            }

            // 3. Aplicar estilo (Halloween, Neón, etc.)
            const menuTextoFinal = aplicarEstilo(menuTextoBase);

            // 4. Obtener thumbnail
            const imgBuffer = await obtenerImagenBuffer();
            let jpegThumbnail = null;
            if (imgBuffer) {
                try {
                    const { default: sharp } = await import('sharp');
                    jpegThumbnail = await sharp(imgBuffer).resize(200, 200).jpeg({ quality: 50 }).toBuffer();
                } catch (e) {}
            }

            // 5. Enviar con extendedTextMessage para el botón "Ver canal"
            const content = {
                extendedTextMessage: {
                    text: menuTextoFinal,
                    matchedText: CANAL_URL,
                    canonicalUrl: CANAL_URL,
                    description: CREADOR,
                    title: botName.toUpperCase(),
                    previewType: 1,
                    jpegThumbnail: jpegThumbnail,
                    contextInfo: {
                        mentionedJid: menciones,
                        isForwarded: true,
                        forwardingScore: 1
                    }
                }
            };

            const waMsg = generateWAMessageFromContent(jid, content, {
                userJid: sock.user?.id || jid,
                quoted: msg
            });

            await sock.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });

        } catch (error) {
            console.error('[MENU] Error:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
            } catch {}
        }
    }
};