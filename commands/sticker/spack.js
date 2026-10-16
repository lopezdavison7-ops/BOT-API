// commands/stickers/spack.js
import axios from 'axios';
import fs from 'fs';

const API_DELIRIUS = 'https://api.delirius.online';

export default {
    nombre: 'spack',
    categoria: 'Stickers',
    alias: ['stickerpack', 'packstickers'],
    descripcion: 'Descarga un pack completo de Stickerly',
    
    ejecutar: async (sock, msg, texto, args) => {
        // Si args es undefined, extraer de texto
        const query = args && args.length > 0 ? args.join(' ') : (texto || '').trim();
        
        if (!query) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Uso: .spack <búsqueda> o .spack <url>'
            }, { quoted: msg });
        }
        
        try {
            let stickers = [];
            let packName = 'Sticker Pack';
            
            // Si es URL directa
            if (query.includes('sticker.ly/s/')) {
                const packId = query.split('/s/')[1].split('/')[0];
                const response = await axios.get(`${API_DELIRIUS}/stickers/${packId}`);
                stickers = response.data.stickers || [];
                packName = response.data.packName || 'Sticker Pack';
            } else {
                // Buscar pack
                const searchResponse = await axios.get(`${API_DELIRIUS}/search/stickers?q=${encodeURIComponent(query)}`);
                if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
                    return sock.sendMessage(msg.key.remoteJid, {
                        text: '❌ No se encontraron resultados'
                    }, { quoted: msg });
                }
                
                const firstPack = searchResponse.data.results[0];
                const packResponse = await axios.get(`${API_DELIRIUS}/stickers/${firstPack.id}`);
                stickers = packResponse.data.stickers || [];
                packName = packResponse.data.packName || 'Sticker Pack';
            }
            
            if (!stickers.length) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ No se encontraron stickers en el pack'
                }, { quoted: msg });
            }
            
            // Enviar todos los stickers con mismo packname/author
            const author = 'BOT-API Pack';
            const cleanPackName = packName.slice(0, 30);
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `📦 Enviando pack: *${cleanPackName}* (${stickers.length} stickers)`
            }, { quoted: msg });
            
            let enviados = 0;
            for (const sticker of stickers) {
                try {
                    await sock.sendMessage(msg.key.remoteJid, {
                        sticker: { url: sticker.url },
                        packname: cleanPackName,
                        author: author
                    }, { quoted: msg });
                    enviados++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    console.log('Error enviando sticker:', err.message);
                }
            }
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Pack enviado: ${enviados}/${stickers.length} stickers\n\n💡 Mantén presionado cualquier sticker → "Añadir a mis stickers" para guardar el pack completo`
            }, { quoted: msg });
            
        } catch (error) {
            console.error('Error en spack:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`
            }, { quoted: msg });
        }
    }
};