import { SetMetadata } from '@nestjs/common';
import { Role } from '../common/roles';

export const ROLES_KEY = 'roles';

/**
 * Restrict a controller or route to the given roles.
 * Admin is always allowed. Routes without @Roles are open to every logged-in user.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
