/** Postgres returns numeric columns as strings; convert them to numbers. */
export const decimalTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null || value === undefined ? null : parseFloat(value)),
};
