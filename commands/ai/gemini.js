// commands/ia/gemini.js
// ============================================================
// BOT-API — GEMINI AI (Delirius API)
// ============================================================
// .gemini <pregunta>  → respuesta de Google Gemini
// .gmn <pregunta>     → alias corto
// ============================================================

const API = 'https://api.delirius.online/ia/gemini?query=';

export default {
    nombre: 'gemini',
    categoria: 'ia',
    alias: ['gmn', 'gem'],
    descripcion: 'Habla con Google Gemini AI',
    uso: '.gemini <pregunta> | .gmn <pregunta>',
    ejecutar: async ({ msg, argumento, responder }) => {
        const pregunta = String(argumento || '').trim();

        if (!pregunta) {
            return await responder.texto(
                '╭━━〔 🤖 𝐆𝐄𝐌𝐈𝐍𝐈 𝐀𝐈 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta tu pregunta\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .gemini ¿qué es la IA?\n' +
                '┃ • .gmn clima de hoy\n' +
                '┃ • .gemini escribe un poema\n' +
                '┃\n' +
                '┃ 💡 Puedes preguntar lo que sea:\n' +
                '┃    ciencia, código, cocina,\n' +
                '┃    historia, idiomas, etc.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ---------- INDICADOR DE CARGA ----------
        await responder.texto('⏳ *Gemini está pensando...*\n\n💭 ' + pregunta);

        try {
            // ---------- CONSULTAR API ----------
            const res = await fetch(API + encodeURIComponent(pregunta));
            const text = await res.text();

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            let json;
            try {
                json = JSON.parse(text);
            } catch {
                throw new Error('Respuesta no es JSON válida');
            }

            // Normalizar claves (ES / EN)
            const status = json.estado ?? json.status ?? false;
            const datos = json.datos ?? json.data ?? null;

            // Validar estado
            if (status === false || !datos) {
                const motivo = json.mensaje || json.msg || json.message || 'Error desconocido';
                throw new Error(motivo);
            }

            const respuesta = datos.resultado || datos.result || datos.respuesta || datos.text || '';

            if (!respuesta || !respuesta.trim()) {
                throw new Error('Gemini no generó una respuesta');
            }

            // ---------- FORMATEAR RESPUESTA ----------
            const respuestaLimpia = respuesta.trim();
            const respuestaCorta = pregunta.length > 100 
                ? pregunta.substring(0, 100) + '...' 
                : pregunta;

            const texto =
                '╭━━〔 🤖 𝐆𝐄𝐌𝐈𝐍𝐈 𝐀𝐈 〕━━⬣\n' +
                '┃\n' +
                '┃ 🙋 *Tu pregunta:*\n' +
                '┃ ' + respuestaCorta + '\n' +
                '┃\n' +
                '┣━━━━━━━━━━━━━━━━⬣\n' +
                '┃\n' +
                '┃ 💡 *Respuesta:*\n' +
                '┃\n' +
                respuestaLimpia.split('\n').map(l => '┃ ' + l).join('\n') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // Si es muy larga, mandar en partes
            if (texto.length > 4000) {
                const partes = [];
                const lineas = respuestaLimpia.split('\n');
                let chunk = '';
                
                for (const linea of lineas) {
                    if ((chunk + '\n' + linea).length > 2500) {
                        partes.push(chunk);
                        chunk = linea;
                    } else {
                        chunk = chunk ? chunk + '\n' + linea : linea;
                    }
                }
                if (chunk) partes.push(chunk);

                // Primera parte con header
                await responder.texto(
                    '╭━━〔 🤖 𝐆𝐄𝐌𝐈𝐍𝐈 𝐀𝐈 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 🙋 *Tu pregunta:*\n' +
                    '┃ ' + respuestaCorta + '\n' +
                    '┃\n' +
                    '┣━━━━━━━━━━━━━━━━⬣\n' +
                    '┃\n' +
                    '┃ 💡 *Respuesta (1/' + partes.length + '):*\n' +
                    '┃\n' +
                    partes[0].split('\n').map(l => '┃ ' + l).join('\n') + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );

                // Resto
                for (let i = 1; i < partes.length; i++) {
                    await responder.texto(
                        '╭━━〔 🤖 𝐆𝐄𝐌𝐈𝐍𝐈 𝐀𝐈 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 💡 *Respuesta (' + (i + 1) + '/' + partes.length + '):*\n' +
                        '┃\n' +
                        partes[i].split('\n').map(l => '┃ ' + l).join('\n') + '\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }
            } else {
                await responder.texto(texto);
            }

        } catch (error) {
            console.error('[GEMINI] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐆𝐄𝐌𝐈𝐍𝐈 𝐀𝐈 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude obtener respuesta.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '┃ 💡 Intenta reformular tu\n' +
                '┃    pregunta o prueba de nuevo.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};