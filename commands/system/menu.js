// ============================================================
// MENU - BOT-API 2.0
// ============================================================
// MENÚ MULTI-DISEÑO + FILTRO POR CATEGORÍA
//
// .menu
//      → muestra todo
//
// .menu economy
//      → muestra solo Economía
//
// .menu grupos
//      → muestra solo Grupos
//
// También acepta nombres alternativos en español/inglés.
//
// .menu <comando>
//      → mantiene la compatibilidad para mostrar información
//        del comando cuando el sistema la soporte.
//
// ============================================================

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';

const FOTO_MENU = path.join(
    process.cwd(),
    'media',
    'menu',
    'menu.jpg'
);

const VIDEO_MENU_URL = '';

const CANAL_FILE = path.join(
    process.cwd(),
    'database',
    'canal.json'
);

const GRUPO_MENCIONES = '120363429140811226@g.us';
const CANTIDAD_MENCIONES = 5;

const ORDEN_CATEGORIAS = [
    'Sistema',
    'Owner',
    'Grupos',
    'Moderación',
    'Economía',
    'Diversión',
    'Interacción',
    'Descargas',
    'Multimedia',
    'Utilidades',
    'IA',
    'Otros'
];

const ICONOS = {
    Owner: '👑',
    Economía: '💸',
    Diversión: '🎉',
    Sistema: '⚙️',
    Otros: '📦',
    Descargas: '📥',
    Utilidades: '🛠️',
    IA: '🧠',
    Multimedia: '🎨',
    Grupos: '👥',
    Interacción: '🎭',
    Moderación: '🛡️'
};

// ============================================================
// ALIAS DE CATEGORÍAS
// ============================================================

const ALIAS_CATEGORIAS = {

    sistema: 'Sistema',
    system: 'Sistema',

    owner: 'Owner',
    propietario: 'Owner',
    propietarios: 'Owner',

    grupos: 'Grupos',
    grupo: 'Grupos',
    group: 'Grupos',
    groups: 'Grupos',

    moderacion: 'Moderación',
    moderación: 'Moderación',
    moderar: 'Moderación',
    moderation: 'Moderación',
    mod: 'Moderación',

    economia: 'Economía',
    economía: 'Economía',
    economy: 'Economía',
    economi: 'Economía',

    diversion: 'Diversión',
    diversión: 'Diversión',
    divertido: 'Diversión',
    fun: 'Diversión',

    interaccion: 'Interacción',
    interacción: 'Interacción',
    interaction: 'Interacción',

    descargas: 'Descargas',
    descarga: 'Descargas',
    downloads: 'Descargas',
    download: 'Descargas',

    multimedia: 'Multimedia',
    media: 'Multimedia',

    utilidades: 'Utilidades',
    utilidad: 'Utilidades',
    utilities: 'Utilidades',
    utility: 'Utilidades',
    utils: 'Utilidades',

    ia: 'IA',
    ai: 'IA',
    inteligenciaartificial: 'IA',

    otros: 'Otros',
    otro: 'Otros',
    other: 'Otros'
};

// ============================================================
// DISEÑOS
// ============================================================

