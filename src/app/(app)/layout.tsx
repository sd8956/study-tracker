import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-md px-4 pb-40 pt-6">{children}</div>
      <BottomNav />
    </>
  );
}
