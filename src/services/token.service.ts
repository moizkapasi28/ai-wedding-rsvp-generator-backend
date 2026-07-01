import moment, { Moment } from "moment";
import { User } from "../../generated/prisma/client";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { TOKEN_TYPE } from "../enums/token.enum";
import { createToken } from "../repositories/token.repository";

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
) => {
  const token = await createToken({
    jti,
    user_id: userId,
    token_type: tokenType,
    expires_at: expiresAt.toDate(),
  });

  if (!token) throw new Error("Failed to save token");

  return token;
};
