import { getBusiness } from "@/lib/getBusiness";
import { DailyReport } from "@/components/dashboard/DailyReport";

export default async function ReportsPage() {
  await getBusiness(); // guard de auth

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <p className="dash-page-eyebrow">Finanzas</p>
          <h1 className="dash-page-title">Corte de caja</h1>
        </div>
      </div>
      <DailyReport />
    </div>
  );
}
