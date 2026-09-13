// commands/info/pais.js
// ============================================================
// BOT-API — INFO DE PAÍSES (API Delirius)
// ============================================================
// .pais colombia · .pais usa · .pais japan
// ============================================================

export default {
    nombre: 'bandera',
    categoria: 'utils',
    alias: ['country', 'paisinfo', 'bandera', 'flag'],
    descripcion: 'Muestra información detallada de cualquier país',
    uso: '.pais <nombre del país>',
    ejecutar: async ({ argumento, responder }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto(
                '╭━━〔 🌎 𝐏𝐀Í𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre de un país\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .pais colombia\n' +
                '┃ .pais mexico\n' +
                '┃ .pais japan\n' +
                '┃ .pais argentina\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            const url = `https://api.delirius.online/tools/flaginfo?query=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            const json = await res.json();

            if (!json.status || !json.data) {
                return await responder.texto('❌ No se encontró información para: *' + query + '*\nIntenta en inglés (ej: .pais colombia)');
            }

            const d = json.data;

            const campos = [
                ['🏛️ Nombre oficial', d.officialName],
                ['🏙️ Capital', d.capitalCity],
                ['🌍 Continente', d.continent],
                ['👥 Población', d.population],
                ['📐 Área', d.area],
                ['💰 Moneda', d.currency],
                ['📊 PIB per cápita', d.gdpPerCapita],
                ['📞 Código telefónico', d.callingCode],
                ['🌐 Dominio internet', d.internetTld],
                ['🏔️ Punto más alto', d.highestPoint],
                ['🌊 Punto más bajo', d.lowestPoint],
                ['🆔 Códigos ISO', d.countryCodes],
                ['🤝 Miembro de', d.memberOf],
                ['🏳️ Estado soberano', d.sovereignState]
            ];

            let datosTexto = '';
            for (const [icono, valor] of campos) {
                if (valor) datosTexto += `┃ ${icono}: ${valor}\n`;
            }

            const mensaje =
                '╭━━〔 🌎 𝐈𝐍𝐅𝐎 𝐃𝐄 𝐏𝐀Í𝐒 〕━━⬣\n' +
                '┃\n' +
                datosTexto +
                '┃\n' +
                (d.description
                    ? '┃ 📖 *Descripción:*\n┃ ' + d.description + '\n┃\n'
                    : '') +
                (json.creator
                    ? '┃ 👤 API: ' + json.creator + '\n'
                    : '') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (d.image) {
                await responder.imagen(
                    { url: d.image },
                    mensaje
                );
            } else {
                await responder.texto(mensaje);
            }

        } catch (error) {
            console.error('[PAIS] Error:', error?.message || error);
            await responder.texto('❌ Error consultando la API: ' + (error?.message || 'Intenta de nuevo.'));
        }
    }
};