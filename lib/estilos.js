import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ESTILOS = path.resolve(process.cwd(), 'database', 'estilos.json');

const TU_CANAL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';

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
        pie: '🎃 BOT-API HALLOWEEN 🎃', 
        canal: TU_CANAL 
    },
    navidad: { 
        nombre: 'Navidad', 
        bordes: { superior: '🎄━', inferior: '🎅━', lateral: '❄️', separador: '🎁' }, 
        pie: '🎄 BOT-API NAVIDAD 🎄', 
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
        bordes: { superior: '╔▓', inferior: '╚▓', lateral: '║', separador: '▓' }, 
        pie: '🤖 BOT-API CYBER 🤖', 
        canal: TU_CANAL 
    }
};

export function obtenerEstilo() {
    try {
        if (fs.existsSync(RUTA_ESTILOS)) {
            const data = fs.readFileSync(RUTA_ESTILOS, 'utf8');
            const estilo = JSON.parse(data);
            
            // 🛡️ AUTO-REPARACIÓN: Si detecta la corrupción de duplicados, resetea a Clásico
            if (estilo.pie && estilo.pie.includes('HALLOWEEN 🎃 HALLOWEEN')) {
                console.log('[ESTILOS] ⚠️ Archivo corrupto detectado, restaurando a Clásico...');
                fs.writeFileSync(RUTA_ESTILOS, JSON.stringify(TEMAS.clasico, null, 2), 'utf8');
                return TEMAS.clasico;
            }
            
            if (estilo && estilo.bordes && estilo.nombre) {
                return estilo;
            }
        }
    } catch (e) {
        console.log('[ESTILOS] ⚠️ Error leyendo estilos, usando clásico.');
    }
    return TEMAS.clasico;
}

export function guardarEstilo(tema) {
    if (!TEMAS[tema]) return false;
    try {
        fs.mkdirSync(path.dirname(RUTA_ESTILOS), { recursive: true });
        fs.writeFileSync(RUTA_ESTILOS, JSON.stringify(TEMAS[tema], null, 2), 'utf8');
        return true;
    } catch { 
        return false; 
    }
}

export function aplicarEstilo(texto) {
    if (!texto) return texto;
    const estilo = obtenerEstilo();
    let resultado = texto;

    // 1. Reemplazo de bordes (maneja variantes de 2 y 3 guiones)
    const b = estilo.bordes || TEMAS.clasico.bordes;
    resultado = resultado.split('╭━━━').join(b.superior + '━');
    resultado = resultado.split('╭━━').join(b.superior);
    resultado = resultado.split('╰━━━').join(b.inferior + '━');
    resultado = resultado.split('╰━━').join(b.inferior);
    resultado = resultado.split('┃').join(b.lateral);
    
    // 2. Reemplazo del footer (SEGURO Y SIN DUPLICADOS)
    // Solo reemplazamos las firmas EXACTAS que usa el bot, evitando reemplazos parciales
    const pieLimpio = estilo.pie || '⚡ BOT-API ⚡';
    
    const firmas = [
        '⚡ BOT-API ⚡',
        '⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡',
        '💻 BOT-API',
        '💻 𝐁𝐎𝐓-𝐀𝐏𝐈',
        '_BOT-API_'
    ];
    
    for (const firma of firmas) {
        resultado = resultado.split(firma).join(pieLimpio);
    }

    return resultado;
}

export function obtenerCanal() {
    return obtenerEstilo().canal || TU_CANAL;
}