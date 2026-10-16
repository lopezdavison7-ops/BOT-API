import axios from 'axios';

const API_DELIRIUS = 'https://api.delirius.online';

export default {
    nombre: 'spack',
    categoria: 'Stickers',
    alias: ['stickerpack', 'packstickers'],
    descripcion: 'Descarga un pack completo de Stickerly',
    uso: '.spack <búsqueda> o .spack <url>',
    
    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const query = String(argumento || '').trim();
        
        if (!query) {
            return await responder.texto(
                '╭━━〔 📦 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 𝐏𝐀𝐂𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Uso incorrecto\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ .spack https://sticker.ly/s/XXXX\n' +
                '┃ .spack cute cat\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
        
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
        
        try {
            let stickers = [];
            let packName = 'Sticker Pack';
            
            // Si es URL directa de sticker.ly
            if (query.includes('sticker.ly/s/')) {
                const packId = query.split('/s/')[1].split('/')[0].split('?')[0];
                const response = await axios.get(`${API_DELIRIUS}/stickers/${packId}`, {
                    timeout: 30000
                });
                
                if (!response.data || !response.data.stickers) {
                    throw new Error('No se pudo obtener el pack');
                }
                
                stickers = response.data.stickers || [];
                packName = response.data.packName || 'Sticker Pack';
            } else {
                // Buscar pack por texto
                const searchResponse = await axios.get(
                    `${API_DELIRIUS}/search/stickers?q=${encodeURIComponent(query)}`,
                    { timeout: 30000 }
                );
                
                if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
                    throw new Error('No se encontraron resultados');
                }
                
                const firstPack = searchResponse.data.results[0];
                const packResponse = await axios.get(`${API_DELIRIUS}/stickers/${firstPack.id}`, {
                    timeout: 30000
                });
                
                if (!packResponse.data || !packResponse.data.stickers) {
                    throw new Error('No se pudo obtener el pack');
                }
                
                stickers = packResponse.data.stickers || [];
                packName = packResponse.data.packName || 'Sticker Pack';
            }
            
            if (!stickers.length) {
                throw new Error('El pack no tiene stickers');
            }
            
            const author = 'BOT-API Pack';
            const cleanPackName = packName.slice(0, 30);
            
            await responder.texto(
                `╭━━〔 📦 𝐏𝐀𝐂𝐊 〕━━⬣\n` +
                `┃\n` +
                `┃ 📦 *${cleanPackName}*\n` +
                `┃ 📸 ${stickers.length} stickers\n` +
                `┃\n` +
                `┃ ⏳ Enviando...\n` +
                `┃\n` +
                `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`
            );
            
            let enviados = 0;
            for (const sticker of stickers) {
                try {
                    await sock.sendMessage(jid, {
                        sticker: { url: sticker.url },
                        packname: cleanPackName,
                        author: author
                    }, { quoted: msg });
                    
                    enviados++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    console.log(`[SPACK] Error sticker ${enviados + 1}:`, err.message);
                }
            }
            
            if (enviados === 0) {
                throw new Error('No se pudo enviar ningún sticker');
            }
            
            await responder.texto(
                `╭━━〔 ✅ 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕━━⬣\n` +
                `┃\n` +
                `┃ 📤 ${enviados}/${stickers.length} stickers\n` +
                `┃ 📦 Pack: *${cleanPackName}*\n` +
                `┃\n` +
                `┃ 💡 Mantén presionado un\n` +
                `┃    sticker → "Añadir a mis\n` +
                `┃    stickers" para guardar\n` +
                `┃    el pack completo\n` +
                `┃\n` +
                `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`
            );
            
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            
        } catch (error) {
            console.error('[SPACK] Error:', error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await responder.texto(
                `╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n` +
                `┃\n` +
                `┃ ⚠️ ${error.message || 'Error desconocido'}\n` +
                `┃\n` +
                `┃ 💡 Verifica la URL o intenta\n` +
                `┃    con otro término de búsqueda\n` +
                `┃\n` +
                `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`
            );
        }
    }
};