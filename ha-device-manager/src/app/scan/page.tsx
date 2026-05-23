import { Suspense } from "react";
import { ScanPage } from "@/components/ScanPage";
import { LoadingPanel } from "@/components/ui/Spinner";

export default function ScanRoute() {
  return (
    <Suspense fallback={<LoadingPanel message="Loading scanner…" />}>
      <ScanPage />
    </Suspense>
  );
}
