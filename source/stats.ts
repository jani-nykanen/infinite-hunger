

export type Stats = {

    score : number,
    coins : number,
    health : number,
}


export const addPoints = (stats : Stats, points : number) : void => {

    stats.score += points*(1.0 + stats.coins/10.0);
}
