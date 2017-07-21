export function assert(expr, errorMessage) {
  if (!expr)
    throw new TypeError(errorMessage)
}

export function defined(x) {
  return x !== undefined
}

export function isObject(o) {
  return typeof o === "object"
}

export function isString(s) {
  return typeof s === "string"
}

export function isNumber(n) {
  return typeof n === "number"
}

export function isPositiveNumber(n) {
  return isNumber(n) && n >= 0
}
