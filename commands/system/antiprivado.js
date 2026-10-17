import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_CONFIG = path.join(__dirname, '..', '..', 'database', 'antiprivado.json');

const OWNERS_PRINCIPALES = ['50578391933', '50577455383', '50368309162'];

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esOwner(sock, msg) {
    const candidatos = [
        msg.key.participant, msg.key.senderPn, msg.key.participantAlt,
        msg.key.sender, msg.key.remoteJid
    ].filter(Boolean);

    for (const c of candidatos) {
        if (OWNERS_PRINCIPALES.includes(numeroVisible(c))) return true;
    }

    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn && OWNERS_PRINCIPALES.includes(numeroVisible(pn))) return true;
            }
        }
    } catch (e) {}

    return false;
}

function leerConfig() {
    try {
        const data = fs.readFileSync(RUTA_CONFIG, 'utf8');
        return JSON.parse(data);
    } catch {
        return { activo: false };
    }
}

function guardarConfig(data) {
    fs.mkdirSync(path.dirname(RUTA_CONFIG), { recursive: true });
    fs.writeFileSync(RUTA_CONFIG, JSON.stringify(data, null, 2), 'utf8');
}

export default {
    nombre: 'antiprivado',
    categoria: 'System',
    alias: ['antipm', 'antiprivate', 'nopm'],
    descripcion: 'Activa o desactiva la respuesta del bot en mensajes privados (PV).',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        if (!(await esOwner(sock, msg))) {
            return await responder.texto(
                '╭━━〔 🔒 𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Este comando es exclusivo\n' +
                '┃    para el *Owner principal*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const estado = String(argumento || '').trim().toLowerCase();
        const config = leerConfig();

        if (estado === 'on' || estado === 'activar' || estado === 'true') {
            config.activo = true;
            guardarConfig(config);
            return await responder.texto(
                '╭━━〔 🛡️ 𝐀𝐍𝐓𝐈𝐏𝐑𝐈𝐕𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ *Modo Anti-Privado ACTIVADO*\n' +
                '┃\n' +
                '┃ El bot ignorará los mensajes\n' +
                '┃ privados de usuarios normales.\n' +
                '┃ (Los Owners siempre tendrán acceso).\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        if (estado === 'off' || estado === 'desactivar' || estado === 'false') {
            config.activo = false;
            guardarConfig(config);
            return await responder.texto(
                '╭━━〔 🛡️ 𝐀𝐍𝐓𝐈𝐏𝐑𝐈𝐕𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ *Modo Anti-Privado DESACTIVADO*\n' +
                '┃\n' +
                '┃ El bot volverá a responder\n' +
                '┃ mensajes privados normalmente.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        return await responder.texto(
            '╭━━〔 🛡️ 𝐀𝐍𝐓𝐈𝐏𝐑𝐈𝐕𝐀𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            `┃ 📊 Estado actual: *${config.activo ? '✅ ACTIVADO' : '❌ DESACTIVADO'}*\n` +
            '┃\n' +
            '┃ 💡 Uso:\n' +
            '┃ › .antiprivado on\n' +
            '┃ › .antiprivado off\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};