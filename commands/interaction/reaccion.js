import fetch from 'node-fetch';

const GIFS = {
    hug: [
        'https://c.tenor.com/ohbIkr1Iy5UAAAAC/hug-anime.gif',
        'https://c.tenor.com/WabTLUkQh58AAAAC/anime-hug.gif',
        'https://c.tenor.com/J7vGqJz8m9IAAAAC/anime-hug.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/hug.gif'
    ],
    kiss: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/kiss-anime.gif',
        'https://c.tenor.com/Kj4RTXkQ6xYAAAAC/kiss.gif',
        'https://media.tenor.com/3xS4gMfKw8MAAAAC/kiss.gif',
        'https://c.tenor.com/9k4nY5p3k5YAAAAC/anime-kiss.gif'
    ],
    pat: [
        'https://c.tenor.com/pKwL2I8aQqEAAAAC/pat-anime.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/pat.gif',
        'https://media.tenor.com/K5R4nV1J9sEAAAAC/pat.gif'
    ],
    slap: [
        'https://c.tenor.com/XiYuU9hxtEkAAAAC/slap-anime.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/slap.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/slap.gif'
    ],
    cuddle: [
        'https://c.tenor.com/J7vGqJz8m9IAAAAC/cuddle.gif',
        'https://media.tenor.com/K5R4nV1J9sEAAAAC/cuddle.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/cuddle.gif'
    ],
    cry: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/cry-anime.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/cry.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/cry.gif'
    ],
    dance: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/dance.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/dance.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/dance.gif'
    ],
    blush: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/blush.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/blush.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/blush.gif'
    ],
    bonk: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/bonk.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/bonk.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/bonk.gif'
    ],
    bully: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/bully.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/bully.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/bully.gif'
    ],
    cringe: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/cringe.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/cringe.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/cringe.gif'
    ],
    bite: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/bite.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/bite.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/bite.gif'
    ],
    happy: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/happy-anime.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/happy.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/happy.gif'
    ],
    highfive: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/highfive.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/highfive.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/highfive.gif'
    ],
    handhold: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/handhold.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/handhold.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/handhold.gif'
    ],
    lick: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/lick.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/lick.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/lick.gif'
    ],
    poke: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/poke.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/poke.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/poke.gif'
    ],
    smile: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/smile.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/smile.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/smile.gif'
    ],
    smug: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/smug.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/smug.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/smug.gif'
    ],
    wave: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/wave.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/wave.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/wave.gif'
    ],
    wink: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/wink.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/wink.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/wink.gif'
    ],
    yeet: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/yeet.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/yeet.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/yeet.gif'
    ],
    glomp: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/glomp.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/glomp.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/glomp.gif'
    ],
    kill: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/kill.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/kill.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/kill.gif'
    ],
    nom: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/nom.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/nom.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/nom.gif'
    ],
    peek: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/peek.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/peek.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/peek.gif'
    ],
    feed: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/feed.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/feed.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/feed.gif'
    ],
    tickle: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/tickle.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/tickle.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/tickle.gif'
    ],
    think: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/think.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/think.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/think.gif'
    ],
    stare: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/stare.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/stare.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/stare.gif'
    ],
    bored: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/bored.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/bored.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/bored.gif'
    ],
    pout: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/pout.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/pout.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/pout.gif'
    ],
    shrug: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/shrug.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/shrug.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/shrug.gif'
    ],
    facepalm: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/facepalm.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/facepalm.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/facepalm.gif'
    ],
    laugh: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/laugh.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/laugh.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/laugh.gif'
    ],
    sleep: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/sleep.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/sleep.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/sleep.gif'
    ],
    sad: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/sad.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/sad.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/sad.gif'
    ],
    angry: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/angry.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/angry.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/angry.gif'
    ],
    confused: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/confused.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/confused.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/confused.gif'
    ],
    shocked: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/shocked.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/shocked.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/shocked.gif'
    ],
    scared: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/scared.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/scared.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/scared.gif'
    ],
    love: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/love.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/love.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/love.gif'
    ],
    run: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/run.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/run.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/run.gif'
    ],
    walk: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/walk.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/walk.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/walk.gif'
    ],
    sing: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/sing.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/sing.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/sing.gif'
    ],
    coffee: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/coffee.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/coffee.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/coffee.gif'
    ],
    eat: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/eat.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/eat.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/eat.gif'
    ],
    drink: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/drink.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/drink.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/drink.gif'
    ],
    bath: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/bath.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/bath.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/bath.gif'
    ],
    smoke: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/smoke.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/smoke.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/smoke.gif'
    ],
    game: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/game.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/game.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/game.gif'
    ],
    read: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/read.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/read.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/read.gif'
    ],
    work: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/work.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/work.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/work.gif'
    ],
    study: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/study.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/study.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/study.gif'
    ],
    fight: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/fight.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/fight.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/fight.gif'
    ],
    celebrate: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/celebrate.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/celebrate.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/celebrate.gif'
    ],
    party: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/party.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/party.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/party.gif'
    ],
    gift: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/gift.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/gift.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/gift.gif'
    ],
    arrest: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/arrest.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/arrest.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/arrest.gif'
    ],
    shoot: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/shoot.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/shoot.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/shoot.gif'
    ],
    stab: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/stab.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/stab.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/stab.gif'
    ],
    punch: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/punch.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/punch.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/punch.gif'
    ],
    throw: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/throw.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/throw.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/throw.gif'
    ],
    catch: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/catch.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/catch.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/catch.gif'
    ],
    push: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/push.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/push.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/push.gif'
    ],
    pull: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/pull.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/pull.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/pull.gif'
    ],
    drag: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/drag.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/drag.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/drag.gif'
    ],
    carry: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/carry.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/carry.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/carry.gif'
    ],
    lift: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/lift.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/lift.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/lift.gif'
    ],
    drop: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/drop.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/drop.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/drop.gif'
    ],
    spin: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/spin.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/spin.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/spin.gif'
    ],
    jump: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/jump.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/jump.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/jump.gif'
    ],
    fall: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/fall.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/fall.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/fall.gif'
    ],
    trip: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/trip.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/trip.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/trip.gif'
    ],
    slip: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/slip.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/slip.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/slip.gif'
    ],
    climb: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/climb.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/climb.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/climb.gif'
    ],
    swim: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/swim.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/swim.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/swim.gif'
    ],
    fly: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/fly.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/fly.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/fly.gif'
    ],
    drive: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/drive.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/drive.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/drive.gif'
    ],
    ride: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/ride.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/ride.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/ride.gif'
    ],
    surf: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/surf.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/surf.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/surf.gif'
    ],
    ski: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/ski.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/ski.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/ski.gif'
    ],
    skate: [
        'https://c.tenor.com/qi5t1nQ1p9EAAAAC/skate.gif',
        'https://media.tenor.com/KJ4RTXkQ6xYAAAAC/skate.gif',
        'https://c.tenor.com/2yN9yJQv7kYAAAAC/skate.gif'
    ],
    bike: [
        'https://c.tenor.com/K5R4nV1J9sEAAAAC/bike.gif',
        'https://media.tenor.com/5ry7314cY0cAAAAC/bike.gif',
        'https://c.tenor.com/Q8gqJ7z8m9IAAAAC/bike.gif'
    ]
};

