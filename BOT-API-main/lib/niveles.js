

import path from 'path';
import { obtenerStore, guardarStore } from './jsonStore.js';

const FILE = path.join(
    process.cwd(),
    'database',
    'niveles.json'
);

const XP_POR_MENSAJE = 10;

function cargar() {
    return obtenerStore(FILE, {});
}

function guardar() {
    guardarStore(FILE);
}

function normalizarId(valor) {

    if (!valor) {
        return null;
    }

    return String(valor)
        .trim()
        .split(':')[0];
}

function crearClave(chatJid, usuarioJid) {

    const chat =
        normalizarId(chatJid);

    const usuario =
        normalizarId(usuarioJid);

    if (!chat || !usuario) {
        return null;
    }

    return `${chat}|${usuario}`;
}

export function xpNecesaria(nivel) {

    const n =
        Math.max(
            1,
            Number(nivel) || 1
        );

    return 100 + ((n - 1) * 50);
}

export function obtenerNivel(
    chatJid,
    usuarioJid
) {

    const clave =
        crearClave(
            chatJid,
            usuarioJid
        );

    if (!clave) {
        return null;
    }

    const db =
        cargar();

    if (!db[clave]) {

        db[clave] = {

            chat: normalizarId(chatJid),

            usuario:
                normalizarId(usuarioJid),

            xp: 0,

            nivel: 1,

            mensajes: 0,

            creadoEn:
                Date.now(),

            actualizadoEn:
                Date.now()
        };

        guardar();
    }

    return {
        ...db[clave]
    };
}

export function agregarXP(
    chatJid,
    usuarioJid,
    cantidad = XP_POR_MENSAJE
) {

    const clave =
        crearClave(
            chatJid,
            usuarioJid
        );

    if (!clave) {

        return {

            xp: 0,

            nivel: 1,

            mensajes: 0,

            subio: false,

            nivelesSubidos: 0,

            nivelAnterior: 1,

            xpAnterior: 0
        };
    }

    const db =
        cargar();

    if (!db[clave]) {

        db[clave] = {

            chat:
                normalizarId(chatJid),

            usuario:
                normalizarId(usuarioJid),

            xp: 0,

            nivel: 1,

            mensajes: 0,

            creadoEn:
                Date.now(),

            actualizadoEn:
                Date.now()
        };
    }

    const usuario =
        db[clave];

    const nivelAnterior =
        usuario.nivel;

    const xpAnterior =
        usuario.xp;

    usuario.xp +=
        Number(cantidad) || 0;

    usuario.mensajes++;

    let nivelesSubidos = 0;

    while (
        usuario.xp >=
        xpNecesaria(usuario.nivel)
    ) {

        usuario.xp -=
            xpNecesaria(
                usuario.nivel
            );

        usuario.nivel++;

        nivelesSubidos++;
    }

    usuario.actualizadoEn =
        Date.now();

    guardar();

    return {

        ...usuario,

        subio:
            nivelesSubidos > 0,

        nivelesSubidos,

        nivelAnterior,

        xpAnterior
    };
}

export function obtenerRanking(
    chatJid,
    limite = 10
) {

    const chat =
        normalizarId(chatJid);

    if (!chat) {
        return [];
    }

    const db =
        cargar();

    return Object.entries(db)

        .filter(
            ([, datos]) =>
                datos?.chat === chat
        )

        .map(
            ([clave, datos]) => ({

                clave,

                jid:
                    datos.usuario,

                xp:
                    Number(datos.xp) || 0,

                nivel:
                    Number(datos.nivel) || 1,

                mensajes:
                    Number(datos.mensajes) || 0
            })
        )

        .sort(
            (a, b) => {

                if (
                    b.nivel !==
                    a.nivel
                ) {

                    return (
                        b.nivel -
                        a.nivel
                    );
                }

                return (
                    b.xp -
                    a.xp
                );
            }
        )

        .slice(
            0,
            Math.max(
                1,
                Number(limite) || 10
            )
        );
}

export function porcentajeXP(
    usuario
) {

    if (!usuario) {
        return 0;
    }

    const necesaria =
        xpNecesaria(
            usuario.nivel
        );

    if (!necesaria) {
        return 0;
    }

    return Math.min(
        100,
        Math.floor(
            (
                usuario.xp /
                necesaria
            ) * 100
        )
    );
}

export function barraXP(
    usuario,
    longitud = 10
) {

    const porcentaje =
        porcentajeXP(
            usuario
        );

    const total =
        Math.max(
            5,
            Number(longitud) || 10
        );

    const llenos =
        Math.round(
            (
                porcentaje /
                100
            ) * total
        );

    const vacios =
        total - llenos;

    return (
        '█'.repeat(llenos) +
        '░'.repeat(vacios)
    );
}

export {
    XP_POR_MENSAJE
};