/**
 * Roles used across the IMS / CRM.
 *
 * - admin      : everything, including confidential (salary, IO, balance) and user management
 * - accounts   : day-to-day work + balance sheet and collection reports
 * - counselor  : students, collected info, applications, documents, leads, invoices
 * - telecaller : leads (calling), collecting student info, read-only student lists
 */
export enum Role {
  ADMIN = 'admin',
  ACCOUNTS = 'accounts',
  COUNSELOR = 'counselor',
  TELECALLER = 'telecaller',
}

export const ALL_ROLES: Role[] = [Role.ADMIN, Role.ACCOUNTS, Role.COUNSELOR, Role.TELECALLER];

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  employee_id: number | null;
  counselor_id: number | null;
}