const DISEÑOS = [
    {
        nombre: 'Galaxy',
        emoji: '🌌',
        top: '╭━━━━━━━━━━〔 🌌 〕━━━━━━━━━━╮',
        bottom: '╰━━━━━━━━━━〔 🌌 〕━━━━━━━━━━╯',
        titulo: '🌌 *GALAXY MENU*',
        subtitulo: '✦ 𝑬𝒙𝒑𝒍𝒐𝒓𝒂 𝒆𝒍 𝒖𝒏𝒊𝒗𝒆𝒓𝒔𝒐 ✦',
        info: '╭──────〔 🌌 *I N F O* 〕──────╮',
        infoEnd: '╰────────────────────────────╯',
        category: '╭━━━〔 {icon} *{name}* 〕━━━╮',
        categoryEnd: '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
        command: '┃ ✦ *{command}*',
        desc: '┃ └─ 🌙 {desc}',
        footer: '🌌 _Explorando comandos desde otra dimensión..._'
    },

    {
        nombre: 'Neon',
        emoji: '💜',
        top: '╔═══════════〔 💜 〕═══════════╗',
        bottom: '╚═══════════〔 💜 〕═══════════╝',
        titulo: '💜 *ＮＥＯＮ ＭＥＮＵ*',
        subtitulo: '⚡ 𝑷𝒐𝒘𝒆𝒓 • 𝑪𝒐𝒅𝒆 • 𝑴𝒂𝒈𝒊𝒄 ⚡',
        info: '╭━━〔 💜 *SYSTEM INFO* 〕━━╮',
        infoEnd: '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
        category: '╭──〔 💜 {icon} *{name}* 〕──╮',
        categoryEnd: '╰──────────────────────────╯',
        command: '│ ⚡ *{command}*',
        desc: '│ 💫 {desc}',
        footer: '💜 _Powered by BOT-API_'
    },

    {
        nombre: 'Sakura',
        emoji: '🌸',
        top: '╭━━━━━━━〔 🌸 〕━━━━━━━╮',
        bottom: '╰━━━━━━━〔 🌸 〕━━━━━━━╯',
        titulo: '🌸 *𝑺𝑨𝑲𝑼𝑹𝑨 𝑴𝑬𝑵𝑼*',
        subtitulo: '♡ 𝑼𝒏 𝒎𝒆𝒏𝒖́ 𝒄𝒐𝒏 𝒖𝒏 𝒕𝒐𝒒𝒖𝒆 𝒆𝒔𝒑𝒆𝒄𝒊𝒂𝒍 ♡',
        info: '╭──〔 🌷 *𝑰𝑵𝑭𝑶* 〕──╮',
        infoEnd: '╰──────────────────────╯',
        category: '╭━━〔 🌸 {icon} *{name}* 〕━━╮',
        categoryEnd: '╰━━━━━━━━━━━━━━━━━━━━━━╯',
        command: '┃ 🌷 *{command}*',
        desc: '┃ ↳ 🌸 {desc}',
        footer: '🌸 _Que florezcan tus comandos..._'
    },

    {
        nombre: 'Fire',
        emoji: '🔥',
        top: '🔥━━━━━━━━〔 🔥 〕━━━━━━━━🔥',
        bottom: '🔥━━━━━━━━〔 🔥 〕━━━━━━━━🔥',
        titulo: '🔥 *F I R E   M E N U*',
        subtitulo: '⚡ 𝑻𝒐𝒅𝒐 𝒆𝒍 𝒑𝒐𝒅𝒆𝒓 𝒆𝒏 𝒕𝒖𝒔 𝒎𝒂𝒏𝒐𝒔 ⚡',
        info: '🔥╭━━〔 *SYSTEM* 〕━━╮',
        infoEnd: '🔥╰━━━━━━━━━━━━━━━━━━╯',
        category: '🔥╭━━〔 {icon} *{name}* 〕━━╮',
        categoryEnd: '🔥╰━━━━━━━━━━━━━━━━━━━━━━╯',
        command: '🔥┃ *{command}*',
        desc: '🔥┃ ➜ {desc}',
        footer: '🔥 _BOT-API en llamas_ 🔥'
    },

    {
        nombre: 'Luxury',
        emoji: '💎',
        top: '╭══════════〔 💎 〕══════════╮',
        bottom: '╰══════════〔 💎 〕══════════╯',
        titulo: '💎 *𝑳𝑼𝑿𝑼𝑹𝒀 𝑴𝑬𝑵𝑼*',
        subtitulo: '♛ 𝑬𝒍𝒆𝒈𝒂𝒏𝒄𝒊𝒂 • 𝑷𝒐𝒘𝒆𝒓 • 𝑷𝒓𝒆𝒔𝒕𝒊𝒈𝒆 ♛',
        info: '╭────〔 💎 *VIP INFO* 〕────╮',
        infoEnd: '╰───────────────────────────╯',
        category: '╭══〔 💎 {icon} *{name}* 〕══╮',
        categoryEnd: '╰════════════════════════════╯',
        command: '║ ◇ *{command}*',
        desc: '║   └─ {desc}',
        footer: '💎 _Una experiencia premium en cada comando._'
    },

    {
        nombre: 'Ocean',
        emoji: '🌊',
        top: '🌊╭━━━━━━━━〔 🌊 〕━━━━━━━━╮',
        bottom: '🌊╰━━━━━━━━〔 🌊 〕━━━━━━━━╯',
        titulo: '🌊 *𝑶𝑪𝑬𝑨𝑵 𝑴𝑬𝑵𝑼*',
        subtitulo: '🐚 𝑭𝒍𝒖𝒚𝒆 𝒑𝒐𝒓 𝒍𝒂𝒔 𝒐𝒑𝒄𝒊𝒐𝒏𝒆𝒔 🐚',
        info: '╭───〔 🌊 *OCEAN INFO* 〕───╮',
        infoEnd: '╰───────────────────────────╯',
        category: '🌊╭──〔 {icon} *{name}* 〕──╮',
        categoryEnd: '🌊╰────────────────────────╯',
        command: '🐬│ *{command}*',
        desc: '🐚│ {desc}',
        footer: '🌊 _Sumérgete en BOT-API._'
    },

    {
        nombre: 'Dark',
        emoji: '🖤',
        top: '╔═══════〔 🖤 〕═══════╗',
        bottom: '╚═══════〔 🖤 〕═══════╝',
        titulo: '🖤 *D A R K   M E N U*',
        subtitulo: '☠︎ 𝑻𝒉𝒆 𝒅𝒂𝒓𝒌 𝒔𝒊𝒅𝒆 𝒐𝒇 𝒄𝒐𝒅𝒆 ☠︎',
        info: '╭──〔 🖤 *DARK SYSTEM* 〕──╮',
        infoEnd: '╰─────────────────────────╯',
        category: '╭─〔 🖤 {icon} *{name}* 〕─╮',
        categoryEnd: '╰─────────────────────────╯',
        command: '│ ☠ *{command}*',
        desc: '│ └─ {desc}',
        footer: '🖤 _BOT-API • Dark Mode_'
    },

    {
        nombre: 'Rainbow',
        emoji: '🌈',
        top: '🌈━━━━━━━━〔 🌈 〕━━━━━━━━🌈',
        bottom: '🌈━━━━━━━━〔 🌈 〕━━━━━━━━🌈',
        titulo: '🌈 *𝑹𝑨𝑰𝑵𝑩𝑶𝑾 𝑴𝑬𝑵𝑼*',
        subtitulo: '✨ 𝑪𝒐𝒍𝒐𝒓 • 𝑭𝒖𝒏 • 𝑷𝒐𝒘𝒆𝒓 ✨',
        info: '╭━━〔 🌈 *INFO* 〕━━╮',
        infoEnd: '╰━━━━━━━━━━━━━━━━━━╯',
        category: '╭━━〔 🌈 {icon} *{name}* 〕━━╮',
        categoryEnd: '╰━━━━━━━━━━━━━━━━━━━━━━╯',
        command: '┃ 🌈 *{command}*',
        desc: '┃ ✨ {desc}',
        footer: '🌈 _Tu bot, tus colores, tus comandos._'
    },

    {
        nombre: 'Cyber',
        emoji: '🤖',
        top: '╭━━━〔 🤖 CYBER 〕━━━╮',
        bottom: '╰━━━〔 🤖 CYBER 〕━━━╯',
        titulo: '🤖 *ＣＹＢＥＲ  ＭＥＮＵ*',
        subtitulo: '▣ 𝑺𝒚𝒔𝒕𝒆𝒎 𝒐𝒏𝒍𝒊𝒏𝒆 • 𝑨𝒄𝒄𝒆𝒔𝒔 𝒈𝒓𝒂𝒏𝒕𝒆𝒅 ▣',
        info: '╭─〔 🤖 *SYSTEM STATUS* 〕─╮',
        infoEnd: '╰──────────────────────────╯',
        category: '╭─〔 🤖 {icon} *{name}* 〕─╮',
        categoryEnd: '╰────────────────────────╯',
        command: '┃ ▣ *{command}*',
        desc: '┃ └─ {desc}',
        footer: '🤖 _SYSTEM ONLINE • BOT-API_'
    },

    {
        nombre: 'Royal',
        emoji: '👑',
        top: '♛━━━━━━━━〔 👑 〕━━━━━━━━♛',
        bottom: '♛━━━━━━━━〔 👑 〕━━━━━━━━♛',
        titulo: '👑 *𝑹𝑶𝒀𝑨𝑳 𝑴𝑬𝑵𝑼*',
        subtitulo: '⚜️ 𝑻𝒉𝒆 𝒓𝒐𝒚𝒂𝒍 𝒃𝒐𝒕 𝒆𝒙𝒑𝒆𝒓𝒊𝒆𝒏𝒄𝒆 ⚜️',
        info: '╭━━〔 👑 *ROYAL INFO* 〕━━╮',
        infoEnd: '╰━━━━━━━━━━━━━━━━━━━━━━━━╯',
        category: '╭━━〔 👑 {icon} *{name}* 〕━━╮',
        categoryEnd: '╰━━━━━━━━━━━━━━━━━━━━━━━━╯',
        command: '║ ♛ *{command}*',
        desc: '║ └─ {desc}',
        footer: '👑 _BOT-API • Royal Edition_'
    }
];

