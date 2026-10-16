import fetch from 'node-fetch';

export default {
    nombre: 'ppcp',
    categoria: 'Imágenes',
    alias: ['ppcouple', 'pareja', 'ppamistad', 'amistad'],
    descripcion: 'Genera imágenes de perfil para parejas o amistades.',

    ejecutar: async ({ sock, msg, responder, jid }) => {
        // Función de reacción blindada (a prueba de fallos)
        const reaccion = async (emoji) => {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
        };

        try {
            await reaccion('🕒');

            // Obtener la base de datos de imágenes
            const response = await fetch('https://raw.githubusercontent.com/ShirokamiRyzen/WAbot-DB/main/fitur_db/ppcp.json');
            
            if (!response.ok) {
                throw new Error('No se pudo conectar a la base de datos de imágenes.');
            }

            const data = await response.json();
            
            // Elegir una pareja aleatoria
            const cita = data[Math.floor(Math.random() * data.length)];

            // 1. Descargar y enviar imagen Masculina
            const resCowo = await fetch(cita.cowo);
            const cowiBuffer = Buffer.from(await resCowo.arrayBuffer());
            
            await sock.sendMessage(jid, {
                image: cowiBuffer,
                caption: '*Masculino* ♂'
            }, { quoted: msg });

            // Pequeña pausa para que se envíen en orden y no se sature
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Descargar y enviar imagen Femenina
            const resCewe = await fetch(cita.cewe);
            const ciwiBuffer = Buffer.from(await resCewe.arrayBuffer());
            
            await sock.sendMessage(jid, {
                image: ciwiBuffer,
                caption: '*Femenina* ♀'
            }, { quoted: msg });

            await reaccion('✅');

        } catch (error) {
            console.error('[PPCP] Error:', error?.message || error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al generar las imágenes.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};