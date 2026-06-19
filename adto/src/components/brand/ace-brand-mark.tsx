import Image from "next/image";
import { cn } from "@/lib/utils";

export function AceBrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative size-10 overflow-hidden rounded-2xl border border-white bg-white shadow-[0_6px_18px_rgba(30,136,229,0.16)]",
        className,
      )}
      aria-hidden="true"
    >
      <Image src="/favicon.ico" alt="" fill sizes="40px" className="object-contain p-1" unoptimized priority />
    </div>
  );
}

export function ADTOBrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AceBrandMark />
      {!compact ? (
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight tracking-tight text-foreground">ADTO</p>
          <p className="truncate text-xs font-medium text-muted-foreground">ACE Database and Tracking Operations</p>
        </div>
      ) : null}
    </div>
  );
}
