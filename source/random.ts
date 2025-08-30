

export const sampleWeightedInterpolated = (weights1 : number[], weights2 : number[], t : number) : number => {

    const p : number = Math.random();

    let threshold : number = 0.0;
    for (let i : number = 0; i < weights1.length; ++ i) {

        threshold += (1.0 - t)*weights1[i] + t*weights2[i];
        if (p < threshold) {

            return i;
        }
    }
    return weights1.length - 1;
}


export const sampleWeighted = (weights : number[]) : number => {

    return sampleWeightedInterpolated(weights, weights, 0.0);
}
