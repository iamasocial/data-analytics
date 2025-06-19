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
import { ResidualsAnalysis } from "@/components/charts/residuals-analysis"

// Helper function to format numbers, handling potential non-numeric modes
function formatNumber(value: number | string | null | undefined, decimals = 3, useExponential = false): string {
  if (value === null || value === undefined) return "N/A";
  const num = Number(value);
  if (isNaN(num)) return String(value); // Return original string if mode is non-numeric

  if (useExponential && Math.abs(num) > 0 && Math.abs(num) < 0.001) {
    return num.toExponential(2);
  }

  return num.toFixed(decimals);
}

// Define types for regression analysis data
interface RegressionCoefficient {
  variable_name: string;
  coefficient: number;
  std_error?: number;
  t_statistic?: number;
  p_value?: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
}

interface ResidualsAnalysisData {
  shapiro_test?: {
    statistic: number;
    p_value: number;
    is_normal: boolean;
  };
  histogram?: {
    bins: number[];
    frequencies: number[];
  };
  qq_plot?: {
    theoretical_quantiles: number[];
    sample_quantiles: number[];
  };
}

interface RegressionModel {
  regression_type: string;
  r_squared: number;
  adjusted_r_squared?: number;
  f_statistic?: number;
  prob_f_statistic?: number;
  sse?: number;
  coefficients: RegressionCoefficient[];
  residuals?: number[];
  residuals_analysis?: ResidualsAnalysisData;
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
  wilcoxon_tests?: {
    // Поддержка snake_case формата
    signed_rank_results?: Array<{
      test_type: string;
      variable1: string;
      variable2: string;
      statistic: number;
      p_value: number;
      conclusion: string;
      sample_size: number;
    }>;
    mann_whitney_results?: Array<{
      test_type: string;
      group_column: string;
      value_column: string;
      group1: string;
      group2: string;
      group1_size: number;
      group2_size: number;
      group1_median: number;
      group2_median: number;
      statistic: number;
      p_value: number;
      conclusion: string;
    }>;
    // Поддержка camelCase формата
    signedRankResults?: Array<{
      testType: string;
      variable1: string;
      variable2: string;
      statistic: number;
      pValue: number;
      conclusion: string;
      sampleSize: number;
    }>;
    mannWhitneyResults?: Array<{
      testType: string;
      groupColumn: string;
      valueColumn: string;
      group1: string;
      group2: string;
      group1Size: number;
      group2Size: number;
      group1Median: number;
      group2Median: number;
      statistic: number;
      pValue: number;
      conclusion: string;
    }>;
  };
  // Add other potential top-level keys from your API response here
}

const regressionTypeTranslations: { [key: string]: string } = {
  Linear: "Линейная",
  Quadratic: "Квадратичная",
  Power: "Степенная",
  Exponential: "Экспоненциальная",
  Logarithmic: "Логарифмическая",
  Trigonometric: "Тригонометрическая",
  Sigmoid: "Сигмоидная",
  Polynomial: "Полиномиальная"
};

