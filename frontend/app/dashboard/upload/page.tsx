"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/components/language-provider"
import { Upload, X, FileText, FileSpreadsheet, FileJson, AlertCircle, CheckCircle2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DistributionChart } from "@/components/charts/distribution-chart"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RegressionChart, calculateY } from "@/components/charts/regression-chart"

// Helper function to format numbers, handling potential non-numeric modes
function formatNumber(value: number | string | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return "N/A";
  const num = Number(value);
  if (isNaN(num)) return String(value); // Return original string if mode is non-numeric
  return num.toFixed(decimals);
}

// Define types for regression analysis data
interface RegressionCoefficient {
  variable_name: string;
  coefficient: number;
  std_error: number;
  t_statistic: number;
  p_value: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
}

interface RegressionModel {
  regression_type: string;
  r_squared: number;
  adjusted_r_squared: number;
  f_statistic: number;
  prob_f_statistic: number;
  sse: number;
  coefficients: RegressionCoefficient[];
}

interface DataPoint {
  x: number;
  y: number;
}

interface RegressionAnalysisResult {
  dependent_variable: string;
  independent_variables: string[];
  data_points: DataPoint[];
  models: RegressionModel[];
}

interface AnalysisResultType { // More specific type for analysisResult state
  descriptive_stats?: any; // Replace any with more specific types if available
  normality_tests?: any;   // Replace any with more specific types if available
  regression_analysis?: RegressionAnalysisResult;
  // Add other potential top-level keys from your API response here
}

