// commands/economy/setgenero.js
import {
    GENEROS,
    setGenero
} from '../../database/perfiles.js';

// Mapea variantes de escritura hacia una clave válida de GENEROS.
const ALIAS_GENERO = {

    masculino: 'masculino',
    hombre: 'masculino',
    m: 'masculino',
    chico: 'masculino',

    femenino: 'femenino',
    mujer: 'femenino',
    f: 'femenino',
    chica: 'femenino',

    otro: 'otro',
    otros: 'otro',
    prefierononsdecir: 'otro',
    prefierononodecir: 'otro'

};

function normalizar(texto) {

    return String(texto)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '');

}

export default {
    nombre: 'setgenero',

    categoria: 'economia',

    alias: [
        'setgender',
        'setgénero'
    ],

    descripcion:
        'Configura tu género. Uso: .setgenero masculino/femenino/otro',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const clave =
            ALIAS_GENERO[
                normalizar(argumento || '')
            ];

        if (!clave) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐒𝐄𝐓𝐆𝐄𝐍𝐄𝐑𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Opción inválida.\n' +
                '┃\n' +
                '┃ 📌 Uso: .setgenero <opción>\n' +
                '┃\n' +
                '┃ Opciones:\n' +
                '┃ • masculino\n' +
                '┃ • femenino\n' +
                '┃ • otro\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        setGenero(
            id,
            clave
        );

        const info =
            GENEROS[clave];

        await responder.texto(
            '╭〔 ⚧️ 𝐒𝐄𝐓𝐆𝐄𝐍𝐄𝐑𝐎 〕⬣\n' +
            '┃\n' +
            '┃ ✅ Género guardado.\n' +
            '┃\n' +
            `┃ ${info.emoji} Género › *${info.etiqueta}*\n` +
            '┃\n' +
            '┃ Se mostrará en tu .profile\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
