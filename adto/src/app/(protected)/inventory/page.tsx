import { Boxes, History } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { verifyInventoryAction } from "@/lib/actions/adms-workflow";
import { requireActiveProfile } from "@/lib/auth";
import { getAccessibleSchoolIds } from "@/lib/services/adms-workflow.service";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const profile = await requireActiveProfile();
  const schoolIds = await getAccessibleSchoolIds(profile);
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

  const pendingRemarks = items.filter((item) => !item.remarks || item.condition === "FAIR" || item.condition === "NEEDS_REPLACEMENT").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Verify ACE kit quantities, condition, completeness, and facilitator remarks using the workbook inventory flow."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Inventory records</p>
            <p className="text-3xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Needs remarks</p>
            <p className="text-3xl font-bold">{pendingRemarks}</p>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checked recently</p>
            <p className="text-3xl font-bold">{recentChecks.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <Boxes className="size-5 text-ace-blue" />
          <CardTitle>Inventory Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <form key={item.id} action={verifyInventoryAction} className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_2fr_auto]">
              <input type="hidden" name="itemId" value={item.id} />
              <div>
                <p className="font-semibold">{item.itemName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.school.name} · {item.category}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last checked: {item.lastCheckedAt ? item.lastCheckedAt.toLocaleDateString("en-US") : "Not checked"}{" "}
                  {item.lastCheckedBy ? `by ${item.lastCheckedBy}` : ""}
                </p>
              </div>
              <Label>
                Quantity
                <Input name="quantity" type="number" min={0} defaultValue={item.quantity} className="mt-1" />
                {item.unit ? <span className="mt-1 block text-xs text-muted-foreground">{item.unit}</span> : null}
              </Label>
              <Label>
                Condition
                <select name="condition" defaultValue={item.condition} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {["NEW", "GOOD", "FAIR", "NEEDS_REPLACEMENT", "LOST"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Remarks
                <Textarea name="remarks" defaultValue={item.remarks ?? ""} className="mt-1 min-h-20" />
              </Label>
              <div className="flex items-end gap-3">
                <StatusBadge status={item.condition} />
                <Button type="submit">Verify</Button>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <History className="size-5 text-ace-orange" />
          <CardTitle>Recent Verification History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Checked by</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentChecks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell className="font-medium">{check.item.itemName}</TableCell>
                  <TableCell>{check.item.school.name}</TableCell>
                  <TableCell>{check.checkedBy}</TableCell>
                  <TableCell>{check.quantity}</TableCell>
                  <TableCell>
                    <StatusBadge status={check.condition} />
                  </TableCell>
                  <TableCell>{check.checkedAt.toLocaleDateString("en-US")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
