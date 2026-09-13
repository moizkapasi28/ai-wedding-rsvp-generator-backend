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
      Object.defineProperty(req, "query", {
        value: parsed.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      req.params = parsed.params as Request["params"];

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const [firstIssue] = error.issues;

        return res.status(400).json({
          success: false,
          // Clients read `message`; without it a validation failure shows up as a bare HTTP 400
          message: firstIssue
            ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
            : "Invalid request",
          errors: error.issues,
        });
      }

      next(error);
    }
  };

export default validate;