// ============================================================
// ÚLTIMO DISEÑO POR CHAT
// ============================================================

const ultimoDiseñoPorChat = new Map();

function obtenerDiseño(jid) {

    const anterior =
        ultimoDiseñoPorChat.get(jid);

    let disponibles =
        DISEÑOS.filter(
            d => d.nombre !== anterior
        );

    if (!disponibles.length) {
        disponibles = DISEÑOS;
    }

    const diseño =
        disponibles[
            Math.floor(
                Math.random() *
                disponibles.length
            )
        ];

    ultimoDiseñoPorChat.set(
        jid,
        diseño.nombre
    );

    return diseño;
}

// ============================================================
// HELPERS
// ============================================================

function obtenerAutor(msg) {

    const key =
        msg?.key || {};

    const candidatos = [
        key.participantAlt,
        key.participant,
        key.senderPn,
        key.remoteJidAlt,
        key.remoteJid
    ];

    for (const c of candidatos) {

        if (
            !c ||
            typeof c !== 'string'
        ) {
            continue;
        }

        const n =
            String(c)
                .split('@')[0]
                .split(':')[0]
                .replace(/\D/g, '');

        if (
            n &&
            n.length >= 7
        ) {

            return {
                jid:
                    c.includes('@')
                        ? c
                        : `${c}@s.whatsapp.net`,

                num: n
            };
        }
    }

    return null;
}

