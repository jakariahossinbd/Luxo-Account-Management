import AdminShell from "../../components/AdminShell";

const staffData = [
  { id: "STF-102", name: "Ava Rahman", role: "Store Manager", attendance: "98%", sales: "$24,500", rating: "4.9" },
  { id: "STF-087", name: "Noah Ahmed", role: "Sales Executive", attendance: "95%", sales: "$19,230", rating: "4.7" },
  { id: "STF-075", name: "Emma Khan", role: "Support Lead", attendance: "96%", sales: "$14,820", rating: "4.8" },
  { id: "STF-063", name: "Liam Roy", role: "Cash Operations", attendance: "93%", sales: "$11,460", rating: "4.6" },
  { id: "STF-051", name: "Maya Das", role: "Inventory Analyst", attendance: "97%", sales: "$9,140", rating: "4.8" },
];

const totalSales = staffData.reduce((sum, item) => sum + Number(item.sales.replace(/[$,]/g, "")), 0);
const averageRating = (
  staffData.reduce((sum, item) => sum + Number(item.rating), 0) / staffData.length
).toFixed(1);

export default function StaffPage() {
  return (
    <AdminShell>
      <main className="mt-4 flex-1 font-[Manrope] text-slate-900 md:mt-0">
        <header className="mb-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl shadow-slate-300/25 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">Staff</p>
          <h1 className="mt-2 text-3xl font-black">Team Performance</h1>
          <p className="mt-2 text-sm text-slate-600">Monitor attendance, individual sales contribution, and staff quality rating.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/20">
            <p className="text-sm font-semibold text-slate-500">Total Staff</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{staffData.length}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">Active this month</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/20">
            <p className="text-sm font-semibold text-slate-500">Combined Sales</p>
            <p className="mt-2 text-3xl font-black text-slate-900">${totalSales.toLocaleString()}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">Top line contribution</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/20 sm:col-span-2 xl:col-span-1">
            <p className="text-sm font-semibold text-slate-500">Average Rating</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{averageRating}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">Customer satisfaction</p>
          </article>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-300/20">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Staff Table</h2>
            <span className="rounded-lg bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">{staffData.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Attendance</th>
                  <th className="px-5 py-3">Sales</th>
                  <th className="px-5 py-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {staffData.map((staff) => (
                  <tr key={staff.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-semibold text-slate-700">{staff.id}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{staff.name}</td>
                    <td className="px-5 py-3 text-slate-600">{staff.role}</td>
                    <td className="px-5 py-3 text-slate-600">{staff.attendance}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{staff.sales}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">{staff.rating}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
