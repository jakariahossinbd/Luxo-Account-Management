import AdminDashboard from "../../components/AdminDashboard";
import AdminShell from "../../components/AdminShell";

export default function SalesPage() {
  return (
    <AdminShell>
      <AdminDashboard
        title="Sales Performance"
        subtitle="Monitor conversion, order volume, and revenue growth."
      />
    </AdminShell>
  );
}
