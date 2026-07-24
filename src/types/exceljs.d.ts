import ExcelJS from "exceljs";

declare module "exceljs" {
  interface DataValidation {
    sqref?: string; // ← add this line
  }

  interface DataValidations {
    model: Record<string, DataValidation>;
    add(cellRange: string, rule: DataValidation): void;
    find(cellRange: string): DataValidation | undefined;
    remove(cellRange: string): void;
  }

  interface Worksheet {
    dataValidations: DataValidations;
  }
}
