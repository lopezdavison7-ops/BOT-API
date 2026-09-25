

import fs from 'fs';
import path from 'path';

const ARCHIVO = path.join(
    process.cwd(),
    'database',
    'bienvenida.json'
);

function asegurarArchivo() {
    const carpeta = path.dirname(ARCHIVO);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(ARCHIVO)) {
        fs.writeFileSync(
            ARCHIVO,
            JSON.stringify({}, null, 2)
        );
    }
}

function leerConfiguracion() {
    asegurarArchivo();

    try {
        const contenido =
            fs.readFileSync(
                ARCHIVO,
                'utf8'
            );

        return JSON.parse(contenido || '{}');
    } catch (error) {
        console.error(
            '[BIENVENIDA] Error leyendo configuración:',
            error
        );

        return {};
    }
}

function guardarConfiguracion(configuracion) {
    asegurarArchivo();

    fs.writeFileSync(
        ARCHIVO,
        JSON.stringify(
            configuracion,
            null,
            2
        )
    );
}

export function bienvenidaActivada(grupoId) {
    if (!grupoId) return false;

    const configuracion =
        leerConfiguracion();

    return configuracion[grupoId] === true;
}

export function establecerBienvenida(
    grupoId,
    estado
) {
    if (!grupoId) return false;

    const configuracion =
        leerConfiguracion();

    configuracion[grupoId] =
        Boolean(estado);

    guardarConfiguracion(
        configuracion
    );

    return configuracion[grupoId];
}

export default {
    nombre: 'bienvenida',

    categoria: 'grupos',

    alias: [
        'welcome'
    ],

    descripcion:
        'Activa o desactiva la bienvenida del grupo.',

    ejecutar: async ({
        responder,
        argumento,
        msg
    }) => {

        const grupoId =
            msg?.key?.remoteJid;

        if (
            !grupoId ||
            !grupoId.endsWith('@g.us')
        ) {
            return responder.texto(
                '❌ Este comando solo funciona en grupos.'
            );
        }

        const opcion =
            String(
                argumento || ''
            )
            .trim()
            .toLowerCase();

        if (!opcion) {

            const activa =
                bienvenidaActivada(
                    grupoId
                );

            return responder.texto(
                '╭━━━〔 🤖 BOT-API 〕━━━╮\n' +
                '┃\n' +
                '┃ 👋 *BIENVENIDA*\n' +
                '┃\n' +
                `┃ Estado: ${
                    activa
                        ? '🟢 ACTIVADA'
                        : '🔴 DESACTIVADA'
                }\n` +
                '┃\n' +
                '┃ Comandos:\n' +
                '┃ • *.bienvenida on*\n' +
                '┃ • *.bienvenida off*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯'
            );
        }

        if (
            opcion === 'on' ||
            opcion === 'activar' ||
            opcion === 'encender'
        ) {

            establecerBienvenida(
                grupoId,
                true
            );

            return responder.texto(
                '╭━━━〔 🤖 BOT-API 〕━━━╮\n' +
                '┃\n' +
                '┃ 🟢 *BIENVENIDA ACTIVADA*\n' +
                '┃\n' +
                '┃ Las nuevas personas que\n' +
                '┃ entren al grupo recibirán\n' +
                '┃ una bienvenida automática.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯'
            );
        }

        if (
            opcion === 'off' ||
            opcion === 'desactivar' ||
            opcion === 'apagar'
        ) {

            establecerBienvenida(
                grupoId,
                false
            );

            return responder.texto(
                '╭━━━〔 🤖 BOT-API 〕━━━╮\n' +
                '┃\n' +
                '┃ 🔴 *BIENVENIDA DESACTIVADA*\n' +
                '┃\n' +
                '┃ Ya no se enviarán mensajes\n' +
                '┃ automáticos al entrar.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯'
            );
        }

        return responder.texto(
            '❌ Opción no válida.\n\n' +
            'Usa:\n' +
            '`.bienvenida on`\n' +
            '`.bienvenida off`'
        );
    }
};