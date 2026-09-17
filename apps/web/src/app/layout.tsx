import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/invoices" className="text-sm font-semibold tracking-tight">
            Invoice review
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/invoices" className="hover:text-foreground">
              Inbox
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
