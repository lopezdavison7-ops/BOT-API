import { esGrupo, verificarPermisosAdmin, obtenerObjetivo } from '../../lib/grupos.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

function soloDigitos(texto = '') {
    return texto.replace(/[^0-9]/g, '');
}

function extraerNumeros(texto = '') {
    return texto
        .split(/[\s,;|/]+/)
        .map(soloDigitos)
        .filter(n => n.length >= 7 && n.length <= 15);
}

function obtenerContexto(msg) {
    const contenido = msg.message || {};

    for (const valor of Object.values(contenido)) {
        if (valor && valor.contextInfo) {
            return valor.contextInfo;
        }
    }

    return null;
}

function listar(numeros, maximo = 25) {
    const visibles = numeros.slice(0, maximo).map(n => `• +${n}`);

    if (numeros.length > maximo) {
        visibles.push(`• ...y ${numeros.length - maximo} más`);
    }

    return visibles.join('\n');
}

async function agregarEnLotes(sock, chatId, numeros, { lote, espera, reintentos }) {
    const agregados = [];
    const yaEstaban = [];
    const fallaron = [];

    for (let i = 0; i < numeros.length; i += lote) {
        const bloque = numeros
            .slice(i, i + lote)
            .map(n => `${n}@s.whatsapp.net`);

        let respuesta = [];

        for (let intento = 0; intento <= reintentos; intento++) {
            try {
                respuesta = await sock.groupParticipantsUpdate(
                    chatId,
                    bloque,
                    'add'
                );

                break;
            } catch (error) {
                console.error(
                    '[ADD]',
                    error?.stack || error?.message || error
                );

                if (intento === reintentos) respuesta = [];
                else await delay(1200);
            }
        }

        for (const resultado of respuesta || []) {
            const numero = resultado.jid.split('@')[0].split(':')[0];

            if (resultado.status === '200') agregados.push(numero);
            else if (resultado.status === '409') yaEstaban.push(numero);
            else fallaron.push(numero);
        }

        if (espera > 0 && i + lote < numeros.length) {
            await delay(espera);
        }
    }

    return { agregados, yaEstaban, fallaron };
}

export default {
    nombre: 'add',
    categoria: 'grupos',
    alias: ['agregar', 'anadir', 'añadir'],
    descripcion:
        'Agrega uno o varios números al grupo. Uso: .add 5215512345678 5215512345679 [--bug]',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        if (!esGrupo(chatId)) {
            return responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
            );
        }

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);

        if (!permiso.ok) {
            return responder.texto(permiso.motivo);
        }

        const texto = argumento || '';

        const modoBug = /--bug\b/i.test(texto);
        const coincidenciaLote = texto.match(/--lote\s+(\d+)/i);
        const coincidenciaDelay = texto.match(/--delay\s+(\d+)/i);

        let crudo = texto.replace(
            /--(bug|lote\s+\d+|delay\s+\d+)/gi,
            ' '
        );

        // Datos del mensaje citado (tarjeta de contacto, texto o menciones)
        const contexto = obtenerContexto(msg);
        const citado = contexto?.quotedMessage;

        if (citado) {
            const vcard =
                citado.contactMessage?.vcard ||
                citado.contactsArrayMessage?.contacts
                    ?.map(c => c.vcard)
                    .join(' ');

            if (vcard) crudo += ' ' + vcard;

            const textoCitado =
                citado.conversation ||
                citado.extendedTextMessage?.text ||
                '';

            if (textoCitado) crudo += ' ' + textoCitado;
        }

        if (contexto?.mentionedJid?.length) {
            crudo += ' ' + contexto.mentionedJid
                .map(jid => jid.split('@')[0])
                .join(' ');
        }

        const miId = sock.user?.id?.split(':')[0].split('@')[0] || '';

        let numeros = [...new Set(extraerNumeros(crudo))]
            .filter(n => n !== miId);

        // Si respondió a alguien y no puso números, se agrega a esa persona
        if (!numeros.length) {
            const objetivo = obtenerObjetivo(msg, '');

            if (objetivo) {
                const numero = objetivo.split('@')[0].split(':')[0];

                if (numero && numero !== miId) numeros.push(numero);
            }
        }

        if (!numeros.length) {
            return responder.texto(
                '⚠️ Debes indicar al menos un número.\n\n' +
                'Ejemplos:\n' +
                '• .add 5215512345678 5215512345679\n' +
                '• Responde a un contacto y escribe .add\n\n' +
                'Modos:\n' +
                '• .add 521... --bug (lotes grandes, sin pausa)\n' +
                '• .add 521... --lote 20 --delay 500'
            );
        }

        let metadata = null;

        try {
            metadata = await sock.groupMetadata(chatId);
        } catch (error) {
            console.error(
                '[ADD]',
                error?.stack || error?.message || error
            );
        }

        // El bot necesita ser admin para poder agregar
        const yo = metadata?.participants?.find(
            p => p.id.split('@')[0].split(':')[0] === miId
        );

        if (yo && !yo.admin) {
            return responder.texto(
                '🤖 Necesito ser *administrador* del grupo para agregar gente.'
            );
        }

        // Sacamos de la lista a los que ya están
        const enGrupo = (metadata?.participants || []).map(
            p => p.id.split('@')[0].split(':')[0]
        );

        const yaEstaban = numeros.filter(n => enGrupo.includes(n));
        numeros = numeros.filter(n => !enGrupo.includes(n));

        const opciones = modoBug
            ? { lote: 50, espera: 0, reintentos: 3 }
            : {
                lote: coincidenciaLote
                    ? Math.min(100, Math.max(1, +coincidenciaLote[1]))
                    : 10,
                espera: coincidenciaDelay ? +coincidenciaDelay[1] : 700,
                reintentos: 2
            };

        if (numeros.length) {
            await responder.texto(
                `⏳ Agregando *${numeros.length}* número(s)` +
                `${modoBug ? ' en modo *bug*' : ''}...`
            );
        }

        const resultado = numeros.length
            ? await agregarEnLotes(sock, chatId, numeros, opciones)
            : { agregados: [], yaEstaban: [], fallaron: [] };

        resultado.yaEstaban.push(...yaEstaban);

        let reporte = '📋 *Resultado*';

        if (resultado.agregados.length) {
            reporte +=
                `\n\n✅ *Agregados* (${resultado.agregados.length}):\n` +
                listar(resultado.agregados);
        }

        if (resultado.yaEstaban.length) {
            reporte +=
                `\n\n👥 *Ya estaban* (${resultado.yaEstaban.length}):\n` +
                listar(resultado.yaEstaban);
        }

        if (resultado.fallaron.length) {
            reporte +=
                `\n\n⚠️ *No se pudieron* (${resultado.fallaron.length}):\n` +
                listar(resultado.fallaron) +
                '\n_Puede ser por su privacidad o número inválido._';
        }

        if (
            !resultado.agregados.length &&
            !resultado.yaEstaban.length &&
            !resultado.fallaron.length
        ) {
            reporte += '\n\nSin cambios.';
        }

        await responder.texto(reporte);
    }
};