function obtenerCanal() {

    try {

        const d =
            obtenerStore(
                CANAL_FILE,
                { url: '' }
            );

        return typeof d.url === 'string'
            ? d.url.trim()
            : '';

    } catch {

        return '';
    }
}

function formatUptime(segundos) {

    const d =
        Math.floor(
            segundos / 86400
        );

    const h =
        Math.floor(
            (segundos % 86400) / 3600
        );

    const m =
        Math.floor(
            (segundos % 3600) / 60
        );

    const s =
        Math.floor(
            segundos % 60
        );

    if (d > 0) {
        return `${d}d ${h}h ${m}m`;
    }

    return `${h}h ${m}m ${s}s`;
}

function normalizarCategoria(categoria) {

    const texto =
        String(
            categoria || 'Otros'
        ).trim();

    if (!texto) {
        return 'Otros';
    }

    return texto.replace(
        /^\w/,
        letra => letra.toUpperCase()
    );
}

function obtenerIcono(categoria) {

    return (
        ICONOS[categoria] ||
        '📦'
    );
}

function organizarComandos(lista) {

    const categorias = {};

    for (const cmd of lista || []) {

        if (
            !cmd ||
            !cmd.nombre
        ) {
            continue;
        }

        const categoria =
            normalizarCategoria(
                cmd.categoria
            );

        if (!categorias[categoria]) {
            categorias[categoria] = [];
        }

        categorias[categoria].push(cmd);
    }

    return categorias;
}

