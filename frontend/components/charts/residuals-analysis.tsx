"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

export interface RegressionCoefficient {
  variable_name: string;
  coefficient: number;
  std_error?: number;
  t_statistic?: number;
  p_value?: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
}

interface ResidualsAnalysisProps {
  residuals: number[];
  shapiroTest?: {
    statistic: number;
    p_value: number;
    is_normal: boolean;
  };
  histogram?: {
    bins: number[];
    frequencies: number[];
  };
  qqPlot?: {
    theoretical_quantiles: number[];
    sample_quantiles: number[];
  };
  title?: string;
  fStatistic?: number;
  fPValue?: number;
  coefficients?: RegressionCoefficient[];
}

export function ResidualsAnalysis({ 
  residuals, 
  shapiroTest, 
  histogram, 
  qqPlot,
  title = "Анализ остатков регрессии",
  fStatistic,
  fPValue,
  coefficients
}: ResidualsAnalysisProps) {
  const [isMounted, setIsMounted] = useState(false);
  const histogramRef = useRef<SVGSVGElement>(null);
  const qqPlotRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !residuals || residuals.length === 0) return;
    
    // Добавляем логирование для отладки
    console.log("ResidualsAnalysis useEffect", {
      isMounted,
      residualsLength: residuals.length,
      histogram: histogram ? {
        binsLength: histogram.bins?.length,
        frequenciesLength: histogram.frequencies?.length
      } : null,
      qqPlot: qqPlot ? {
        theoreticalQuantilesLength: qqPlot.theoretical_quantiles?.length,
        sampleQuantilesLength: qqPlot.sample_quantiles?.length,
        theoreticalQuantiles: qqPlot.theoretical_quantiles?.slice(0, 5),
        sampleQuantiles: qqPlot.sample_quantiles?.slice(0, 5)
      } : null
    });
    
    // Проверяем, что histogram содержит все необходимые данные
    if (histogram && histogram.bins && histogram.bins.length > 0 && 
        histogram.frequencies && histogram.frequencies.length > 0 && 
        histogramRef.current) {
      renderHistogram();
    }
    
    // Проверяем, что qqPlot содержит все необходимые данные
    if (qqPlot && qqPlot.theoretical_quantiles && qqPlot.theoretical_quantiles.length > 0 && 
        qqPlot.sample_quantiles && qqPlot.sample_quantiles.length > 0 && 
        qqPlotRef.current) {
      renderQQPlot();
    } else {
      console.log("Не удается отрисовать QQ-график. Условия не выполнены:", {
        qqPlotExists: !!qqPlot,
        theoreticalQuantilesExists: qqPlot?.theoretical_quantiles ? true : false,
        theoreticalQuantilesLength: qqPlot?.theoretical_quantiles?.length,
        sampleQuantilesExists: qqPlot?.sample_quantiles ? true : false,
        sampleQuantilesLength: qqPlot?.sample_quantiles?.length,
        qqPlotRefExists: qqPlotRef.current ? true : false
      });
    }
  }, [isMounted, residuals, histogram, qqPlot]);

  // Функция рендеринга гистограммы
  const renderHistogram = () => {
    if (!histogram || !histogram.bins || !histogram.frequencies || 
        histogram.bins.length === 0 || histogram.frequencies.length === 0 || 
        !histogramRef.current) return;
    
    // Очистка предыдущего графика
    d3.select(histogramRef.current).selectAll("*").remove();
    
    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select(histogramRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Создание шкал
    const x = d3.scaleLinear()
      .domain([d3.min(histogram.bins) || 0, d3.max(histogram.bins) || 1])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(histogram.frequencies) || 1])
      .range([height, 0]);
    
    // Добавление осей
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .style("font-size", "12px");
    
    svg.append("g")
      .call(d3.axisLeft(y))
      .style("font-size", "12px");
    
    // Добавление подписей осей
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Значение остатка")
      .style("font-size", "14px")
      .style("font-weight", "bold");
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -height / 2)
      .text("Частота")
      .style("font-size", "14px")
      .style("font-weight", "bold");

    // Добавляем заголовок
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Гистограмма остатков");
    
    // Рисование столбцов гистограммы
    for (let i = 0; i < histogram.frequencies.length; i++) {
      if (i < histogram.bins.length - 1) {
        svg.append("rect")
          .attr("x", x(histogram.bins[i]))
          .attr("y", y(histogram.frequencies[i]))
          .attr("width", x(histogram.bins[i + 1]) - x(histogram.bins[i]))
          .attr("height", height - y(histogram.frequencies[i]))
          .attr("fill", "#6366f1")
          .attr("opacity", 0.8)
          .attr("stroke", "#4338ca")
          .attr("stroke-width", 1);
      }
    }
  };

  // Функция рендеринга QQ-графика
  const renderQQPlot = () => {
    if (!qqPlot || !qqPlot.theoretical_quantiles || !qqPlot.sample_quantiles ||
        qqPlot.theoretical_quantiles.length === 0 || qqPlot.sample_quantiles.length === 0 ||
        !qqPlotRef.current) {
      console.log("Выход из renderQQPlot из-за невыполнения условий");
      return;
    }
    
    // Логируем данные перед отрисовкой
    console.log("Рисуем QQ-график с данными:", {
      theoreticalQuantiles: qqPlot.theoretical_quantiles.slice(0, 5),
      sampleQuantiles: qqPlot.sample_quantiles.slice(0, 5),
      theoreticalLength: qqPlot.theoretical_quantiles.length,
      sampleLength: qqPlot.sample_quantiles.length
    });
    
    try {
      // Очистка предыдущего графика
      d3.select(qqPlotRef.current).selectAll("*").remove();
      
      const margin = { top: 30, right: 30, bottom: 50, left: 60 };
      const width = 500 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;
      
      const svg = d3.select(qqPlotRef.current)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // Создание шкал
      const x = d3.scaleLinear()
        .domain([d3.min(qqPlot.theoretical_quantiles) || -3, d3.max(qqPlot.theoretical_quantiles) || 3])
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([d3.min(qqPlot.sample_quantiles) || -3, d3.max(qqPlot.sample_quantiles) || 3])
        .range([height, 0]);
      
      // Добавление осей
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .style("font-size", "12px");
      
      svg.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "12px");
      
      // Добавление подписей осей
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("Теоретические квантили")
        .style("font-size", "14px")
        .style("font-weight", "bold");
      
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text("Эмпирические квантили")
        .style("font-size", "14px")
        .style("font-weight", "bold");
        
      // Добавляем заголовок
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("QQ-график (проверка нормальности)");
      
      // Рисование линии y = x (идеальное соответствие)
      const xDomain = x.domain();
      const yDomain = y.domain();
      const minBoth = Math.min(xDomain[0], yDomain[0]);
      const maxBoth = Math.max(xDomain[1], yDomain[1]);
      
      // Добавление фона для выделения идеальной линии
      svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f8fafc")
        .attr("opacity", 0.5);
      
      svg.append("line")
        .attr("x1", x(minBoth))
        .attr("y1", y(minBoth))
        .attr("x2", x(maxBoth))
        .attr("y2", y(maxBoth))
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,3");
      
      // Рисование точек
      svg.selectAll("circle")
        .data(qqPlot.theoretical_quantiles.map((q, i) => ({ theoretical: q, sample: qqPlot.sample_quantiles[i] })))
        .enter()
        .append("circle")
        .attr("cx", d => x(d.theoretical))
        .attr("cy", d => y(d.sample))
        .attr("r", 4)
        .attr("fill", "#6366f1")
        .attr("stroke", "#4338ca")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8);
        
      console.log("QQ-график успешно отрисован");
    } catch (error) {
      console.error("Ошибка при отрисовке QQ-графика:", error);
    }
  };
  
  // Функция для определения значимости p-value
  const getSignificanceStars = (pValue: number): string => {
    if (pValue <= 0.001) return "***";
    if (pValue <= 0.01) return "**";
    if (pValue <= 0.05) return "*";
    return "";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Показываем информацию о F-критерии, если она есть и если это не сигмоидная/тригонометрическая модель */}
        {title && (title.includes("Trigonometric") || title.includes("Тригонометрическ") || title.includes("Sigmoid") || title.includes("Сигмоидн")) ? (
          <div className="mb-6 p-4 border rounded-md bg-yellow-50">
            <h4 className="text-lg font-medium mb-2">Примечание о статистических критериях</h4>
            <p className="text-sm mb-1">
              F-критерий и t-критерии не применимы для нелинейных моделей типа сигмоидной и тригонометрической регрессии.
            </p>
            <p className="text-sm mb-1">
              Эти критерии разработаны для линейных моделей и могут давать некорректные результаты при оценке нелинейных зависимостей.
            </p>
          </div>
        ) : (
          fStatistic !== undefined && fPValue !== undefined && !isNaN(fStatistic) && !isNaN(fPValue) && (
            <div className="mb-6 p-4 border rounded-md bg-blue-50">
              <h4 className="text-lg font-medium mb-2">F-критерий</h4>
              <p className="text-sm mb-1">F-статистика: {fStatistic.toFixed(4)}</p>
              <p className="text-sm mb-1">p-значение: {fPValue.toExponential(10)} {getSignificanceStars(fPValue)}</p>
              <p className="text-sm font-semibold">
                Вывод: {fPValue <= 0.05 
                  ? "Модель статистически значима (p ≤ 0.05)" 
                  : "Модель статистически не значима (p > 0.05)"}
              </p>
            </div>
          )
        )}
        
        
        
        {shapiroTest && (
          <div className="mb-6 p-4 border rounded-md">
            <h4 className="text-lg font-medium mb-2">Тест Шапиро-Уилка</h4>
            <p className="text-sm mb-1">Статистика: {shapiroTest.statistic.toFixed(4)}</p>
            <p className="text-sm mb-1">p-значение: {shapiroTest.p_value.toExponential(10)}</p>
            <p className="text-sm font-semibold">
              Вывод: {shapiroTest.is_normal 
                ? "Остатки имеют нормальное распределение (p > 0.05)" 
                : "Остатки не имеют нормального распределения (p ≤ 0.05)"}
            </p>
          </div>
        )}
        
        {/* Контейнер с графиками рядом друг с другом */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-center items-center bg-white p-2 rounded-lg border">
            <svg ref={histogramRef} width="500" height="400" className="max-w-full"></svg>
          </div>
          
          <div className="flex justify-center items-center bg-white p-2 rounded-lg border">
            <svg ref={qqPlotRef} width="500" height="400" className="max-w-full"></svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 