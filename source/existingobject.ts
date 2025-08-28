


export interface ExistingObject {

    doesExist() : boolean;
}


export function nextExistingObject<T extends ExistingObject>(objects : T[], type : Function) : T  {

    for (const o of objects) {

        if (!o.doesExist()) {

            return o;
        }
    }

    const o : T = new type.prototype.constructor() as T;
    objects.push(o);

    return o;
}