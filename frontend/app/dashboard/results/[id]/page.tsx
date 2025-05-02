"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/components/language-provider"
import { CorrelationChart } from "@/components/charts/correlation-chart"
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
    ],
    correlations: [
      { variable1: "price", variable2: "revenue", correlation: 0.78 },
      { variable1: "quantity", variable2: "revenue", correlation: 0.92 },
      { variable1: "price", variable2: "quantity", correlation: -0.15 },
    ],
    hypotheses: [
      {
        name: "Влияние цены на объем продаж",
        description: "Проверка гипотезы о влиянии цены на объем продаж",
        result: "Подтверждена",
        pValue: 0.002,
        confidence: 0.95,
      },
      {
        name: "Сезонность продаж",
        description: "Проверка наличия сезонности в продажах",
        result: "Подтверждена",
        pValue: 0.001,
        confidence: 0.99,
      },
      {
        name: "Различия между регионами",
        description: "Проверка значимых различий в продажах между регионами",
        result: "Частично подтверждена",
        pValue: 0.048,
        confidence: 0.9,
      },
    ],
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
    ],
    correlations: [
      { variable1: "age", variable2: "satisfaction", correlation: 0.12 },
      { variable1: "income", variable2: "satisfaction", correlation: 0.35 },
      { variable1: "satisfaction", variable2: "recommendation", correlation: 0.87 },
    ],
    hypotheses: [
      {
        name: "Влияние возраста на удовлетворенность",
        description: "Проверка гипотезы о влиянии возраста на удовлетворенность",
        result: "Не подтверждена",
        pValue: 0.23,
        confidence: 0.95,
      },
      {
        name: "Влияние дохода на удовлетворенность",
        description: "Проверка гипотезы о влиянии дохода на удовлетворенность",
        result: "Подтверждена",
        pValue: 0.01,
        confidence: 0.95,
      },
    ],
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
    ],
    correlations: [
      { variable1: "views", variable2: "clicks", correlation: 0.82 },
      { variable1: "clicks", variable2: "conversions", correlation: 0.75 },
      { variable1: "bounce_rate", variable2: "conversions", correlation: -0.68 },
    ],
    hypotheses: [
      {
        name: "Влияние просмотров на конверсии",
        description: "Проверка гипотезы о влиянии количества просмотров на конверсии",
        result: "Подтверждена",
        pValue: 0.003,
        confidence: 0.99,
      },
    ],
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
        <TabsList className="grid grid-cols-4 md:w-[400px]">
          <TabsTrigger value="metrics">{t("metrics")}</TabsTrigger>
          <TabsTrigger value="summary">Сводка</TabsTrigger>
          <TabsTrigger value="correlation">{t("correlation")}</TabsTrigger>
          <TabsTrigger value="hypothesis">{t("hypothesis")}</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Количество строк</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.rowCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Количество столбцов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.columnCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Пропущенные значения</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.missingValues}</div>
                <p className="text-xs text-gray-500">
                  {(
                    (result.metrics.missingValues / (result.metrics.rowCount * result.metrics.columnCount)) *
                    100
                  ).toFixed(2)}
                  % от всех значений
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Дубликаты строк</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.duplicateRows}</div>
                <p className="text-xs text-gray-500">
                  {((result.metrics.duplicateRows / result.metrics.rowCount) * 100).toFixed(2)}% от всех строк
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Выбросы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.metrics.outliers}</div>
                <p className="text-xs text-gray-500">Обнаружено в числовых столбцах</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Распределение данных</CardTitle>
              <CardDescription>Визуализация распределения ключевых числовых переменных</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <DistributionChart />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Временной ряд</CardTitle>
              <CardDescription>Динамика ключевых показателей во времени</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <TimeSeriesChart />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сводка по столбцам</CardTitle>
              <CardDescription>Основная информация о столбцах в наборе данных</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Столбец</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Пропущенные</TableHead>
                    <TableHead>Уникальные</TableHead>
                    <TableHead>Мин</TableHead>
                    <TableHead>Макс</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.summary.map((column) => (
                    <TableRow key={column.column}>
                      <TableCell className="font-medium">{column.column}</TableCell>
                      <TableCell>{column.type}</TableCell>
                      <TableCell>{column.missing}</TableCell>
                      <TableCell>{column.unique}</TableCell>
                      <TableCell>{column.min !== null ? column.min : "-"}</TableCell>
                      <TableCell>{column.max !== null ? column.max : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Корреляционная матрица</CardTitle>
              <CardDescription>Визуализация корреляций между числовыми переменными</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <CorrelationChart />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Значимые корреляции</CardTitle>
              <CardDescription>Наиболее значимые корреляции между переменными</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Переменная 1</TableHead>
                    <TableHead>Переменная 2</TableHead>
                    <TableHead>Корреляция</TableHead>
                    <TableHead>Сила связи</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.correlations.map((corr, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{corr.variable1}</TableCell>
                      <TableCell>{corr.variable2}</TableCell>
                      <TableCell>{corr.correlation.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            Math.abs(corr.correlation) > 0.7
                              ? "bg-green-100 text-green-800"
                              : Math.abs(corr.correlation) > 0.3
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {Math.abs(corr.correlation) > 0.7
                            ? "Сильная"
                            : Math.abs(corr.correlation) > 0.3
                              ? "Средняя"
                              : "Слабая"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hypothesis" className="space-y-6">
          {result.hypotheses.map((hypothesis, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{hypothesis.name}</CardTitle>
                <CardDescription>{hypothesis.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Результат</div>
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            hypothesis.result === "Подтверждена"
                              ? "bg-green-100 text-green-800"
                              : hypothesis.result === "Частично подтверждена"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {hypothesis.result}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">P-значение</div>
                      <div className="font-medium">{hypothesis.pValue}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Доверительный интервал</div>
                      <div className="font-medium">{hypothesis.confidence * 100}%</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium text-gray-500 mb-2">Интерпретация</div>
                    <p className="text-sm text-gray-700">
                      {hypothesis.result === "Подтверждена"
                        ? `Гипотеза "${hypothesis.name}" подтверждена с высокой статистической значимостью (p-значение = ${hypothesis.pValue}). Это означает, что наблюдаемые различия или связи не являются случайными.`
                        : hypothesis.result === "Частично подтверждена"
                          ? `Гипотеза "${hypothesis.name}" частично подтверждена (p-значение = ${hypothesis.pValue}). Результаты показывают некоторые значимые связи, но требуют дополнительного исследования.`
                          : `Гипотеза "${hypothesis.name}" не подтверждена (p-значение = ${hypothesis.pValue}). Статистически значимых различий или связей не обнаружено.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
