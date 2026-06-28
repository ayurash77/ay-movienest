export type UserRole = 'USER' | 'ADMIN';

export const BOOTSTRAP_ADMIN_EMAILS = [ 'ayurash@me.com' ];

export function resolveRole(email: string, storedRole: string | null | undefined): UserRole {
    if (BOOTSTRAP_ADMIN_EMAILS.includes(email.toLowerCase())) return 'ADMIN';
    return storedRole === 'ADMIN' ? 'ADMIN' : 'USER';
}
