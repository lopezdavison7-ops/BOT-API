// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST - MANDA TODAS LAS QUE VENGA
// BOT-API + YO SOY YO BAILEYS
// ============================================================

const API_BASE = 'https://apiyosoyyo-ofc.onrender.com';
const API_KEY = process.env.YO_SOY_YO_API_KEY || process.env.YT_API_KEY || 'yosoyyo_sk_gincmnk3';
const API_PINTEREST = `${API_BASE}/api/pinterest`;
const TIMEOUT_API = 30000;
const LIMITE_RESULTADOS = 30; // Le pedimos más a la API. WhatsApp max 10 por álbum
const CAPTION = 'BOT-API 👄😍';

//... el resto de funciones fetchConTimeout, descargarImagen, buscarPinterest quedan igual...

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'pinterest',
    categoria: 'descargas',
    alias: ['pin', 'pinterestimg'],
    descripcion: 'Busca imágenes en Pinterest y las envía en álbum.',
    ejecutar: async ({ sock, msg, responder, argumento }) => {

        const consulta = argumento?.trim();
        if (!consulta) {
            await responder.texto(
                '╭━━〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué quieres buscar.\n' +
                '┃ 📌 Ej:.pinterest anime\n' +
                '╰━━━━━━━━⬣'
            );
            return;
        }

        const jid = msg?.key?.remoteJid;
        if (!jid) return;

        try {
            await responder.texto(`📌 *Pinterest*\n\n🔎 Búsqueda: *${consulta}*\n⏳ Descargando y creando álbumes...`);

            const resultados = await buscarPinterest(consulta);

            // ------------------------------------------------
            // DESCARGAR TODAS LAS IMÁGENES PRIMERO
            // ------------------------------------------------
            const buffers = [];
            for (let i = 0; i < resultados.length; i++) {
                try {
                    const buffer = await descargarImagen(resultados[i].descarga);
                    buffers.push({ image: buffer });
                    console.log(`[PINTEREST] Imagen ${i + 1}/${resultados.length} lista`);
                } catch (e) {
                    console.error(`[PINTEREST] Error img ${i + 1}:`, e.message);
                }
            }

            if (buffers.length === 0) throw new Error('No pude descargar ninguna imagen.');

            // ------------------------------------------------
            // ENVIAR EN ÁLBUMES DE 10 - WHATSAPP NO DEJA MÁS
            // ------------------------------------------------
            const CHUNK_SIZE = 10;
            let albumNum = 1;
            const totalAlbums = Math.ceil(buffers.length / CHUNK_SIZE);

            for (let i = 0; i < buffers.length; i += CHUNK_SIZE) {
                const chunk = buffers.slice(i, i + CHUNK_SIZE);
                const isFirstAlbum = i === 0;

                await sock.sendMessage(jid, {
                    album: chunk,
                    caption: isFirstAlbum
                       ? `📌 *Pinterest*: ${consulta}\n🖼️ ${buffers.length} imágenes totales\nÁlbum ${albumNum}/${totalAlbums}\n${CAPTION}`
                        : `Álbum ${albumNum}/${totalAlbums}`
                }, { quoted: isFirstAlbum? msg : undefined });

                albumNum++;
                await new Promise(r => setTimeout(r, 2000)); // delay anti-ban entre álbumes
            }

            await responder.texto(`✅ *Listo*\n\n🔎 Búsqueda: *${consulta}*\n🖼️ Enviadas: *${buffers.length}* en *${totalAlbums}* álbumes`);

        } catch (error) {
            console.error('[PINTEREST] Error:', error);
            await responder.texto(`╭━━〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n┃\n┃ ⚠️ ${error?.message || 'Error desconocido.'}\n╰━━━━━━━━⬣`);
        }
    }
};