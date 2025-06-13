"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface HistogramData {
  bins: number[]; // Bin edges (N+1)
  frequencies: number[]; // Frequencies per bin (N)
  normal_curve_x?: number[]; // X-координаты точек нормальной кривой (опционально)
  normal_curve_y?: number[]; // Y-координаты точек нормальной кривой (опционально)
  normalCurveX?: number[]; // Альтернативное имя для X-координат (camelCase формат)
  normalCurveY?: number[]; // Альтернативное имя для Y-координат (camelCase формат)
  mean?: number; // Среднее значение для нормальной кривой
  std_dev?: number; // Стандартное отклонение для нормальной кривой
  stdDev?: number; // Альтернативное имя для стандартного отклонения (camelCase формат)
}

interface DistributionChartProps {
  data: HistogramData;
  variableName: string;
  showNormalCurve?: boolean; // Этот параметр оставляем для обратной совместимости, но игнорируем
}

// Updated component to accept props and draw a single histogram
export function DistributionChart({ data, variableName }: DistributionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isMounted, setIsMounted] = useState(false); // State for client-side check

  // Ensure component only runs client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Проверяем наличие данных нормальной кривой в props
    console.log(`[DistributionChart] Props check for ${variableName}:`, {
      data_keys: Object.keys(data || {}),
      has_normal_curve_x: !!data?.normal_curve_x,
      normal_curve_x_length: data?.normal_curve_x?.length || 0,
      has_normal_curve_y: !!data?.normal_curve_y,
      normal_curve_y_length: data?.normal_curve_y?.length || 0
    });
    
    // Проверяем альтернативные имена полей через any
    const anyData = data as any;
    if (anyData) {
      console.log(`[DistributionChart] Alternative field names check for ${variableName}:`, {
        has_normalCurveX: !!anyData.normalCurveX,
        normalCurveX_length: anyData.normalCurveX?.length || 0,
        has_normalCurveY: !!anyData.normalCurveY,
        normalCurveY_length: anyData.normalCurveY?.length || 0
      });
    }
    
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
    
    // Отладочный вывод для проверки данных
    console.log(`[DistributionChart] Rendering chart for ${variableName}`);
    console.log(`[DistributionChart] Bins: ${data.bins?.length || 0}, Frequencies: ${data.frequencies?.length || 0}`);
    console.log(`[DistributionChart] Normal curve data:`, {
      hasNormalCurveX: !!data.normal_curve_x && data.normal_curve_x.length > 0,
      normalCurveXLength: data.normal_curve_x?.length || 0,
      hasNormalCurveY: !!data.normal_curve_y && data.normal_curve_y.length > 0,
      normalCurveYLength: data.normal_curve_y?.length || 0
    });
    
    // Дополнительная проверка для отладки
    console.log("[DistributionChart] Full data object keys:", Object.keys(data));
    if (data.normal_curve_x) {
      console.log("[DistributionChart] normal_curve_x is present");
    } else {
      console.log("[DistributionChart] normal_curve_x is missing");
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

    // Отступы для графика
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
    
    // Если есть данные нормальной кривой, учитываем их при определении границ
    if (data.normal_curve_x && data.normal_curve_x.length > 0) {
      xMin = Math.min(xMin, Math.min(...data.normal_curve_x));
      xMax = Math.max(xMax, Math.max(...data.normal_curve_x));
    }
    
    // Максимум частоты для масштаба Y
    const histogramMax = d3.max(histFrequencies) || 1;
    let yMax = histogramMax * 1.1; // Небольшой отступ сверху
    
    // Если есть данные нормальной кривой, учитываем их при определении максимума Y
    if (data.normal_curve_y && data.normal_curve_y.length > 0) {
      const normalCurveMax = d3.max(data.normal_curve_y) || 0;
      yMax = Math.max(yMax, normalCurveMax * 1.1);
    }

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
    
    // --- Draw Normal Curve if data is available ---
    const normalCurveX = data.normal_curve_x || data.normalCurveX;
    const normalCurveY = data.normal_curve_y || data.normalCurveY;
    
    if (normalCurveX && normalCurveY && 
        normalCurveX.length > 0 && normalCurveY.length > 0) {
      
      console.log(`[DistributionChart] Drawing normal curve for ${variableName} with ${normalCurveX.length} points`);
      console.log(`[DistributionChart] X range: [${Math.min(...normalCurveX)}, ${Math.max(...normalCurveX)}]`);
      console.log(`[DistributionChart] Y range: [${Math.min(...normalCurveY)}, ${Math.max(...normalCurveY)}]`);
      
      // Вывод первых 5 точек для отладки
      console.log("[DistributionChart] First 5 points:", normalCurveX.slice(0, 5).map((x: number, i: number) => ({
        x: x,
        y: normalCurveY?.[i] || 0
      })));
      
      // Создаем массив точек для кривой
      const curvePoints = normalCurveX.map((x: number, i: number) => ({
        x: x,
        y: normalCurveY?.[i] || 0
      }));
      
      // Рисуем кривую
      const line = d3.line<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveBasis); // Сглаживаем кривую
      
      try {
        const path = svg.append("path")
          .datum(curvePoints)
          .attr("fill", "none")
          .attr("stroke", "#e53e3e")
          .attr("stroke-width", 2)
          .attr("d", line);
          
        console.log(`[DistributionChart] Normal curve path created: ${path.attr("d")}`);
      } catch (error) {
        console.error(`[DistributionChart] Error drawing normal curve:`, error);
      }
        
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
    }

  }, [data, variableName, isMounted]);

  return (
    <div className="w-full h-64">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
}
