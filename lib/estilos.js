import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ESTILOS = path.join(__dirname, '..', 'database', 'estilos.json');

const TU_CANAL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';

const TEMAS = {
    clasico: {
        nombre: '⚡ Clásico',
        reemplazos: { '╭━━': '╭━━', '╰━━': '╰━━', '┃': '┃', '━': '━', '⬣': '⬣' },
        emojis: { '✅': '✅', '❌': '❌', '⚠️': '⚠️', '💡': '💡', '📌': '📌', '🎯': '🎯', '👤': '👤', '⭐': '⭐', '💰': '💰', '🎵': '🎵' },
        pie: '⚡ BOT-API ⚡',
        canal: TU_CANAL
    },
    halloween: {
        nombre: '🎃 Halloween',
        reemplazos: { '╭━━': '🎃━', '╰━━': '💀━', '┃': '🦇', '━': '🕸️', '⬣': '🕷️' },
        emojis: { '✅': '🎃', '❌': '💀', '⚠️': '👻', '💡': '🕯️', '📌': '🦇', '🎯': '🎃', '👤': '🧟', '⭐': '🕸️', '💰': '🍬', '🎵': '🎶' },
        pie: '🎃 BOT-API HALLOWEEN 🎃',
        canal: TU_CANAL
    },
    navidad: {
        nombre: '🎄 Navidad',
        reemplazos: { '╭━━': '🎄━', '╰━━': '🎅━', '┃': '❄️', '━': '🎁', '⬣': '⭐' },
        emojis: { '✅': '🎄', '❌': '⛄', '⚠️': '🦌', '💡': '🌟', '📌': '🎁', '🎯': '🎄', '👤': '🤶', '⭐': '⭐', '💰': '🎁', '🎵': '🔔' },
        pie: '🎄 BOT-API NAVIDAD 🎄',
        canal: TU_CANAL
    },
    neon: {
        nombre: '🔥 Neón',
        reemplazos: { '╭━━': '╔═', '╰━━': '╚═', '┃': '║', '━': '═', '⬣': '◆' },
        emojis: { '✅': '✨', '❌': '💥', '⚠️': '⚡', '💡': '💜', '📌': '📍', '🎯': '🎯', '👤': '👾', '⭐': '💎', '💰': '💵', '🎵': '🎧' },
        pie: '🔥 BOT-API NEON 🔥',
        canal: TU_CANAL
    },
    cyber: {
        nombre: '🤖 Cyberpunk',
        reemplazos: { '╭━━': '╔▓', '╰━━': '╚▓', '┃': '║', '━': '▓', '⬣': '◈' },
        emojis: { '✅': '✔', '❌': '✖', '⚠️': '⚠', '💡': '💠', '📌': '▸', '🎯': '◎', '👤': '◉', '⭐': '💠', '💰': '◈', '🎵': '♫' },
        pie: '🤖 BOT-API CYBER 🤖',
        canal: TU_CANAL
    }
};

export function obtenerEstilo() {
    try {
        const data = fs.readFileSync(RUTA_ESTILOS, 'utf8');
        return JSON.parse(data);
    } catch {
        return TEMAS.clasico;
    }
}

export function guardarEstilo(tema) {
    if (!TEMAS[tema]) return false;
    fs.mkdirSync(path.dirname(RUTA_ESTILOS), { recursive: true });
    fs.writeFileSync(RUTA_ESTILOS, JSON.stringify(TEMAS[tema], null, 2), 'utf8');
    return true;
}

export function listarTemas() {
    return Object.keys(TEMAS).map(k => ({ key: k, nombre: TEMAS[k].nombre }));
}

export function aplicarEstilo(texto) {
    if (!texto) return texto;
    const estilo = obtenerEstilo();
    let resultado = texto;

    for (const [original, nuevo] of Object.entries(estilo.reemplazos)) {
        resultado = resultado.split(original).join(nuevo);
    }
    for (const [original, nuevo] of Object.entries(estilo.emojis)) {
        resultado = resultado.split(original).join(nuevo);
    }
    if (resultado.includes('BOT-API')) {
        resultado = resultado.replace(/⚡\s*BOT-API\s*⚡/g, estilo.pie);
    }
    return resultado;
}

export function obtenerCanal() {
    return obtenerEstilo().canal || TU_CANAL;
}