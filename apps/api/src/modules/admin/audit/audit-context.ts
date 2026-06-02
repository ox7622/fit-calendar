// Shared context type for audit-recording call sites. Kept separate from
// admin-audit.service.ts so feature modules can import the type without
// pulling the service runtime into their own injection graph.
export interface IAuditContext {
    adminUserId: string | null;
    ipAddress: string | null;
}
