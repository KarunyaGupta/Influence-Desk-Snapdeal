import type { AuditLogEntry } from "@/lib/types";

export interface AuditService {
  list(filters?: {
    entityType?: AuditLogEntry["entityType"];
    entityId?: string;
    actorUserId?: string;
  }): Promise<AuditLogEntry[]>;
}