function ordenarCategorias(categorias) {

    return Object.keys(categorias)
        .sort((a, b) => {

            const ia =
                ORDEN_CATEGORIAS.indexOf(a);

            const ib =
                ORDEN_CATEGORIAS.indexOf(b);

            if (
                ia === -1 &&
                ib === -1
            ) {
                return a.localeCompare(b);
            }

            if (ia === -1) {
                return 1;
            }

            if (ib === -1) {
                return -1;
            }

            return ia - ib;
        });
}

function acortarDesc(texto) {

    if (!texto) {
        return 'Sin descripción';
    }

    const limpio =
        String(texto).trim();

    if (limpio.length <= 40) {
        return limpio;
    }

    return `${limpio.slice(0, 40).trim()}...`;
}

// ============================================================
// RESOLVER CATEGORÍA
// ============================================================

function buscarCategoria(argumento, categorias) {

    if (!argumento) {
        return null;
    }

    const limpio =
        String(argumento)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '');

    // Primero por alias
    const categoriaAlias =
        ALIAS_CATEGORIAS[limpio];

    if (
        categoriaAlias &&
        categorias[categoriaAlias]
    ) {
        return categoriaAlias;
    }

    // Después coincidencia directa
    for (const categoria of Object.keys(categorias)) {

        const normalizada =
            categoria
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '');

        if (normalizada === limpio) {
            return categoria;
        }
    }

    return null;
}

// ============================================================
// BUSCAR COMANDO
// ============================================================

function buscarComando(argumento, listaComandos) {

    if (!argumento) {
        return null;
    }

    const buscado =
        String(argumento)
            .trim()
            .toLowerCase();

    return (
        listaComandos || []
    ).find(cmd => {

        if (!cmd?.nombre) {
            return false;
        }

        if (
            String(cmd.nombre)
                .toLowerCase() === buscado
        ) {
            return true;
        }

        return (
            Array.isArray(cmd.alias) &&
            cmd.alias.some(
                alias =>
                    String(alias)
                        .toLowerCase() === buscado
            )
        );
    }) || null;
}

// ============================================================
// MENCIONES FIJAS
// ============================================================

async function obtenerMencionesFijas() {

    try {

        const conexiones =
            global.conns || {};

        const s =
            conexiones?.[0] ||
            Object.values(conexiones)[0];

        if (!s) {
            return {
                jids: [],
                texto: ''
            };
        }

        const meta =
            await s.groupMetadata(
                GRUPO_MENCIONES
            );

        const jids =
            meta.participants
                .slice(
                    0,
                    CANTIDAD_MENCIONES
                )
                .map(p => p.id);

        const texto =
            jids
                .map(
                    v =>
                        `@${v.split('@')[0]}`
                )
                .join(' ');

        return {
            jids,
            texto
        };

    } catch (error) {

        console.error(
            '[MENU] Error menciones fijas:',
            error?.message || error
        );

        return {
            jids: [],
            texto: ''
        };
    }
}

// ============================================================
// GENERAR MENÚ
// ============================================================

