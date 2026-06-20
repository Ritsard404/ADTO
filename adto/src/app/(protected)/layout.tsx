import { AppChrome } from "@/components/layout/app-chrome";
import { requireActiveProfile } from "@/lib/auth";
import { getDataMode } from "@/lib/runtime-mode";
import { isAuthBypassEnabled } from "@/lib/test-auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireActiveProfile();

  return (
    <AppChrome profile={profile} dataMode={getDataMode()} testRoleSwitcherEnabled={isAuthBypassEnabled()}>{children}</AppChrome>
  );
}
