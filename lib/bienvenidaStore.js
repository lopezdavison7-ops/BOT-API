import fs from 'fs';
import path from 'path';

const ARCHIVO = path.join(process.cwd(), 'database', 'bienvenida.json');

function asegurarArchivo() {
    const carpeta = path.dirname(ARCHIVO);
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
    if (!fs.existsSync(ARCHIVO)) fs.writeFileSync(ARCHIVO, JSON.stringify({}, null, 2));
}

function leerConfig() {
    asegurarArchivo();
    try {
        return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8') || '{}');
    } catch (e) {
        console.error('[BIENVENIDA] Error leyendo:', e);
        return {};
    }
}

function guardarConfig(cfg) {
    asegurarArchivo();
    fs.writeFileSync(ARCHIVO, JSON.stringify(cfg, null, 2));
}

function normalizar(valor) {
    if (typeof valor === 'boolean') return { activa: valor, mensaje: null };
    if (valor && typeof valor === 'object') {
        return {
            activa: Boolean(valor.activa),
            mensaje: typeof valor.mensaje === 'string' ? valor.mensaje : null
        };
    }
    return { activa: false, mensaje: null };
}

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function bienvenidaActivada(grupoId) {
    if (!grupoId) return false;
    return normalizar(leerConfig()[grupoId]).activa;
}

export function establecerBienvenida(grupoId, estado) {
    if (!grupoId) return false;
    const cfg = leerConfig();
    const actual = normalizar(cfg[grupoId]);
    actual.activa = Boolean(estado);
    cfg[grupoId] = actual;
    guardarConfig(cfg);
    return actual.activa;
}

export function obtenerMensaje(grupoId) {
    if (!grupoId) return null;
    return normalizar(leerConfig()[grupoId]).mensaje;
}

export function establecerMensaje(grupoId, mensaje) {
    if (!grupoId) return false;
    const cfg = leerConfig();
    const actual = normalizar(cfg[grupoId]);
    actual.mensaje = mensaje;
    cfg[grupoId] = actual;
    guardarConfig(cfg);
    return true;
}

export function construirWelcome({ jid, userJid, userName, groupName, membersCount }) {
    const mensaje = obtenerMensaje(jid);
    const userNum = numeroVisible(userJid);

    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    if (mensaje) {
        const texto = mensaje
            .replace(/@user/g, '@' + userNum)
            .replace(/@name/g, userName || userNum)
            .replace(/@group/g, groupName || 'este grupo')
            .replace(/@members/g, String(membersCount || 0))
            .replace(/@date/g, fecha);

        return { texto, mentions: [userJid], personalizado: true };
    }

    const texto =
        '╭━━━〔 ✨ *BIENVENIDO/A* 〕━━━╮\n' +
        '┃\n' +
        `┃ 👤 *${userName || '+' + userNum}*\n` +
        '┃\n' +
        '┃ 🎉 ¡Bienvenido/a a\n' +
        `┃    *${groupName || 'este grupo'}*!\n` +
        '┃\n' +
        '┃ 🤝 Esperamos que disfrutes\n' +
        '┃    tu estancia con nosotros.\n' +
        '┃\n' +
        '┃ 📜 Escribe *.menu* para\n' +
        '┃    ver los comandos.\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
        '              🤖 *BOT-API*';

    return { texto, mentions: [userJid], personalizado: false };
}