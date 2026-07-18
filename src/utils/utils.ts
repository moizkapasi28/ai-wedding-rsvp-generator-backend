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
