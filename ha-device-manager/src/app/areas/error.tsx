"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export default function AreasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="animate-in">
      <Alert variant="error" title="Areas page failed to load">
        {error.message || "An unexpected error occurred."}
      </Alert>
      <p className="mt-4 text-sm text-muted">
        If this keeps happening after retrying, restart the app with a clean build:{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">npm run serve</code> in{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">ha-device-manager</code>.
      </p>
      <Button variant="primary" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
