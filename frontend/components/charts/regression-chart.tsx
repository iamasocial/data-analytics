"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface DataPoint {
  x: number;
  y: number;
}

interface RegressionModel {
  type: string;
  coefficients: {
    variable_name: string;
    coefficient: number;
  }[];
  r_squared: number;
}

interface RegressionChartProps {
  data: DataPoint[];
  models: RegressionModel[];
  dependentVar: string;
  independentVar: string;
  height?: number; // Optional height prop
}

// Function to calculate Y values based on regression type and coefficients
function calculateY(x: number, modelType: string, coefficients: {variable_name: string, coefficient: number}[]): number {
  // Найдем коэффициенты в зависимости от имен
  const intercept = coefficients.find((c) => c.variable_name === "const" || c.variable_name === "intercept")?.coefficient || 0;
  
  // Для полиномиальной регрессии нам нужны все коэффициенты
  if (modelType === "Polynomial") {
    let y = intercept;
    coefficients.forEach(coef => {
      if (coef.variable_name !== "const" && coef.variable_name !== "intercept") {
        // Проверяем, содержит ли имя переменной номер степени (например, "x^2")
        const degreeMatch = coef.variable_name.match(/\^(\d+)/);
        const degree = degreeMatch ? parseInt(degreeMatch[1]) : 1;
        y += coef.coefficient * Math.pow(x, degree);
      }
    });
    return y;
  }
  
  // Для других типов регрессии находим один основной коэффициент (slope)
  const slope = coefficients.find((c) => 
    c.variable_name !== "const" && 
    c.variable_name !== "intercept")?.coefficient || 0;
  
  // Расчет в зависимости от типа регрессии
  switch(modelType) {
    case "Linear":
      return intercept + slope * x;
    case "Quadratic": {
      const a = coefficients.find(c => c.variable_name === "a")?.coefficient ?? 0;
      const b = coefficients.find(c => c.variable_name === "b")?.coefficient ?? 0;
      const c_quad = coefficients.find(c => c.variable_name === "c")?.coefficient ?? 0;
      // Важно: для квадратичной y = ax^2 + bx + c, 'c' является свободным членом.
      // 'intercept' здесь может быть нерелевантен, если он ищет 'const'.
      return a * x * x + b * x + c_quad;
    }
    case "Logarithmic":
      // Защита от логарифма отрицательного числа
      return intercept + slope * (x > 0 ? Math.log(x) : 0);
    case "Exponential":
      // y = a * e^(b*x)
      // В этом случае intercept это ln(a), поэтому a = e^intercept
      return Math.exp(intercept) * Math.exp(slope * x);
    case "Power":
      // y = a * x^b
      // В этом случае также intercept это ln(a)
      return x > 0 ? Math.exp(intercept) * Math.pow(x, slope) : 0;
    default:
      return intercept + slope * x; // Default to linear as fallback
  }
}

