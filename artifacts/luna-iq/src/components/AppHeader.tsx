import { ReactNode } from "react";

interface AppHeaderProps {
  title: ReactNode;
  subtitle?: string;
  rightElement?: ReactNode;
}

export function AppHeader({ title, subtitle, rightElement }: AppHeaderProps) {
  return (
    <header className="px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </header>
  );
}
