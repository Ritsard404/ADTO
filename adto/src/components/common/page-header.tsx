import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-0.5">
        <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground">{title}</h1>
        {description ? <p className="max-w-4xl text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