// Вспомогательная функция для форматирования уравнения регрессии
function formatRegressionEquation(
  model: RegressionModel,
  dependentVar: string = "y",
  independentVar: string = "x"
): string {
  const { regression_type, coefficients } = model;
  
  // Helper to safely get coefficient value, formatting it to a fixed number of decimals
  const getCoeffValue = (name: string, decimals: number = 3): number => {
    const coeff = coefficients.find(c => c.variable_name === name);
    return coeff ? parseFloat(coeff.coefficient.toFixed(decimals)) : 0;
  };

  let equation = `${dependentVar} = `;

  switch (regression_type) {
    case "Linear":
      // y = slope*x + intercept
      const slopeLin = getCoeffValue(independentVar, 3); // Предполагаем, что имя коэффициента при x - это само имя независимой переменной
      const interceptLin = getCoeffValue("const", 3);
      equation += `${slopeLin} * ${independentVar} ${interceptLin >= 0 ? "+" : "-"} ${Math.abs(interceptLin)}`;
      break;
    case "Quadratic":
      // y = ax^2 + bx + c
      const aQuad = getCoeffValue("a", 3); // или x^2
      const bQuad = getCoeffValue("b", 3); // или x
      const cQuad = getCoeffValue("c", 3); // или const
      equation += `${aQuad} * ${independentVar}² ${bQuad >= 0 ? "+" : "-"} ${Math.abs(bQuad)} * ${independentVar} ${cQuad >= 0 ? "+" : "-"} ${Math.abs(cQuad)}`;
      break;
    case "Power":
      // y = a * x^b
      const aPow = getCoeffValue("a", 3);
      const bPow = getCoeffValue("b", 3);
      equation += `${aPow} * ${independentVar}^${bPow}`;
      break;
    case "Exponential":
      // y = a * e^(b*x)
      const aExp = getCoeffValue("a", 3);
      const bExp = getCoeffValue("b", 3);
      equation += `${aExp} * exp(${bExp} * ${independentVar})`;
      break;
    case "Logarithmic":
      // y = a + b * ln(x)
      const aLog = getCoeffValue("a", 3);
      const bLog = getCoeffValue("b", 3);
      equation += `${aLog} ${bLog >= 0 ? "+" : "-"} ${Math.abs(bLog)} * ln(${independentVar})`;
      break;
    case "Trigonometric":
        // y = a*sin(b*x + c) + d
        const aTrig = getCoeffValue("a",3);
        const bTrig = getCoeffValue("b",3);
        const cTrig = getCoeffValue("c",3);
        const dTrig = getCoeffValue("d",3);
        equation += `${aTrig} * sin(${bTrig} * ${independentVar} ${cTrig >= 0 ? "+" : "-"} ${Math.abs(cTrig)}) ${dTrig >= 0 ? "+" : "-"} ${Math.abs(dTrig)}`;
        break;
    case "Sigmoid":
        // y = L / (1 + exp(-k*(x-x0))) -> в нашем proto это c / (1 + exp(-a*(x-b)))
        const sigL = getCoeffValue("c", 3); // L (max value)
        const sigK = getCoeffValue("a", 3); // k (steepness)
        const sigX0 = getCoeffValue("b", 3); // x0 (midpoint)
        // Если sigK (коэффициент 'a') приходит отрицательным (например, -8.681),
        // а в формуле уже есть минус перед ним: exp(-a * ...),
        // то -a станет -(-8.681) = 8.681.
        // Поэтому мы вычисляем -sigK и форматируем его.
        const term_a_sigmoid = -sigK;
        equation += `${sigL} / (1 + exp(${term_a_sigmoid.toFixed(3)} * (${independentVar} - ${sigX0.toFixed(3)})))`;
        break;
    case "Polynomial":
        // Простая версия: y = c2*x^2 + c1*x + c0
        // Предполагаем, что коэффициенты называются x^2, x, const
        // или c2, c1, c0 в порядке убывания степени
        let polyEq = "";
        const sortedCoeffs = [...coefficients].sort((coeffA, coeffB) => {
            const getDegree = (varName: string) => {
                if (varName === "const") return 0;
                if (varName === independentVar) return 1;
                if (varName.startsWith(independentVar + "^")) return parseInt(varName.split("^")[1]);
                if (varName.startsWith("c")) return parseInt(varName.substring(1)); // для c2, c1, c0
                return -1; // неизвестные имена в конец
            };
            return getDegree(coeffB.variable_name) - getDegree(coeffA.variable_name);
        });

        sortedCoeffs.forEach((coef, index) => {
            const val = parseFloat(coef.coefficient.toFixed(3));
            const absVal = Math.abs(val);
            let term = "";

            if (coef.variable_name === "const") {
                term = `${absVal}`;
            } else if (coef.variable_name === independentVar || coef.variable_name.endsWith(independentVar) && !coef.variable_name.includes("^")) {
                term = `${absVal} * ${independentVar}`;
            } else if (coef.variable_name.includes("^")) {
                term = `${absVal} * ${coef.variable_name}`; // Используем x^2, x^3 как есть
            } else {
                 // для c0, c1x, c2x^2 и т.д. если имена такие
                const degreeMatch = coef.variable_name.match(/c(\\d+)/);
                if (degreeMatch) {
                    const degree = parseInt(degreeMatch[1]);
                    if (degree === 0) term = `${absVal}`;
                    else if (degree === 1) term = `${absVal} * ${independentVar}`;
                    else term = `${absVal} * ${independentVar}^${degree}`;
                } else {
                    term = `${absVal} * ${coef.variable_name}`; // fallback
                }
            }
            
            if (index === 0) {
                polyEq += (val < 0 ? "- " : "") + term;
            } else {
                polyEq += (val < 0 ? " - " : " + ") + term;
            }
        });
        equation += polyEq || "N/A";
        break;
    default:
      equation += "Уравнение не определено для этого типа";
  }
  return equation.replace(/\\+ -/g, '- ').replace(/- -/g, '+ '); // Очистка двойных знаков
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
    wilcoxon_signed_rank: false,
    mann_whitney: false
  });
  // Переменные для тестов Вилкоксона
  const [wilcoxonVar1, setWilcoxonVar1] = useState<string>("");
  const [wilcoxonVar2, setWilcoxonVar2] = useState<string>("");
  const [mannWhitneyGroup, setMannWhitneyGroup] = useState<string>("");
  const [mannWhitneyValue, setMannWhitneyValue] = useState<string>("");
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [dependentVariable, setDependentVariable] = useState<string>("");
  const [independentVariable, setIndependentVariable] = useState<string>("");
  const [selectedRegressionType, setSelectedRegressionType] = useState<string>("");
  const [globalYDomain, setGlobalYDomain] = useState<[number, number] | undefined>(undefined);
  const [selectedModelType, setSelectedModelType] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (fileColumns.length >= 2) {
      // Автоматически ставим галочку "Регрессия", если есть 2+ колонки
      setSelectedAnalysesOptions(prev => ({ ...prev, regression: true }));

      // Ищем 'x' и 'y' (в любом регистре)
      const xCol = fileColumns.find(col => col.toLowerCase() === 'x');
      const yCol = fileColumns.find(col => col.toLowerCase() === 'y');

      if (xCol && yCol) {
        // Устанавливаем, если они еще не установлены или если выбраны другие
        // Это предотвратит сброс выбора пользователя, если он уже что-то выбрал вручную
        // для текущего набора колонок
        if (!independentVariable || !fileColumns.includes(independentVariable)) {
          setIndependentVariable(xCol);
        }
        if (!dependentVariable || !fileColumns.includes(dependentVariable)) {
          setDependentVariable(yCol);
        }
      } else if (fileColumns.length >= 2) {
        // Если 'x' и 'y' не найдены, но есть 2+ колонки,
        // и переменные еще не выбраны (или их выбор стал невалидным),
        // выбираем первые две как независимую и зависимую по умолчанию
        // Это поведение можно настроить или убрать, если нежелательно
        if (!independentVariable || !fileColumns.includes(independentVariable)) {
          setIndependentVariable(fileColumns[0]);
        }
        if (!dependentVariable || !fileColumns.includes(dependentVariable) && fileColumns[1] !== (independentVariable || fileColumns[0])) {
          // Убедимся, что не выбираем ту же колонку, что и для independentVariable
          setDependentVariable(fileColumns[1]); 
        }
      }
    }
  }, [fileColumns]); // Запускаем эффект при изменении fileColumns

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Проверка размера файла (4 МБ = 4 * 1024 * 1024 байт)
      const maxSize = 4 * 1024 * 1024;
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > maxSize) {
          toast({
            title: "Файл слишком большой",
            description: `Файл "${file.name}" превышает максимальный размер в 4 МБ`,
          });
          return false;
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

      // Заменяем текущий файл на новый (или первый из новых, если их несколько)
      // Это гарантирует, что работаем всегда с последним выбранным файлом
      setFiles(validFiles.slice(0, 1)); 
      
      // Clear previous columns and variable selections when new file is dropped
      // and also clear previous analysis results and related state
      setFileColumns([])
      setDependentVariable("")
      setIndependentVariable("")
      setAnalysisResult(null)
      setSelectedRegressionType("")
      setSelectedModelType(undefined)
      setUploadStatus("idle")
      setUploadProgress(0)
    },
    [toast],
  )

  // Function to clear all states
  const clearAll = () => {
    setFiles([])
    setFileColumns([])
    setDependentVariable("")
    setIndependentVariable("")
    setWilcoxonVar1("")
    setWilcoxonVar2("")
    setMannWhitneyGroup("")
    setMannWhitneyValue("")
    setUploadStatus("idle")
    setUploadProgress(0)
    setAnalysisResult(null)
    setSelectedRegressionType("")
    setSelectedModelType(undefined)
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
    setWilcoxonVar1("")
    setWilcoxonVar2("")
    setMannWhitneyGroup("")
    setMannWhitneyValue("")
    setUploadStatus("idle")
    setUploadProgress(0)
    setSelectedRegressionType("")
    setSelectedModelType(undefined)
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
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast({
          title: "Ошибка аутентификации",
          description: "Токен не найден. Пожалуйста, войдите снова.",
          variant: "destructive",
        });
        setUploadStatus("error");
        router.push("/auth/login");
        return;
      }

      const response = await fetch("http://localhost:8080/api/columns", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(100); // Indicate completion of this step

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error from /api/columns" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setFileColumns(data.columns || []);
      setUploadStatus("idle"); // Or a success status for column fetching
      if ((data.columns || []).length > 0 && files.length > 0) {
          // Only auto-select if columns were actually fetched
        setSelectedAnalysesOptions(prev => ({ ...prev, regression: (data.columns || []).length >= 2 }));
      }

    } catch (error) {
      console.error("Error fetching column names:", error);
      toast({
        title: "Ошибка при загрузке колонок",
        description: error instanceof Error ? error.message : "Не удалось получить список колонок из файла.",
        variant: "destructive",
      });
      setUploadStatus("error");
      setFileColumns([]); // Clear columns on error
    }
  };

  useEffect(() => {
    if (files.length > 0) {
      fetchColumnNames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]); // Re-fetch columns when files change

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Файл не выбран",
        description: "Пожалуйста, выберите файл для анализа.",
        variant: "destructive",
      });
      return;
    }

    const selectedOptions = Object.entries(selectedAnalysesOptions)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (selectedOptions.length === 0) {
      toast({
        title: "Анализы не выбраны",
        description: "Пожалуйста, выберите хотя бы один тип анализа.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", files[0]);
    selectedOptions.forEach(option => {
      formData.append("selected_analyses", option);
    });

    if (selectedAnalysesOptions.regression) {
      if (!dependentVariable || !independentVariable) {
        toast({
          title: "Переменные для регрессии не выбраны",
          description: "Пожалуйста, выберите зависимую и независимую переменные.",
          variant: "destructive",
        });
        return;
      }
      if (dependentVariable === independentVariable) {
        toast({
          title: "Некорректный выбор переменных",
           description: "Зависимая и независимая переменные должны отличаться.",
           variant: "destructive",
        });
        return;
      }
      // Добавляем regression как анализ и отдельно переменные без префиксов
      formData.append("dependent_variable", dependentVariable);
      formData.append("independent_variable", independentVariable);
    }
    
    // Проверка и добавление параметров для теста знаковых рангов Вилкоксона
    if (selectedAnalysesOptions.wilcoxon_signed_rank) {
      if (!wilcoxonVar1 || !wilcoxonVar2) {
        toast({
          title: "Переменные для теста Вилкоксона не выбраны",
          description: "Пожалуйста, выберите две переменные для сравнения.",
          variant: "destructive",
        });
        return;
      }
      formData.append("selected_analyses", `wilcoxon_var1:${wilcoxonVar1}`);
      formData.append("selected_analyses", `wilcoxon_var2:${wilcoxonVar2}`);
    }
    
    // Проверка и добавление параметров для теста Манна-Уитни
    if (selectedAnalysesOptions.mann_whitney) {
      if (!mannWhitneyGroup || !mannWhitneyValue) {
        toast({
          title: "Переменные для теста Манна-Уитни не выбраны",
          description: "Пожалуйста, выберите группирующую переменную и переменную значений.",
          variant: "destructive",
        });
        return;
      }
      formData.append("selected_analyses", `mann_whitney_group:${mannWhitneyGroup}`);
      formData.append("selected_analyses", `mann_whitney_value:${mannWhitneyValue}`);
    }

    setUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setAnalysisResult(null);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast({
          title: "Ошибка аутентификации",
          description: "Токен не найден. Пожалуйста, войдите снова.",
          variant: "destructive",
        });
        setUploading(false);
        setUploadStatus("error");
        router.push("/auth/login");
        return;
      }

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
          setUploadProgress(progress);
        } else {
          clearInterval(interval); // Stop at 90 to prevent reaching 100 before server responds
        }
      }, 200);

      const response = await fetch("http://localhost:8080/api/analyze", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(interval); // Clear interval once response is received

      if (!response.ok) {
        setUploadProgress(0); // Reset progress on error
        setUploadStatus("error");
        setUploading(false);
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error from /api/analyze" }));
        toast({
          title: "Ошибка анализа",
          description: errorData.error || `Server error: ${response.status}`,
          variant: "destructive",
        });
        return;
      }

      const results = await response.json();
      

      
      // Детальная проверка данных гистограммы
      if (results.descriptive_stats?.histograms && results.descriptive_stats.histograms.length > 0) {
        const firstHist = results.descriptive_stats.histograms[0];

        
        // Преобразуем snake_case в camelCase для полей нормальной кривой
        results.descriptive_stats.histograms.forEach((hist: Record<string, any>) => {
          // Проверяем наличие snake_case полей и преобразуем их в camelCase
          if (hist.normal_curve_x && !hist.normalCurveX) {
            hist.normalCurveX = hist.normal_curve_x;
          }
          if (hist.normal_curve_y && !hist.normalCurveY) {
            hist.normalCurveY = hist.normal_curve_y;

          }
          if (hist.std_dev && !hist.stdDev) {
            hist.stdDev = hist.std_dev;

          }
        });
      }
      
      // Проверяем и преобразуем поля тестов Вилкоксона, если нужно
      if (results.wilcoxon_tests) {
        // Копируем snake_case поля в camelCase для совместимости
        if (results.wilcoxon_tests.signed_rank_results && !results.wilcoxon_tests.signedRankResults) {
          results.wilcoxon_tests.signedRankResults = results.wilcoxon_tests.signed_rank_results;
        }
        if (results.wilcoxon_tests.mann_whitney_results && !results.wilcoxon_tests.mannWhitneyResults) {
          results.wilcoxon_tests.mannWhitneyResults = results.wilcoxon_tests.mann_whitney_results;
        }
        

      }
      
      setAnalysisResult(results);
      setUploadProgress(100);
      setUploadStatus("success");
      toast({
        title: "Анализ завершен",
        description: "Результаты анализа успешно загружены.",
        variant: "default", // Or "success" if you have such variant
      });

    } catch (error) {
      // clearInterval(interval); // Ensure interval is cleared in case of network error before fetch
      console.error("Upload error:", error);
      setUploading(false);
      setUploadStatus("error");
      setUploadProgress(0);
      toast({
        title: "Ошибка при загрузке",
        description: error instanceof Error ? error.message : "Произошла ошибка при отправке файла на анализ.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // The interval should be cleared within the try or catch block, 
      // not necessarily here, as it might not have been set if an early return occurred.
    }
  };

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
        
      } else {
        setGlobalYDomain(undefined); // Reset if no valid Y values
      }
    } else {
      setGlobalYDomain(undefined); // Reset if no analysis result or models
    }
  }, [analysisResult]);

  // Effect to select the best regression model by R-squared or default to the first one
  useEffect(() => {
    if (analysisResult?.regression_analysis?.models && analysisResult.regression_analysis.models.length > 0) {
      const { models } = analysisResult.regression_analysis;
      // Sort models by Adjusted R-squared in descending order
      // Ensure adjusted_r_squared exists, otherwise fallback to r_squared or 0
      const sortedModels = [...models].sort((a, b) => {
        const adjR2A = typeof a.adjusted_r_squared === 'number' ? a.adjusted_r_squared : (typeof a.r_squared === 'number' ? a.r_squared : -Infinity);
        const adjR2B = typeof b.adjusted_r_squared === 'number' ? b.adjusted_r_squared : (typeof b.r_squared === 'number' ? b.r_squared : -Infinity);
        return adjR2B - adjR2A;
      });
      if (sortedModels.length > 0) {
        setSelectedRegressionType(sortedModels[0].regression_type); // Select the one with highest Adjusted R-squared
      } else {
        setSelectedRegressionType("");
      }
    } else {
      setSelectedRegressionType(""); // Clear selection if no models
    }
  }, [analysisResult]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("uploadData")}</h1>
        <p className="text-gray-500">{t("uploadSubtitle")}</p>
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
                  {isDragActive ? t("dropFilesHere") : t("dragAndDrop")}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t("supportedFormats")}</p>
                <p className="text-sm text-gray-500 mt-1">{t("maxFileSize")}</p>
              </div>
              <Button type="button" disabled={uploading}>
                {t("selectFiles")}
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t("selectedFiles")}</h3>
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={uploading}>
                  {t("clearAll")}
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
                      <span className="sr-only">{t("removeFile")}</span>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Analysis Selection Checkboxes */}
              <div className="mt-6 space-y-4">
                <h3 className="font-medium">{t("selectAnalyses")}</h3>
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
                      {t("descriptiveStats")}
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
                      {t("normalityTest")}
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
                      {t("regression")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wilcoxon_signed_rank"
                      checked={selectedAnalysesOptions.wilcoxon_signed_rank}
                      onCheckedChange={(checked) =>
                        setSelectedAnalysesOptions((prev) => ({ ...prev, wilcoxon_signed_rank: !!checked }))
                      }
                      disabled={uploading}
                    />
                    <Label htmlFor="wilcoxon_signed_rank" className="cursor-pointer">
                      {t("wilcoxonSignedRankTest")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mann_whitney"
                      checked={selectedAnalysesOptions.mann_whitney}
                      onCheckedChange={(checked) =>
                        setSelectedAnalysesOptions((prev) => ({ ...prev, mann_whitney: !!checked }))
                      }
                      disabled={uploading}
                    />
                    <Label htmlFor="mann_whitney" className="cursor-pointer">
                      {t("mannWhitneyTest")}
                    </Label>
                  </div>
                </div>
              </div>
              {/* End Analysis Selection Checkboxes */}
              
              {/* Regression Variable Selection */}
              {selectedAnalysesOptions.regression && fileColumns.length > 0 && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                  <h3 className="font-medium mb-3">{t("regressionVariables")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dependent-variable">{t("dependentVariableY")}</Label>
                      <select
                        id="dependent-variable"
                        value={dependentVariable}
                        onChange={(e) => setDependentVariable(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">{t("selectVariable")}</option>
                        {fileColumns.map((column) => (
                          <option key={`dep-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="independent-variable">{t("independentVariableX")}</Label>
                      <select
                        id="independent-variable"
                        value={independentVariable}
                        onChange={(e) => setIndependentVariable(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">{t("selectVariable")}</option>
                        {fileColumns.map((column) => (
                          <option key={`indep-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {/* End Regression Variable Selection */}

              {/* Wilcoxon Signed Rank Test Variable Selection */}
              {selectedAnalysesOptions.wilcoxon_signed_rank && fileColumns.length > 0 && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                  <h3 className="font-medium mb-3">{t("wilcoxonSignedRankVariables")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wilcoxon-var1">{t("firstVariable")}</Label>
                      <select
                        id="wilcoxon-var1"
                        value={wilcoxonVar1}
                        onChange={(e) => setWilcoxonVar1(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">{t("selectVariable")}</option>
                        {fileColumns.map((column) => (
                          <option key={`wilc1-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wilcoxon-var2">{t("secondVariable")}</Label>
                      <select
                        id="wilcoxon-var2"
                        value={wilcoxonVar2}
                        onChange={(e) => setWilcoxonVar2(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">{t("selectVariable")}</option>
                        {fileColumns.map((column) => (
                          <option key={`wilc2-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{t("wilcoxonSignedRankHint")}</p>
                </div>
              )}
              {/* End Wilcoxon Signed Rank Test Variable Selection */}

              {/* Mann-Whitney Test Variable Selection */}
              {selectedAnalysesOptions.mann_whitney && fileColumns.length > 0 && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                  <h3 className="font-medium mb-3">{t("mannWhitneyVariables")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mann-whitney-group">{t("group_column")}</Label>
                      <select
                        id="mann-whitney-group"
                        value={mannWhitneyGroup}
                        onChange={(e) => setMannWhitneyGroup(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">{t("selectVariable")}</option>
                        {fileColumns.map((column) => (
                          <option key={`mw-group-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mann-whitney-value">{t("valuesToCompare")}</Label>
                      <select
                        id="mann-whitney-value"
                        value={mannWhitneyValue}
                        onChange={(e) => setMannWhitneyValue(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        disabled={uploading}
                      >
                        <option value="">{t("selectVariable")}</option>
                        {fileColumns.map((column) => (
                          <option key={`mw-value-${column}`} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{t("mannWhitneyHint")}</p>
                </div>
              )}
              {/* End Mann-Whitney Test Variable Selection */}

              {uploadStatus !== "idle" && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {uploadStatus === "uploading"
                        ? t("uploading")
                        : uploadStatus === "success"
                          ? t("uploadComplete")
                          : t("uploadError")}
                    </span>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  {uploadStatus === "success" && (
                    <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t("uploadSuccessMessage")}</span>
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
                      {t("uploading")}...
                    </div>
                  ) : (
                    t("uploadAndAnalyze")
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
            <CardTitle>{t("results.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={
              // Автоматически выбираем вкладку на основе наличия данных
              (analysisResult?.wilcoxon_tests?.signed_rank_results || 
               analysisResult?.wilcoxon_tests?.signedRankResults || 
               analysisResult?.wilcoxon_tests?.mann_whitney_results || 
               analysisResult?.wilcoxon_tests?.mannWhitneyResults) ? "wilcoxon" : 
              analysisResult?.normality_tests ? "normality-test" : 
              analysisResult?.descriptive_stats ? "descriptive-stats" : 
              "normality-test"
            } className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                {analysisResult?.descriptive_stats && (
                    <TabsTrigger value="descriptive-stats">{t("results.tabs.descriptiveStats")}</TabsTrigger>
                )}
                {analysisResult?.normality_tests && selectedAnalysesOptions.normality_test && (
                    <TabsTrigger value="normality-test">{t("results.tabs.normalityTest")}</TabsTrigger>
                )}
                {analysisResult?.regression_analysis && (
                    <TabsTrigger value="regression">{t("results.tabs.regression")}</TabsTrigger>
                )}
                {/* Тесты Вилкоксона - показываем только если были выбраны */}
                {selectedAnalysesOptions.wilcoxon_signed_rank || selectedAnalysesOptions.mann_whitney ? (
                    <TabsTrigger value="wilcoxon">{t("wilcoxon_tests")}</TabsTrigger>
                ) : null}
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
                          <TableHead>{t("variable")}</TableHead>
                          <TableHead>{t("count")}</TableHead>
                          <TableHead>{t("mean")}</TableHead>
                          <TableHead>{t("median")}</TableHead>
                          <TableHead>{t("mode")}</TableHead>
                          <TableHead>{t("stdDev")}</TableHead>
                          <TableHead>{t("min")}</TableHead>
                          <TableHead>{t("max")}</TableHead>
                          <TableHead>{t("q1")}</TableHead>
                          <TableHead>{t("q3")}</TableHead>
                          <TableHead>{t("iqr")}</TableHead>
                          <TableHead>{t("variationCoefficient")}</TableHead>
                          <TableHead>{t("skewness")}</TableHead>
                          <TableHead>{t("kurtosis")}</TableHead>
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
                                  ? (stat.mode.length === Number(stat.count) ? t("unique") : `${t("multiple")} (${stat.mode.length})`) 
                                  : stat.mode.map((m: number | string) => formatNumber(m, 2)).join(", ")
                                : formatNumber(stat.mode, 2)}
                            </TableCell>
                            <TableCell>{formatNumber(stat.std_dev)}</TableCell>
                            <TableCell>{formatNumber(stat.min_value)}</TableCell>
                            <TableCell>{formatNumber(stat.max_value)}</TableCell>
                            <TableCell>{formatNumber(stat.q1)}</TableCell>
                            <TableCell>{formatNumber(stat.q3)}</TableCell>
                            <TableCell>{formatNumber(stat.iqr)}</TableCell>
                            <TableCell>{formatNumber(stat.variation_coefficient)}</TableCell>
                            <TableCell>{formatNumber(stat.skewness)}</TableCell>
                            <TableCell>{formatNumber(stat.kurtosis)}</TableCell>
                          </TableRow>
                        )) ?? (
                          <TableRow>
                            <TableCell colSpan={14} className="text-center">{t("noData")}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Add Histograms Here */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">{t("histograms")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {analysisResult.descriptive_stats.histograms?.map((hist: any, index: number) => {

                           
                           // Дополнительный отладочный вывод перед передачей в DistributionChart
                           if (hist.bins && hist.frequencies && hist.bins.length > 0 && hist.frequencies.length > 0) {

                           }
                           
                           return (
                             <div key={`hist-${index}-${hist.column_name}`} className="border rounded-lg p-4">
                               <h4 className="text-md font-semibold mb-2 text-center">{hist.column_name}</h4>
                               {/* Ensure data structure is correct before passing */}
                               {hist.bins && hist.frequencies && hist.bins.length > 0 && hist.frequencies.length > 0 ? (
                                 <DistributionChart 
                                   data={{ 
                                     bins: hist.bins, 
                                     frequencies: hist.frequencies
                                     // Не передаем данные нормальной кривой на вкладке описательной статистики
                                   }} 
                                   variableName={hist.column_name}
                                   showNormalCurve={false} // Отключаем отображение нормальной кривой
                                 />
                               ) : (
                                 <p className="text-sm text-center text-gray-500">{`${t("noDataForHistogram")} '${hist.column_name}'`}</p>
                               )}
                             </div>
                           );
                        }) ?? (
                           <p className="text-sm text-center text-gray-500 md:col-span-2">{t("noDataForHistograms")}</p>
                        )}
                      </div>
                    </div>

                    {/* Add Confidence Intervals Here */}
                    <div className="hidden">
                      <h3 className="text-lg font-semibold mb-4">{t("confidenceIntervals")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {analysisResult.descriptive_stats.confidence_intervals?.map((ci: any, index: number) => (
                          <div key={`ci-${index}-${ci.column_name}`} className="border rounded-lg p-4">
                             <h4 className="text-md font-semibold mb-2 text-center">{ci.column_name}</h4>
                             <div className="space-y-2">
                               <p><strong>{t("confidenceLevel")}:</strong> {(ci.confidence_level * 100).toFixed(0)}%</p>
                               <p><strong>{t("interval")}:</strong> [{formatNumber(ci.lower_bound)}, {formatNumber(ci.upper_bound)}]</p>
                               <p><strong>{t("mean")}:</strong> {formatNumber(ci.mean)}</p>
                               <p><strong>{t("standardError")}:</strong> {formatNumber(ci.standard_error)}</p>
                             </div>
                          </div>
                        )) ?? (
                           <p className="text-sm text-center text-gray-500 md:col-span-2">{t("noDataForConfidenceIntervals")}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              )}

              {analysisResult?.normality_tests && selectedAnalysesOptions.normality_test && (
                <TabsContent value="normality-test">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("normalityTests")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Shapiro-Wilk Test Results */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">{t("shapiroWilkTest")}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("variable")}</TableHead>
                          <TableHead>{t("statistic")}</TableHead>
                          <TableHead>{t("pValue")}</TableHead>
                          <TableHead>{t("conclusion")}</TableHead>
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
                                  ? t("normalDistribution") 
                                  : t("nonNormalDistribution")}
                              </TableCell>
                          </TableRow>
                        )) ?? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">{t("noData")}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    </div>

                    {/* Chi-Square Test Results */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">{t("chiSquareTest")}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("variable")}</TableHead>
                          <TableHead>{t("statistic")}</TableHead>
                          <TableHead>{t("pValue")}</TableHead>
                          <TableHead>{t("degreesOfFreedom")}</TableHead>
                            <TableHead>{t("intervals")}</TableHead>
                          <TableHead>{t("conclusion")}</TableHead>
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
                                  ? t("normalDistribution") 
                                  : t("nonNormalDistribution")}
                              </TableCell>
                            </TableRow>
                        )) ?? (
                          <TableRow>
                              <TableCell colSpan={6} className="text-center">{t("noData")}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    </div>

                    {/* Гистограммы распределения с нормальной кривой */}
                    {analysisResult.descriptive_stats?.histograms && analysisResult.descriptive_stats.histograms.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">{t("histogramsWithNormalCurve")}</h3>
                        

                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Временно отображаем все гистограммы без фильтрации */}
                          {analysisResult.descriptive_stats.histograms.map((hist: any, index: number) => (
                            <div key={`norm-hist-${index}-${hist.column_name}`} className="border rounded-lg p-4">
                              <h4 className="text-md font-semibold mb-2 text-center">{hist.column_name}</h4>
                              {hist.bins && hist.frequencies && hist.bins.length > 0 && hist.frequencies.length > 0 ? (
                                <DistributionChart 
                                  data={{ 
                                    bins: hist.bins, 
                                    frequencies: hist.frequencies,
                                    normal_curve_x: hist.normalCurveX || hist.normal_curve_x, // Поддержка обоих форматов
                                    normal_curve_y: hist.normalCurveY || hist.normal_curve_y, // Поддержка обоих форматов
                                    mean: hist.mean,
                                    std_dev: hist.stdDev || hist.std_dev // Поддержка обоих форматов
                                  }} 
                                  variableName={hist.column_name}
                                  showNormalCurve={true} // Включаем отображение нормальной кривой на вкладке с тестами нормальности
                                />
                              ) : (
                                <p className="text-sm text-center text-gray-500">{`${t("noDataForHistogram")} '${hist.column_name}'`}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              )}

              {analysisResult?.regression_analysis && (
              <TabsContent value="regression">
                <Card className="w-full overflow-hidden">
                  <CardHeader>
                    <CardTitle>{t("regressionAnalysis")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 md:p-1">
                    {(() => { // IIFE to ensure regressionAnalysis is defined in this scope
                      const regressionAnalysis = analysisResult.regression_analysis;
                      if (!regressionAnalysis) return null;

                      // Сортировка моделей для выбора лучшей и для отображения в таблице
                                    const sortedModels = [...regressionAnalysis.models].sort((a, b) => {
                        const adjR2A = typeof a.adjusted_r_squared === 'number' && !isNaN(a.adjusted_r_squared) ? a.adjusted_r_squared : -Infinity;
                        const adjR2B = typeof b.adjusted_r_squared === 'number' && !isNaN(b.adjusted_r_squared) ? b.adjusted_r_squared : -Infinity;
                        
                        if (adjR2A !== adjR2B) {
                          return adjR2B - adjR2A; // 1. По Adjusted R² (убывание)
                        }

                        const isAQuadratic = a.regression_type === "Quadratic";
                        const isBQuadratic = b.regression_type === "Quadratic";
                        if (isAQuadratic && !isBQuadratic) return -1; // 2. Quadratic предпочтительнее
                        if (!isAQuadratic && isBQuadratic) return 1;

                        const sseA = typeof a.sse === 'number' && !isNaN(a.sse) ? a.sse : Infinity;
                        const sseB = typeof b.sse === 'number' && !isNaN(b.sse) ? b.sse : Infinity;
                        if (sseA !== sseB) {
                          return sseA - sseB; // 3. По SSE (возрастание)
                        }
                        
                        return a.regression_type.localeCompare(b.regression_type); // 4. По имени (алфавитный порядок)
                      });

                      // Логика выбора модели для отображения
                      let modelForDisplay: RegressionModel | undefined;

                      if (sortedModels.length > 0) {
                        if (selectedModelType) {
                          // Если тип выбран пользователем, пытаемся найти эту модель
                          modelForDisplay = sortedModels.find(m => m.regression_type === selectedModelType);
                        }
                        if (!modelForDisplay) {
                           // Если тип не выбран, или выбранный не найден (например, после обновления данных),
                           // или это первая загрузка, берем лучшую из отсортированных
                           modelForDisplay = sortedModels[0];
                           // Используем setTimeout, чтобы обновить состояние selectedModelType уже после текущего рендера,
                           // если оно не соответствует modelForDisplay.regression_type
                           if (selectedModelType !== modelForDisplay.regression_type) {
                            setTimeout(() => setSelectedModelType(modelForDisplay!.regression_type), 0);
                           }
                        }
                      } else {
                        // Если моделей нет, сбрасываем выбранный тип
                        if (selectedModelType) {
                          setTimeout(() => setSelectedModelType(undefined), 0);
                        }
                                    }
                                    
                                    return (
                                      <>
                          {/* Переключатели моделей (табы) */}
                          {sortedModels.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                              {sortedModels.map((model) => (
                                          <Button
                                            key={`btn-${model.regression_type}`}
                                  variant={model.regression_type === (modelForDisplay?.regression_type) ? "default" : "outline"}
                                            size="sm"
                                  onClick={() => setSelectedModelType(model.regression_type)}
                                          >
                                            {regressionTypeTranslations[model.regression_type] || model.regression_type}
                                          </Button>
                                        ))}
                            </div>
                          )}

                          {/* Отображение деталей выбранной модели и графика */} 
                          {modelForDisplay && (
                            <div key={`regression-details-${modelForDisplay.regression_type}`} className="w-full border rounded-lg p-2 md:p-4 bg-white shadow-sm mt-1">
                              <div className="bg-blue-50 p-3 mb-4 rounded-md">
                                <p className="font-medium text-blue-800">{t("regressionEquation")} ({regressionTypeTranslations[modelForDisplay.regression_type] || modelForDisplay.regression_type}):</p>
                                <p className="mt-1 text-sm md:text-base break-all">
                                  {formatRegressionEquation(modelForDisplay, regressionAnalysis.dependent_variable, regressionAnalysis.independent_variables[0] || "x")}
                                </p>
                              </div>
                                                <RegressionChart 
                                                  data={regressionAnalysis.data_points}
                                models={[{ 
                                  type: modelForDisplay.regression_type, 
                                  coefficients: modelForDisplay.coefficients, 
                                  r_squared: modelForDisplay.r_squared,
                                  residuals: modelForDisplay.residuals,
                                  residuals_analysis: modelForDisplay.residuals_analysis
                                }]}
                                                  dependentVar={regressionAnalysis.dependent_variable}
                                independentVar={regressionAnalysis.independent_variables[0] || "x"}
                                                  globalYDomain={globalYDomain}
                                />
                      </div>
                    )}

                    {/* --- Residuals Analysis Section --- */}
                    {modelForDisplay?.residuals_analysis && (
                      <div className="mt-6 w-full border rounded-lg p-2 md:p-4 bg-white shadow-sm">
                        <ResidualsAnalysis
                            residuals={modelForDisplay.residuals || []}
                            shapiroTest={modelForDisplay.residuals_analysis.shapiro_test}
                            histogram={modelForDisplay.residuals_analysis.histogram}
                            qqPlot={modelForDisplay.residuals_analysis.qq_plot}
                            title={`${t("residualsAnalysis")} (${regressionTypeTranslations[modelForDisplay.regression_type] || modelForDisplay.regression_type})`}
                          />
                      </div>
                    )}

                    {/* Новая секция для деталей выбранной модели (modelForDisplay) */}
                    {modelForDisplay && (
                        <div key={`model-details-summary-${modelForDisplay.regression_type}`} className="mt-6 w-full border rounded-lg p-2 md:p-4 bg-white shadow-sm">
                            <h3 className="text-lg font-semibold mb-3">{t("modelSummary")}: {regressionTypeTranslations[modelForDisplay.regression_type] || modelForDisplay.regression_type}</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("parameter")}</TableHead>
                                        <TableHead>{t("value")}</TableHead>
                                        <TableHead>{t("stdError")}</TableHead>
                                        <TableHead>{t("tStatistic")}</TableHead>
                                        <TableHead>{t("pValue")}</TableHead>
                                        <TableHead>{t("confidenceInterval")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {modelForDisplay.coefficients.map((coef, coefIndex) => (
                                        <TableRow key={`coef-${modelForDisplay.regression_type}-${coefIndex}-${coef.variable_name}`}>
                                            <TableCell className="font-medium">
                                                {modelForDisplay.regression_type === 'Linear'
                                                    ? (coef.variable_name === 'const' ? 'b' : 'a')
                                                    : (coef.variable_name === "const" ? t("intercept") : coef.variable_name)
                                                }
                                            </TableCell>
                                            <TableCell>{formatNumber(coef.coefficient)}</TableCell>
                                            <TableCell>{typeof coef.std_error === 'number' ? formatNumber(coef.std_error) : t("na")}</TableCell>
                                            <TableCell>{typeof coef.t_statistic === 'number' ? formatNumber(coef.t_statistic) : t("na")}</TableCell>
                                            <TableCell>{typeof coef.p_value === 'number' ? formatNumber(coef.p_value, 3, true) : t("na")}</TableCell>
                                            <TableCell>
                                                {typeof coef.confidence_interval_lower === 'number' && typeof coef.confidence_interval_upper === 'number'
                                                ? `[${formatNumber(coef.confidence_interval_lower)}, ${formatNumber(coef.confidence_interval_upper)}]`
                                                : t("na")}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="font-medium">{t("fStatisticAndPValue")}</TableCell>
                                        <TableCell>
                                            {formatNumber(modelForDisplay.f_statistic)} (p: {formatNumber(modelForDisplay.prob_f_statistic, 3, true)})
                                        </TableCell>
                                        <TableCell colSpan={4} />
                                    </TableRow>
                                </TableBody>
                            </Table>
                      </div>
                    )}

                          {/* Таблица сравнения моделей */} 
                          {sortedModels.length > 0 && (
                          <div className="mt-6">
                              <h3 className="text-lg font-semibold mb-2">{t("modelComparison")}</h3>
                     <Table>
                      <TableHeader>
                        <TableRow>
                                  <TableHead>{t("modelType")}</TableHead>
                                    <TableHead className="text-right">{t("rSquared")}</TableHead>
                                    <TableHead className="text-right">{t("adjustedRSquared")}</TableHead>
                                    <TableHead className="text-right">{t("fStatistic")}</TableHead>
                                    <TableHead className="text-right">{t("sse")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                                  {sortedModels.map((model) => (
                                    <TableRow key={model.regression_type}>
                                      <TableCell>{regressionTypeTranslations[model.regression_type] || model.regression_type}</TableCell>
                                      <TableCell className="text-right">{formatNumber(model.r_squared, 3)}</TableCell>
                                      <TableCell className="text-right">
                                        {typeof model.adjusted_r_squared === 'number' ? formatNumber(model.adjusted_r_squared, 3) : t("na")}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {typeof model.f_statistic === 'number' ? formatNumber(model.f_statistic, 2) : t("na")}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {typeof model.sse === 'number' ? formatNumber(model.sse, 3) : t("na")}
                                      </TableCell>
                          </TableRow>
                                  ))}
                      </TableBody>
                    </Table>
                              </div>
                          )}
                        </>
                      );
                    })()} 
                   </CardContent>
                 </Card>
              </TabsContent>
              )}

              {/* Показываем вкладку, если были выбраны тесты Вилкоксона */}
              {(selectedAnalysesOptions.wilcoxon_signed_rank || selectedAnalysesOptions.mann_whitney) && (
                <TabsContent value="wilcoxon">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("wilcoxon_tests")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Wilcoxon Signed Rank Test Results - учет null в данных */}
                      {analysisResult?.wilcoxon_tests && (
                        (analysisResult.wilcoxon_tests?.signed_rank_results && 
                         analysisResult.wilcoxon_tests?.signed_rank_results.length > 0) || 
                        (analysisResult.wilcoxon_tests?.signedRankResults && 
                         analysisResult.wilcoxon_tests?.signedRankResults.length > 0)
                      ) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">{t("wilcoxonSignedRankTest")}</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("variable1")}</TableHead>
                                <TableHead>{t("variable2")}</TableHead>
                                <TableHead>{t("sample_size")}</TableHead>
                                <TableHead>{t("statistic")}</TableHead>
                                <TableHead>{t("pValue")}</TableHead>
                                <TableHead>{t("conclusion")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Используем любой доступный формат данных */}
                              {/* @ts-ignore - игнорируем проверку типов из-за разных форматов имен полей */}
                              {(analysisResult.wilcoxon_tests?.signed_rank_results || 
                                analysisResult.wilcoxon_tests?.signedRankResults || []).map((result: any, index: number) => (
                                <TableRow key={`wsr-${index}`}>
                                  <TableCell>{result.variable1}</TableCell>
                                  <TableCell>{result.variable2}</TableCell>
                                  <TableCell>{result.sample_size || result.sampleSize}</TableCell>
                                  <TableCell>{formatNumber(result.statistic, 4)}</TableCell>
                                  <TableCell>{formatNumber(result.p_value || result.pValue, 4)}</TableCell>
                                  <TableCell>
                                    {(result.p_value || result.pValue) > 0.05 ? (
                                      <div className="flex items-center">
                                        <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                                        <span>{result.conclusion}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center">
                                        <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
                                        <span>{result.conclusion}</span>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Mann-Whitney Test Results - учет null в данных */}
                      {analysisResult?.wilcoxon_tests && (
                        (analysisResult.wilcoxon_tests?.mann_whitney_results && 
                         analysisResult.wilcoxon_tests?.mann_whitney_results.length > 0) || 
                        (analysisResult.wilcoxon_tests?.mannWhitneyResults && 
                         analysisResult.wilcoxon_tests?.mannWhitneyResults.length > 0)
                      ) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">{t("mannWhitneyTest")}</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("group_column")}</TableHead>
                                <TableHead>{t("variableToCompare")}</TableHead>
                                <TableHead>{t("group1")} / {t("group2")}</TableHead>
                                <TableHead>{t("group_sizes")}</TableHead>
                                <TableHead>{t("group_medians")}</TableHead>
                                <TableHead>{t("statistic")}</TableHead>
                                <TableHead>{t("pValue")}</TableHead>
                                <TableHead>{t("conclusion")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* @ts-ignore - игнорируем проверку типов для разных форматов */}
                              {(analysisResult.wilcoxon_tests?.mann_whitney_results || 
                                analysisResult.wilcoxon_tests?.mannWhitneyResults || []).map((result: any, index: number) => (
                                <TableRow key={`mw-${index}`}>
                                  <TableCell>{result.group_column || result.groupColumn}</TableCell>
                                  <TableCell>{result.value_column || result.valueColumn}</TableCell>
                                  <TableCell>{result.group1} / {result.group2}</TableCell>
                                  <TableCell>{result.group1_size || result.group1Size} / {result.group2_size || result.group2Size}</TableCell>
                                  <TableCell>{formatNumber(result.group1_median || result.group1Median, 3)} / {formatNumber(result.group2_median || result.group2Median, 3)}</TableCell>
                                  <TableCell>{formatNumber(result.statistic, 4)}</TableCell>
                                  <TableCell>{formatNumber(result.p_value || result.pValue, 4)}</TableCell>
                                  <TableCell>
                                    {(result.p_value || result.pValue) > 0.05 ? (
                                      <div className="flex items-center">
                                        <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                                        <span>{result.conclusion}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center">
                                        <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
                                        <span>{result.conclusion}</span>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* No Wilcoxon Tests Results - проверяем наличие wilcoxon_tests */}
                      {(!analysisResult?.wilcoxon_tests ||
                        ((!analysisResult.wilcoxon_tests?.signed_rank_results || analysisResult.wilcoxon_tests.signed_rank_results.length === 0) && 
                        (!analysisResult.wilcoxon_tests?.signedRankResults || analysisResult.wilcoxon_tests.signedRankResults.length === 0) && 
                        (!analysisResult.wilcoxon_tests?.mann_whitney_results || analysisResult.wilcoxon_tests.mann_whitney_results.length === 0) && 
                        (!analysisResult.wilcoxon_tests?.mannWhitneyResults || analysisResult.wilcoxon_tests.mannWhitneyResults.length === 0))) && (
                        <div className="text-center py-8">
                          <p>{t("noWilcoxonTestsPerformed")}</p>
                        </div>
                      )}
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
