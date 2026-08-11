// ============================================================
// SISTEMA OWNER - ALEX BOT
// Owner persistente con soporte para JID y LID
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// ARCHIVO DEL OWNER
// ============================================================

const OWNER_FILE = path.join(
    __dirname,
    '..',
    'database',
    'owner.json'
);

// Owner inicial actual
const OWNER_INICIAL = '50578391933';

// ============================================================
// UTILIDADES
// ============================================================

function limpiarNumero(valor = '') {
    return String(valor)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

function normalizarJID(valor = '') {
    return String(valor)
        .trim()
        .split(':')[0];
}

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo() {
    const carpeta = path.dirname(OWNER_FILE);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(OWNER_FILE)) {
        fs.writeFileSync(
            OWNER_FILE,
            JSON.stringify(
                {
                    owner: OWNER_INICIAL
                },
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// CARGAR OWNER
// ============================================================

function cargarOwner() {
    asegurarArchivo();

    try {
        const datos = JSON.parse(
            fs.readFileSync(
                OWNER_FILE,
                'utf8'
            )
        );

        if (datos?.owner) {
            return String(datos.owner);
        }

    } catch (error) {

        console.error(
            '[OWNER] Error leyendo owner.json:',
            error.message
        );
    }

    return OWNER_INICIAL;
}

// ============================================================
// COMPROBAR OWNER
// ============================================================

export function esOwner(msg) {

    const owner = cargarOwner();

    const ownerJID =
        normalizarJID(owner);

    const ownerNumero =
        limpiarNumero(owner);

    const key =
        msg?.key || {};

    const candidatos = [
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt,
        key.participant,
        key.remoteJid
    ].filter(Boolean);

    for (const candidato of candidatos) {

        const jid =
            normalizarJID(candidato);

        const numero =
            limpiarNumero(candidato);

        // Comparación directa JID/LID
        if (jid === ownerJID) {
            return true;
        }

        // Comparación por número
        if (
            ownerNumero &&
            numero &&
            numero === ownerNumero
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// OBTENER OWNER ACTUAL
// ============================================================

export function obtenerOwner() {
    return cargarOwner();
}

// ============================================================
// CAMBIAR OWNER
// ============================================================

export function guardarOwner(nuevoOwner) {

    const valor =
        normalizarJID(nuevoOwner);

    if (
        !valor ||
        valor.endsWith('@g.us')
    ) {
        throw new Error(
            'El Owner debe ser un usuario válido.'
        );
    }

    asegurarArchivo();

    fs.writeFileSync(
        OWNER_FILE,
        JSON.stringify(
            {
                owner: valor,
                actualizado:
                    new Date().toISOString()
            },
            null,
            2
        ),
        'utf8'
    );

    return valor;
}
