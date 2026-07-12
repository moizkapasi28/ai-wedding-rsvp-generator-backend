import { User } from "../../generated/prisma/client";

export type SafeUser = Omit<User, "password">;

export interface TokenPayload {
  token: string;
  expires_at: Date;
}

export interface AuthResponseDto {
  user: SafeUser;
  tokens: {
    access: TokenPayload;
    refresh: TokenPayload;
  };
}
