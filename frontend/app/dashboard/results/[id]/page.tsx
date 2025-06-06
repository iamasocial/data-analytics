"use client"

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; // Для App Router
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/components/language-provider"
import { DistributionChart } from "@/components/charts/distribution-chart"
import { TimeSeriesChart } from "@/components/charts/time-series-chart"
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { RegressionChart } from "@/components/charts/regression-chart";
import { Label } from "@/components/ui/label";
import { ResidualsAnalysis } from "@/components/charts/residuals-analysis"
import { checkTokenValidity, handleUnauthorized, logout, clearAuthTokens } from "@/lib/auth"
import { calculateGlobalYDomain } from "@/lib/chart-utils"

// Тип для гистограммы
interface Histogram {
  columnName: string; // camelCase как в ответе
  bins: number[];
  frequencies: number[];
}

// Тип для описательной статистики
interface Descriptive {
  variableName: string; // camelCase как в ответе
  count: string;
  mean: number;
  median: number;
  mode: string[];
  variance: number;
  stdDev: number; // camelCase как в ответе
  variationCoefficient: number; // camelCase как в ответе
  skewness: number;
  kurtosis: number;
  minValue: number; // camelCase как в ответе
  maxValue: number; // camelCase как в ответе
}

// Тип для доверительных интервалов
interface ConfidenceInterval {
  columnName: string; // camelCase как в ответе
  confidenceLevel: number; // camelCase как в ответе
  lowerBound: number; // camelCase как в ответе
  upperBound: number; // camelCase как в ответе
  mean: number;
  standardError: number; // camelCase как в ответе
}

// Обновляем тип для описательной статистики
interface DescriptiveStatisticsData {
  descriptives: Descriptive[];
  histograms: Histogram[];
  confidenceIntervals: ConfidenceInterval[];
}

// Обновляем тип для теста нормальности, чтобы поддерживать как одиночные, так и множественные результаты
interface NormalityTestResultData {
  columnName: string; // camelCase как в ответе
  testName?: string; // camelCase как в ответе
  statistic: number;
  pValue: number; // camelCase как в ответе
  isNormal: boolean; // camelCase как в ответе
  degreesOfFreedom?: number; // camelCase как в ответе
  intervals?: number;
}

