import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnPasswordAction } from "@/features/auth/actions/auth";
import { requireActiveProfile } from "@/lib/auth";

export default async function AccountPage() {
  const profile = await requireActiveProfile();

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Manage your own ADTO account access." />

      <Card className="adto-card max-w-2xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <KeyRound className="size-5 text-ace-blue" />
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profile.email}</span>. Enter your current password before setting a new one.
          </div>
          <form
            action={async (formData) => {
              "use server";
              await changeOwnPasswordAction(formData);
            }}
            className="grid gap-3"
          >
            <Label>
              Current password
              <Input name="currentPassword" type="password" minLength={6} autoComplete="current-password" className="mt-1" required />
            </Label>
            <Label>
              New password
              <Input name="newPassword" type="password" minLength={8} autoComplete="new-password" className="mt-1" required />
            </Label>
            <Label>
              Confirm new password
              <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" className="mt-1" required />
            </Label>
            <Button type="submit" className="w-fit">Update password</Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Admins can reset a user&apos;s password, but ADTO never displays existing passwords.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
