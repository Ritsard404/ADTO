import { Boxes, History } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { verifyInventoryAction } from "@/features/facilitator/actions/adms-workflow";
import { requireActiveProfile } from "@/lib/auth";
import { getAccessibleSchoolIds } from "@/features/facilitator/services/adms-workflow.service";
import { getInventoryReadModel } from "@/features/inventory/services/inventory-read.service";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; focus?: string }>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const schoolIds = await getAccessibleSchoolIds(profile);
  const { schools, items, recentChecks } = await getInventoryReadModel(schoolIds, params);

  const pendingRemarks = items.filter((item) => !item.remarks || ["FAIR", "NEEDS_REPLACEMENT", "LOST"].includes(item.condition)).length;
  const categoryKeys = Array.from(new Set(items.map((item) => `${item.school.name} / ${item.category}`)));

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
        <CardHeader>
          <CardTitle>Checklist Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <select name="schoolId" defaultValue={params.schoolId ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All accessible schools</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <select name="focus" defaultValue={params.focus ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All items</option>
              <option value="attention">Needs attention</option>
              <option value="missing-remarks">Missing remarks</option>
            </select>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <Boxes className="size-5 text-ace-blue" />
          <CardTitle>Inventory Verification Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryKeys.map((category) => {
            const categoryItems = items.filter((item) => `${item.school.name} / ${item.category}` === category);
            return (
            <section key={category} className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{category}</h3>
                <span className="text-sm text-muted-foreground">{categoryItems.length} items</span>
              </div>
              {categoryItems.map((item) => (
                <form key={item.id} action={verifyInventoryAction} className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-6">
                  <input type="hidden" name="itemId" value={item.id} />
                  <div>
                    <p className="font-semibold">{item.itemName}</p>
                    <p className="text-sm text-muted-foreground">{item.school.name} - {item.category}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last checked: {item.lastCheckedAt ? item.lastCheckedAt.toLocaleDateString("en-US") : "Not checked"}{" "}
                      {item.lastCheckedBy ? `by ${item.lastCheckedBy}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Source: {item.sourceSheet ?? "Manual record"}</p>
                  </div>
                  <Label>
                    Quantity
                    <Input name="quantity" type="number" min={0} defaultValue={item.quantity} className="mt-1" />
                    {item.unit ? <span className="mt-1 block text-xs text-muted-foreground">{item.unit}</span> : null}
                  </Label>
                  <Label>
                    Issued
                    <Input name="issuedQuantity" type="number" min={0} defaultValue={item.issuedQuantity ?? item.quantity} className="mt-1" />
                  </Label>
                  <Label>
                    Total
                    <Input name="totalQuantity" type="number" min={0} defaultValue={item.totalQuantity ?? item.quantity} className="mt-1" />
                  </Label>
                  <Label>
                    Condition
                    <select name="condition" defaultValue={item.condition} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {["NEW", "GOOD", "FAIR", "NEEDS_REPLACEMENT", "LOST"].map((condition) => (
                        <option key={condition} value={condition}>{condition.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  </Label>
                  <Label>
                    Borrowed
                    <Input name="borrowedStatus" defaultValue={item.borrowedStatus ?? ""} className="mt-1" placeholder="Borrowed / Not borrowed" />
                  </Label>
                  <Label>
                    Completeness
                    <Input name="completenessStatus" defaultValue={item.completenessStatus ?? ""} className="mt-1" placeholder="Complete / Incomplete" />
                  </Label>
                  <Label>
                    Sign-off
                    <Input name="facilitatorSignOff" defaultValue={item.facilitatorSignOff ?? profile.fullName} className="mt-1" />
                  </Label>
                  <Label className="lg:col-span-2">
                    Remarks
                    <Textarea name="remarks" defaultValue={item.remarks ?? ""} className="mt-1 min-h-20" />
                  </Label>
                  <div className="flex items-end gap-3">
                    <StatusBadge status={item.condition} />
                    <Button type="submit">Verify</Button>
                  </div>
                </form>
              ))}
            </section>
            );
          })}
          {!items.length ? <p className="text-sm text-muted-foreground">No inventory items match the current filter.</p> : null}
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
                  <TableCell><StatusBadge status={check.condition} /></TableCell>
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
