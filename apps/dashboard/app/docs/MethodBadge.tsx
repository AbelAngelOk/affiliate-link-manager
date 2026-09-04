const METHOD_STYLES: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-emerald-100 text-emerald-700",
  PATCH: "bg-amber-100 text-amber-800",
  DELETE: "bg-red-100 text-red-700",
};

// Sin "use client": es puro (ni hooks ni estado), lo usan tanto page.tsx
// (Server Component) como DocsSidebar.tsx (Client Component).
export function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${METHOD_STYLES[method] ?? "bg-muted text-muted-foreground"}`}
    >
      {method}
    </span>
  );
}