interface RegressionCoefficient {
  variable_name: string;
  variableName?: string;
  coefficient: number;
  std_error?: number;
  stdError?: number;
  t_statistic?: number;
  tStatistic?: number;
  p_value?: number;
  pValue?: number;
  confidence_interval_lower?: number;
  confidenceIntervalLower?: number;
  confidence_interval_upper?: number;
  confidenceIntervalUpper?: number;
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

interface RegressionModelData {
  regression_type: string;
  regressionType?: string;
  r_squared: number;
  rSquared?: number;
  adjusted_r_squared?: number;
  adjustedRSquared?: number;
  f_statistic?: number;
  fStatistic?: number;
  prob_f_statistic?: number;
  probFStatistic?: number;
  sse?: number;
  coefficients: RegressionCoefficient[];
  residuals?: number[];
  residuals_analysis?: ResidualsAnalysisData;
}

interface RegressionAnalysisData {
  dependent_variable: string;
  dependentVariable?: string; // Добавляем поддержку camelCase
  independent_variables: string[];
  independentVariables?: string[]; // Добавляем поддержку camelCase
  data_points: Array<{ x: number; y: number }>;
  dataPoints?: Array<{ x: number; y: number }>; // Добавляем поддержку camelCase
  models: RegressionModelData[]; 
}

interface NormalityTestsData {
  shapiroWilkResults?: NormalityTestResultData[];
  chiSquareResults?: NormalityTestResultData[];
}

// Добавляем интерфейсы для нового формата данных - массивы в обертке
interface NormalityResultsWrapper {
  results: NormalityTestResultData[];
}

// Обновляем тип AnalysisResultsMap, чтобы он соответствовал фактическим данным от API
type AnalysisResultsMap = {
  descriptive_stats?: DescriptiveStatisticsData;
  normality_tests?: NormalityTestsData; // Полная структура с результатами тестов нормальности
  regression_analysis?: RegressionAnalysisData;
  processing_log?: string[];
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
};

// Вспомогательная функция для форматирования уравнения регрессии
function formatRegressionEquation(
  model: RegressionModelData,
  dependentVar: string = "y",
  independentVar: string = "x"
): string {
  const { coefficients } = model;
  const regType = model.regressionType || model.regression_type || ""; // Поддержка camelCase
  
  const getCoeffValue = (name: string, decimals: number = 3): number => {
    const coeff = coefficients.find(c => (c.variable_name === name || c.variableName === name));
    return coeff ? parseFloat(Number(coeff.coefficient).toFixed(decimals)) : 0;
  };

  let equation = `${dependentVar} = `;

  switch (regType) {
    case "Linear":
      const slopeLin = getCoeffValue(independentVar, 3);
      const interceptLin = getCoeffValue("const", 3);
      equation += `${slopeLin} * ${independentVar} ${interceptLin >= 0 ? "+" : "-"} ${Math.abs(interceptLin)}`;
      break;
    case "Quadratic":
      const aQuad = getCoeffValue("a",3) || getCoeffValue(independentVar + "^2", 3) ;
      const bQuad = getCoeffValue("b",3) || getCoeffValue(independentVar,3);
      const cQuad = getCoeffValue("c",3) || getCoeffValue("const",3) ;
      equation += `${aQuad} * ${independentVar}² ${bQuad >= 0 ? "+" : "-"} ${Math.abs(bQuad)} * ${independentVar} ${cQuad >= 0 ? "+" : "-"} ${Math.abs(cQuad)}`;
      break;
    case "Power":
      const aPow = getCoeffValue("a", 3);
      const bPow = getCoeffValue("b", 3);
      equation += `${aPow} * ${independentVar}^${bPow}`;
      break;
    case "Exponential":
      const aExp = getCoeffValue("a", 3);
      const bExp = getCoeffValue("b", 3);
      equation += `${aExp} * exp(${bExp} * ${independentVar})`;
      break;
    case "Logarithmic":
      const aLog = getCoeffValue("a", 3);
      const bLog = getCoeffValue("b", 3);
      equation += `${aLog} ${bLog >= 0 ? "+" : "-"} ${Math.abs(bLog)} * ln(${independentVar})`;
      break;
    case "Trigonometric":
        const aTrig = getCoeffValue("a",3);
        const bTrig = getCoeffValue("b",3);
        const cTrig = getCoeffValue("c",3);
        const dTrig = getCoeffValue("d",3);
        equation += `${aTrig} * sin(${bTrig} * ${independentVar} ${cTrig >= 0 ? "+" : "-"} ${Math.abs(cTrig)}) ${dTrig >= 0 ? "+" : "-"} ${Math.abs(dTrig)}`;
        break;
    case "Sigmoid":
        const sigL = getCoeffValue("c", 3); 
        const sigK = getCoeffValue("a", 3); 
        const sigX0 = getCoeffValue("b", 3);
        const term_a_sigmoid = -sigK;
        equation += `${sigL.toFixed(3)} / (1 + exp(${term_a_sigmoid.toFixed(3)} * (${independentVar} - ${sigX0.toFixed(3)})))`;
        break;
    case "Polynomial":
        let polyEq = "";
        const sortedCoeffs = [...coefficients].sort((coeffA, coeffB) => {
            const getDegree = (varName: string) => {
                if (varName === "const") return 0;
                if (varName === independentVar) return 1;
                if (varName.startsWith(independentVar + "^")) return parseInt(varName.split("^")[1]);
                if (varName.startsWith("c") && !isNaN(parseInt(varName.substring(1)))) return parseInt(varName.substring(1));
                return -1; 
            };
            const degreeA = getDegree(coeffA.variable_name);
            const degreeB = getDegree(coeffB.variable_name);
            if (degreeA === degreeB && coeffA.variable_name.startsWith("c") && coeffB.variable_name.startsWith("c")){
                 return parseInt(coeffB.variable_name.substring(1)) - parseInt(coeffA.variable_name.substring(1));   
            }
            return degreeB - degreeA;
        });

        sortedCoeffs.forEach((coef, index) => {
            const val = parseFloat(Number(coef.coefficient).toFixed(3));
            const absVal = Math.abs(val);
            let term = "";
            const varName = coef.variable_name;

            if (varName === "const" || varName.match(/^c0$/)) {
                term = `${absVal}`;
            } else if (varName === independentVar || varName.match(/^c1$/)) {
                term = `${absVal} * ${independentVar}`;
            } else if (varName.startsWith(independentVar + "^")) {
                term = `${absVal} * ${varName}`;
            } else if (varName.match(/^c\\d+$/)) {
                 const degree = parseInt(varName.substring(1));
                    if (degree > 1) term = `${absVal} * ${independentVar}^${degree}`;
                    else term = `${absVal} * ${varName}`;
            }
             else {
                     term = `${absVal} * ${varName}`;
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
      equation += "Уравнение не определено для этого типа регрессии";
  }
  return equation.replace(/\\+ -/g, '- ').replace(/--/g, '+ ');
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

// Helper function to format numbers, handling potential non-numeric modes
// Скопировано из upload/page.tsx
function formatNumber(value: number | string | null | undefined, decimals = 3, useExponential = false): string {
  if (value === null || value === undefined) return "N/A";
  const num = Number(value);
  if (isNaN(num)) return "N/A";
  
  // Используем экспоненциальную запись для очень маленьких чисел (p-значения)
  if (useExponential && Math.abs(num) > 0 && Math.abs(num) < 0.01) {
    return num.toExponential(decimals);
  }
  
  return num.toFixed(decimals);
}

// Определяем локально тип для пропсов RegressionChart, соответствующий импортируемому компоненту
interface RegressionChartProps {
  data: Array<{ x: number; y: number }>;
  models: Array<{
    type: string;
    coefficients: Array<{
      variable_name?: string;
      variableName?: string;
      coefficient: number;
    }>;
    r_squared: number;
    residuals?: number[];
    residuals_analysis?: ResidualsAnalysisData;
  }>;
  dependentVar: string;
  independentVar: string;
  height?: number;
  globalYDomain?: [number, number];
  globalXDomain?: [number, number]; // Добавляем поддержку глобального масштаба по оси X
}

// Обновление кода для тестов нормальности в старом формате:
// Используем для старого формата приведение типов (as any) или создаем отдельный интерфейс для совместимости

interface LegacyNormalityTestResultData {
  column_name: string;
  test_name?: string; 
  statistic: number;
  p_value: number;
  is_normal: boolean;
  degrees_of_freedom?: number;
  intervals?: number;
}

const AnalysisResultPage: React.FC = () => {
  const { t } = useTranslation()
  const params = useParams()
  const id = params.id as string
  const [results, setResults] = useState<AnalysisResultsMap | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModelType, setSelectedModelType] = useState<string | undefined>(undefined);

  // Используем checkTokenValidity из модуля auth

  useEffect(() => {
    if (!id) return
    
    // Проверяем токен при загрузке страницы
    if (!checkTokenValidity()) return;

    const fetchResultDetails = async () => {
      setLoading(true)
      setError(null)
      
      // Получаем токен из localStorage, проверяем наличие и срок действия
      let token: string | null = localStorage.getItem('authToken')
      
      // Проверяем наличие токена обновления
      const refreshToken: string | null = localStorage.getItem('refreshToken')
      
      // Если токен отсутствует, но есть токен обновления, пытаемся обновить токен
      if ((!token || token === 'undefined') && refreshToken) {
        try {
          const refreshResponse = await fetch('http://localhost:8080/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            // Сохраняем новый токен
            if (typeof refreshData.token === 'string') {
              token = refreshData.token;
              localStorage.setItem('authToken', refreshData.token);
            }
          }
        } catch (refreshError) {
          console.error('Ошибка при обновлении токена:', refreshError);
        }
      }

      if (!token || token === 'undefined') {
        setError(t('auth_error_token_not_found'))
        setLoading(false)
        return
      }

      try {
        // Изменяем URL, добавляя полный путь к Go серверу, как в login/register
        const response = await fetch(`http://localhost:8080/api/analyses/history/${id}/results`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          // Специальная обработка ошибки 401 (Unauthorized)
          if (response.status === 401) {
            handleUnauthorized();
            return; // Прерываем выполнение функции
          }
          
          // Добавляем обработку ошибок 403 (Forbidden) и 404 (Not Found) - доступ к чужим результатам
          if (response.status === 403 || response.status === 404) {
            setError(t('access_denied_error') || 'У вас нет доступа к этим результатам анализа')
            setLoading(false)
            return;
          }
          
          const errorData = await response.json().catch(() => ({ message: t('failed_to_fetch_results_error') }));
          throw new Error(errorData.message || t('http_error_status') + ': ' + response.status.toString());
        }

        const rawText = await response.text();
        const data = JSON.parse(rawText);
        
        const analysisData = data.results || data; 
        
        // Проверяем, если normality_tests пришел как строка JSON
        if (analysisData.normality_tests && typeof analysisData.normality_tests === 'string') {
          try {
            analysisData.normality_tests = JSON.parse(analysisData.normality_tests);
          } catch (e) {
            console.error("Ошибка при парсинге normality_tests:", e);
          }
        }
        
        // Проверяем, есть ли еще поля в виде строк JSON
        for (const key in analysisData) {
          if (typeof analysisData[key] === 'string' && 
              (analysisData[key].startsWith('{') || analysisData[key].startsWith('['))) {
            try {
              const parsed = JSON.parse(analysisData[key]);
              analysisData[key] = parsed;
            } catch (e) {
              console.error(`Ошибка при парсинге поля ${key}:`, e);
            }
          }
        }
        
        setResults(analysisData);

        if (analysisData?.regression_analysis?.models && analysisData.regression_analysis.models.length > 0) {
          // Сортируем модели по adjusted_r_squared (убывание)
          const sortedModels = [...analysisData.regression_analysis.models].sort((a, b) => {
            const adjR2A = typeof a.adjusted_r_squared === 'number' && !isNaN(a.adjusted_r_squared) ? a.adjusted_r_squared : -Infinity;
            const adjR2B = typeof b.adjusted_r_squared === 'number' && !isNaN(b.adjusted_r_squared) ? b.adjusted_r_squared : -Infinity;
            return adjR2B - adjR2A;
          });
          
          // Выбираем лучшую модель по умолчанию
          setSelectedModelType(sortedModels[0].regression_type);
        }

      } catch (err: any) {
        console.error("Ошибка при получении данных:", err);
        setError(err.message || t('unknown_error_occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchResultDetails()
  }, [id, t])

  if (loading) {
    return <div className="flex justify-center items-center h-64"><RefreshCw className="animate-spin h-8 w-8 text-primary" /> <p className="ml-2">{t('loading_results_message')}</p></div>
  }

  if (error) return <div className="text-red-500 text-center py-10">{t('error_loading_results_message') + ': ' + error}</div>
  if (!results) return <div className="text-center py-10">{t('no_results_found_message')}</div>

  // Проверяем наличие данных нормальности в любом из возможных форматов
  const hasNormalityTests = results.normality_tests && 
    ((results.normality_tests.shapiroWilkResults && results.normality_tests.shapiroWilkResults.length > 0) || 
     (results.normality_tests.chiSquareResults && results.normality_tests.chiSquareResults.length > 0));
  
  // Определяем текущую модель регрессии
  const currentRegressionModel = results?.regression_analysis?.models?.find(m => 
    (m.regression_type === selectedModelType || m.regressionType === selectedModelType)
  );

  // Подготовка данных для DistributionChart
  const histogramChartDataForDistributionChart: Array<{ name: string; bins: number[]; frequencies: number[] }> | undefined = 
    results.descriptive_stats?.histograms.map(hist => ({
      name: hist.columnName,
      bins: hist.bins,
      frequencies: hist.frequencies,
    }));
    
  // Получаем глобальный масштаб для оси Y из утилиты
  const globalYDomain = results?.regression_analysis ? 
    calculateGlobalYDomain(
      results.regression_analysis.data_points || results.regression_analysis.dataPoints || [],
      results.regression_analysis.models || []
    ) : undefined;

  // Исправляем создание пропсов для RegressionChart с поддержкой camelCase полей и добавляем анализ остатков
  const regressionChartProps: RegressionChartProps | undefined = 
    currentRegressionModel && 
    results?.regression_analysis ? {
      data: results.regression_analysis.data_points || 
            results.regression_analysis.dataPoints || [],
      models: [{
        type: currentRegressionModel.regressionType || currentRegressionModel.regression_type || "",
        coefficients: currentRegressionModel.coefficients || [],
        r_squared: currentRegressionModel.rSquared || currentRegressionModel.r_squared || 0,
        residuals: currentRegressionModel.residuals || [],
        // Передаем данные анализа остатков, если они есть, без проверки всех полей
        ...(currentRegressionModel.residuals_analysis ? {
            residuals_analysis: {
              ...(currentRegressionModel.residuals_analysis.shapiro_test && {
                shapiro_test: currentRegressionModel.residuals_analysis.shapiro_test
              }),
              ...(currentRegressionModel.residuals_analysis.histogram && {
                histogram: currentRegressionModel.residuals_analysis.histogram
              }),
              ...(currentRegressionModel.residuals_analysis.qq_plot && {
                qq_plot: currentRegressionModel.residuals_analysis.qq_plot
              })
            }
          } : {})
      }],
      dependentVar: results.regression_analysis.dependent_variable || 
                   results.regression_analysis.dependentVariable || "y",
      independentVar: (results.regression_analysis.independent_variables && 
                      results.regression_analysis.independent_variables.length > 0) ? 
                      results.regression_analysis.independent_variables[0] : 
                      (results.regression_analysis.independentVariables && 
                      results.regression_analysis.independentVariables.length > 0) ?
                      results.regression_analysis.independentVariables[0] : "x",
      height: 500, // Увеличиваем высоту графика для лучшего отображения
      // Передаем глобальный домен для оси Y, чтобы все графики имели одинаковый масштаб
      globalYDomain: globalYDomain
    } : undefined;

  // renderNormalityTestTable определяется здесь, до return
  const renderNormalityTestTable = (testResults: NormalityTestResultData[] | undefined, titleKey: string) => {
    const title = t(titleKey as any); 
    if (!testResults || testResults.length === 0) return <p>{t('no_data_for_test') + ': ' + title}</p>;
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('column_name_header')}</TableHead>
                <TableHead>{t('statistic_header')}</TableHead>
                <TableHead>{t('p_value_header')}</TableHead>
                {testResults[0]?.degreesOfFreedom !== undefined && <TableHead>{t('df_header')}</TableHead>}
                {testResults[0]?.intervals !== undefined &&  <TableHead>{t('intervals_header')}</TableHead>}
                <TableHead>{t('is_normal_header')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testResults.map((res, index) => (
                <TableRow key={index}>
                  <TableCell>{res.columnName}</TableCell>
                  <TableCell>{formatNumber(res.statistic)}</TableCell>
                  <TableCell>{formatNumber(res.pValue)}</TableCell>
                  {res.degreesOfFreedom !== undefined && <TableCell>{res.degreesOfFreedom}</TableCell>}
                  {res.intervals !== undefined && <TableCell>{res.intervals}</TableCell>}
                  <TableCell>
                    {res.isNormal ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle2 size={16} className="mr-1" /> {t('normal_distribution_label')}
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <AlertCircle size={16} className="mr-1" /> {t('not_normal_distribution_label')}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // Добавляем после определения renderNormalityTestTable
  const renderRegressionTabContent = () => {
    if (!results?.regression_analysis?.models || results.regression_analysis.models.length === 0) {
      return <p className="text-center py-4">Нет данных регрессионного анализа</p>;
    }

    // Сортировка моделей по adjusted_r_squared (убывание)
    const sortedModels = [...results.regression_analysis.models].sort((a, b) => {
      const adjR2A = typeof (a.adjusted_r_squared || a.adjustedRSquared) === 'number' && 
                    !isNaN(a.adjusted_r_squared || a.adjustedRSquared || 0) ? 
                    (a.adjusted_r_squared || a.adjustedRSquared || 0) : -Infinity;
      const adjR2B = typeof (b.adjusted_r_squared || b.adjustedRSquared) === 'number' && 
                    !isNaN(b.adjusted_r_squared || b.adjustedRSquared || 0) ? 
                    (b.adjusted_r_squared || b.adjustedRSquared || 0) : -Infinity;
      
      if (adjR2A !== adjR2B) {
        return adjR2B - adjR2A; // 1. По Adjusted R² (убывание)
      }

      const isAQuadratic = (a.regression_type === "Quadratic" || a.regressionType === "Quadratic");
      const isBQuadratic = (b.regression_type === "Quadratic" || b.regressionType === "Quadratic");
      if (isAQuadratic && !isBQuadratic) return -1; // 2. Quadratic предпочтительнее
      if (!isAQuadratic && isBQuadratic) return 1;

      const sseA = typeof a.sse === 'number' && !isNaN(a.sse) ? a.sse : Infinity;
      const sseB = typeof b.sse === 'number' && !isNaN(b.sse) ? b.sse : Infinity;
      if (sseA !== sseB) {
        return sseA - sseB; // 3. По SSE (возрастание)
      }
      
      return (a.regression_type || a.regressionType || "").localeCompare(b.regression_type || b.regressionType || ""); // 4. По имени (алфавитный порядок)
    });

    // Используем переменную currentRegressionModel, объявленную выше
    const currentModel = currentRegressionModel || sortedModels[0];
    const modelType = currentModel.regression_type || currentModel.regressionType || "";

    // Получаем переменные с поддержкой camelCase
    const depVar = results.regression_analysis.dependent_variable || 
                  results.regression_analysis.dependentVariable || "y";
    const indepVars = results.regression_analysis.independent_variables || 
                    results.regression_analysis.independentVariables || [];
    const indepVar = indepVars.length > 0 ? indepVars[0] : "x";

    return (
      <div className="space-y-6">
        {/* Переключатели моделей (кнопки) */}
        <div className="flex flex-wrap gap-2">
          {sortedModels.map((model) => {
            const modelRegType = model.regression_type || model.regressionType || "";
            return (
              <Button
                key={`btn-${modelRegType}`}
                variant={(modelRegType === selectedModelType) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedModelType(modelRegType)}
                className={(modelRegType === selectedModelType) ? "bg-primary text-primary-foreground font-bold" : ""}
              >
                {regressionTypeTranslations[modelRegType] || modelRegType}
              </Button>
            );
          })}
        </div>

        {/* Уравнение регрессии */}
        <div className="bg-blue-50 p-3 rounded-md">
          <p className="font-medium text-blue-800">
            Уравнение регрессии ({regressionTypeTranslations[modelType] || modelType}):
          </p>
          <p className="mt-1 text-sm md:text-base break-all">
            {formatRegressionEquation(
              currentModel, 
              depVar, 
              indepVar
            )}
          </p>
        </div>

        {/* График регрессии */}
        {regressionChartProps && (
          <div className="mt-4" style={{ minHeight: '400px' }}>
            <h4 className="font-semibold mb-2">График регрессии</h4>
            <RegressionChart {...regressionChartProps} />
          </div>
        )}

        {/* Анализ остатков регрессии - переписанный блок */}
        {currentModel && (
          <div className="mt-8">
            {/* Получаем данные анализа остатков, учитывая разные возможные форматы имен полей */}
            {(() => {
              // Поддержка как snake_case, так и camelCase вариантов полей
              const residualsAnalysis = currentModel.residuals_analysis || (currentModel as any).residualsAnalysis;
              
              // Извлекаем shapiroTest
              const shapiroTest = residualsAnalysis?.shapiro_test || residualsAnalysis?.shapiroTest;
              
              // Извлекаем histogram
              const histogram = residualsAnalysis?.histogram;
              
              // Извлекаем qqPlot 
              const qqPlot = residualsAnalysis?.qq_plot || residualsAnalysis?.qqPlot;
              
              // Преобразуем qqPlot в нужный формат, если он существует
              const formattedQqPlot = qqPlot ? {
                theoretical_quantiles: qqPlot.theoretical_quantiles || qqPlot.theoreticalQuantiles,
                sample_quantiles: qqPlot.sample_quantiles || qqPlot.sampleQuantiles
              } : undefined;
              
              return (
                <ResidualsAnalysis 
                  residuals={currentModel.residuals || []}
                  shapiroTest={shapiroTest}
                  histogram={histogram}
                  qqPlot={formattedQqPlot}
                  title={`Анализ остатков регрессии (${regressionTypeTranslations[modelType] || modelType})`}
                  fStatistic={currentModel.f_statistic || currentModel.fStatistic}
                  fPValue={currentModel.prob_f_statistic || currentModel.probFStatistic}
                  coefficients={currentModel.coefficients && currentModel.coefficients.map(coef => ({
                    variable_name: coef.variable_name || coef.variableName || "",
                    coefficient: coef.coefficient,
                    std_error: coef.std_error || coef.stdError,
                    t_statistic: coef.t_statistic || coef.tStatistic,
                    p_value: coef.p_value || coef.pValue,
                    confidence_interval_lower: coef.confidence_interval_lower || coef.confidenceIntervalLower,
                    confidence_interval_upper: coef.confidence_interval_upper || coef.confidenceIntervalUpper
                  }))}
                />
              );
            })()}
          </div>
        )}

        {/* Таблица коэффициентов */}
        {currentModel && currentModel.coefficients && currentModel.coefficients.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Сводка по модели: {regressionTypeTranslations[modelType] || modelType}</h4>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/6">Переменная</TableHead>
                  <TableHead className="w-1/6">Коэффициент</TableHead>
                  <TableHead className="w-1/6">Стд. ошибка</TableHead>
                  <TableHead className="w-1/6">t-статистика</TableHead>
                  <TableHead className="w-1/6">p-значение</TableHead>
                  <TableHead className="w-1/6">Доверительный интервал (95%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentModel.coefficients.map((coef, index) => {
                  // Поддержка как snake_case, так и camelCase имен полей
                  const varName = coef.variable_name || coef.variableName || "";
                  const stdError = coef.std_error || coef.stdError || 0;
                  const tStat = coef.t_statistic || coef.tStatistic || 0;
                  const pValue = coef.p_value || coef.pValue || 0;
                  const ciLower = coef.confidence_interval_lower || coef.confidenceIntervalLower || 0;
                  const ciUpper = coef.confidence_interval_upper || coef.confidenceIntervalUpper || 0;
                  
                  // Определяем отображаемое имя переменной
                  let displayName = varName;
                  if (varName === "const") {
                    displayName = "Константа";
                  } else if (varName === "a") {
                    displayName = "a";
                  } else if (varName === "b") {
                    displayName = "b";
                  } else if (varName === "c") {
                    displayName = "c";
                  } else if (varName === "d") {
                    displayName = "d";
                  } else if (varName.startsWith(indepVar + "^")) {
                    displayName = `${indepVar}^${varName.split("^")[1]}`;
                  } else if (varName.match(/^c\d+$/)) {
                    const degree = parseInt(varName.substring(1));
                    if (degree === 0) displayName = "Константа";
                    else if (degree === 1) displayName = indepVar;
                    else displayName = `${indepVar}^${degree}`;
                  } else if (indepVar && varName === indepVar) {
                    displayName = indepVar;
                  } else if (modelType === "Quadratic" && varName.includes("**2")) {
                    displayName = `${indepVar}²`;
                  }
                  
                  return (
                    <TableRow key={`coef-${index}`}>
                      <TableCell>{displayName}</TableCell>
                      <TableCell>{formatNumber(coef.coefficient)}</TableCell>
                      <TableCell>{formatNumber(stdError)}</TableCell>
                      <TableCell>{formatNumber(tStat)}</TableCell>
                      <TableCell>{formatNumber(pValue, 3, true)}</TableCell>
                      <TableCell>[{formatNumber(ciLower)}, {formatNumber(ciUpper)}]</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Сравнение моделей */}
        {sortedModels.length > 1 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Сравнение моделей регрессии</h4>
            <div className="w-full overflow-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/5">Тип модели</TableHead>
                    <TableHead className="w-1/5">R²</TableHead>
                    <TableHead className="w-1/5">Скорр. R²</TableHead>
                    <TableHead className="w-1/5">F-статистика</TableHead>
                    <TableHead className="w-1/5">SSE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedModels.map((model, index) => {
                    const modelRegType = model.regression_type || model.regressionType || "";
                    return (
                      <TableRow 
                        key={`model-${index}`}
                        className={(modelRegType === selectedModelType) ? "bg-primary/20 font-medium border-l-4 border-l-primary" : ""}
                      >
                        <TableCell>{regressionTypeTranslations[modelRegType] || modelRegType}</TableCell>
                        <TableCell>{formatNumber(model.r_squared || model.rSquared)}</TableCell>
                        <TableCell>{formatNumber(model.adjusted_r_squared || model.adjustedRSquared)}</TableCell>
                        <TableCell>
                          {modelRegType === "Sigmoid" || modelRegType === "Trigonometric" 
                            ? "Не применимо" 
                            : formatNumber(model.f_statistic || model.fStatistic)}
                        </TableCell>
                        <TableCell>{formatNumber(model.sse)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Результаты Анализа (ID: {id})</CardTitle>
        </CardHeader>
        <CardContent>
          {results.error && (
            <Card className="mb-4 border-red-500">
              <CardHeader className="bg-red-50">
                <CardTitle className="text-red-700 flex items-center">
                  <AlertCircle size={20} className="mr-2"/> Ошибка анализа
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p><strong>Код ошибки:</strong> {results.error.code}</p>
                <p><strong>Сообщение:</strong> {results.error.message}</p>
                {results.error.details && results.error.details.length > 0 && (
                  <div className="mt-2">
                    <strong>Детали:</strong>
                    <ul className="list-disc list-inside">
                      {results.error.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <Tabs defaultValue={
            results.descriptive_stats ? "desc_stats" : 
            hasNormalityTests ? "norm_tests" :
            results.regression_analysis ? "reg_analysis" : "logs"
          } className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {results.descriptive_stats && <TabsTrigger value="desc_stats">Описательная статистика</TabsTrigger>}
              {hasNormalityTests && <TabsTrigger value="norm_tests">Проверка нормальности</TabsTrigger>}
              {results.regression_analysis && <TabsTrigger value="reg_analysis">Модели регрессии</TabsTrigger>}
              {results.processing_log && results.processing_log.length > 0 && <TabsTrigger value="logs">Лог обработки</TabsTrigger>}
            </TabsList>

            {results.descriptive_stats && (
              <TabsContent value="desc_stats">
                <Card>
                  <CardHeader><CardTitle>Описательная статистика</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    {results.descriptive_stats.descriptives && results.descriptive_stats.descriptives.length > 0 ? (
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
                          {results.descriptive_stats.descriptives.map((stat, index) => (
                            <TableRow key={`desc-${index}-${stat.variableName}`}>
                              <TableCell>{stat.variableName}</TableCell>
                              <TableCell>{stat.count}</TableCell>
                              <TableCell>{formatNumber(stat.mean)}</TableCell>
                              <TableCell>{formatNumber(stat.median)}</TableCell>
                              <TableCell>
                                {Array.isArray(stat.mode) 
                                  ? (stat.mode.length > 5 || stat.mode.length === Number(stat.count)) 
                                    ? (stat.mode.length === Number(stat.count) ? "Уникальные" : `Множество (${stat.mode.length})`) 
                                    : stat.mode.map((m) => formatNumber(m, 2)).join(", ")
                                  : formatNumber(stat.mode, 2)}
                              </TableCell>
                              <TableCell>{formatNumber(stat.stdDev)}</TableCell>
                              <TableCell>{formatNumber(stat.minValue)}</TableCell>
                              <TableCell>{formatNumber(stat.maxValue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : <p>Нет данных описательной статистики</p>}

                    {/* Гистограммы распределения */}
                    {results.descriptive_stats.histograms && results.descriptive_stats.histograms.length > 0 && histogramChartDataForDistributionChart && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Гистограммы Распределения</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {histogramChartDataForDistributionChart.map((histData, index) => (
                            <div key={`hist-${index}-${histData.name}`} className="border rounded-lg p-4">
                              <h4 className="text-md font-semibold mb-2 text-center">{histData.name}</h4>
                              <DistributionChart 
                                variableName={histData.name} 
                                data={{ 
                                  bins: histData.bins, 
                                  frequencies: histData.frequencies 
                                }} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Доверительные интервалы */}
                    {results.descriptive_stats.confidenceIntervals && results.descriptive_stats.confidenceIntervals.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Доверительные Интервалы</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {results.descriptive_stats.confidenceIntervals.map((ci, index) => (
                            <div key={`ci-${index}-${ci.columnName}`} className="border rounded-lg p-4">
                              <h4 className="text-md font-semibold mb-2 text-center">{ci.columnName}</h4>
                              <div className="space-y-2">
                                <p><strong>Уровень доверия:</strong> {(ci.confidenceLevel * 100).toFixed(0)}%</p>
                                <p><strong>Интервал:</strong> [{formatNumber(ci.lowerBound)}, {formatNumber(ci.upperBound)}]</p>
                                <p><strong>Среднее:</strong> {formatNumber(ci.mean)}</p>
                                <p><strong>Стандартная ошибка:</strong> {formatNumber(ci.standardError)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {hasNormalityTests && (
              <TabsContent value="norm_tests">
                <Card>
                  <CardHeader>
                    <CardTitle>Тесты на Нормальность</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Shapiro-Wilk Test Results */}
                    {results.normality_tests && 
                     results.normality_tests.shapiroWilkResults && 
                     Array.isArray(results.normality_tests.shapiroWilkResults) && 
                     results.normality_tests.shapiroWilkResults.length > 0 ? (
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
                            {results.normality_tests.shapiroWilkResults.map((test, index) => {
                              // Приводим к правильному формату имен полей (camelCase)
                              const formattedTest = {
                                columnName: test.columnName || "неизвестная переменная",
                                statistic: test.statistic || 0,
                                pValue: test.pValue || 0,
                                isNormal: test.isNormal || false
                              };
                              
                              return (
                                <TableRow key={`sw-${index}-${formattedTest.columnName}`}>
                                  <TableCell>{formattedTest.columnName}</TableCell>
                                  <TableCell>{formatNumber(formattedTest.statistic)}</TableCell>
                                  <TableCell>{formatNumber(formattedTest.pValue)}</TableCell>
                                  <TableCell>
                                    {formattedTest.isNormal ? (
                                      <span className="text-green-600 flex items-center">
                                        <CheckCircle2 size={16} className="mr-1" /> Распределение нормальное (p {'>'} 0.05)
                                      </span>
                                    ) : (
                                      <span className="text-red-600 flex items-center">
                                        <AlertCircle size={16} className="mr-1" /> Распределение не нормальное (p {'≤'} 0.05)
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                    
                    {/* Chi-Square Test Results */}
                    {results.normality_tests && 
                     results.normality_tests.chiSquareResults && 
                     Array.isArray(results.normality_tests.chiSquareResults) && 
                     results.normality_tests.chiSquareResults.length > 0 ? (
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
                            {results.normality_tests.chiSquareResults.map((test, index) => {
                              // Приводим к правильному формату имен полей (camelCase)
                              const formattedTest = {
                                columnName: test.columnName || "неизвестная переменная",
                                statistic: test.statistic || 0,
                                pValue: test.pValue || 0,
                                isNormal: test.isNormal || false,
                                degreesOfFreedom: test.degreesOfFreedom || 0,
                                intervals: test.intervals || 0
                              };
                              
                              return (
                                <TableRow key={`chi2-${index}-${formattedTest.columnName}`}>
                                  <TableCell>{formattedTest.columnName}</TableCell>
                                  <TableCell>{formatNumber(formattedTest.statistic)}</TableCell>
                                  <TableCell>{formatNumber(formattedTest.pValue)}</TableCell>
                                  <TableCell>{formattedTest.degreesOfFreedom}</TableCell>
                                  <TableCell>{formattedTest.intervals}</TableCell>
                                  <TableCell>
                                    {formattedTest.isNormal ? (
                                      <span className="text-green-600 flex items-center">
                                        <CheckCircle2 size={16} className="mr-1" /> Распределение нормальное (p {'>'} 0.05)
                                      </span>
                                    ) : (
                                      <span className="text-red-600 flex items-center">
                                        <AlertCircle size={16} className="mr-1" /> Распределение не нормальное (p {'≤'} 0.05)
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}

                    {(!results.normality_tests || 
                     (!results.normality_tests.shapiroWilkResults || !Array.isArray(results.normality_tests.shapiroWilkResults) || !results.normality_tests.shapiroWilkResults.length) && 
                     (!results.normality_tests.chiSquareResults || !Array.isArray(results.normality_tests.chiSquareResults) || !results.normality_tests.chiSquareResults.length)) && (
                      <p className="text-center py-4">Нет данных о нормальности распределения</p>
                    )}

                    {/* Гистограммы распределения с нормальной кривой - только для переменных из тестов нормальности */}
                    {results.descriptive_stats?.histograms && 
                     results.descriptive_stats.histograms.length > 0 && 
                     histogramChartDataForDistributionChart && 
                     results.normality_tests && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Гистограммы распределения с наложенной нормальной кривой</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(() => {
                            // Получаем список всех переменных из тестов нормальности
                            const normalityVariables = new Set<string>();
                            
                            if (results.normality_tests.shapiroWilkResults && Array.isArray(results.normality_tests.shapiroWilkResults)) {
                              results.normality_tests.shapiroWilkResults.forEach(test => {
                                if (test.columnName) normalityVariables.add(test.columnName);
                              });
                            }
                            
                            if (results.normality_tests.chiSquareResults && Array.isArray(results.normality_tests.chiSquareResults)) {
                              results.normality_tests.chiSquareResults.forEach(test => {
                                if (test.columnName) normalityVariables.add(test.columnName);
                              });
                            }
                            
                            // Создаем функцию для поиска соответствия имен переменных
                            const matchVariableName = (histName: string, normalityName: string) => {
                              // Прямое соответствие
                              if (histName === normalityName) return true;
                              
                              // Приведение к нижнему регистру для сравнения
                              const histLower = histName.toLowerCase();
                              const normalityLower = normalityName.toLowerCase();
                              if (histLower === normalityLower) return true;
                              
                              // Удаление пробелов и других общих разделителей
                              const clean = (str: string) => str.replace(/[\s_-]/g, '').toLowerCase();
                              if (clean(histName) === clean(normalityName)) return true;
                              
                              return false;
                            };
                            
                            // Отображаем все гистограммы, если имена переменных не совпадают
                            // Это временное решение, пока проблема с именами не будет решена
                            if (normalityVariables.size === 0 || 
                                !histogramChartDataForDistributionChart.some(histData => 
                                  Array.from(normalityVariables).some(normVar => matchVariableName(histData.name, normVar))
                                )) {
                              return histogramChartDataForDistributionChart.map((histData, index) => (
                                <div key={`norm-hist-${index}-${histData.name}`} className="border rounded-lg p-4">
                                  <h4 className="text-md font-semibold mb-2 text-center">{histData.name}</h4>
                                  <DistributionChart 
                                    variableName={histData.name} 
                                    data={{ 
                                      bins: histData.bins, 
                                      frequencies: histData.frequencies 
                                    }}
                                    showNormalCurve={true}
                                  />
                                </div>
                              ));
                            }
                            
                            // Фильтруем гистограммы только для переменных из тестов
                            const filteredHistograms = histogramChartDataForDistributionChart
                              .filter(histData => 
                                Array.from(normalityVariables).some(normVar => matchVariableName(histData.name, normVar))
                              );
                              
                            // Отображаем сообщение, если нет гистограмм для отображения
                            if (filteredHistograms.length === 0) {
                              return (
                                <div className="col-span-2 text-center py-4">
                                  <p>Нет данных гистограмм для переменных из тестов нормальности</p>
                                </div>
                              );
                            }
                            
                            // Отображаем гистограммы для переменных из тестов
                            return filteredHistograms.map((histData, index) => (
                              <div key={`norm-hist-${index}-${histData.name}`} className="border rounded-lg p-4">
                                <h4 className="text-md font-semibold mb-2 text-center">{histData.name}</h4>
                                <DistributionChart 
                                  variableName={histData.name} 
                                  data={{ 
                                    bins: histData.bins, 
                                    frequencies: histData.frequencies 
                                  }}
                                  showNormalCurve={true}
                                />
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {results.regression_analysis && (
              <TabsContent value="reg_analysis">
                <Card>
                  <CardHeader>
                    <CardTitle>Регрессионный Анализ</CardTitle>
                    <CardDescription>
                      Зависимая переменная: {results.regression_analysis.dependent_variable || 
                        results.regression_analysis.dependentVariable || 'Не указана'} <br />
                      Независимые переменные: {results.regression_analysis.independent_variables ? 
                        results.regression_analysis.independent_variables.join(', ') : 
                        results.regression_analysis.independentVariables ?
                        results.regression_analysis.independentVariables.join(', ') :
                        'Не указаны'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderRegressionTabContent()}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {results.processing_log && results.processing_log.length > 0 && (
              <TabsContent value="logs">
                <Card>
                  <CardHeader>
                    <CardTitle>Лог обработки</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">
                      {results.processing_log.join('\n')}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
};

export default AnalysisResultPage
