import { createElement } from "react";
import { progressPercent, type VerificationStatus } from "@/lib/progress";

export type { VerificationStatus } from "@/lib/progress";
const statusLabels: Record<VerificationStatus, string> = {
  "not-checked": "Not checked",
  "needs-information": "Needs information",
  "user-reviewed": "Details reviewed by user",
  prepared: "Prepared locally",
  "official-confirmation-required": "Official confirmation required",
  "officially-verified": "Official confirmation required",
};

export function VerificationProgressRing({
  completed, total, size = 48, status = "not-checked", label,
}: {
  completed: number;
  total: number;
  size?: 32 | 48 | 72;
  status?: VerificationStatus;
  label: string;
}) {
  const percent = progressPercent(completed, total);
  const circumference = 2 * Math.PI * 20;
  // There is no authorized verification mechanism in this product. Even an
  // imported local value cannot render an official-verification claim.
  const description = `${label}: ${percent}%. ${percent === 100 ? "Locally completed" : percent ? "In progress" : "Not started"}. ${statusLabels[status]}. Official verification unavailable.`;
  return createElement("span", {
    className: `verification-ring ${percent === 100 ? "is-complete" : ""}`,
    style: { width: size, height: size },
    role: "img", "aria-label": description, title: description,
  }, createElement("svg", { viewBox: "0 0 48 48", width: size, height: size, "aria-hidden": true },
    createElement("circle", { className: "verification-ring-track", cx: 24, cy: 24, r: 20 }),
    createElement("circle", { className: "verification-ring-arc", cx: 24, cy: 24, r: 20,
      strokeDasharray: circumference, strokeDashoffset: circumference * (1 - percent / 100) }),
    percent === 100
      ? createElement("path", { d: "M17 24.5 22 29 31 19", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" })
      : createElement("text", { x: 24, y: 25, dy: ".3em", textAnchor: "middle", fill: "currentColor", fontSize: size === 32 ? 13 : 11, fontWeight: 600 }, `${percent}%`),
  ));
}
