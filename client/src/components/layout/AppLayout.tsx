import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ReactNode, useEffect, useState } from "react";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title = "Dashboard" }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => {
      const desktop = mediaQuery.matches;
      setIsDesktop(desktop);
      setIsSidebarOpen(false);
      if (!desktop) {
        setIsSidebarCollapsed(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleToggleSidebar = () => {
    if (isDesktop) {
      setIsSidebarCollapsed((prev) => !prev);
      return;
    }
    setIsSidebarOpen((prev) => !prev);
  };

  const contentMarginClass = isDesktop
    ? isSidebarCollapsed
      ? "lg:ml-20"
      : "lg:ml-72"
    : "ml-0";

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <Sidebar
        isCollapsed={isDesktop ? isSidebarCollapsed : false}
        isOpen={!isDesktop && isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={`flex-1 ${contentMarginClass} flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out`}>
        <Header title={title} onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
