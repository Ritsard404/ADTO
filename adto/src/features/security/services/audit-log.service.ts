import { prisma } from "@/lib/prisma";

type AuditLogInput = {
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
};

const sensitiveKeyPattern = /password|token|secret|key|authorization|cookie/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? "[REDACTED]" : redact(nestedValue),
      ]),
    );
  }

  return value;
}

function serializeAuditValue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.slice(0, 8_000);
  return JSON.stringify(redact(value)).slice(0, 8_000);
}

export async function recordAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        previousValue: serializeAuditValue(input.previousValue),
        newValue: serializeAuditValue(input.newValue),
      },
    });
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}
