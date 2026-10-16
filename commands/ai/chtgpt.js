import axios from 'axios';

export default {
    nombre: 'chatgpt',
    categoria: 'IA',
    alias: ['gpt', 'ia', 'chat'],
    descripcion: 'Conversa con ChatGPT.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const text = String(argumento || '').trim();

        if (!text) {
            return await responder.texto(
                '╭━━〔 🤖 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❓ ¿Qué querés preguntarle?\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ › .chatgpt hola, cómo estás\n' +
                '┃ › .gpt dame una idea de negocio\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        try {
            // Reacción directa (funciona siempre, sin depender del handler)
            await sock.sendMessage(jid, { 
                react: { text: '🤖', key: msg.key } 
            });

            const { data } = await axios.get('https://api.alyacore.xyz/ai/chatgpt', {
                params: {
                    text: text,
                    key: 'Duarte-zz12'
                }
            });

            if (!data.status || !data.result) {
                await sock.sendMessage(jid, { 
                    react: { text: '❌', key: msg.key } 
                });
                return await responder.texto(
                    '❌ No pude obtener respuesta de ChatGPT.\n' +
                    'Intentá de nuevo más tarde.'
                );
            }

            await responder.texto(
                '╭━━〔 🤖 𝐑𝐄𝐒𝐏𝐔𝐄𝐒𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                `┃ ${data.result}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            
            await sock.sendMessage(jid, { 
                react: { text: '✅', key: msg.key } 
            });

        } catch (err) {
            console.error('[CHATGPT] Error:', err?.message || err);
            await sock.sendMessage(jid, { 
                react: { text: '❌', key: msg.key } 
            });
            await responder.texto(
                '❌ Ocurrió un error al conectar con la API de ChatGPT.\n' +
                'Verifica tu conexión o intentá más tarde.'
            );
        }
    }
};