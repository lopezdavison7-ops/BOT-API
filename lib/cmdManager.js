
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMANDS_DIR = path.join(__dirname, '../commands');

export async function loadCommands() {
    const commands = new Map();

    function recolectar(dir, acumulado) {
        let items;
        try {
            items = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
            console.error(`[CMD] ❌ No se pudo leer ${dir}:`, error.message);
            return;
        }

        items.sort((a, b) => a.name.localeCompare(b.name));

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                recolectar(fullPath, acumulado);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                acumulado.push(fullPath);
            }
        }
    }

    const rutas = [];
    recolectar(COMMANDS_DIR, rutas);

    // Importa todos los módulos en paralelo (mucho más rápido que uno a uno)
    // y luego los registra en orden determinista para no romper alias/colisiones.
    const modulos = await Promise.all(rutas.map(async (fullPath) => {
        try {
            const module = await import(`file://${fullPath}`);
            return { fullPath, command: module.default };
        } catch (error) {
            console.error(`[CMD] ❌ Error en ${fullPath}:`, error.message);
            return null;
        }
    }));

    for (const resultado of modulos) {
        if (!resultado) continue;

        const { fullPath, command } = resultado;

        if (command && command.nombre) {
            commands.set(command.nombre, command);

            if (command.alias && Array.isArray(command.alias)) {
                for (const alias of command.alias) {
                    commands.set(alias, command);
                }
            }
            console.log(`[CMD] ✓ Cargado: ${command.nombre}`);
        } else {
            console.warn(`[CMD] ⚠️ Ignorado: ${fullPath} (sin nombre)`);
        }
    }

    console.log(`[CMD] ✅ Total comandos cargados: ${commands.size}`);
    return commands;
}