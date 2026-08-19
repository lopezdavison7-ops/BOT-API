// commands/hora.js
export default {
    nombre: 'hora',
    categoria: 'Utilidades',
    alias: ['tiempo', 'reloj'],
    descripcion: 'Muestra la hora actual en diferentes países',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const zonas = {
                'mx': { nombre: 'México', zona: 'America/Mexico_City' },
                'ar': { nombre: 'Argentina', zona: 'America/Argentina/Buenos_Aires' },
                'cl': { nombre: 'Chile', zona: 'America/Santiago' },
                'pe': { nombre: 'Perú', zona: 'America/Lima' },
                'co': { nombre: 'Colombia', zona: 'America/Bogota' },
                'es': { nombre: 'España', zona: 'Europe/Madrid' },
                'us': { nombre: 'USA (NY)', zona: 'America/New_York' },
                'jp': { nombre: 'Japón', zona: 'Asia/Tokyo' },
                'uk': { nombre: 'Reino Unido', zona: 'Europe/London' },
                'de': { nombre: 'Alemania', zona: 'Europe/Berlin' }
            };

            let respuesta = `╭〔 🕐 𝐇𝐎𝐑𝐀 𝐌𝐔𝐍𝐃𝐈𝐀𝐋 〕⬣\n┃\n`;

            for (const [code, data] of Object.entries(zonas)) {
                const date = new Date();
                const options = { timeZone: data.zona, hour12: false, hour: '2-digit', minute: '2-digit' };
                const time = date.toLocaleTimeString('es-ES', options);
                respuesta += `┃ ${data.nombre}: ${time}\n`;
            }

            respuesta += `┃\n╰━━━━━━━━━━━━━━━━⬣\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;

            await responder.texto(respuesta);

        } catch (error) {
            console.error('[HORA] Error:', error);
            await responder.texto('❌ Error al obtener la hora.');
        }
    }
};