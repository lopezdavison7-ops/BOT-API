const ASTA_API = 'https://astabot.hidenplay.net/api/v1/ali';
const ASTA_KEY = 'ASTA-B3KU7MOYAP3VRPVUPIJD';

export default {
    nombre: 'img',
    categoria: 'IA',
    alias: ['imagen', 'ia', 'ali', 'generar', 'create'],
    descripcion: 'Genera imágenes con IA a partir de un texto',
    uso: '.img <descripción>',

    ejecutar: async ({ argumento, responder }) => {
        const prompt = String(argumento || '').trim();

        if (!prompt) {
            return await responder.texto(
                '╭━━〔 🎨 𝐆𝐄𝐍𝐄𝐑𝐀𝐑 𝐈𝐌𝐀𝐆𝐄𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué quieres generar\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .img un guerrero anime con espada\n' +
                '┃ ➪ .img paisaje futurista cyberpunk\n' +
                '┃ ➪ .img retrato de mujer samurai\n' +
                '┃\n' +
                '┃ 📊 Límite: 35 generaciones/día\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            await responder.texto('🎨 Generando imagen con IA...\n⏳ Esto puede tomar 10-30 segundos');

            const url = `${ASTA_API}?prompt=${encodeURIComponent(prompt)}&key=${ASTA_KEY}`;

            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'image/*' }
            });

            if (!res.ok) {
                if (res.status === 429) {
                    return await responder.texto(
                        '╭━━〔 ⚠️ 𝐋Í𝐌𝐈𝐓𝐄 𝐀𝐋𝐂𝐀𝐍𝐙𝐀𝐃𝐎 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ❌ Se alcanzó el límite diario\n' +
                        '┃    de 35 generaciones.\n' +
                        '┃\n' +
                        '┃ 💡 Vuelve mañana o contacta\n' +
                        '┃    al dueño para más keys.\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }

                if (res.status === 401 || res.status === 403) {
                    return await responder.texto(
                        '╭━━〔 🔑 𝐄𝐑𝐑𝐎𝐑 𝐃𝐄 𝐀𝐔𝐓𝐇 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ❌ API key inválida o expirada\n' +
                        '┃\n' +
                        '┃ 💬 Contacta al dueño:\n' +
                        '┃ https://wa.me/50578391933\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }

                throw new Error(`API respondió ${res.status}`);
            }

            const contentType = res.headers.get('content-type') || '';

            if (!contentType.includes('image')) {
                const texto = await res.text();
                console.error('[IMG] Respuesta no es imagen:', texto.substring(0, 200));
                return await responder.texto('❌ La API no devolvió una imagen válida');
            }

            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if (buffer.length < 1000) {
                return await responder.texto('❌ La imagen generada está vacía o corrupta');
            }

            await responder.imagen(
                buffer,
                '╭━━〔 🎨 𝐈𝐌𝐀𝐆𝐄𝐍 𝐆𝐄𝐍𝐄𝐑𝐀𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 📝 Prompt: ' + prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '') + '\n' +
                '┃\n' +
                '┃ 🤖 Modelo: Ali · AI Image\n' +
                '┃ 📦 Tamaño: ' + (buffer.length / 1024).toFixed(1) + ' KB\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

        } catch (error) {
            console.error('[IMG] Error:', error?.message || error);

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ No se pudo generar la imagen.\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta de nuevo en unos\n' +
                '┃    segundos.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};