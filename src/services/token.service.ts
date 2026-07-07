import moment from "moment";
import { Prisma, Token, User } from "../../generated/prisma/client";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { TOKEN_TYPE } from "../enums/token.enum";
import { createToken, findTokenByJti } from "../repositories/token.repository";

export const generateAuthTokensService = async (user: User) => {
  const tokenExpiryTime = process.env.JWT_ACCESS_EXPIRATION_MINUTES;
  const accessTokenExpires = moment().add(tokenExpiryTime, "minutes");

  const accessTokenJti = uuidv4();
  const accessToken = generateTokenService(
    user.id,
    accessTokenExpires,
    accessTokenJti,
  );

  // Here save access token
  await saveTokenService(
    accessTokenJti,
    user.id,
    TOKEN_TYPE.ACCESS,
    accessTokenExpires,
  );

  const refreshTokenExpires = moment().add(
    process.env.JWT_REFRESH_EXPIRATION_DAYS,
    "days",
  );

  if (refreshTokenExpires.isBefore(moment())) {
    throw new Error("Refresh token expiration must be in the future");
  }
  const refreshTokenJti = uuidv4();
  const refreshToken = generateTokenService(
    user.id,
    refreshTokenExpires,
    refreshTokenJti,
  );

  //Here save refresh token
  await saveTokenService(
    refreshTokenJti,
    user.id,
    TOKEN_TYPE.REFRESH,
    refreshTokenExpires,
  );

  return {
    access: {
      token: accessToken,
      expires_at: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires_at: refreshTokenExpires.toDate(),
    },
  };
};

export const generateTokenService = (
  userId: string,
  expiresAt: moment.Moment,
  tokenIndentifier: string,
  secret: string = process.env.JWT_SECRET,
): string => {
  const payload = {
    sub: userId,
    jti: tokenIndentifier,
    exp: expiresAt.unix(),
  };

  return jwt.sign(payload, secret, { algorithm: "HS256" });
};

export const saveTokenService = async (
  jti: string,
  userId: string,
  tokenType: TOKEN_TYPE,
  expiresAt: moment.Moment,
  tx?: Prisma.TransactionClient,
) => {
  const token = await createToken(
    {
      jti,
      user_id: userId,
      token_type: tokenType as any,
      expires_at: expiresAt.toDate(),
    },
    tx,
  );

  if (!token) throw new Error("Failed to save token");

  return token;
};

export const generateVerifyEmailTokenService = async (
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<string> => {
  const tokenExpiryTime = process.env.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES || 10;
  const expiresAt = moment().add(tokenExpiryTime, "minutes");
  const jti = uuidv4();

  const token = generateTokenService(userId, expiresAt, jti);

  await saveTokenService(
    jti,
    userId,
    TOKEN_TYPE.EMAIL_VERIFICATION,
    expiresAt,
    tx,
  );

  return token;
};

export const verifyTokenService = async (
  token: string,
  tokenType: TOKEN_TYPE,
  tx?: Prisma.TransactionClient,
): Promise<Token> => {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as jwt.JwtPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }

  const tokenDoc = await findTokenByJti(payload.jti as string, tx);
  if (!tokenDoc || tokenDoc.token_type !== tokenType) {
    throw new Error("Token not found");
  }

  if (moment().isAfter(moment(tokenDoc.expires_at))) {
    throw new Error("Token has expired");
  }

  return tokenDoc;
};

export const generateResetPasswordTokenService = async (
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<string> => {
  const tokenExpiryTime =
    process.env.JWT_RESET_PASSWORD_EXPIRATION_MINUTES || 10;
  const expiresAt = moment().add(tokenExpiryTime, "minutes");
  const jti = uuidv4();

  const token = generateTokenService(userId, expiresAt, jti);

  await saveTokenService(jti, userId, TOKEN_TYPE.RESET_PASSWORD, expiresAt, tx);

  return token;
};
