import ReportPage from "@features/report/components/ReportPage";
import demoReports from "@features/report/data/demoReports";

export default function DemoDossierPage() {
  return <ReportPage initial={demoReports} />;
}