const MENSAJES = {
    hug: { alias: ['abrazar', 'abrazo'], con: 'abraza a', solo: 'se abraza a sí mismo', emoji: '🤗' },
    kiss: { alias: ['besar', 'beso'], con: 'besa a', solo: 'se besa a sí mismo', emoji: '💋' },
    pat: { alias: ['acariciar', 'caricia'], con: 'acaricia a', solo: 'se acaricia', emoji: '🥰' },
    slap: { alias: ['bofetada', 'abofetear'], con: 'abofetea a', solo: 'se abofetea', emoji: '👋' },
    cuddle: { alias: ['acurrucar', 'mimar'], con: 'se acurruca con', solo: 'se acurruca solo', emoji: '🤗' },
    cry: { alias: ['llorar', 'llora'], con: 'llora por', solo: 'llora solo', emoji: '😢' },
    dance: { alias: ['bailar', 'baile'], con: 'baila con', solo: 'baila solo', emoji: '💃' },
    blush: { alias: ['sonrojo', 'sonrojarse'], con: 'se sonroja por', solo: 'se sonroja', emoji: '☺️' },
    bonk: { alias: [], con: 'le da un bonk a', solo: 'se bonkea', emoji: '🔨' },
    bully: { alias: ['molestar', 'bullyear'], con: 'molesta a', solo: 'se molesta solo', emoji: '😈' },
    cringe: { alias: ['verguenza'], con: 'siente cringe por', solo: 'tiene cringe', emoji: '😬' },
    bite: { alias: ['morder', 'mordida'], con: 'muerde a', solo: 'se muerde', emoji: '😬' },
    happy: { alias: ['feliz', 'alegre'], con: 'está feliz con', solo: 'está feliz', emoji: '😊' },
    highfive: { alias: ['chocar', 'chocala'], con: 'choca los cinco con', solo: 'choca al aire', emoji: '🙌' },
    handhold: { alias: ['mano', 'tomardemano'], con: 'toma de la mano a', solo: 'se toma la mano', emoji: '❤️' },
    lick: { alias: ['lamer'], con: 'lame a', solo: 'se lame', emoji: '👅' },
    poke: { alias: ['picar'], con: 'pica a', solo: 'se pica', emoji: '👉' },
    smile: { alias: ['sonreir', 'sonrisa'], con: 'le sonríe a', solo: 'sonríe', emoji: '😄' },
    smug: { alias: ['presumido'], con: 'mira con superioridad a', solo: 'modo presumido', emoji: '😏' },
    wave: { alias: ['saludar', 'saludo'], con: 'saluda a', solo: 'saluda al aire', emoji: '👋' },
    wink: { alias: ['guino'], con: 'le guiña a', solo: 'guiña', emoji: '😜' },
    yeet: { alias: ['lanzar'], con: 'yeetea a', solo: 'se yeetea', emoji: '💨' },
    glomp: { alias: ['lanzarse'], con: 'se lanza sobre', solo: 'se glompea', emoji: '🤗' },
    kill: { alias: ['matar'], con: 'quiere matar a', solo: 'modo asesino', emoji: '🔪' },
    nom: { alias: ['comer'], con: 'come con', solo: 'come solo', emoji: '🍜' },
    peek: { alias: ['chismear', 'fisgonear'], con: 'espía a', solo: 'espía', emoji: '👀' },
    feed: { alias: ['alimentar'], con: 'alimenta a', solo: 'se alimenta', emoji: '🍱' },
    tickle: { alias: ['cosquillas'], con: 'hace cosquillas a', solo: 'se hace cosquillas', emoji: '🤭' },
    think: { alias: ['pensar'], con: 'piensa en', solo: 'piensa', emoji: '🤔' },
    stare: { alias: ['mirar', 'mirada'], con: 'mira fijamente a', solo: 'mira al vacío', emoji: '👁️' },
    bored: { alias: ['aburrido'], con: 'se aburre con', solo: 'está aburrido', emoji: '😑' },
    pout: { alias: ['pucheros'], con: 'le hace pucheros a', solo: 'hace pucheros', emoji: '😡' },
    shrug: { alias: ['encoger'], con: 'se encoge de hombros con', solo: 'se encoge', emoji: '🤷' },
    facepalm: { alias: ['manoencara'], con: 'hace facepalm por', solo: 'facepalm', emoji: '🤦' },
    laugh: { alias: ['reir', 'risa'], con: 'se ríe con', solo: 'se ríe solo', emoji: '😂' },
    sleep: { alias: ['dormir', 'sueno'], con: 'duerme con', solo: 'duerme', emoji: '😴' },
    sad: { alias: ['triste'], con: 'está triste por', solo: 'está triste', emoji: '😔' },
    angry: { alias: ['enojado', 'furioso'], con: 'está furioso con', solo: 'está furioso', emoji: '😡' },
    confused: { alias: ['confundido'], con: 'está confundido con', solo: 'está confundido', emoji: '😵' },
    shocked: { alias: ['shockeado'], con: 'se shockea con', solo: 'está shockeado', emoji: '😱' },
    scared: { alias: ['miedo', 'asustar'], con: 'le tiene miedo a', solo: 'tiene miedo', emoji: '😨' },
    love: { alias: ['amar', 'amor'], con: 'ama a', solo: 'se ama', emoji: '❤️' },
    run: { alias: ['correr', 'huir'], con: 'corre hacia', solo: 'corre', emoji: '🏃' },
    walk: { alias: ['caminar'], con: 'camina con', solo: 'camina', emoji: '🚶' },
    sing: { alias: ['cantar'], con: 'le canta a', solo: 'canta', emoji: '🎤' },
    coffee: { alias: ['cafe'], con: 'toma café con', solo: 'toma café', emoji: '☕' },
    eat: { alias: ['comer'], con: 'come con', solo: 'come', emoji: '🍜' },
    drink: { alias: ['beber'], con: 'bebe con', solo: 'bebe', emoji: '🥤' },
    bath: { alias: ['banar', 'bano'], con: 'se baña con', solo: 'se baña', emoji: '🛁' },
    smoke: { alias: ['fumar'], con: 'fuma con', solo: 'fuma', emoji: '🚬' },
    game: { alias: ['jugar', 'gamear'], con: 'juega con', solo: 'juega', emoji: '🎮' },
    read: { alias: ['leer'], con: 'lee con', solo: 'lee', emoji: '📚' },
    work: { alias: ['trabajar'], con: 'trabaja con', solo: 'trabaja', emoji: '💼' },
    study: { alias: ['estudiar'], con: 'estudia con', solo: 'estudia', emoji: '📖' },
    fight: { alias: ['pelear'], con: 'pelea con', solo: 'pelea solo', emoji: '🥊' },
    celebrate: { alias: ['celebrar'], con: 'celebra con', solo: 'celebra', emoji: '🎉' },
    party: { alias: ['fiesta', 'fiestear'], con: 'fiestea con', solo: 'fiestea', emoji: '🎊' },
    gift: { alias: ['regalo', 'regalar'], con: 'le da un regalo a', solo: 'se regala', emoji: '🎁' },
    arrest: { alias: ['arrestar'], con: 'arresta a', solo: 'se arresta', emoji: '👮' },
    shoot: { alias: ['disparar'], con: 'le dispara a', solo: 'dispara al aire', emoji: '🔫' },
    stab: { alias: ['apunalar'], con: 'apuñala a', solo: 'se apuñala', emoji: '🗡️' },
    punch: { alias: ['punetazo', 'golpear'], con: 'golpea a', solo: 'golpea al aire', emoji: '👊' },
    throw: { alias: ['lanzar'], con: 'le lanza algo a', solo: 'lanza algo', emoji: '🤾' },
    catch: { alias: ['atrapar'], con: 'atrapa a', solo: 'atrapa algo', emoji: '🤲' },
    push: { alias: ['empujar'], con: 'empuja a', solo: 'empuja al aire', emoji: '🤜' },
    pull: { alias: ['jalar'], con: 'jala a', solo: 'jala algo', emoji: '🤛' },
    drag: { alias: ['arrastrar'], con: 'arrastra a', solo: 'arrastra algo', emoji: '🛷' },
    carry: { alias: ['cargar'], con: 'carga a', solo: 'carga algo', emoji: '🏋️' },
    lift: { alias: ['levantar'], con: 'levanta a', solo: 'levanta algo', emoji: '💪' },
    drop: { alias: ['soltar'], con: 'suelta a', solo: 'suelta algo', emoji: '🤷' },
    spin: { alias: ['girar'], con: 'gira con', solo: 'gira', emoji: '🌀' },
    jump: { alias: ['saltar'], con: 'salta con', solo: 'salta', emoji: '🦘' },
    fall: { alias: ['caer', 'caerse'], con: 'se cae con', solo: 'se cae', emoji: '🤕' },
    trip: { alias: ['tropezar'], con: 'tropieza con', solo: 'tropieza', emoji: '🤸' },
    slip: { alias: ['resbalar'], con: 'resbala con', solo: 'resbala', emoji: '🧊' },
    climb: { alias: ['escalar'], con: 'escala con', solo: 'escala', emoji: '🧗' },
    swim: { alias: ['nadar'], con: 'nada con', solo: 'nada', emoji: '🏊' },
    fly: { alias: ['volar'], con: 'vuela con', solo: 'vuela', emoji: '🦅' },
    drive: { alias: ['conducir', 'manejar'], con: 'conduce con', solo: 'conduce', emoji: '🚗' },
    ride: { alias: ['montar'], con: 'monta con', solo: 'monta', emoji: '🏇' },
    surf: { alias: ['surfear'], con: 'surfea con', solo: 'surfea', emoji: '🏄' },
    ski: { alias: ['esquiar'], con: 'esquía con', solo: 'esquía', emoji: '⛷️' },
    skate: { alias: ['patinar'], con: 'patina con', solo: 'patina', emoji: '🛹' },
    bike: { alias: ['bicicleta', 'bicicletar'], con: 'bicicletea con', solo: 'bicicletea', emoji: '🚴' }
};

