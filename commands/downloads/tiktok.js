import axios from 'axios';

export default {
  nombre: 'tiktok',
  alias: ['tt', 'tk'],
  categoria: 'descargas',
  descripcion: 'Descarga videos de TikTok',
  uso: '.tt <url o búsqueda>',

  async ejecutar({ sock, msg, args }) {
    const query = args.join(' ').trim();
    
    if (!query) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '🎵 *TikTok Downloader*\n\n💡 Uso: `.tt <url o búsqueda>`\n\n📝 Ejemplos:\n• `.tt hola`\n• `.tt https://vm.tiktok.com/...`'
      }, { quoted: msg });
    }

    try {
      const isUrl = query.match(/^https?:\/\//i);
      let videoData = null;

      if (isUrl) {
        // Descarga directa por URL
        const response = await axios.get(`https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(query)}`, {
          timeout: 30000
        });

        if (!response.data?.estado || !response.data?.resultado) {
          throw new Error('La API no devolvió datos válidos');
        }

        videoData = response.data.resultado;
      } else {
        // Búsqueda - usar directamente los datos del primer resultado
        const response = await axios.get(`https://api-faa.my.id/faa/tiktok-search?q=${encodeURIComponent(query)}`, {
          timeout: 30000
        });

        if (!response.data?.estado || !response.data?.resultado || !Array.isArray(response.data.resultado) || response.data.resultado.length === 0) {
          throw new Error('No se encontraron resultados para tu búsqueda');
        }

        // Usar directamente el primer resultado de búsqueda (ya tiene url_nowm)
        videoData = response.data.resultado[0];
      }

      // Extraer datos del video
      const videoUrl = videoData.url_nowm || videoData.alternativas?.seleccionado || videoData.datos;
      const audioUrl = videoData.música?.url || videoData.music_info?.url;
      const author = videoData.autor?.nickname || videoData.autor?.username || 'Desconocido';
      const title = videoData.title || videoData.título || 'Sin título';
      
      // Estadísticas (pueden venir en diferentes formatos)
      const views = videoData.estadísticas?.vistas || videoData.stats?.views || 0;
      const likes = videoData.estadísticas?.['Me gusta'] || videoData.stats?.likes || 0;
      const comments = videoData.estadísticas?.comentarios || videoData.stats?.comments || 0;

      if (!videoUrl) {
        throw new Error('No se encontró URL de descarga del video');
      }

      // Enviar video
      await sock.sendMessage(msg.key.remoteJid, {
        video: { url: videoUrl },
        caption: `🎵 *${title}*\n\n👤 Autor: ${author}\n👁️ Vistas: ${views}\n❤️ Likes: ${likes}\n💬 Comentarios: ${comments}`,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      // Enviar audio si está disponible
      if (audioUrl) {
        await sock.sendMessage(msg.key.remoteJid, {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg',
          ptt: false
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('Error en comando tiktok:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Ocurrió un error al procesar el contenido.\n\n⚠️ Detalle: ${error.message || 'Error desconocido'}`
      }, { quoted: msg });
    }
  }
};