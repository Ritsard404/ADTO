import { withMockRelations } from "@/lib/mock-adms-data";
import type { Prisma } from "@/generated/prisma/client";
import type { InventoryCondition } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export interface InventoryReadFilters {
  schoolId?: string;
  focus?: string;
}

export async function getInventoryReadModel(schoolIds: string[] | null, filters: InventoryReadFilters = {}) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    const schools = mock.schools.filter((school) => !allowed || allowed.has(school.id));
    const scopedSchools = new Set(schools.filter((school) => !filters.schoolId || school.id === filters.schoolId).map((school) => school.id));
    const schoolById = new Map(schools.map((school) => [school.id, school]));
    return {
      schools: schools.map((school) => ({ id: school.id, name: school.name })),
      items: mock.inventoryItems.filter((item) => scopedSchools.has(item.schoolId)).map((item) => ({ ...item, school: schoolById.get(item.schoolId) ?? schools[0] })),
      recentChecks: mock.inventoryChecks.filter((check) => scopedSchools.has(check.item.schoolId)),
    };
  }

  const scopedSchoolIds = filters.schoolId
    ? schoolIds
      ? schoolIds.includes(filters.schoolId)
        ? [filters.schoolId]
        : []
      : [filters.schoolId]
    : schoolIds;
  const attentionConditions: InventoryCondition[] = ["FAIR", "NEEDS_REPLACEMENT", "LOST"];
  const attentionWhere: Prisma.InventoryItemWhereInput = filters.focus === "attention"
    ? { OR: [{ remarks: null }, { condition: { in: attentionConditions } }] }
    : filters.focus === "missing-remarks"
      ? { remarks: null }
      : {};
  const where = { ...(scopedSchoolIds ? { schoolId: { in: scopedSchoolIds } } : {}), ...attentionWhere };
  const [schools, items, recentChecks] = await Promise.all([
    prisma.school.findMany({ where: schoolIds ? { id: { in: schoolIds } } : {}, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({
      where,
      include: { school: true },
      orderBy: [{ school: { name: "asc" } }, { category: "asc" }, { itemName: "asc" }],
      take: 500,
    }),
    prisma.inventoryCheck.findMany({
      where: scopedSchoolIds ? { item: { schoolId: { in: scopedSchoolIds } } } : {},
      include: { item: { include: { school: true } } },
      orderBy: { checkedAt: "desc" },
      take: 10,
    }),
  ]);
  return { schools, items, recentChecks };
}
