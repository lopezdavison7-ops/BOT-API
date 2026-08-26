export default {
    nombre: 'abismo',
    categoria: 'Economia',
    alias: ['ruletaoscura', 'azar'],
    descripcion: 'Alto riesgo. 50% x10, 50% pierdes. Uso:.abismo <cantidad>',
    ejecutar: async ({ msg, args, responder }) => {
        const user = global.db.data.users[msg.sender];
        const apuesta = parseInt(args[0]);

        if (!apuesta) return responder.texto('🖤 Uso:.abismo <cantidad>');
        if (apuesta < 50) return responder.texto('🖤 Mínimo: 50 coins');
        if (user.balance < apuesta) return responder.texto(`💸 No tienes. Balance: ${user.balance}`);

        let tiempo = 10000;
        if (new Date - user.lastabismo < tiempo) return responder.texto(`⏳ Espera ${Math.ceil(((user.lastabismo + tiempo) - new Date())/1000)}s`);
        user.lastabismo = new Date * 1;

        user.balance -= apuesta;
        const gana = Math.random() < 0.5;

        if (gana) {
            let ganancia = apuesta * 10;
            user.balance += ganancia;
            responder.texto(`⚫ *ABISMO* ⚫\n\n🔥 GANASTE x10!\n💎 +${ganancia} coins\n💰 Balance: ${user.balance}`);
        } else {
            responder.texto(`🌑 *ABISMO* 🌑\n\n💀 PERDISTE\n💸 -${apuesta} coins\n💰 Balance: ${user.balance}`);
        }
    }
}