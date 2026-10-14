import { User } from "../../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      // Set by the authenticate middleware. Typed as always present because every route that
      // reads it runs behind authenticate; public routes (RSVP, auth) must not read it.
      user: User;
    }
  }
}
