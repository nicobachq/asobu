import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { TopHeader } from "./TopHeader";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="md:ml-[15.5rem] min-h-screen flex flex-col">
        <div className="hidden md:block">
          <TopHeader />
        </div>
        <main className="flex-1 pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
