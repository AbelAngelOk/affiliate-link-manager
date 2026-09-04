"use client";

import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { operationAnchor, type OpenApiOperation } from "@/lib/openapi";
import { MethodBadge } from "./MethodBadge";

type Props = {
  title: string;
  version: string;
  tags: string[];
  operationsByTag: Record<string, OpenApiOperation[]>;
};

// Menú vertical estilo Postman: cada sección (tag) es un Collapsible de
// shadcn/ui que despliega sus endpoints. Arrancan todas abiertas a propósito
// — el contenido tiene que estar en el HTML servido sin depender de que se
// ejecute JS (ver 03-stack-tecnologico.md §3.4, criterio de SEO/GEO/LLMO);
// colapsarlas es una comodidad interactiva encima de eso, no un requisito
// para ver el índice completo.
export function DocsSidebar({ title, version, tags, operationsByTag }: Props) {
  return (
    <aside className="shrink-0 py-8 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:overflow-y-auto">
      <p className="mb-1 font-semibold">{title}</p>
      <p className="mb-6 text-xs text-muted-foreground">v{version}</p>

      <nav className="space-y-0.5 text-sm">
        <a href="#introduccion" className="block rounded px-2 py-1.5 hover:bg-muted">
          Introducción
        </a>
        <a href="#autenticacion" className="block rounded px-2 py-1.5 hover:bg-muted">
          Autenticación
        </a>
        <a href="#recursos" className="block rounded px-2 py-1.5 hover:bg-muted">
          Recursos
        </a>
      </nav>

      <div className="mt-6 space-y-1">
        {tags.map((tag) => (
          <Collapsible key={tag} defaultOpen>
            <CollapsibleTrigger className="group flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-muted">
              <ChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
              {tag}
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-3.5 space-y-0.5 border-l pl-2.5 text-sm">
              {operationsByTag[tag]?.map((op) => (
                <a
                  key={operationAnchor(op)}
                  href={`#${operationAnchor(op)}`}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                >
                  <MethodBadge method={op.method} />
                  <span className="truncate text-muted-foreground">{op.path}</span>
                </a>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </aside>
  );
}
