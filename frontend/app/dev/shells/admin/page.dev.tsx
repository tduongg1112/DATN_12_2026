import { Activity, Users } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { StatRow } from "@/components/ds/stat-row"
import { AdminPageShell } from "@/components/layout/page-shells"

/** Khung ADMIN không qua RequireAuth, chỉ để xem bố cục khi dev. */
export default function AdminShellPreview() {
  return (
    <AdminPageShell title="Dashboard">
      <div className="grid gap-2 lg:grid-cols-12 lg:gap-5">
        <Card className="lg:col-span-8">
          <StatRow
            icon={Activity}
            title="Số lượt chẩn đoán"
            sub="30 ngày gần nhất"
            value={1284}
            unit="lượt"
          />
        </Card>
        <Card className="lg:col-span-4">
          <StatRow
            icon={Users}
            title="Người dùng mới"
            sub="So với kỳ trước"
            value={42}
            unit="người"
            tone="neutral"
          />
        </Card>
        <Card className="lg:col-span-12">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Bệnh</th>
                  <th>Loại cây</th>
                  <th className="text-right">Số lượt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Bệnh mốc sương</td>
                  <td>Cà chua</td>
                  <td className="text-right">312</td>
                </tr>
                <tr>
                  <td>Bệnh gỉ sắt</td>
                  <td>Ngô</td>
                  <td className="text-right">208</td>
                </tr>
                <tr>
                  <td>Bệnh tiêm lửa</td>
                  <td>Lúa</td>
                  <td className="text-right">97</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminPageShell>
  )
}
