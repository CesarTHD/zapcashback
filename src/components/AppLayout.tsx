import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

export function AppLayout({ children, title, subtitle, actions }: {
  children: ReactNode; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {title && (
          <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/70 bg-white/55 px-4 py-2 shadow-[0_6px_24px_-16px_hsl(153_50%_18%/0.35)] backdrop-blur-xl backdrop-saturate-150 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </header>
        )}
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
