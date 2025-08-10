export const isValidEmail = function (email) {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  email = email.trim();

  if (!email || typeof email !== "string") return false;

  if (email.length > 254) return false;

  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) return false;

  const [localPart, domainPart] = email.split("@");

  if (localPart.length === 0 || localPart.length > 64) return false;

  if (domainPart.length === 0 || domainPart.length > 253) return false;

  if (email.includes("..")) return false;

  if (localPart.startsWith(".") || localPart.endsWith(".")) return false;

  if (
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    domainPart.startsWith("-") ||
    domainPart.endsWith("-")
  ) {
    return false;
  }

  if (!emailRegex.test(email)) return false;

  if (!domainPart.includes(".")) return false;

  const domainLabels = domainPart.split(".");

  for (let label of domainLabels) {
    if (label.length === 0 || label.length > 63) return false;

    if (label.startsWith("-") || label.endsWith("-")) return false;
  }

  const tld = domainLabels[domainLabels.length - 1];

  if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

  return true;
};

export const isValidName = function (name) {
  const numbers = "0123456789";
  const specials =
    '!"#$%&()*+,./:;<=>?@[\\]^_`{|}~¡¢£¤¥¦§¨©ª«¬­®¯°±²³´¶·¸¹º»¼½¾¿×÷';

  if (typeof name !== "string") return false;

  name = name.trim();

  if (name.length < 2 || name.length > 50) return false;

  for (let number of numbers) {
    if (name.includes(number)) return false;
  }

  for (let special of specials) {
    if (name.includes(special)) return false;
  }

  if (name.startsWith("-") || name.endsWith("-")) return false;

  return true;
};

export const isValidUsername = function (username) {
  const allowedChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  const numbers = "0123456789";

  if (typeof username !== "string") return false;

  username = username.trim();

  if (username.length < 3 || username.length > 20) return false;

  for (let char of username) {
    if (!allowedChars.includes(char)) return false;
  }

  if (numbers.includes(username[0])) return false;

  return true;
};

export const isValidPassword = function (password) {
  const capitals = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const smalls = "abcdefghijklmnopqrstuvwxyz";
  const specials = `~!@#$%^&*()_-+={}[]|\\:;"'<,>.?/`;
  const extractedCapitals = [];
  const extractedSmalls = [];
  const extractedSpecials = [];

  for (let char of password) {
    if (capitals.includes(char)) extractedCapitals.push(char);
    if (smalls.includes(char)) extractedSmalls.push(char);
    if (specials.includes(char)) extractedSpecials.push(char);
  }

  if (
    password.length < 8 ||
    extractedCapitals.length < 1 ||
    extractedSmalls.length < 1 ||
    extractedSpecials.length < 1 ||
    !/\d/.test(password)
  ) {
    return false;
  } else {
    return true;
  }
};
