// commands/info/pais.js
// ============================================================
// BOT-API — INFO DE PAÍSES (API Delirius) — Traducido al español
// ============================================================
// .pais colombia · .pais usa · .pais japan
// ============================================================

// Traducciones de valores comunes de la API
const TRADUCCIONES = {
    // Continentes
    'North America': 'América del Norte',
    'South America': 'América del Sur',
    'Central America': 'América Central',
    'Europe': 'Europa',
    'Asia': 'Asia',
    'Africa': 'África',
    'Oceania': 'Oceanía',
    'Antarctica': 'Antártida',
    
    // Estado soberano
    'Yes': 'Sí',
    'No': 'No',
    
    // Océanos
    'North Pacific Ocean': 'Océano Pacífico Norte',
    'South Pacific Ocean': 'Océano Pacífico Sur',
    'Pacific Ocean': 'Océano Pacífico',
    'Atlantic Ocean': 'Océano Atlántico',
    'Caribbean Sea': 'Mar Caribe',
    'Indian Ocean': 'Océano Índico',
    'Arctic Ocean': 'Océano Ártico',
    'Mediterranean Sea': 'Mar Mediterráneo',
    
    // Organizaciones
    'United Nations': 'Naciones Unidas',
    'Organization of American States': 'Organización de los Estados Americanos',
    'Union of South American Nations': 'Unión de Naciones Suramericanas',
    'European Union': 'Unión Europea',
    'African Union': 'Unión Africana',
    'Commonwealth of Nations': 'Mancomunidad de Naciones',
    'Central American Integration System': 'Sistema de la Integración Centroamericana',
    'Association of Southeast Asian Nations': 'Asociación de Naciones del Sudeste Asiático',
    'Arab League': 'Liga Árabe',
    
    // Fuentes de datos
    'World Bank': 'Banco Mundial',
};

function traducir(texto) {
    if (!texto) return texto;
    let resultado = String(texto);
    for (const [ingles, espanol] of Object.entries(TRADUCCIONES)) {
        resultado = resultado.split(ingles).join(espanol);
    }
    return resultado;
}

function traducirDatos(d) {
    return {
        officialName: d.officialName || '',
        capitalCity: d.capitalCity || '',
        continent: traducir(d.continent) || '',
        population: d.population || '',
        area: d.area || '',
        currency: d.currency || '',
        gdpPerCapita: d.gdpPerCapita || '',
        callingCode: d.callingCode || '',
        internetTld: d.internetTld || '',
        highestPoint: d.highestPoint || '',
        lowestPoint: traducir(d.lowestPoint) || '',
        countryCodes: d.countryCodes || '',
        memberOf: traducir(d.memberOf) || '',
        sovereignState: traducir(d.sovereignState) || ''
    };
}

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

            const d = traducirDatos(json.data);

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
                (json.data.description
                    ? '┃ 📖 *Descripción:*\n┃ ' + json.data.description + '\n┃\n'
                    : '') +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (json.data.image) {
                await responder.imagen(
                    { url: json.data.image },
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