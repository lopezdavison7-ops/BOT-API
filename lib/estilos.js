import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ESTILOS = path.join(__dirname, '..', 'database', 'estilos.json');

const TU_CANAL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';

// DISEÑOS LIMPIOS: Solo cambian bordes y footer. Nada de saturar con emojis.
const TEMAS = {
    clasico: {
        nombre: 'Clásico',
        bordes: { superior: '╭━━', inferior: '╰━━', lateral: '┃', separador: '━' },
        pie: '⚡ BOT-API ⚡',
        canal: TU_CANAL
    },
    halloween: {
        nombre: 'Halloween',
        bordes: { superior: '🎃━', inferior: '💀━', lateral: '🦇', separador: '🕸️' },
        pie: '🎃 BOT-API HALLOWEEN ',
        canal: TU_CANAL
    },
    navidad: {
        nombre: 'Navidad',
        bordes: { superior: '🎄━', inferior: '🎅━', lateral: '❄️', separador: '🎁' },
        pie: ' BOT-API NAVIDAD 🎄',
        canal: TU_CANAL
    },
    neon: {
        nombre: 'Neón',
        bordes: { superior: '╔═', inferior: '╚═', lateral: '║', separador: '═' },
        pie: '⚡ BOT-API NEON ⚡',
        canal: TU_CANAL
    },
    cyber: {
        nombre: 'Cyber',
        bordes: { superior: '╔', inferior: '╚▓', lateral: '║', separador: '▓' },
        pie: '🤖 BOT-API CYBER ',
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

// APLICAR ESTILO: Solo reemplaza bordes y footer. NO toca los emojis internos.
export function aplicarEstilo(texto) {
    if (!texto) return texto;
    const estilo = obtenerEstilo();
    let resultado = texto;

    // 1. Reemplazar bordes
    for (const [original, nuevo] of Object.entries(estilo.bordes)) {
        resultado = resultado.split(original).join(nuevo);
    }

    // 2. Reemplazar el footer específico de BOT-API
    if (resultado.includes('BOT-API')) {
        resultado = resultado.replace(/⚡\s*BOT-API\s*⚡/g, estilo.pie);
    }

    return resultado;
}

export function obtenerCanal() {
    return obtenerEstilo().canal || TU_CANAL;
}