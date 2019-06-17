import * as murmurhash from "murmurhash";
import { URL } from "url";

const arrayMatch = new RegExp(/([^\[\*\]]*)((?:\[[\*\d+]\]\.?){1})(.*)/);

export const isArrayPath = (path: string): [boolean, string?, string?] => {
  const matchResult = path.match(arrayMatch);
  if (matchResult === null || matchResult.length <= 2 || !matchResult[2]) {
    return [false];
  }

  return [true, matchResult[1] || undefined, matchResult[3] || undefined];
};

export const splitPath = (path: string) => {
  if (!path) {
    return [];
  }
  return path.split(".").map((p) => {
    try {
      const pathKey = parseInt(p, 10);
      if (isNaN(pathKey)) {
        return p;
      }
      return pathKey;
    } catch (e) {
      return p;
    }
  });
};

const isUUIDRegExp = new RegExp(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, "i");

export const hashUUID = (uuid: string): string => {
  if (!isUUIDRegExp.test(uuid)) {
    return uuid;
  }

  const firstPart = uuid.substr(0, 6);
  const hashedfirstPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);
  const lastPart = uuid.substr(-6, 6);
  const hashedLastPart = murmurhash.v3(lastPart, 0).toString().substr(0, 6);

  const hashedUUID = `${hashedfirstPart}` +
    `${uuid.substring(hashedfirstPart.length, uuid.length - hashedLastPart.length)}` +
    `${hashedLastPart}`;

  return hashedUUID;
};

export const hashQueryParam = (input: string, paramName?: string, paramFormat?: string): string => {

  if (!input ||
    !paramName ||
    !paramFormat) {
    return input;
  }

  let url;
  // try {
  url = new URL(input, "https://www.github.com");
  // } catch (error) {
  // swallow any invalid url and return the input
  //   return input;
  // }

  const paramValue = url.searchParams.get(paramName);
  if (!paramValue) {
    return input;
  }

  let hashedValue;
  switch (paramFormat) {
    case "hashed.uuid":
      hashedValue = hashUUID(paramValue);
      break;
    default:
      return input;
  }

  const result = input.replace(paramValue, hashedValue);
  return result;
};

export const hashString = (input: string, ignoreLeft?: number, ignoreRight?: number): string => {

  if (!input ||
    (ignoreLeft || 0) + (ignoreRight || 0) >= input.length) {
    return input;
  }

  let unhashed = input;
  if (ignoreLeft) {
    unhashed = unhashed.substring(ignoreLeft);
  }
  if (ignoreRight) {
    unhashed = unhashed.substring(0, unhashed.length - ignoreRight);
  }

  let hashed = murmurhash.v3(murmurhash.v3(unhashed, 0).toString(), 0).toString();
  if (unhashed.length < hashed.length) {
    hashed = hashed.substring(0, unhashed.length);
  } else if (unhashed.length > hashed.length) {
    const diff = unhashed.length - hashed.length;
    hashed = `${hashed}${hashed.substring(0, diff)}`;
  }

  let result = hashed;
  if (ignoreLeft) {
    result = `${input.substring(0, ignoreLeft)}${result}`;
  }
  if (ignoreRight) {
    result = `${result}${input.substring(input.length - ignoreRight)}`;
  }

  return result;
};

export const hashAlphanumerical = (input: string, ignoreLeft?: number, upperCase?: boolean): string => {
  if (!input) {
    return input;
  }

  const candidate = ignoreLeft ?
    input.substring(ignoreLeft)
    : input;

  const parts = candidate.split("-");
  let hashedParts = parts.map((part: string) => murmurhash.v3(part, 0).toString(36).substring(0, 3));
  if (upperCase) {
    hashedParts = hashedParts.map((part: string) => part.toUpperCase());
  }
  const result = `${input.substring(0, ignoreLeft)}${hashedParts.join("-")}`;
  return result;
};

export const hashLuhnString = (input: string, prefixLength?: number, prefix?: string): string => {
  if (!input) {
    return input;

  }
  if (prefixLength) {
    const stringWithoutPrefixAndChecksum = input.substring(prefixLength, input.length - 1);
    const hashedNumber = murmurhash.v3(murmurhash.v3(stringWithoutPrefixAndChecksum, 0).toString(), 0).toString();
    const shortenedHashedNumber = hashedNumber.substring(0, stringWithoutPrefixAndChecksum.length);
    const resultWithoutChecksum = `${input.substring(0, prefixLength)}${shortenedHashedNumber}`;
    const checksum = calculateChecksum(resultWithoutChecksum);
    return `${resultWithoutChecksum}${checksum}`;
  } else if (prefix) {
    const stringWithoutChecksum = input.substring(0, input.length - 1);
    const hashedNumber = murmurhash.v3(murmurhash.v3(stringWithoutChecksum, 0).toString(), 0).toString();
    const shortenedHashedNumber = hashedNumber.substring(0, stringWithoutChecksum.length);
    const checksum = calculateChecksum(`${prefix}${shortenedHashedNumber}`);
    return `${shortenedHashedNumber}${checksum}`;
  } else {
    const stringWithoutChecksum = input.substring(prefixLength, input.length - 1);
    const hashedNumber = murmurhash.v3(murmurhash.v3(stringWithoutChecksum, 0).toString(), 0).toString();
    const shortenedHashedNumber = hashedNumber.substring(0, stringWithoutChecksum.length);
    const checksum = calculateChecksum(shortenedHashedNumber);
    return `${shortenedHashedNumber}${checksum}`;
  }
};

const calculateChecksum = (input: string): string => {
  const invertedDigits = input
    .split("")
    .reverse()
    .map((digit: string) => parseInt(digit, 10));

  const multiplicators = [] as number[];
  for (let i = 0; i < invertedDigits.length; i++) {
    multiplicators.push(((i + 1) % 2) + 1);
  }

  const sum = invertedDigits
    .reduce((accumulator: number, currentValue: number, currentIndex: number) => {
      const product = currentValue * multiplicators[currentIndex];
      return accumulator + (sumOfDigits(product));
    }, 0);

  const remainder = sum % 10;
  const checksum = remainder === 0 ? 0 : 10 - remainder;

  return checksum.toString();
};

const sumOfDigits = (value: number): number => {
  return value
    .toString()
    .split("")
    .map(Number)
    .reduce((a: number, b: number) => a + b, 0);
};
