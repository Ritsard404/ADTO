import { PageHeader } from "@/components/common/page-header";
import { AccountPasswordForm } from "@/app/(protected)/account/account-password-form";
import { requireActiveProfile } from "@/lib/auth";

export default async function AccountPage() {
  const profile = await requireActiveProfile();

  return (
    <div className="space-y-3">
      <PageHeader title="Account" description="Manage your own ADTO account access." />
      <AccountPasswordForm email={profile.email} />
    </div>
  );
}
