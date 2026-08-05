export type RfqValidationErrors = Record<string, string>;

export function validateRfqInput(input: {
  quantity?: string | null;
  budgetMin?: string | null;
  budgetMax?: string | null;
}): RfqValidationErrors {
  const errors: RfqValidationErrors = {};

  if (input.quantity != null && input.quantity !== "") {
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.quantity = "Quantity must be a whole number greater than 0";
    }
  }

  const min = input.budgetMin != null && input.budgetMin !== "" ? Number(input.budgetMin) : null;
  const max = input.budgetMax != null && input.budgetMax !== "" ? Number(input.budgetMax) : null;

  if (min != null && Number.isNaN(min)) {
    errors.budgetMin = "Budget minimum must be a valid number";
  }

  if (max != null && Number.isNaN(max)) {
    errors.budgetMax = "Budget maximum must be a valid number";
  }

  if (min != null && max != null && !Number.isNaN(min) && !Number.isNaN(max) && max < min) {
    errors.budgetMax = "Budget maximum cannot be less than budget minimum";
  }

  return errors;
}
