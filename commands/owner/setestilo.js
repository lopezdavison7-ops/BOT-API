import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ESTILOS = path.join(__dirname, '..', '..', 'database', 'estilos.json');

const OWNER_PRINCIPAL = '50578391933';
const TU_CANAL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';

const TEMAS = {
    clasico: { nombre: 'Clásico', bordes: { superior: '╭━━', inferior: '╰━━', lateral: '┃', separador: '━' }, pie: '⚡ BOT-API ⚡', canal: TU_CANAL },
    halloween: { nombre: 'Halloween', bordes: { superior: '🎃━', inferior: '💀━', lateral: '🦇', separador: '🕸️' }, pie: '🎃 BOT-API HALLOWEEN 🎃', canal: TU_CANAL },
    navidad: { nombre: 'Navidad', bordes: { superior: '🎄━', inferior: '🎅━', lateral: '❄️', separador: '🎁' }, pie: '🎄 BOT-API NAVIDAD 🎄', canal: TU_CANAL },
    neon: { nombre: 'Neón', bordes: { superior: '╔═', inferior: '╚═', lateral: '║', separador: '═' }, pie: '⚡ BOT-API NEON ⚡', canal: TU_CANAL },
    cyber: { nombre: 'Cyber', bordes: { superior: '╔▓', inferior: '╚▓', lateral: '║', separador: '▓' }, pie: '🤖 BOT-API CYBER 🤖', canal: TU_CANAL }
};

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esOwnerPrincipal(sock, msg) {
    const candidatos = [msg.key.participant, msg.key.senderPn, msg.key.participantAlt, msg.key.sender, msg.key.remoteJid].filter(Boolean);
    for (const c of candidatos) {
        if (numeroVisible(c) === OWNER_PRINCIPAL) return true;
    }
    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn && numeroVisible(pn) === OWNER_PRINCIPAL) return true;
            }
        }
    } catch (e) {}
    return false;
}

export default {
    nombre: 'setestilo',
    categoria: 'Owner',
    alias: ['tema', 'diseño', 'design', 'settheme', 'estilo'],
    owner: true,
    descripcion: 'Cambia el diseño visual de TODO el bot.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        if (!(await esOwnerPrincipal(sock, msg))) {
            return await responder.texto('🔐 *ACCESO DENEGADO*\n\nSolo el Owner principal puede usar este comando.');
        }

        const tema = String(argumento || '').trim().toLowerCase();

        if (!tema || tema === 'ver' || tema === 'lista') {
            let texto = '╭━━〔 🎨 TEMAS DISPONIBLES 〕━━⬣\n┃\n';
            Object.keys(TEMAS).forEach(key => {
                texto += `┃ • ${TEMAS[key].nombre}\n`;
            });
            texto += '┃\n┃ 💡 Uso: .setestilo <tema>\n';
            texto += '┃ Ej: .setestilo halloween\n';
            texto += '╰━━━━━━━━━━━━━━━━━━━━━━━━⬣';
            return await responder.texto(texto);
        }

        if (TEMAS[tema]) {
            fs.mkdirSync(path.dirname(RUTA_ESTILOS), { recursive: true });
            fs.writeFileSync(RUTA_ESTILOS, JSON.stringify(TEMAS[tema], null, 2), 'utf8');
            
            return await responder.texto(
                '╭━━〔 🎨 ESTILO CAMBIADO 〕━━⬣\n' +
                `┃\n┃ ✅ Tema activado: *${TEMAS[tema].nombre}*\n` +
                '┃\n┃ 🎃 Todos los comandos usarán\n' +
                '┃    este diseño automáticamente.\n' +
                '┃\n┃ 💡 Prueba con: .menu\n' +
                '┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━⬣'
            );
        }

        return await responder.texto(
            `❌ Tema no encontrado.\n\n` +
            `Temas disponibles: ${Object.keys(TEMAS).join(', ')}\n\n` +
            `Usa *.setestilo lista* para ver los estilos.`
        );
    }
};