import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body;
      req.query = parsed.query as Request["query"];
      req.params = parsed.params as Request["params"];

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.issues,
        });
      }

      next(error);
    }
  };

export default validate;
