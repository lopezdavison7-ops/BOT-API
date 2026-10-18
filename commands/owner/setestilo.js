import { listarTemas, guardarEstilo, obtenerEstilo } from '../../lib/estilos.js';

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
    descripcion: 'Cambia el diseño visual de TODO el bot. Solo Owner principal.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {

        if (!(await esOwnerPrincipal(sock, msg))) {
            return await responder.texto(
                '━━〔 🔒 𝐀𝐂𝐄𝐒𝐎 𝐄𝐍𝐄𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃  Este comando es exclusivo\n' +
                '┃    para el *Owner principal*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐓-𝐀𝐏𝐈 〕━━⬣'
            );
        }

        const tema = String(argumento || '').trim().toLowerCase();

        if (!tema || tema === 'ver' || tema === 'lista') {
            const temas = listarTemas();
            const estiloActual = obtenerEstilo();
            
            let texto = '╭━━〔 🎨 𝐓𝐄𝐀𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐋𝐄 〕━━⬣\n';
            texto += '┃\n';
            texto += `┃ 📌 Tema actual: *${estiloActual.nombre}*\n`;
            texto += '┃\n';
            temas.forEach(t => {
                const activo = t.key === Object.keys(temas).find(k => obtenerEstilo().nombre === t.nombre) ? ' ✅' : '';
                texto += `┃ ${t.nombre}${activo}\n`;
            });
            texto += '┃\n';
            texto += '┃ 💡 Uso: .setestilo <tema>\n';
            texto += '┃ Ejemplos:\n';
            texto += ' › .setestilo halloween\n';
            texto += '┃ › .setestilo navidad\n';
            texto += '┃ › .setestilo neon\n';
            texto += '┃\n';
            texto += '╰━━━━━━━━━━━━━━━━⬣';
            
            return await responder.texto(texto);
        }

        const temasDisponibles = listarTemas().map(t => t.key);
        
        if (temasDisponibles.includes(tema)) {
            const exito = guardarEstilo(tema);
            if (exito) {
                const estiloNuevo = obtenerEstilo();
                return await responder.texto(
                    '╭━━〔 🎨 𝐄𝐒𝐓𝐈𝐋𝐎 𝐀𝐌𝐈𝐀𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    `┃ ✅ Tema activado: *${estiloNuevo.nombre}*\n` +
                    '┃\n' +
                    '┃ 🎃 Todos los comandos usarán\n' +
                    '┃    este diseño automáticamente.\n' +
                    '┃\n' +
                    '┃ 💡 Prueba con: .menu, .rob, .play\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
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