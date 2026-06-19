import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export async function getInventoryReadModel(schoolIds: string[] | null) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    return {
      items: mock.inventoryItems.filter((item) => !allowed || allowed.has(item.schoolId)),
      recentChecks: mock.inventoryChecks.filter((check) => !allowed || allowed.has(check.item.schoolId)),
    };
  }

  const where = schoolIds ? { schoolId: { in: schoolIds } } : {};
  const [items, recentChecks] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: { school: true },
      orderBy: [{ school: { name: "asc" } }, { category: "asc" }, { itemName: "asc" }],
    }),
    prisma.inventoryCheck.findMany({
      where: schoolIds ? { item: { schoolId: { in: schoolIds } } } : {},
      include: { item: { include: { school: true } } },
      orderBy: { checkedAt: "desc" },
      take: 10,
    }),
  ]);
  return { items, recentChecks };
}
