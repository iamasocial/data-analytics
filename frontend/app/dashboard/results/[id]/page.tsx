"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/components/language-provider"
import { DistributionChart } from "@/components/charts/distribution-chart"
import { TimeSeriesChart } from "@/components/charts/time-series-chart"
import { Download, RefreshCw } from "lucide-react"

// Имитация данных результатов анализа
const analysisResults = {
  "1": {
    fileName: "sales_data_2025.csv",
    fileType: "CSV",
    date: "2025-04-28",
    metrics: {
      rowCount: 5243,
      columnCount: 12,
      missingValues: 124,
      duplicateRows: 5,
      outliers: 78,
    },
    summary: [
      { column: "date", type: "datetime", missing: 0, unique: 365, min: "2024-01-01", max: "2024-12-31" },
      { column: "product_id", type: "string", missing: 0, unique: 156, min: null, max: null },
      { column: "category", type: "string", missing: 12, unique: 8, min: null, max: null },
      { column: "price", type: "numeric", missing: 0, unique: 87, min: 9.99, max: 499.99 },
      { column: "quantity", type: "numeric", missing: 0, unique: 45, min: 1, max: 100 },
      { column: "revenue", type: "numeric", missing: 0, unique: 1245, min: 9.99, max: 24999.5 },
      { column: "customer_id", type: "string", missing: 23, unique: 1876, min: null, max: null },
      { column: "region", type: "string", missing: 5, unique: 12, min: null, max: null },
    ]
  },
  "2": {
    fileName: "customer_survey.xlsx",
    fileType: "XLSX",
    date: "2025-04-25",
    metrics: {
      rowCount: 1250,
      columnCount: 25,
      missingValues: 87,
      duplicateRows: 0,
      outliers: 32,
    },
    summary: [
      { column: "respondent_id", type: "string", missing: 0, unique: 1250, min: null, max: null },
      { column: "age", type: "numeric", missing: 12, unique: 65, min: 18, max: 85 },
      { column: "gender", type: "string", missing: 5, unique: 3, min: null, max: null },
      { column: "income", type: "numeric", missing: 45, unique: 78, min: 15000, max: 250000 },
      { column: "satisfaction", type: "numeric", missing: 0, unique: 10, min: 1, max: 10 },
      { column: "recommendation", type: "numeric", missing: 0, unique: 11, min: 0, max: 10 },
    ]
  },
  "3": {
    fileName: "product_metrics.json",
    fileType: "JSON",
    date: "2025-04-20",
    metrics: {
      rowCount: 876,
      columnCount: 18,
      missingValues: 45,
      duplicateRows: 2,
      outliers: 15,
    },
    summary: [
      { column: "product_id", type: "string", missing: 0, unique: 156, min: null, max: null },
      { column: "views", type: "numeric", missing: 0, unique: 245, min: 0, max: 15678 },
      { column: "clicks", type: "numeric", missing: 0, unique: 187, min: 0, max: 4532 },
      { column: "conversions", type: "numeric", missing: 0, unique: 98, min: 0, max: 876 },
      { column: "bounce_rate", type: "numeric", missing: 12, unique: 76, min: 0.01, max: 0.95 },
    ]
  },
}

export default function ResultsPage() {
  const { t } = useTranslation()
  const params = useParams()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState("metrics")

  // Получение данных по ID
  const result = analysisResults[id as keyof typeof analysisResults]

  if (!result) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Результаты не найдены</h2>
          <p className="text-gray-500 mt-2">Результаты анализа с ID {id} не найдены</p>
          <Button asChild className="mt-4">
            <a href="/dashboard">Вернуться на панель управления</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Результаты анализа: {result.fileName}</h1>
          <p className="text-gray-500">
            {new Date(result.date).toLocaleDateString()} • {result.fileType}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("rerunAnalysis")}
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            {t("exportResults")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:w-[400px]">
          <TabsTrigger value="metrics">{t("metrics")}</TabsTrigger>
          <TabsTrigger value="summary">Сводка</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Количество строк</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.rowCount.toLocaleString()}</div>
                <p className="text-xs text-gray-500">Всего записей в датасете</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Количество столбцов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.columnCount}</div>
                <p className="text-xs text-gray-500">Всего переменных</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Пропущенные значения</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.missingValues}</div>
                <p className="text-xs text-gray-500">
                  {((result.metrics.missingValues / (result.metrics.rowCount * result.metrics.columnCount)) * 100).toFixed(2)}% от всех значений
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Дубликаты строк</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.duplicateRows}</div>
                <p className="text-xs text-gray-500">{((result.metrics.duplicateRows / result.metrics.rowCount) * 100).toFixed(2)}% от всех строк</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Выбросы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.outliers}</div>
                <p className="text-xs text-gray-500">Значения за пределами 3 стандартных отклонений</p>
              </CardContent>
            </Card>
          <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Качество данных</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  {result.metrics.missingValues === 0 && result.metrics.duplicateRows === 0
                    ? "Отличное"
                    : result.metrics.missingValues < 100 && result.metrics.duplicateRows < 10
                      ? "Хорошее"
                      : "Требуется очистка"}
              </div>
                <p className="text-xs text-gray-500">Общая оценка качества</p>
            </CardContent>
          </Card>
              </div>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Сводка по столбцам</CardTitle>
              <CardDescription>Общая информация о переменных в датасете</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя столбца</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Пропущенные</TableHead>
                    <TableHead>Уникальные</TableHead>
                    <TableHead>Минимум</TableHead>
                    <TableHead>Максимум</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.summary.map((col) => (
                    <TableRow key={col.column}>
                      <TableCell className="font-medium">{col.column}</TableCell>
                      <TableCell>{col.type}</TableCell>
                      <TableCell>{col.missing}</TableCell>
                      <TableCell>{col.unique}</TableCell>
                      <TableCell>{col.min !== null ? col.min : "N/A"}</TableCell>
                      <TableCell>{col.max !== null ? col.max : "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
