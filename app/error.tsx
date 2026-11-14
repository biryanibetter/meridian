"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="loading-state">
      <h1>Let’s try that again.</h1>
      <p>
        The workspace could not load. Your browser-local demo is still saved.
      </p>
      <Button onClick={reset}>Reload workspace</Button>
    </div>
  );
}