const MAPA = {};
for (const [tipo, d] of Object.entries(MENSAJES)) {
    MAPA[tipo] = tipo;
    for (const a of d.alias) MAPA[a] = tipo;
}

function bold(texto) {
    return String(texto).replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97;
        return String.fromCodePoint(base + c.charCodeAt(0));
    });
}

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function datosMencion(sock, jid) {
    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { token: '@' + pj.split('@')[0], jids: [pj] };
            }
        }
    } catch (e) {}
    return { token: '@' + jid.split('@')[0], jids: [jid] };
}

function extraerComando(msg) {
    const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
    const limpio = texto.trim().replace(/^\.+\s*/, '');
    return (limpio.split(/\s+/)[0] || '').toLowerCase();
}

export default {
    nombre: 'reaccion',
    categoria: 'Interacción',
    alias: [...Object.keys(MENSAJES), ...Object.values(MENSAJES).flatMap(d => d.alias), 'reacciones', 'reaction'],
    descripcion: 'Reacciones anime locales (82+ tipos)',
    uso: '.<reaccion> [@usuario]',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderName = msg.pushName || sender.split('@')[0].replace(/\D/g, '');

            const invocado = extraerComando(msg);

            if (invocado === 'reacciones' || invocado === 'reaction' || invocado === 'reaccion') {
                const tipos = Object.keys(MENSAJES);
                let lista = '';
                for (let i = 0; i < tipos.length; i += 4) {
                    lista += tipos.slice(i, i + 4).map(t => MENSAJES[t].emoji + ' .' + t).join('  ') + '\n';
                }
                return await responder.texto(
                    bold('REACCIONES') + ' 🎭 (' + tipos.length + ')\n' +
                    'Usa .<reaccion> [@user]\n\n' +
                    lista + '\n⚡ ' + bold('BOT-API')
                );
            }

            const tipo = MAPA[invocado];
            if (!tipo) {
                return await responder.texto('❌ Reacción no válida. Usa .reacciones para ver las ' + Object.keys(MENSAJES).length + ' disponibles.');
            }

            const d = MENSAJES[tipo];
            const ctx = msg.message?.extendedTextMessage?.contextInfo;
            let target = ctx?.participant || ctx?.mentionedJid?.[0] || null;
            if (target === sender) target = null;

            let caption;
            const mentions = [sender];

            if (target) {
                const t = await datosMencion(sock, target);
                mentions.push(...t.jids);
                caption = '`' + senderName + '` ' + bold(d.con) + ' ' + t.token + ' ' + d.emoji;
            } else {
                caption = '`' + senderName + '` ' + bold(d.solo) + ' ' + d.emoji;
            }

            const gifs = GIFS[tipo];
            if (!gifs || gifs.length === 0) {
                return await responder.texto(caption);
            }

            const url = random(gifs);

            try {
                await sock.sendMessage(jid, {
                    video: { url },
                    mimetype: 'video/mp4',
                    gifPlayback: true,
                    caption,
                    mentions
                }, { quoted: msg });
            } catch (e) {
                await responder.texto(caption);
            }

        } catch (error) {
            console.error('[REACCIONES] Error:', error);
            await responder.texto('❌ Error: ' + (error.message || error));
        }
    }
};