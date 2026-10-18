import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { guardarEstilo, listarTemas, obtenerEstilo } from '../../lib/estilos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OWNER_PRINCIPAL = '50578391933';

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esOwnerPrincipal(sock, msg) {
    const candidatos = [
        msg.key.participant, msg.key.senderPn, msg.key.participantAlt,
        msg.key.sender, msg.key.remoteJid
    ].filter(Boolean);

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
            const temas = listarTemas();
            const estiloActual = obtenerEstilo();
            
            let texto = '╭━━〔 🎨 TEMAS DISPONIBLES 〕━━⬣\n';
            texto += `┃ 📌 Tema actual: *${estiloActual.nombre}*\n┃\n`;
            temas.forEach(t => {
                texto += `┃ • ${t.nombre}\n`;
            });
            texto += '┃\n┃ 💡 Uso: .setestilo <tema>\n';
            texto += '┃ Ej: .setestilo halloween\n';
            texto += '╰━━━━━━━━━━━━━━━━━━━━━━━━⬣';
            
            return await responder.texto(texto);
        }

        const temasDisponibles = listarTemas().map(t => t.key);
        
        if (temasDisponibles.includes(tema)) {
            const exito = guardarEstilo(tema);
            if (exito) {
                const estiloNuevo = obtenerEstilo();
                return await responder.texto(
                    '╭━━〔 🎨 ESTILO CAMBIADO 〕━━⬣\n' +
                    `┃\n┃ ✅ Tema activado: *${estiloNuevo.nombre}*\n` +
                    '┃\n┃ 🎃 Todos los comandos usarán\n' +
                    '┃    este diseño automáticamente.\n' +
                    '┃\n┃ 💡 Prueba con: .menu\n' +
                    '┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━⬣'
                );
            }
        }

        return await responder.texto(
            `❌ Tema no encontrado.\n\n` +
            `Temas disponibles: ${temasDisponibles.join(', ')}\n\n` +
            `Usa *.setestilo lista* para ver los estilos.`
        );
    }
};