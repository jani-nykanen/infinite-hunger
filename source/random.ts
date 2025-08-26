


export const sampleWeighted = (weights : number[]) : number => {

    const p : number = Math.random();

    let threshold : number = 0.0;
    for (let i : number = 0; i < weights.length; ++ i) {

        threshold += weights[i];
        if (p < threshold) {

            return i;
        }
    }
    // If the weight table is correct, this one is never reached
    return weights.length - 1;
}
