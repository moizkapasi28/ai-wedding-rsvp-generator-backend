import { User } from "../../generated/prisma/browser";
import { createUser, findUserByEmail } from "../repositories/user.repository";
import { ApiError } from "../utils/apiError.util";
import { LoginDto, SignUpDto } from "../validations/auth.validation";
import bcrypt from "bcrypt";
import { generateAuthTokensService } from "./token.service";

export const signUpService = async (
  payload: SignUpDto,
): Promise<Omit<User, "password">> => {
  const { email, password, first_name, last_name, mobile_number } = payload;
  const exitingUser = await findUserByEmail(email);

  if (exitingUser) throw new ApiError(409, "User already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await createUser({
    email,
    password: hashedPassword,
    first_name,
    last_name,
    mobile_number,
  });

  const { password: _password, ...user } = newUser;
  return user;
};

export const signInService = async (
  payload: LoginDto,
): Promise<
  Omit<User, "password"> & {
    tokens: {
      access: { token: string; expires_at: Date };
      refresh: { token: string; expires_at: Date };
    };
  }
> => {
  const { email, password } = payload;

  const existingUser = await findUserByEmail(email);

  if (!existingUser) throw new ApiError(404, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);

  if (!isPasswordValid) throw new ApiError(404, "Invalid email or password");

  const tokens = await generateAuthTokensService(existingUser);

  const { password: _password, ...user } = existingUser;

  return {
    ...user,
    tokens: tokens,
  };
};
