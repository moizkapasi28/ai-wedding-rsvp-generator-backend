interface Data {
  type: string;
  query: string;
}

export const createUrl = (data: Data): string => {
  return `${process.env.WEB_APP_URL}${data.type}?${data.query}`;
};
