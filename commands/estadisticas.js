const contador = new Map();
const inicio = Date.now();

export function registrarUso(nombreComando) {
    contador.set(nombreComando, (contador.get(nombreComando) || 0) + 1);
}

export function obtenerEstadisticas() {
    const entradas = [...contador.entries()].sort((a, b) => b[1] - a[1]);
    const totalUsos = entradas.reduce((s, [, n]) => s + n, 0);
    const segundos = Math.floor((Date.now() - inicio) / 1000);
    return { entradas, totalUsos, segundos };
}