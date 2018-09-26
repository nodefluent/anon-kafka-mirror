import * as murmurhash from "murmurhash";

export const arrayMatch = new RegExp(/([^\[\*\]]*)((?:\[[\*\d+]\]\.?){0,})([^\[\*\]]*)/);

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

export const isUUIDRegExp = new RegExp(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/, "i");

export const hashUUID = (uuid: string): string => {
  if (!isUUIDRegExp.test(uuid)) {
    return uuid;
  }

  const firstPart = uuid.substr(0, 6);
  const hashedfirstPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);
  const lastPart = uuid.substr(-6, 6);
  const hashedlastPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);

  return uuid.replace(firstPart, hashedfirstPart).replace(lastPart, hashedlastPart);
};

export const hashString = (input: string, ignoreLeft?: number, ignoreRight?: number): string => {

  if ((ignoreLeft || 0) + (ignoreRight || 0) >= input.length) {
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
