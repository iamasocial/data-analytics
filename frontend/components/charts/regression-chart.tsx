"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { ResidualsAnalysis, RegressionCoefficient as ResAnalysisCoefficient } from "./residuals-analysis"

interface DataPoint {
  x: number;
  y: number;
}

interface RegressionCoefficient {
  variable_name?: string;
  variableName?: string;
  coefficient: number;
  std_error?: number;
  t_statistic?: number;
  p_value?: number;
  confidence_interval_lower?: number; 
  confidence_interval_upper?: number;
}

interface RegressionModel {
  type: string;
  coefficients: RegressionCoefficient[];
  r_squared: number;
  residuals?: number[];
  residuals_analysis?: {
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
  };
  f_statistic?: number;
  prob_f_statistic?: number;
}

export interface RegressionChartProps {
  data: DataPoint[];
  models: RegressionModel[];
  dependentVar: string;
  independentVar: string;
  height?: number; // Optional height prop
  globalYDomain?: [number, number]; // For shared Y-axis scale
  globalXDomain?: [number, number]; // For shared X-axis scale
}

// Function to calculate Y values based on regression type and coefficients
// Exporting for use in UploadPage to calculate global Y scale
export function calculateY(x: number, modelType: string, coefficients: {variable_name?: string, variableName?: string, coefficient: number}[]): number {
  // Найдем коэффициенты в зависимости от имен
  const intercept = coefficients.find((c) => 
    c.variable_name === "const" || c.variable_name === "intercept" || 
    c.variableName === "const" || c.variableName === "intercept"
  )?.coefficient || 0;
  
  // Для полиномиальной регрессии нам нужны все коэффициенты
  if (modelType === "Polynomial") {
    let y = intercept;
    coefficients.forEach(coef => {
      const variableName = coef.variable_name || coef.variableName || "";
      if (variableName !== "const" && variableName !== "intercept") {
        // Проверяем, содержит ли имя переменной номер степени (например, "x^2")
        const degreeMatch = variableName.match(/\^(\d+)/);
        const degree = degreeMatch ? parseInt(degreeMatch[1]) : 1;
        y += coef.coefficient * Math.pow(x, degree);
      }
    });
    return y;
  }
  
  // Для других типов регрессии находим один основной коэффициент (slope)
  const slope = coefficients.find((c) => {
    const name = c.variable_name || c.variableName || "";
    return name !== "const" && name !== "intercept";
  })?.coefficient || 0;
  
  // Расчет в зависимости от типа регрессии
  switch(modelType) {
    case "Linear":
      return intercept + slope * x;
    case "Quadratic": {
      const a = coefficients.find(c => c.variable_name === "a" || c.variableName === "a")?.coefficient ?? 0;
      const b = coefficients.find(c => c.variable_name === "b" || c.variableName === "b")?.coefficient ?? 0;
      const c_quad = coefficients.find(c => c.variable_name === "c" || c.variableName === "c")?.coefficient ?? 0;
      // Важно: для квадратичной y = ax^2 + bx + c, 'c' является свободным членом.
      // 'intercept' здесь может быть нерелевантен, если он ищет 'const'.
      return a * x * x + b * x + c_quad;
    }
    case "Logarithmic": {
      const coeff_a = coefficients.find(c => c.variable_name === "a" || c.variableName === "a")?.coefficient;
      const coeff_b = coefficients.find(c => c.variable_name === "b" || c.variableName === "b")?.coefficient;

      if (coeff_a === undefined || coeff_b === undefined) {
        console.warn(`Logarithmic regression: coefficients 'a' (${coeff_a}) or 'b' (${coeff_b}) not found. Coeffs:`, coefficients);
        return NaN; // Return NaN if coefficients are missing, to filter out later
      }
      // y = a + b * ln(x)
      if (x <= 0) {
        // Python backend for log_func uses np.maximum(x, 1e-10).
        // Math.log(0) is -Infinity. Math.log(negative) is NaN.
        // To align with backend's avoidance of true zero/negative, we can return NaN or a calculated value for small x.
        // For simplicity and to allow filtering of invalid points, returning NaN is safer here.
        return NaN; 
      }
      return coeff_a + coeff_b * Math.log(x);
    }
    case "Exponential":
      // y = a * e^(b*x)
      // В этом случае intercept это ln(a), поэтому a = e^intercept
      return Math.exp(intercept) * Math.exp(slope * x);
    case "Power":
      // y = a * x^b
      if (x <= 0) return NaN; // Power function undefined for x <= 0
      
      const a_power = coefficients.find(c => c.variable_name === "a" || c.variableName === "a")?.coefficient ?? 0;
      const b_power = coefficients.find(c => c.variable_name === "b" || c.variableName === "b")?.coefficient ?? 0;
      
      return a_power * Math.pow(x, b_power);
    case "Trigonometric": {
      // y = a * sin(b * x + c) + d
      const a_trig = coefficients.find(c => c.variable_name === "a" || c.variableName === "a")?.coefficient ?? 0;
      const b_trig = coefficients.find(c => c.variable_name === "b" || c.variableName === "b")?.coefficient ?? 0;
      const c_trig = coefficients.find(c => c.variable_name === "c" || c.variableName === "c")?.coefficient ?? 0;
      const d_trig = coefficients.find(c => c.variable_name === "d" || c.variableName === "d")?.coefficient ?? 0;
      
      return a_trig * Math.sin(b_trig * x + c_trig) + d_trig;
    }
    case "Sigmoid": {
      // y = c / (1 + exp(-a * (x - b)))
      const a_sig = coefficients.find(c => c.variable_name === "a" || c.variableName === "a")?.coefficient ?? 0;
      const b_sig = coefficients.find(c => c.variable_name === "b" || c.variableName === "b")?.coefficient ?? 0;
      const c_sig = coefficients.find(c => c.variable_name === "c" || c.variableName === "c")?.coefficient ?? 0;
      
      return c_sig / (1 + Math.exp(-a_sig * (x - b_sig)));
    }
    default:
      console.warn("Unknown regression type:", modelType);
      return NaN;
  }
}

