"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/components/language-provider"
import { Upload, FileText, Eye, Trash2, BarChart2, PieChart } from "lucide-react"

// Имитация данных истории анализов
const analysisHistory = [
  {
    id: "1",
    date: "2025-04-28",
    fileName: "sales_data_2025.csv",
    fileType: "CSV",
    status: "completed",
  },
  {
    id: "2",
    date: "2025-04-25",
    fileName: "customer_survey.xlsx",
    fileType: "XLSX",
    status: "completed",
  },
  {
    id: "3",
    date: "2025-04-20",
    fileName: "product_metrics.json",
    fileType: "JSON",
    status: "completed",
  },
  {
    id: "4",
    date: "2025-04-15",
    fileName: "marketing_campaign.csv",
    fileType: "CSV",
    status: "processing",
  },
  {
    id: "5",
    date: "2025-04-10",
    fileName: "financial_report.xlsx",
    fileType: "XLSX",
    status: "failed",
  },
]

export default function DashboardPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState("all")

  const filteredHistory = filter === "all" ? analysisHistory : analysisHistory.filter((item) => item.status === filter)

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("completed")
      case "processing":
        return t("processing")
      case "failed":
        return t("failed")
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-gray-500">Управляйте вашими данными и анализами</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">
            <Upload className="mr-2 h-4 w-4" />
            {t("uploadData")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего анализов</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-gray-500">+2 за последнюю неделю</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Успешных анализов</CardTitle>
            <BarChart2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10</div>
            <p className="text-xs text-gray-500">83% от общего числа</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Объем данных</CardTitle>
            <PieChart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2 GB</div>
            <p className="text-xs text-gray-500">+250 MB за последний месяц</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{t("analysisHistory")}</CardTitle>
              <CardDescription>История ваших загрузок и анализов данных</CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="completed">Завершенные</SelectItem>
                <SelectItem value="processing">В обработке</SelectItem>
                <SelectItem value="failed">С ошибками</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>Файл</TableHead>
                <TableHead>{t("fileType")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell>{item.fileName}</TableCell>
                    <TableCell>{item.fileType}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          item.status,
                        )}`}
                      >
                        {getStatusText(item.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.status === "completed" && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/results/${item.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">{t("view")}</span>
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t("delete")}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    Нет данных для отображения
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" disabled>
            Предыдущая
          </Button>
          <Button variant="outline" disabled>
            Следующая
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
