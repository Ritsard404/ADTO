import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure organization preferences, role approvals, and system defaults." />
    <Card className="adto-card">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Organization settings, role approvals, and Supabase Storage buckets will be configured in later phases.
      </CardContent>
    </Card>
    </div>
  );
}
