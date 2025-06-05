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
    pValue?: number;
    isNormal?: boolean;
  };
  histogram?: {
    bins: number[];
    frequencies: number[];
  };
  qqPlot?: {
    theoretical_quantiles: number[];
    sample_quantiles: number[];
    theoreticalQuantiles?: number[];
    sampleQuantiles?: number[];
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

  const normalizedShapiroTest = shapiroTest ? {
    statistic: shapiroTest.statistic,
    p_value: shapiroTest.p_value || shapiroTest.pValue || 0,
    is_normal: shapiroTest.is_normal || shapiroTest.isNormal || false
  } : undefined;

  const normalizedQQPlot = qqPlot ? {
    theoretical_quantiles: qqPlot.theoretical_quantiles || qqPlot.theoreticalQuantiles || [],
    sample_quantiles: qqPlot.sample_quantiles || qqPlot.sampleQuantiles || []
  } : undefined;

  useEffect(() => {
    if (!isMounted) return;
    
    console.log("ResidualsAnalysis useEffect", {
      isMounted,
      residualsLength: residuals?.length || 0,
      normalizedShapiroTest,
      histogram,
      normalizedQQPlot
    });
    
    if (histogram && histogram.bins && histogram.bins.length > 0 && 
        histogram.frequencies && histogram.frequencies.length > 0 && 
        histogramRef.current) {
      renderHistogram();
    }
    
    if (normalizedQQPlot && 
        normalizedQQPlot.theoretical_quantiles && normalizedQQPlot.theoretical_quantiles.length > 0 && 
        normalizedQQPlot.sample_quantiles && normalizedQQPlot.sample_quantiles.length > 0 && 
        qqPlotRef.current) {
      renderQQPlot();
    }
  }, [isMounted, residuals, histogram, normalizedQQPlot]);

  const renderHistogram = () => {
    if (!histogram || !histogram.bins || !histogram.frequencies || 
        histogram.bins.length === 0 || histogram.frequencies.length === 0 || 
        !histogramRef.current) return;
    
    d3.select(histogramRef.current).selectAll("*").remove();
    
    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select(histogramRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleLinear()
      .domain([d3.min(histogram.bins) || 0, d3.max(histogram.bins) || 1])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(histogram.frequencies) || 1])
      .range([height, 0]);
    
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .style("font-size", "12px");
    
    svg.append("g")
      .call(d3.axisLeft(y))
      .style("font-size", "12px");
    
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

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Гистограмма остатков");
    
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

  const renderQQPlot = () => {
    if (!normalizedQQPlot || 
        !normalizedQQPlot.theoretical_quantiles || 
        !normalizedQQPlot.sample_quantiles ||
        normalizedQQPlot.theoretical_quantiles.length === 0 || 
        normalizedQQPlot.sample_quantiles.length === 0 ||
        !qqPlotRef.current) {
      console.log("Выход из renderQQPlot из-за невыполнения условий");
      return;
    }
    
    d3.select(qqPlotRef.current).selectAll("*").remove();
    
    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select(qqPlotRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleLinear()
      .domain([d3.min(normalizedQQPlot.theoretical_quantiles) || -3, d3.max(normalizedQQPlot.theoretical_quantiles) || 3])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([d3.min(normalizedQQPlot.sample_quantiles) || -3, d3.max(normalizedQQPlot.sample_quantiles) || 3])
      .range([height, 0]);
    
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .style("font-size", "12px");
    
    svg.append("g")
      .call(d3.axisLeft(y))
      .style("font-size", "12px");
    
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
        
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("QQ-график (проверка нормальности)");
      
    const xDomain = x.domain();
    const yDomain = y.domain();
    const minBoth = Math.min(xDomain[0], yDomain[0]);
    const maxBoth = Math.max(xDomain[1], yDomain[1]);
      
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
      
    svg.selectAll("circle")
      .data(normalizedQQPlot.theoretical_quantiles.map((q, i) => ({ 
        theoretical: q, 
        sample: normalizedQQPlot.sample_quantiles[i] 
      })))
      .enter()
      .append("circle")
      .attr("cx", d => x(d.theoretical))
      .attr("cy", d => y(d.sample))
      .attr("r", 4)
      .attr("fill", "#6366f1")
      .attr("stroke", "#4338ca")
      .attr("stroke-width", 1)
      .attr("opacity", 0.8);
  };
  
  const getSignificanceStars = (pValue: number): string => {
    if (pValue <= 0.001) return "***";
    if (pValue <= 0.01) return "**";
    if (pValue <= 0.05) return "*";
    return "";
  };

  const isNonlinearModel = title && (title.includes("Trigonometric") || title.includes("Тригонометрическ") || title.includes("Sigmoid") || title.includes("Сигмоидн"));
  
  const hasResidualsData = (residuals && residuals.length > 0) || normalizedShapiroTest || histogram || normalizedQQPlot;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        
        {hasResidualsData && (
          <>
            {normalizedShapiroTest && (
              <div className="mb-6 p-4 border rounded-md">
                <h4 className="text-lg font-medium mb-2">Тест Шапиро-Уилка</h4>
                <p className="text-sm mb-1">Статистика: {normalizedShapiroTest.statistic.toFixed(4)}</p>
                <p className="text-sm mb-1">p-значение: {normalizedShapiroTest.p_value.toExponential(10)}</p>
                <p className="text-sm font-semibold">
                  Вывод: {normalizedShapiroTest.is_normal 
                    ? "Остатки имеют нормальное распределение (p > 0.05)" 
                    : "Остатки не имеют нормального распределения (p ≤ 0.05)"}
                </p>
              </div>
            )}
            
            {(histogram || normalizedQQPlot) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {histogram && histogram.bins && histogram.frequencies && (
                  <div className="flex justify-center items-center bg-white p-2 rounded-lg border">
                    <svg ref={histogramRef} width="500" height="400" className="max-w-full"></svg>
                  </div>
                )}
                
                {normalizedQQPlot && normalizedQQPlot.theoretical_quantiles && normalizedQQPlot.sample_quantiles && (
                  <div className="flex justify-center items-center bg-white p-2 rounded-lg border">
                    <svg ref={qqPlotRef} width="500" height="400" className="max-w-full"></svg>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {!hasResidualsData && coefficients && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <p className="text-sm text-gray-600">
              Полный анализ остатков регрессии не доступен. Это может происходить из-за недостаточного количества данных, особенностей нелинейной модели или других ограничений алгоритма анализа. Доступны только статистические критерии и коэффициенты модели.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 