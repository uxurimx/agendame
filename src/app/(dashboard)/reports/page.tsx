import { getBusiness } from "@/lib/getBusiness";
import { DailyReport } from "@/components/dashboard/DailyReport";

export default async function ReportsPage() {
  await getBusiness(); // guard de auth

  return (
    <div className="dash-page">
      <div className="dash-page-header dash-page-header--reports">
        <div className="dash-page-title-row">
          <p className="dash-page-eyebrow">Finanzas</p>
          <p className="dash-page-report-subtitle">Corte de caja</p>
        </div>
      </div>
      <DailyReport />
    </div>
  );
}
