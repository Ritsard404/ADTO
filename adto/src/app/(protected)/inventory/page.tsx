import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    include: { school: true },
    orderBy: { itemName: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Monitor ACE kits, materials, condition, and school-specific resource concerns." />
    <Card className="adto-card">
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Condition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell>{item.school.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  <StatusBadge status={item.condition} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  );
}
