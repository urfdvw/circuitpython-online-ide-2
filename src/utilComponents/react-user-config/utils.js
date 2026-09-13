export function isDefined(value) {
    return value !== null && value !== undefined;
}

export function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