export function RegressionChart({ data, models, dependentVar, independentVar, height = 600 }: RegressionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only runs client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Rendering logic
  useEffect(() => {
    if (!isMounted || !data || data.length === 0) return;
    
    function renderChart() {
      // Ensure refs exist
      if (!svgRef.current || !containerRef.current) return;
      
      // Clear previous chart
      d3.select(svgRef.current).selectAll("*").remove();
      
      // Get container dimensions
      const containerWidth = containerRef.current.clientWidth || 800;
      
      // Set margins - smaller right margin to maximize space
      const margin = { top: 30, right: 20, bottom: 50, left: 60 };
      const width = containerWidth - margin.left - margin.right;
      const chartHeight = height;
      const graphHeight = chartHeight - margin.top - margin.bottom;
      
      // Debug dimensions
      console.log("[RegressionChart] Dimensions:", { 
        containerWidth, 
        chartWidth: width, 
        chartHeight 
      });
      
      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr("width", containerWidth)
        .attr("height", chartHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      // Set up scales
      const xMin = d3.min(data, d => d.x) || 0;
      const xMax = d3.max(data, d => d.x) || 1;
      const yMin = d3.min(data, d => d.y) || 0;
      const yMax = d3.max(data, d => d.y) || 1;
  
      // Add padding to domains
      const xPadding = (xMax - xMin) * 0.05;
      const yPadding = (yMax - yMin) * 0.05;
  
      // Pre-calculate regression y-values to determine proper y-axis scale
      const xPointsForRange = [xMin - xPadding, xMin, (xMin + xMax) / 2, xMax, xMax + xPadding];
      let allYValues = [...data.map(d => d.y)];
      
      // Calculate Y values for all regression models at key X points
      models.forEach(model => {
        const modelYs = xPointsForRange.map(x => {
          const y = calculateY(x, model.type, model.coefficients);
          return isNaN(y) || !isFinite(y) ? null : y;
        }).filter((y): y is number => y !== null);
        allYValues = [...allYValues, ...modelYs];
      });
      
      // Determine true y-axis range including regression lines
      const actualYMin = Math.min(...allYValues);
      const actualYMax = Math.max(...allYValues);
      
      // Use a wider range if regression values extend beyond data points
      const finalYMin = Math.min(yMin, actualYMin);
      const finalYMax = Math.max(yMax, actualYMax);
      
      // Add padding to Y domain
      const finalYPadding = (finalYMax - finalYMin) * 0.1;
      
      console.log("Y-axis range:", {
        dataRange: [yMin, yMax],
        withRegression: [actualYMin, actualYMax],
        final: [finalYMin - finalYPadding, finalYMax + finalYPadding]
      });
  
      const xScale = d3.scaleLinear()
        .domain([xMin - xPadding, xMax + xPadding])
        .range([0, width]);
      
      const yScale = d3.scaleLinear()
        .domain([finalYMin - finalYPadding, finalYMax + finalYPadding])
        .range([graphHeight, 0]);
  
      // Draw axes
      svg.append("g")
         .attr("transform", `translate(0,${graphHeight})`)
         .call(d3.axisBottom(xScale));
  
      svg.append("g")
         .call(d3.axisLeft(yScale));
  
      // Axis Labels
      svg.append("text")
         .attr("text-anchor", "middle")
         .attr("x", width / 2)
         .attr("y", graphHeight + margin.bottom - 10)
         .text(independentVar);
  
      svg.append("text")
         .attr("text-anchor", "middle")
         .attr("transform", "rotate(-90)")
         .attr("y", -margin.left + 15)
         .attr("x", -graphHeight / 2)
         .text(dependentVar);
  
      // Draw Scatter Plot
      svg.selectAll("circle")
         .data(data)
         .enter()
         .append("circle")
         .attr("cx", d => xScale(d.x))
         .attr("cy", d => yScale(d.y))
         .attr("r", 5)
         .style("fill", "#4c51bf")
         .style("opacity", 0.7)
         .style("stroke", "white")
         .style("stroke-width", 1);
  
      // Draw Regression Lines
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      const xPoints = d3.range(xMin - xPadding, xMax + xPadding, (xMax - xMin) / 200);
      
      models.forEach((model, index) => {
        const modelType = model.type;
        const color = colorScale(modelType);
        
        // Calculate y values
        const yPoints = xPoints.map(x => {
          return calculateY(x, modelType, model.coefficients);
        });
        
        // Отладка: проверяем значения y
        console.log(`Regression ${modelType} - Points sample:`, 
          xPoints.slice(0, 5).map((x, i) => ({ x, y: yPoints[i] })));
        
        // Create line data
        const lineData = xPoints.map((x, i) => ({
          x: x,
          y: yPoints[i]
        }))
        .filter(d => {
          const isValid = !isNaN(d.y) && isFinite(d.y);
          return isValid;
        });
        
        // Отладка: количество точек после фильтрации
        console.log(`Regression ${modelType} - Valid points: ${lineData.length}/${xPoints.length}`);
        
        // Если линия пустая, пропускаем отрисовку
        if (lineData.length === 0) {
          console.warn(`Regression ${modelType} - No valid points to draw line`);
          return;
        }
        
        // Если у нас есть значения, которые слишком сильно выходят за пределы графика,
        // мы ограничиваем их для лучшего отображения
        const yExtent = d3.extent(lineData, d => d.y) as [number, number];
        const yDataRange = yMax - yMin;
        
        // Проверяем, есть ли экстремальные значения, выходящие далеко за пределы графика
        const hasExtremeValues = 
          yExtent[0] < yMin - yDataRange * 5 || 
          yExtent[1] > yMax + yDataRange * 5;
        
        console.log(`Regression ${modelType} - Y extent:`, yExtent, 
          `Data range: ${yMin}-${yMax}`, 
          `Has extreme values: ${hasExtremeValues}`);
        
        const limitedLineData = hasExtremeValues 
          ? lineData.map(d => ({
              x: d.x,
              y: Math.max(yMin - yDataRange, Math.min(d.y, yMax + yDataRange))
            }))
          : lineData;
        
        // Draw line
        const line = d3.line<{x: number, y: number}>()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveMonotoneX);
        
        svg.append("path")
          .datum(limitedLineData)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 3)
          .attr("d", line);
        
        // Add to legend
        svg.append("circle")
          .attr("cx", width + 10)
          .attr("cy", 20 + index * 25)
          .attr("r", 6)
          .style("fill", color);
        
        svg.append("text")
          .attr("x", width + 20)
          .attr("y", 20 + index * 25)
          .attr("alignment-baseline", "middle")
          .text(`R² = ${model.r_squared.toFixed(3)}`);
      });
    }

    // Initial render
    renderChart();
    
    // Handle resize
    const handleResize = () => {
      renderChart();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, models, dependentVar, independentVar, isMounted, height]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: `${height}px` }} />
    </div>
  );
}