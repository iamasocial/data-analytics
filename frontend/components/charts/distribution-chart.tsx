"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface HistogramData {
  bins: number[]; // Bin edges (N+1)
  frequencies: number[]; // Frequencies per bin (N)
}

interface DistributionChartProps {
  data: HistogramData;
  variableName: string;
  showNormalCurve?: boolean; // Опция для отображения нормальной кривой
}

// Updated component to accept props and draw a single histogram
export function DistributionChart({ data, variableName, showNormalCurve = false }: DistributionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isMounted, setIsMounted] = useState(false); // State for client-side check

  // Ensure component only runs client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Wait until mounted and basic data/ref checks pass
    if (!isMounted) {
      return;
    }
    
    if (!svgRef.current) {
      return;
    }
    
    if (!data) {
      return;
    }
    
    if (!data.bins || data.bins.length < 2) {
      return;
    }
    
    if (!data.frequencies || data.frequencies.length === 0) {
      return;
    }

    // --- Data Preparation ---
    // Ensure bins and frequencies match up (N+1 edges, N frequencies)
    let histBins = data.bins;
    let histFrequencies = data.frequencies;
    
    if (histBins.length !== histFrequencies.length + 1) {
      // Попытка корректировки данных для отображения
      let adjustedBins = [...histBins];
      let adjustedFrequencies = [...histFrequencies];
      
      if (histBins.length < histFrequencies.length + 1) {
        // Не хватает граничных значений, добавляем недостающие
        while (adjustedBins.length < adjustedFrequencies.length + 1) {
          const lastBin = adjustedBins[adjustedBins.length - 1];
          const binWidth = adjustedBins[1] - adjustedBins[0];
          adjustedBins.push(lastBin + binWidth);
        }
      } else if (histBins.length > histFrequencies.length + 1) {
        // Лишние граничные значения, обрезаем до нужной длины
        adjustedBins = adjustedBins.slice(0, adjustedFrequencies.length + 1);
      }
      
      // Используем скорректированные данные
      if (adjustedBins.length === adjustedFrequencies.length + 1) {
        // Заменяем исходные данные на скорректированные
        histBins = adjustedBins;
        histFrequencies = adjustedFrequencies;
      } else {
        return; // Пропускаем отрисовку
      }
    }

    // --- D3 Setup ---
    d3.select(svgRef.current).selectAll("*").remove(); // Clear previous chart

    // Увеличим отступы для лучшего отображения нормальной кривой
    const margin = { top: 30, right: 40, bottom: 50, left: 60 };
    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight > 0 ? svgRef.current.clientHeight : 300;
    if (containerWidth <= 0) {
        console.warn("[DistributionChart] Container width is 0, skipping render.");
        return;
    } 

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    if (width <= 0 || height <= 0) {
        console.warn("[DistributionChart] Calculated chart dimensions are non-positive, skipping render.");
        return;
    } 

    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales ---
    // Create data pairs for bars: {x0, x1, frequency}
    const barData = histFrequencies.map((freq, i) => ({
        x0: histBins[i],
        x1: histBins[i+1],
        frequency: freq
    }));

    // Расчет границ для графика
    let xMin = histBins[0];
    let xMax = histBins[histBins.length - 1];
    
    // Вычисляем параметры нормального распределения, если нужна нормальная кривая
    let mean = 0;
    let stdDev = 1;
    
    if (showNormalCurve) {
      // Вычисляем среднее через взвешенную сумму середин интервалов
      const binMidpoints = barData.map(d => (d.x0 + d.x1) / 2);
      let totalCount = 0;
      let weightedSum = 0;
      
      binMidpoints.forEach((midpoint, i) => {
        weightedSum += midpoint * histFrequencies[i];
        totalCount += histFrequencies[i];
      });
      
      // Среднее
      mean = totalCount > 0 ? weightedSum / totalCount : 0;
      
      // Теперь вычисляем дисперсию
      let weightedSumSquaredDeviations = 0;
      binMidpoints.forEach((midpoint, i) => {
        weightedSumSquaredDeviations += histFrequencies[i] * Math.pow(midpoint - mean, 2);
      });
      
      // Стандартное отклонение
      stdDev = totalCount > 1 ? Math.sqrt(weightedSumSquaredDeviations / (totalCount - 1)) : 1;
      
      // Умеренно расширяем границы для лучшего отображения нормальной кривой
      // Используем 2.5 стандартных отклонения в обе стороны от среднего
      const dataRange = xMax - xMin;
      const minExtension = Math.max(mean - 2.5 * stdDev, xMin - dataRange * 0.1);
      const maxExtension = Math.min(mean + 2.5 * stdDev, xMax + dataRange * 0.1);
      
      // Обновляем границы
      xMin = Math.min(xMin, minExtension);
      xMax = Math.max(xMax, maxExtension);
    }
    
    // Максимум частоты для масштаба Y
    const histogramMax = d3.max(histFrequencies) || 1;
    const yMax = histogramMax * 1.1; // Небольшой отступ сверху

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

    // --- Axes ---
    const optimalXTickCount = Math.max(5, Math.min(10, Math.floor(width / 80)));
    
    svg.append("g")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(xScale)
         .ticks(optimalXTickCount)
         .tickSizeOuter(0));

    svg.append("g")
       .call(d3.axisLeft(yScale)
         .ticks(Math.min(10, Math.max(5, Math.floor(histogramMax))))
         .tickFormat(d3.format("d"))); // Форматируем как целые числа

    // Axis Labels
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("x", width / 2)
       .attr("y", height + margin.bottom - 10)
       .text(variableName);

    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("transform", "rotate(-90)")
       .attr("y", -margin.left + 15)
       .attr("x", -height / 2)
       .text("Частота");
       
    // --- Draw Bars ---
    svg.selectAll("rect.histogram-bar")
       .data(barData)
       .enter()
       .append("rect")
       .attr("class", "histogram-bar") 
       .attr("x", d => xScale(d.x0))
       .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
       .attr("y", d => yScale(d.frequency))
       .attr("height", d => height - yScale(d.frequency))
       .style("fill", "#4c51bf")
       .style("opacity", 0.8)
       .style("stroke", "#2d3748")
       .style("stroke-width", 1);

    // --- Draw Normal Curve if requested ---
    if (showNormalCurve) {
      try {
        // Функция плотности нормального распределения
        const normalDensity = (x: number) => {
          return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
                 Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
        };

        // Определяем ширину бина
        const avgBinWidth = barData.reduce((sum, d) => sum + (d.x1 - d.x0), 0) / barData.length;
        
        // Масштабируем кривую нормального распределения
        const totalFrequency = d3.sum(histFrequencies);
        
        // Масштабный коэффициент для приоритета гистограммы
        const maxNormalHeight = normalDensity(mean);
        const targetHeight = histogramMax * 0.95; // Ниже максимума гистограммы
        const scaleFactor = targetHeight / maxNormalHeight;
        
        // Создаем точки для кривой нормального распределения
        const numPoints = 200; // Много точек для плавной кривой
        const step = (xMax - xMin) / numPoints;
        
        const normalCurvePoints = Array.from({ length: numPoints + 1 }, (_, i) => {
          const x = xMin + i * step;
          const y = normalDensity(x) * scaleFactor;
          return { x, y };
        });
        
        // Рисуем кривую
        const line = d3.line<{x: number, y: number}>()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveBasis); // Сглаживаем кривую
        
        svg.append("path")
          .datum(normalCurvePoints)
          .attr("fill", "none")
          .attr("stroke", "#e53e3e")
          .attr("stroke-width", 2)
          .attr("d", line);
          
        // Добавляем легенду
        const legendX = width - 120;
        const legendY = 20;
        
        // Прямоугольник для гистограммы
        svg.append("rect")
          .attr("x", legendX - 25)
          .attr("y", legendY)
          .attr("width", 20)
          .attr("height", 10)
          .style("fill", "#4c51bf")
          .style("opacity", 0.8)
          .style("stroke", "#2d3748")
          .style("stroke-width", 1);
        
        // Надпись для гистограммы
        svg.append("text")
          .attr("x", legendX)
          .attr("y", legendY + 8)
          .text("Наблюдаемое")
          .style("font-size", "12px")
          .attr("alignment-baseline", "middle");
        
        // Линия для нормальной кривой
        svg.append("line")
          .attr("x1", legendX - 25)
          .attr("y1", legendY + 25)
          .attr("x2", legendX - 5)
          .attr("y2", legendY + 25)
          .style("stroke", "#e53e3e")
          .style("stroke-width", 2);
        
        // Надпись для нормальной кривой
        svg.append("text")
          .attr("x", legendX)
          .attr("y", legendY + 25)
          .text("Нормальное")
          .style("font-size", "12px")
          .attr("alignment-baseline", "middle");
      } catch (error) {
        console.error("[DistributionChart] Error drawing normal curve:", error);
      }
    }

  }, [data, variableName, isMounted, showNormalCurve]); // Добавляем showNormalCurve в зависимости

  // Conditionally render svg only when mounted
  if (!isMounted) {
    return <div className="w-full h-64 flex items-center justify-center text-gray-500">Загрузка графика...</div>; // Placeholder during mount
  }

  return (
    <div className="w-full h-64"> {/* Set a fixed height or make it responsive */}
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