export default function UploadPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null)
  const [selectedAnalysesOptions, setSelectedAnalysesOptions] = useState({
    descriptive_stats: true,
    normality_test: true,
    regression: false,
  });
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [dependentVariable, setDependentVariable] = useState<string>("");
  const [independentVariable, setIndependentVariable] = useState<string>("");
  const [selectedRegressionType, setSelectedRegressionType] = useState<string>("");
  const [globalYDomain, setGlobalYDomain] = useState<[number, number] | undefined>(undefined);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Проверка размера файла (200 МБ = 200 * 1024 * 1024 байт)
      const maxSize = 200 * 1024 * 1024
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > maxSize) {
          toast({
            title: "Файл слишком большой",
            description: `Файл "${file.name}" превышает максимальный размер в 200 МБ`,
          })
          return false
        }

        // Проверка типа файла
        const extension = file.name.split(".").pop()?.toLowerCase()
        if (!["csv", "xlsx", "json"].includes(extension || "")) {
          toast({
            title: "Неподдерживаемый формат",
            description: `Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются только CSV, XLSX и JSON`,
          })
          return false
        }

        return true
      })

      setFiles((prev) => [...prev, ...validFiles])
      
      // Clear previous columns and variable selections when new file is dropped
      setFileColumns([])
      setDependentVariable("")
      setIndependentVariable("")
    },
    [toast],
  )

  // Function to clear all states
  const clearAll = () => {
    setFiles([])
    setFileColumns([])
    setDependentVariable("")
    setIndependentVariable("")
    setUploadStatus("idle")
    setUploadProgress(0)
    setAnalysisResult(null)
    setSelectedRegressionType("")
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/json": [".json"],
    },
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    // Clear analysis results and related state when file is removed
    setAnalysisResult(null)
    setFileColumns([])
    setDependentVariable("")
    setIndependentVariable("")
    setUploadStatus("idle")
    setUploadProgress(0)
    setSelectedRegressionType("")
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "csv":
        return <FileText className="h-6 w-6 text-blue-500" />
      case "xlsx":
        return <FileSpreadsheet className="h-6 w-6 text-green-500" />
      case "json":
        return <FileJson className="h-6 w-6 text-orange-500" />
      default:
        return <FileText className="h-6 w-6 text-gray-500" />
    }
  }

  // Function to fetch column names from the uploaded file
  const fetchColumnNames = async () => {
    if (files.length === 0) return;
    
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      
      const response = await fetch('http://localhost:8080/api/columns', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching columns: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.columns && Array.isArray(result.columns)) {
        setFileColumns(result.columns);
      }
    } catch (error) {
      console.error("Failed to fetch columns:", error);
      toast({
        title: "Ошибка получения столбцов",
        description: "Не удалось получить список столбцов файла.",
      });
    }
  };
  
  // Call fetchColumnNames when a file is selected
  useEffect(() => {
    if (files.length > 0) {
      fetchColumnNames();
    }
  }, [files]);

  const handleUpload = async () => {
    if (files.length === 0) return

    // Validate regression selections if regression is selected
    if (selectedAnalysesOptions.regression) {
      if (!dependentVariable || !independentVariable) {
        toast({
          title: "Отсутствуют переменные для регрессии",
          description: "Пожалуйста, выберите зависимую и независимую переменные для регрессионного анализа.",
        });
        return;
      }
      
      if (dependentVariable === independentVariable) {
        toast({
          title: "Некорректный выбор переменных",
          description: "Зависимая и независимая переменные должны отличаться.",
        });
        return;
      }
    }

    setUploading(true)
    setUploadStatus("idle")
    setAnalysisResult(null)
    setUploadStatus("uploading")
    setUploadProgress(0)

    // Имитация загрузки с прогрессом - оставляем для визуализации
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        // Остановим имитацию прогресса, если достигли 95% до ответа сервера
        if (prev >= 95) {
          // clearInterval(interval); // Не останавливаем интервал здесь
          return prev; // Держим 95% пока нет ответа
        }
        return prev + 5;
      })
    }, 200);

    const fileToUpload = files[0]; // <<-- Пока отправляем только первый файл

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload); // \'file\' - имя поля, которое ожидает Go

      // Add selected analyses to FormData
      const analysesToPerform = Object.entries(selectedAnalysesOptions)
        .filter(([_,isSelected]) => isSelected)
        .map(([key,_]) => key);

      if (analysesToPerform.length === 0) {
        toast({
          title: t("noAnalysesSelectedTitle"),
          description: t("noAnalysesSelectedDesc"),
        });
        setUploading(false);
        clearInterval(interval);
        setUploadStatus("idle");
        return;
      }
      
      analysesToPerform.forEach(analysis => {
        formData.append('selected_analyses', analysis);
      });
      
      // Add regression variables if regression analysis is selected
      if (selectedAnalysesOptions.regression) {
        formData.append('dependent_variable', dependentVariable);
        formData.append('independent_variable', independentVariable);
      }

      const response = await fetch('http://localhost:8080/api/analyze', { // <<-- URL Go API
        method: 'POST',
        body: formData,
      });

      clearInterval(interval); // Останавливаем имитацию прогресса
      setUploadProgress(100); // Устанавливаем прогресс на 100

      if (!response.ok) {
        let errorMsg = `API Error: ${response.status}`;
        try {
           const errorData = await response.json();
           errorMsg += ` - ${errorData.error || JSON.stringify(errorData)}`;
        } catch (jsonError) {
            errorMsg += ` - ${await response.text()}`;
        }
        console.error(errorMsg);
        throw new Error(errorMsg); // Передаем ошибку в catch блок
      }

      const result = await response.json();
      console.log('Analysis Result:', result);
      setAnalysisResult(result);
      setUploadStatus("success");

      toast({
        title: t("uploadSuccess"),
        description: "Анализ успешно завершен.", // Можно обновить сообщение
      });

    } catch (error) {
      clearInterval(interval);
      setUploadStatus("error");
      setUploadProgress(0); // Сбрасываем прогресс при ошибке
      setAnalysisResult(null);
      console.error("Upload failed:", error);

      toast({
        title: t("uploadError"),
        description: error instanceof Error ? error.message : "Произошла ошибка при отправке или анализе файла.",
      });
      // Разблокируем кнопку после ошибки через некоторое время
      setTimeout(() => { setUploading(false); }, 500);
    } finally {
       // Разблокируем кнопку и здесь, если не было ошибки
       if (uploadStatus !== 'error') {
           setTimeout(() => { setUploading(false); }, 500); // Разблокируем после небольшого таймаута
       }
    }
  }

  // Effect to calculate global Y domain for regression charts
  useEffect(() => {
    if (analysisResult?.regression_analysis?.models && analysisResult.regression_analysis.data_points?.length > 0) {
      const { models, data_points } = analysisResult.regression_analysis;
      let allYValues: number[] = data_points.map((dp: DataPoint) => dp.y);
      
      const xData = data_points.map((dp: DataPoint) => dp.x);
      const xMin = Math.min(...xData);
      const xMax = Math.max(...xData);
      const xRange = xMax - xMin;
      // Generate a set of X points for calculating regression lines' Y values
      // More points can make the min/max Y more accurate but increase computation
      const numXPointsForGlobalScale = 100; 
      const xPointsForScale = Array.from({ length: numXPointsForGlobalScale }, (_, i) => xMin + (i / (numXPointsForGlobalScale -1)) * xRange);
      if (xRange === 0 && xPointsForScale.length === 0) { // Handle case with single X point
        xPointsForScale.push(xMin);
      }


      models.forEach((model: RegressionModel) => {
        const modelYs = xPointsForScale.map(xVal => {
          const y = calculateY(xVal, model.regression_type, model.coefficients);
          return isNaN(y) || !isFinite(y) ? null : y;
        }).filter((y): y is number => y !== null);
        allYValues = [...allYValues, ...modelYs];
      });

      if (allYValues.length > 0) {
        const yMin = Math.min(...allYValues);
        const yMax = Math.max(...allYValues);
        const yPadding = (yMax - yMin) * 0.1 || 0.1; // Add padding, handle yMax === yMin

        setGlobalYDomain([yMin - yPadding, yMax + yPadding]);
        console.log("Calculated globalYDomain:", [yMin - yPadding, yMax + yPadding]);
      } else {
        setGlobalYDomain(undefined); // Reset if no valid Y values
      }
    } else {
      setGlobalYDomain(undefined); // Reset if no analysis result or models
    }
  }, [analysisResult]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("uploadData")}</h1>
        <p className="text-gray-500">Загрузите файлы для анализа данных</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary hover:bg-primary/5"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-4">
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? "Отпустите файлы для загрузки" : t("dragAndDrop")}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t("supportedFormats")}</p>
                <p className="text-sm text-gray-500 mt-1">{t("maxFileSize")}</p>
              </div>
              <Button type="button" disabled={uploading}>
                Выбрать файлы
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Выбранные файлы</h3>
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={uploading}>
                  Очистить все
                </Button>
              </div>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.name)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={uploading}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Удалить файл</span>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Analysis Selection Checkboxes */}
              <div className="mt-6 space-y-4">
                <h3 className="font-medium">Выберите анализы для выполнения:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="descriptive_stats"
                      checked={selectedAnalysesOptions.descriptive_stats}
                      onCheckedChange={(checked) =>
                        setSelectedAnalysesOptions((prev) => ({ ...prev, descriptive_stats: !!checked }))
                      }
                      disabled={uploading}
                    />
                    <Label htmlFor="descriptive_stats" className="cursor-pointer">
                      Описательная статистика
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="normality_test"
                      checked={selectedAnalysesOptions.normality_test}
                      onCheckedChange={(checked) =>
                        setSelectedAnalysesOptions((prev) => ({ ...prev, normality_test: !!checked }))
                      }
                      disabled={uploading}
                    />
                    <Label htmlFor="normality_test" className="cursor-pointer">
                      Проверка нормальности
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="regression"
                      checked={selectedAnalysesOptions.regression}
                      onCheckedChange={(checked) =>
                        setSelectedAnalysesOptions((prev) => ({ ...prev, regression: !!checked }))
                      }
                      disabled={uploading}
                    />
                    <Label htmlFor="regression" className="cursor-pointer">
                      Регрессия
                    </Label>
                  </div>
                </div>
              </div>
              {/* End Analysis Selection Checkboxes */}
              
              {/* Regression Variable Selection */}
              {selectedAnalysesOptions.regression && fileColumns.length > 0 && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                  <h3 className="font-medium mb-3">Переменные для регрессии:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dependent-variable">Зависимая переменная (Y):</Label>
                      <select
                        id="dependent-variable"
                        value={dependentVariable}
                        onChange={(e) => setDependentVariable(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">Выберите переменную</option>
                        {fileColumns.map((column) => (
                          <option key={`dep-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="independent-variable">Независимая переменная (X):</Label>
                      <select
                        id="independent-variable"
                        value={independentVariable}
                        onChange={(e) => setIndependentVariable(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">Выберите переменную</option>
                        {fileColumns.map((column) => (
                          <option key={`indep-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {/* End Regression Variable Selection */}

              {uploadStatus !== "idle" && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {uploadStatus === "uploading"
                        ? "Загрузка..."
                        : uploadStatus === "success"
                          ? "Загрузка завершена"
                          : "Ошибка загрузки"}
                    </span>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  {uploadStatus === "success" && (
                    <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Файлы успешно загружены и отправлены на анализ</span>
                    </div>
                  )}
                  {uploadStatus === "error" && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t("uploadFailedMessage")}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full md:w-auto">
                  {uploading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Загрузка...
                    </div>
                  ) : (
                    "Загрузить и анализировать"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      { /* --- Display Analysis Results --- */ }
      {analysisResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Результаты Анализа</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="descriptive-stats" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                {analysisResult?.descriptive_stats && (
                    <TabsTrigger value="descriptive-stats">{t("results.tabs.descriptiveStats")}</TabsTrigger>
                )}
                {analysisResult?.normality_tests && (
                    <TabsTrigger value="normality-test">{t("results.tabs.normalityTest")}</TabsTrigger>
                )}
                {analysisResult?.regression_analysis && (
                    <TabsTrigger value="regression">{t("results.tabs.regression")}</TabsTrigger>
                )}
              </TabsList>

              {analysisResult?.descriptive_stats && (
                <TabsContent value="descriptive-stats">
                <Card>
                  <CardHeader>
                      <CardTitle>{t("results.tabs.descriptiveStats")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Переменная</TableHead>
                          <TableHead>Кол-во</TableHead>
                          <TableHead>Среднее</TableHead>
                          <TableHead>Медиана</TableHead>
                          <TableHead>Мода</TableHead>
                          <TableHead>Стд.Откл.</TableHead>
                          <TableHead>Мин.</TableHead>
                          <TableHead>Макс.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.descriptive_stats.descriptives?.map((stat: any, index: number) => (
                          <TableRow key={`desc-${index}-${stat.variable_name}`}>
                            <TableCell>{stat.variable_name}</TableCell>
                            <TableCell>{stat.count}</TableCell>
                            <TableCell>{formatNumber(stat.mean)}</TableCell>
                            <TableCell>{formatNumber(stat.median)}</TableCell>
                            <TableCell>
                              {Array.isArray(stat.mode) 
                                ? (stat.mode.length > 5 || stat.mode.length === Number(stat.count)) 
                                  ? (stat.mode.length === Number(stat.count) ? "Уникальные" : `Множество (${stat.mode.length})`) 
                                  : stat.mode.map((m: number | string) => formatNumber(m, 2)).join(", ")
                                : formatNumber(stat.mode, 2)}
                            </TableCell>
                            <TableCell>{formatNumber(stat.std_dev)}</TableCell>
                            <TableCell>{formatNumber(stat.min_value)}</TableCell>
                            <TableCell>{formatNumber(stat.max_value)}</TableCell>
                          </TableRow>
                        )) ?? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center">Нет данных</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Add Histograms Here */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Гистограммы Распределения</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {analysisResult.descriptive_stats.histograms?.map((hist: any, index: number) => {
                           return (
                             <div key={`hist-${index}-${hist.column_name}`} className="border rounded-lg p-4">
                               <h4 className="text-md font-semibold mb-2 text-center">{hist.column_name}</h4>
                               {/* Ensure data structure is correct before passing */}
                               {hist.bins && hist.frequencies && hist.bins.length > 0 && hist.frequencies.length > 0 ? (
                                 <DistributionChart 
                                   data={{ bins: hist.bins, frequencies: hist.frequencies }} 
                                   variableName={hist.column_name}
                                 />
                               ) : (
                                 <p className="text-sm text-center text-gray-500">Нет данных для гистограммы '{hist.column_name}'</p>
                               )}
                             </div>
                           );
                        }) ?? (
                           <p className="text-sm text-center text-gray-500 md:col-span-2">Нет данных для гистограмм.</p>
                        )}
                      </div>
                    </div>

                    {/* Add Confidence Intervals Here */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Доверительные Интервалы</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {analysisResult.descriptive_stats.confidence_intervals?.map((ci: any, index: number) => (
                          <div key={`ci-${index}-${ci.column_name}`} className="border rounded-lg p-4">
                             <h4 className="text-md font-semibold mb-2 text-center">{ci.column_name}</h4>
                             <div className="space-y-2">
                               <p><strong>Уровень доверия:</strong> {(ci.confidence_level * 100).toFixed(0)}%</p>
                               <p><strong>Интервал:</strong> [{formatNumber(ci.lower_bound)}, {formatNumber(ci.upper_bound)}]</p>
                               <p><strong>Среднее:</strong> {formatNumber(ci.mean)}</p>
                               <p><strong>Стандартная ошибка:</strong> {formatNumber(ci.standard_error)}</p>
                             </div>
                          </div>
                        )) ?? (
                           <p className="text-sm text-center text-gray-500 md:col-span-2">Нет данных для доверительных интервалов.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              )}

              {analysisResult?.normality_tests && (
                <TabsContent value="normality-test">
                <Card>
                  <CardHeader>
                    <CardTitle>Тесты на Нормальность</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Shapiro-Wilk Test Results */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Тест Шапиро-Уилка</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Переменная</TableHead>
                          <TableHead>Статистика</TableHead>
                          <TableHead>P-значение</TableHead>
                          <TableHead>Вывод (alpha=0.05)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {analysisResult.normality_tests.shapiro_wilk_results?.map((test: any, index: number) => (
                            <TableRow key={`sw-${index}-${test.column_name}`}>
                              <TableCell>{test.column_name}</TableCell>
                            <TableCell>{formatNumber(test.statistic)}</TableCell>
                            <TableCell>{formatNumber(test.p_value)}</TableCell>
                              <TableCell>
                                {test.is_normal 
                                  ? "Распределение нормальное (p > 0.05)" 
                                  : "Распределение не нормальное (p ≤ 0.05)"}
                              </TableCell>
                          </TableRow>
                        )) ?? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">Нет данных</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    </div>

                    {/* Chi-Square Test Results */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Тест Хи-квадрат (Пирсона)</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Переменная</TableHead>
                          <TableHead>Статистика</TableHead>
                          <TableHead>P-значение</TableHead>
                          <TableHead>Степени свободы</TableHead>
                            <TableHead>Интервалы</TableHead>
                          <TableHead>Вывод (alpha=0.05)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {analysisResult.normality_tests.chi_square_results?.map((test: any, index: number) => (
                            <TableRow key={`chi2-${index}-${test.column_name}`}>
                              <TableCell>{test.column_name}</TableCell>
                              <TableCell>{formatNumber(test.statistic)}</TableCell>
                              <TableCell>{formatNumber(test.p_value)}</TableCell>
                              <TableCell>{test.degrees_of_freedom}</TableCell>
                              <TableCell>{test.intervals}</TableCell>
                              <TableCell>
                                {test.is_normal 
                                  ? "Распределение нормальное (p > 0.05)" 
                                  : "Распределение не нормальное (p ≤ 0.05)"}
                              </TableCell>
                            </TableRow>
                        )) ?? (
                          <TableRow>
                              <TableCell colSpan={6} className="text-center">Нет данных</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              )}

              {analysisResult?.regression_analysis && (
              <TabsContent value="regression">
                <Card className="w-full overflow-hidden">
                  <CardHeader>
                    <CardTitle>Регрессионный Анализ</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 md:p-1">
                    {(() => { // IIFE to ensure regressionAnalysis is defined in this scope
                      const regressionAnalysis = analysisResult.regression_analysis;
                      if (!regressionAnalysis) return null; // Should not happen due to outer check, but good for TS

                      return (
                        <div className="space-y-6">
                          {/* Debug info for regression models */}
                          {process.env.NODE_ENV !== "production" && (
                            <div className="bg-gray-100 p-2 rounded-md mb-4 text-sm">
                              <p className="font-bold">Debug - Regression Models:</p>
                              <pre className="overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(regressionAnalysis.models.map((m: RegressionModel) => ({
                                  type: m.regression_type,
                                  r2: m.r_squared,
                                  coefs: m.coefficients.map((c: RegressionCoefficient) => `${c.variable_name}: ${c.coefficient}`)
                                })), null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {/* Regression Chart */}
                          {regressionAnalysis.data_points && regressionAnalysis.data_points.length > 0 && (
                            <div className="mb-6 w-full">
                              <h3 className="text-lg font-semibold mb-4">Графики регрессии</h3>
                              
                              {/* Regression Type Selector */}
                              <div className="mb-4">
                                <div className="flex flex-wrap gap-2">
                                  {(() => {
                                    const sortedModels = [...regressionAnalysis.models].sort((a, b) => {
                                      return b.r_squared - a.r_squared;
                                    });
                                    
                                    if (!selectedRegressionType && sortedModels.length > 0) {
                                      const defaultType = sortedModels[0]?.regression_type;
                                      setTimeout(() => {
                                        setSelectedRegressionType(defaultType);
                                      }, 0);
                                      
                                      return (
                                        <>
                                          {sortedModels.map(model => (
                                            <Button
                                              key={`btn-${model.regression_type}`}
                                              variant={model.regression_type === defaultType ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => setSelectedRegressionType(model.regression_type)}
                                            >
                                              {model.regression_type} (R² = {formatNumber(model.r_squared)})
                                            </Button>
                                          ))}
                                          
                                          {sortedModels
                                            .filter(model => model.regression_type === defaultType)
                                            .map((model, idx) => (
                                              <div key={`regression-chart-${idx}`} className="w-full border rounded-lg p-2 bg-white shadow-sm">
                                                <h4 className="text-lg font-medium mb-2 text-center">
                                                  {model.regression_type} (R² = {formatNumber(model.r_squared)})
                                                </h4>
                                                <div className="bg-blue-50 p-3 mb-2 rounded-md">
                                                  <p className="font-medium text-blue-800">Коэффициенты:</p>
                                                  <div className="mt-1">
                                                    {model.coefficients.map((c: RegressionCoefficient, i: number) => (
                                                      <span key={`coef-${i}`} className="mr-4">
                                                        {c.variable_name === "const" ? "Свободный член" : c.variable_name} = {formatNumber(c.coefficient)}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                                <div className="w-full" style={{ minHeight: '650px', maxWidth: '100%' }}>
                                                  <RegressionChart 
                                                    data={regressionAnalysis.data_points}
                                                    models={[{ type: model.regression_type, coefficients: model.coefficients, r_squared: model.r_squared }]}
                                                    dependentVar={regressionAnalysis.dependent_variable}
                                                    independentVar={regressionAnalysis.independent_variables[0]}
                                                    height={700}
                                                    globalYDomain={globalYDomain}
                                                  />
                                                </div>
                                              </div>
                                            ))}
                                        </>
                                      );
                                    }
                                    
                                    return (
                                      <>
                                        {sortedModels.map(model => (
                                          <Button
                                            key={`btn-${model.regression_type}`}
                                            variant={model.regression_type === selectedRegressionType ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedRegressionType(model.regression_type)}
                                          >
                                            {model.regression_type} (R² = {formatNumber(model.r_squared)})
                                          </Button>
                                        ))}
                                        
                                        {sortedModels
                                          .filter(model => model.regression_type === selectedRegressionType)
                                          .map((model, idx) => (
                                            <div key={`regression-chart-${idx}`} className="w-full border rounded-lg p-2 bg-white shadow-sm">
                                              <h4 className="text-lg font-medium mb-2 text-center">
                                                {model.regression_type} (R² = {formatNumber(model.r_squared)})
                                              </h4>
                                              <div className="bg-blue-50 p-3 mb-2 rounded-md">
                                                <p className="font-medium text-blue-800">Коэффициенты:</p>
                                                <div className="mt-1">
                                                  {model.coefficients.map((c: RegressionCoefficient, i: number) => (
                                                    <span key={`coef-${i}`} className="mr-4">
                                                      {c.variable_name === "const" ? "Свободный член" : c.variable_name} = {formatNumber(c.coefficient)}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                              <div className="w-full" style={{ minHeight: '650px', maxWidth: '100%' }}>
                                                <RegressionChart 
                                                  data={regressionAnalysis.data_points}
                                                  models={[{ type: model.regression_type, coefficients: model.coefficients, r_squared: model.r_squared }]}
                                                  dependentVar={regressionAnalysis.dependent_variable}
                                                  independentVar={regressionAnalysis.independent_variables[0]}
                                                  height={700}
                                                  globalYDomain={globalYDomain}
                                                />
                                              </div>
                                            </div>
                                          ))}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p><strong>Зависимая переменная:</strong> {regressionAnalysis.dependent_variable}</p>
                              <p><strong>Независимые переменные:</strong> {regressionAnalysis.independent_variables.join(", ")}</p>
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-4">Сравнение моделей регрессии</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Тип модели</TableHead>
                                  <TableHead>R²</TableHead>
                                  <TableHead>Скорр. R²</TableHead>
                                  <TableHead>SSE</TableHead>
                                  {regressionAnalysis.models.some((m: RegressionModel) => m.regression_type === "Linear") && (
                                    <>
                                      <TableHead>F-статистика</TableHead>
                                      <TableHead>P-значение</TableHead>
                                    </>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {regressionAnalysis.models
                                  .sort((a: RegressionModel, b: RegressionModel) => {
                                    return b.r_squared - a.r_squared;
                                  })
                                  .map((model: RegressionModel, idx: number) => (
                                    <TableRow key={`model-${idx}`}>
                                      <TableCell>{model.regression_type}</TableCell>
                                      <TableCell>{formatNumber(model.r_squared)}</TableCell>
                                      <TableCell>{formatNumber(model.adjusted_r_squared)}</TableCell>
                                      <TableCell>{formatNumber(model.sse)}</TableCell>
                                      {regressionAnalysis.models.some((m: RegressionModel) => m.regression_type === "Linear") && (
                                        <>
                                          <TableCell>
                                            {model.regression_type === "Linear" 
                                              ? formatNumber(model.f_statistic)
                                              : "-"}
                                          </TableCell>
                                          <TableCell>
                                            {model.regression_type === "Linear" 
                                              ? formatNumber(model.prob_f_statistic)
                                              : "-"}
                                          </TableCell>
                                        </>
                                      )}
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                          
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold">Коэффициенты лучшей модели</h3>
                            {regressionAnalysis.models.length > 0 && (
                              <>
                                <p className="mb-2">
                                  <strong>Тип модели: </strong>
                                  {regressionAnalysis.models.sort((a: RegressionModel, b: RegressionModel) => b.r_squared - a.r_squared)[0].regression_type}
                                </p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Переменная</TableHead>
                                      <TableHead>Коэффициент</TableHead>
                                      <TableHead>Стд. ошибка</TableHead>
                                      {regressionAnalysis.models[0].regression_type === "Linear" && (
                                        <>
                                          <TableHead>T-статистика</TableHead>
                                          <TableHead>P-значение</TableHead>
                                        </>
                                      )}
                                      <TableHead>95% ДИ (нижн.)</TableHead>
                                      <TableHead>95% ДИ (верхн.)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {regressionAnalysis.models
                                      .sort((a: RegressionModel, b: RegressionModel) => b.r_squared - a.r_squared)[0]
                                      .coefficients?.map((coeff: RegressionCoefficient, index: number) => (
                                        <TableRow key={`coef-${index}-${coeff.variable_name}`}>
                                          <TableCell>{coeff.variable_name}</TableCell>
                                          <TableCell>{formatNumber(coeff.coefficient)}</TableCell>
                                          <TableCell>{formatNumber(coeff.std_error)}</TableCell>
                                          {regressionAnalysis.models[0].regression_type === "Linear" && (
                                            <>
                                              <TableCell>{formatNumber(coeff.t_statistic)}</TableCell>
                                              <TableCell>{formatNumber(coeff.p_value)}</TableCell>
                                            </>
                                          )}
                                          <TableCell>{formatNumber(coeff.confidence_interval_lower)}</TableCell>
                                          <TableCell>{formatNumber(coeff.confidence_interval_upper)}</TableCell>
                                        </TableRow>
                                      )) ?? (
                                        <TableRow>
                                          <TableCell colSpan={7} className="text-center">Нет данных</TableCell>
                                        </TableRow>
                                      )}
                                  </TableBody>
                                </Table>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()} 
                  </CardContent>
                </Card>
              </TabsContent>
              )}

            </Tabs>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
