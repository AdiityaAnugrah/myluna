export interface AuthUser {
  id: string;
  email: string;
  username: string;
  roleId: string;
  roleName: string;
  isTestingMode?: boolean;
}

export interface AuditContext {
  userId: string;
  ip: string;
  userAgent: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auditContext?: AuditContext;
    }
  }
}

export {};
