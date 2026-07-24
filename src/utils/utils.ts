interface Data {
  type: string;
  query: string;
}

export const createUrl = (data: Data): string => {
  return `${process.env.WEB_APP_URL}${data.type}?${data.query}`;
};

export const sanitizeSearchTerm = (term: string): string => {
  return term
    .trim()
    .replace(/[&|!():*<>]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" | ");
};

export const colLetter = (n: number): string => {
  let result = "";
  while (n > 0) {
    result = String.fromCharCode(((n - 1) % 26) + 65) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

export const colLetterToNum = (col: string): number => {
  return col.split("").reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0);
};

export const str = (val: unknown): string => {
  return String(val ?? "").trim();
};