export function RegressionChart({ data, models, dependentVar, independentVar, height = 600, globalYDomain, globalXDomain }: RegressionChartProps) {
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
  
      const yScale = d3.scaleLinear();

      if (globalYDomain && globalYDomain.length === 2) {
        yScale.domain(globalYDomain).range([graphHeight, 0]);
        console.log("[RegressionChart] Using globalYDomain:", globalYDomain);
      } else {
        // Fallback to existing dynamic Y scale calculation if globalYDomain is not provided
        // Pre-calculate regression y-values to determine proper y-axis scale
        const xPointsForRange = [xMin - xPadding, xMin, (xMin + xMax) / 2, xMax, xMax + xPadding];
        let allYValues = [...data.map(d => d.y)];
        
        // Calculate Y values for all regression models at key X points (for this specific chart's models)
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
        
        console.log("[RegressionChart] Dynamically calculated Y-axis range:", {
          dataRange: [yMin, yMax],
          withRegression: [actualYMin, actualYMax],
          final: [finalYMin - finalYPadding, finalYMax + finalYPadding]
        });
        yScale.domain([finalYMin - finalYPadding, finalYMax + finalYPadding]).range([graphHeight, 0]);
      }
  
      const xScale = d3.scaleLinear()
        .range([0, width]);
        
      if (globalXDomain && globalXDomain.length === 2) {
        xScale.domain(globalXDomain);
        console.log("[RegressionChart] Using globalXDomain:", globalXDomain);
      } else {
        xScale.domain([xMin - xPadding, xMax + xPadding]);
      }
  
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
        const currentYScaleDomain = yScale.domain(); // Получаем текущий домен шкалы Y
        
        // Проверяем, есть ли экстремальные значения, выходящие далеко за пределы графика
        const hasExtremeValues = 
          yExtent[0] < currentYScaleDomain[0] - (currentYScaleDomain[1] - currentYScaleDomain[0]) * 0.1 || 
          yExtent[1] > currentYScaleDomain[1] + (currentYScaleDomain[1] - currentYScaleDomain[0]) * 0.1;
        
        console.log(`Regression ${modelType} - Y extent:`, yExtent, 
          `Y Scale Domain: ${currentYScaleDomain[0]}-${currentYScaleDomain[1]}`, 
          `Has extreme values: ${hasExtremeValues}`);
        
        // Ограничиваем значения линии регрессии, чтобы они не выходили слишком далеко за пределы видимой области графика
        // Используем currentYScaleDomain для определения границ
        const limitedLineData = lineData.map(d => ({
          x: d.x,
          y: Math.max(currentYScaleDomain[0], Math.min(d.y, currentYScaleDomain[1]))
        }));
        
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
    
    // Handle window resize
    const handleResize = () => {
      renderChart();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMounted, data, models, height, globalYDomain, globalXDomain]);

  // Найти модель с остатками для анализа
  const modelWithResiduals = models.find(model => model.residuals && model.residuals.length > 0 && model.residuals_analysis);
  
  // Найти текущую выбранную модель (даже если нет анализа остатков)
  const currentModel = models.length > 0 ? models[0] : null;

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full" height={height}></svg>
      
      {/* Отображение анализа остатков, если они есть */}
      {modelWithResiduals && modelWithResiduals.residuals && modelWithResiduals.residuals_analysis && (
        <div className="mt-8">
          <ResidualsAnalysis 
            residuals={modelWithResiduals.residuals}
            shapiroTest={modelWithResiduals.residuals_analysis.shapiro_test}
            histogram={modelWithResiduals.residuals_analysis.histogram}
            qqPlot={modelWithResiduals.residuals_analysis.qq_plot}
            title={`Анализ остатков регрессии (${modelWithResiduals.type})`}
            fStatistic={modelWithResiduals.f_statistic}
            fPValue={modelWithResiduals.prob_f_statistic}
            coefficients={modelWithResiduals.coefficients.map(coef => ({
              variable_name: coef.variable_name || coef.variableName || "",
              coefficient: coef.coefficient,
              std_error: coef.std_error,
              t_statistic: coef.t_statistic,
              p_value: coef.p_value,
              confidence_interval_lower: coef.confidence_interval_lower,
              confidence_interval_upper: coef.confidence_interval_upper
            }) as ResAnalysisCoefficient)}
          />
        </div>
      )}
      

    </div>
  );
}