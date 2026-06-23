import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createUserAction, updateUserAction, updateUserPasswordAction } from "@/features/admin/actions/admin";
import { requireRole } from "@/lib/auth";
import { mockProfiles } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const query = params.q?.trim();
  const role = params.role && params.role !== "ALL" ? params.role : undefined;
  const status = params.status && params.status !== "ALL" ? params.status : undefined;

  const users = isMockDataMode()
    ? mockProfiles
        .filter((user) => !role || user.role === role)
        .filter((user) => !status || user.status === status)
        .filter((user) => !query || [user.fullName, user.email].some((value) => value.toLowerCase().includes(query.toLowerCase())))
    : await prisma.profile.findMany({
        where: {
          role: role ? (role as "ADMIN" | "FACILITATOR" | "SCHOOL_ADMIN") : undefined,
          status: status ? (status as "PENDING" | "ACTIVE" | "DISABLED") : undefined,
          OR: query
            ? [{ fullName: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }]
            : undefined,
        },
        orderBy: [{ role: "asc" }, { fullName: "asc" }],
      });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage ADMS user accounts, roles, and activation status." />

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Create or Invite User</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-3 md:grid-cols-[1fr_1fr_180px_160px_180px_180px_auto]">
            <Label>
              Full name
              <Input name="fullName" className="mt-1" required />
            </Label>
            <Label>
              Email
              <Input name="email" type="email" className="mt-1" required />
            </Label>
            <Label>
              Role
              <select name="role" defaultValue="FACILITATOR" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"].map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Status
              <select name="status" defaultValue="PENDING" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["PENDING", "ACTIVE", "DISABLED"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Initial password
              <Input name="password" type="password" minLength={8} autoComplete="new-password" className="mt-1" required />
            </Label>
            <Label>
              Confirm password
              <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" className="mt-1" required />
            </Label>
            <div className="flex items-end">
              <Button type="submit">Save user</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <Input name="q" defaultValue={query ?? ""} placeholder="Search name or email" />
            <select name="role" defaultValue={role ?? "ALL"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["ALL", "ADMIN", "FACILITATOR", "SCHOOL_ADMIN"].map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status ?? "ALL"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["ALL", "PENDING", "ACTIVE", "DISABLED"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <form id={`user-${user.id}`} action={updateUserAction}>
                      <input type="hidden" name="profileId" value={user.id} />
                      <Input name="fullName" defaultValue={user.fullName} className="min-w-48" />
                    </form>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <select name="role" form={`user-${user.id}`} defaultValue={user.role} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"].map((option) => (
                        <option key={option} value={option}>
                          {option.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <select
                        name="status"
                        form={`user-${user.id}`}
                        defaultValue={user.status}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {["PENDING", "ACTIVE", "DISABLED"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <StatusBadge status={user.status} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button type="submit" form={`user-${user.id}`} size="sm">
                      Update
                    </Button>
                  </TableCell>
                  <TableCell>
                    <form
                      action={async (formData) => {
                        "use server";
                        await updateUserPasswordAction(formData);
                      }}
                      className="grid min-w-56 gap-2"
                    >
                      <input type="hidden" name="profileId" value={user.id} />
                      <Input name="password" type="password" placeholder="New password" minLength={8} autoComplete="new-password" />
                      <Input name="confirmPassword" type="password" placeholder="Confirm password" minLength={8} autoComplete="new-password" />
                      <Button type="submit" size="sm" variant="outline">
                        Set password
                      </Button>
                    </form>
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
