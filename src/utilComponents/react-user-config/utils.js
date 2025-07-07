export function isDefined(obj) {
    return obj !== null && obj != undefined;
}

export function isObject(obj) {
    return typeof obj === typeof {};
}