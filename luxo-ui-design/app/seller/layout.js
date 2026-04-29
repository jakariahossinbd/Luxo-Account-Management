export default function SellerLayout({ children }) {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(203,213,225,0.28),_transparent_40%)]" />
      </div>
      <div className="mx-auto min-h-screen w-full px-2 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        {children}
      </div>
    </>
  );
}
