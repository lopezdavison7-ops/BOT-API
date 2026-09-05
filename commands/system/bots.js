// commands/system/bots.js
// ============================================================
// COMANDO: BOTS
// Consulta el servidor de subbots (proceso aparte, con su
// propia web en /subbot) para ver cuántos subbots están
// conectados en este momento.
//
// Uso: .bots
// ============================================================

import axios from 'axios';

const SUBBOT_API_URL = 'https://subbotapi.swallox.com';

// ============================================================
// ENMASCARAR NÚMERO
// ============================================================
// No se muestra el número completo de cada subbot en un
// comando que cualquiera puede correr en cualquier grupo —
// eso sería exponer el teléfono de otra persona sin permiso.
// Se deja ver solo el inicio y el final.
// ============================================================
function enmascararNumero(numero) {
    const limpio = String(numero || '').replace(/\D/g, '');

    if (!limpio) return 'N/D';
    if (limpio.length < 6) return `${limpio.slice(0, 2)}••`;

    return `${limpio.slice(0, 3)}••••${limpio.slice(-2)}`;
}

function formatearTiempo(creado) {
    if (!creado) return '';

    const segundos = Math.floor((Date.now() - creado) / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);

    if (horas > 0) return `hace ${horas}h`;
    if (minutos > 0) return `hace ${minutos}m`;
    return 'recién';
}

function iconoEstado(estado) {
    if (estado === 'conectado') return '🟢';
    if (estado === 'reconectando' || estado === 'esperando_vinculacion' || estado === 'iniciando' || estado === 'conectando') return '🟡';
    return '⚪';
}

export default {
    nombre: 'bots',

    categoria: 'Sistema',

    alias: [
        'subbots'
    ],

    descripcion:
        'Muestra cuántos subbots están conectados ahora mismo.',

    ejecutar: async ({ responder }) => {

        try {
            const response = await axios.get(
                `${SUBBOT_API_URL}/subbot/lista`,
                {
                    timeout: 10000,
                    validateStatus: () => true
                }
            );

            if (response.status < 200 || response.status >= 300 || !Array.isArray(response.data?.subbots)) {
                console.error('[BOTS] Respuesta inválida:', response.status, response.data);
                await responder.texto(
                    '❌ No se pudo conectar con el servidor de subbots.\n\n' +
                    '📡 Puede que esté apagado o reiniciándose.'
                );
                return;
            }

            const subbots = response.data.subbots;
            const conectados = subbots.filter(s => s.estado === 'conectado');

            let texto =
                '╭〔 🤖 𝐒𝐔𝐁𝐁𝐎𝐓𝐒 〕⬣\n' +
                '┃\n' +
                `┃ 🟢 Conectados: ${conectados.length}\n` +
                `┃ 📊 Total activos: ${subbots.length}\n` +
                '┃\n';

            if (subbots.length === 0) {
                texto += '┃ No hay ningún subbot vinculado\n┃ todavía.\n┃\n';
            } else {
                subbots.forEach(s => {
                    const tiempo = formatearTiempo(s.creado);
                    texto += `┃ ${iconoEstado(s.estado)} ${enmascararNumero(s.numero)}${tiempo ? ` · ${tiempo}` : ''}\n`;
                });
                texto += '┃\n';
            }

            texto += '╰━━━━━━━━━━━━━━━━⬣';

            await responder.texto(texto);

        } catch (error) {
            console.error('[BOTS] Error:', error?.message || error);

            if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
                await responder.texto('⏱️ El servidor de subbots tardó demasiado en responder.');
                return;
            }

            await responder.texto(
                '❌ No se pudo conectar con el servidor de subbots.\n\n' +
                '📡 Puede que esté apagado ahorita.'
            );
        }
    }
};