function generarMenuCompleto(
    categorias,
    prefijo,
    mencionTexto,
    botName,
    diseño,
    extra = {},
    categoriaFiltrada = null
) {

    const totalCmds =
        Object.values(categorias)
            .flat()
            .length;

    const totalCats =
        Object.keys(categorias)
            .length;

    const now =
        moment.tz(
            ZONA_HORARIA
        );

    let texto = '';

    texto += `${diseño.top}\n\n`;

    texto +=
        `👋 ¡Hola ${mencionTexto}! ✨\n`;

    if (extra.mencionesTexto) {

        texto +=
            `\n👥 ${extra.mencionesTexto}\n`;
    }

    texto += '\n';

    texto +=
        categoriaFiltrada
            ? `📂 *CATEGORÍA: ${categoriaFiltrada.toUpperCase()}*\n`
            : `${diseño.titulo}\n`;

    texto +=
        `${diseño.subtitulo}\n\n`;

    texto +=
        `🤖 *${botName}*\n`;

    texto +=
        `🎨 Diseño actual: *${diseño.nombre}* ${diseño.emoji}\n\n`;

    texto += `${diseño.info}\n`;

    texto +=
        `┃ 👨‍💻 Creador    ▸ ${CREADOR}\n`;

    texto +=
        `┃ 📦 Versión    ▸ ${VERSION}\n`;

    texto +=
        `┃ 📚 Comandos   ▸ ${totalCmds}\n`;

    texto +=
        `┃ 🗂️ Categorías ▸ ${totalCats}\n`;

    texto +=
        `┃ 🔧 Prefijo    ▸ ${prefijo}\n`;

    texto +=
        `┃ ⏱️ Uptime     ▸ ${formatUptime(process.uptime())}\n`;

    texto +=
        `┃ 📅 Fecha      ▸ ${now.format('DD/MM/YYYY')}\n`;

    texto +=
        `┃ 🕐 Hora       ▸ ${now.format('HH:mm:ss')}\n`;

    texto +=
        `${diseño.infoEnd}\n`;

    for (
        const cat of ordenarCategorias(categorias)
    ) {

        const icono =
            obtenerIcono(cat);

        const comandos =
            categorias[cat];

        texto += '\n';

        texto +=
            `${diseño.category
                .replace('{icon}', icono)
                .replace(
                    '{name}',
                    cat.toUpperCase()
                )}\n\n`;

        for (const cmd of comandos) {

            const alias =
                cmd.alias?.length
                    ? ` (${cmd.alias.join(', ')})`
                    : '';

            texto +=
                `${diseño.command.replace(
                    '{command}',
                    `${prefijo}${cmd.nombre}${alias}`
                )}\n`;

            texto +=
                `${diseño.desc.replace(
                    '{desc}',
                    acortarDesc(
                        cmd.descripcion
                    )
                )}\n`;

            texto += '\n';
        }

        texto +=
            `${diseño.categoryEnd}\n`;
    }

    const canal =
        obtenerCanal();

    if (canal) {

        texto +=
            `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        texto +=
            `📢 *CANAL OFICIAL*\n${canal}\n`;

        texto +=
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    texto += '\n';

    texto +=
        `💡 Usa *${prefijo}menu <categoría>* para filtrar.\n`;

    texto +=
        `💡 Usa *${prefijo}menu* para ver todo.\n\n`;

    texto +=
        `${diseño.footer}\n\n`;

    texto +=
        `_${botName}_ • ${now.format('HH:mm')}\n`;

    texto +=
        `${diseño.bottom}`;

    return texto;
}

// ============================================================
// COMANDO MENU
// ============================================================

export default {

    nombre: 'menu',

    categoria: 'Sistema',

    alias: [
        'ayuda',
        'help',
        'comandos',
        'cmds'
    ],

    async ejecutar({
        sock,
        msg,
        listaComandos,
        prefijo,
        argumento
    }) {

        try {

            const jid =
                msg?.key?.remoteJid;

            if (!jid) {
                return;
            }

            const autor =
                obtenerAutor(msg);

            const categorias =
                organizarComandos(
                    listaComandos
                );

            // ==================================================
            // BUSCAR CATEGORÍA
            // ==================================================

            const categoriaEncontrada =
                buscarCategoria(
                    argumento,
                    categorias
                );

            let categoriasMostrar =
                categorias;

            // ==================================================
            // SI SE ESCRIBIÓ UNA CATEGORÍA
            // ==================================================

            if (categoriaEncontrada) {

                categoriasMostrar = {
                    [categoriaEncontrada]:
                        categorias[categoriaEncontrada]
                };
            }

            // ==================================================
            // SI NO ES CATEGORÍA, BUSCAR COMANDO
            // ==================================================

            else if (
                argumento &&
                String(argumento).trim()
            ) {

                const comando =
                    buscarComando(
                        argumento,
                        listaComandos
                    );

                if (!comando) {

                    return sock.sendMessage(
                        jid,
                        {
                            text:
                                `❌ No encontré la categoría o comando *${argumento}*.\n\n` +
                                `💡 Usa *${prefijo}menu* para ver todo.\n` +
                                `📂 Ejemplo: *${prefijo}menu economy*`
                        },
                        {
                            quoted: msg
                        }
                    );
                }

                const categoriaComando =
                    normalizarCategoria(
                        comando.categoria
                    );

                if (
                    categorias[categoriaComando]
                ) {

                    categoriasMostrar = {
                        [categoriaComando]:
                            categorias[
                                categoriaComando
                            ]
                    };
                }
            }

            // ==================================================
            // DISEÑO
            // ==================================================

            const diseño =
                obtenerDiseño(jid);

            // ==================================================
            // MENCIONES
            // ==================================================

            const {
                jids: mencionesFijas,
                texto: textoMenciones
            } =
                await obtenerMencionesFijas();

            const mencionTexto =
                autor
                    ? `@${autor.num}`
                    : '@usuario';

            const mencionesAutor =
                autor
                    ? [autor.jid]
                    : [];

            const todasLasMenciones =
                [
                    ...new Set([
                        ...mencionesAutor,
                        ...mencionesFijas
                    ])
                ];

            const botName =
                global.botname ||
                'BOT-API 2.0';

            // ==================================================
            // CREAR MENÚ
            // ==================================================

            const menuTexto =
                generarMenuCompleto(
                    categoriasMostrar,
                    prefijo,
                    mencionTexto,
                    botName,
                    diseño,
                    {
                        mencionesTexto:
                            textoMenciones
                    },
                    categoriaEncontrada
                );

            // ==================================================
            // VIDEO
            // ==================================================

            if (VIDEO_MENU_URL) {

                await sock.sendMessage(
                    jid,
                    {
                        video: {
                            url: VIDEO_MENU_URL
                        },
                        caption: menuTexto,
                        gifPlayback: false,
                        mentions:
                            todasLasMenciones
                    },
                    {
                        quoted: msg
                    }
                );

                return;
            }

            // ==================================================
            // FOTO
            // ==================================================

            if (
                fs.existsSync(
                    FOTO_MENU
                )
            ) {

                await sock.sendMessage(
                    jid,
                    {
                        image: {
                            url: FOTO_MENU
                        },
                        caption: menuTexto,
                        mentions:
                            todasLasMenciones
                    },
                    {
                        quoted: msg
                    }
                );

                return;
            }

            // ==================================================
            // TEXTO
            // ==================================================

            await sock.sendMessage(
                jid,
                {
                    text: menuTexto,
                    mentions:
                        todasLasMenciones
                },
                {
                    quoted: msg
                }
            );

        } catch (error) {

            console.error(
                '[MENU] Error:',
                error
            );

            try {

                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text:
                            `❌ Error al mostrar el menú: ${error.message}`
                    },
                    {
                        quoted: msg
                    }
                );

            } catch {}
        }
    }
};