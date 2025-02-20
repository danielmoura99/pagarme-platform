"use client";

import { Suspense } from "react";
import ProcessingContent from "./_components/processing-content";
import { Loader2 } from "lucide-react";

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
