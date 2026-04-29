import Sidebar from "./Sidebar";

export default function AdminShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#e0f2fe,_transparent_45%),radial-gradient(circle_at_bottom_right,_#ccfbf1,_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col p-4 md:flex-row md:gap-4 md:p-6">
        <Sidebar />
        {children}
      </div>
    </div>
  );
}