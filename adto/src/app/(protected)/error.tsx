"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unable to load this workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Try again or return to the dashboard.</p>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
