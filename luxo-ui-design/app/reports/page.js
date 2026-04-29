import AdminDashboard from "../../components/AdminDashboard";
import AdminShell from "../../components/AdminShell";

export default function ReportsPage() {
  return (
    <AdminShell>
      <AdminDashboard
        title="Reports Center"
        subtitle="Review metrics snapshots and export reporting data."
      />
    </AdminShell>
  );
}
