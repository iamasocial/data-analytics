"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

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
      // y = a + b * ln(x)
      if (x <= 0) return NaN; // Логарифм не определен для x <= 0, возвращаем NaN

      const coeff_a = coefficients.find(c => c.variable_name === "a" || c.variableName === "a")?.coefficient;
      const coeff_b = coefficients.find(c => c.variable_name === "b" || c.variableName === "b")?.coefficient;

      if (coeff_a === undefined || coeff_b === undefined) {
        return NaN; 
      }
      return coeff_a + coeff_b * Math.log(x);
    }
    case "Exponential": {
        // y = a * e^(b*x)
        const a_exp = coefficients.find(c => c.variable_name === "a" || c.variableName === "a")?.coefficient ?? 0;
        const b_exp = coefficients.find(c => c.variable_name === "b" || c.variableName === "b")?.coefficient ?? 0;
        return a_exp * Math.exp(b_exp * x);
    }
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
      // console.log("[RegressionChart] Dimensions:", { 
      //   containerWidth, 
      //   chartWidth: width, 
      //   chartHeight 
      // });
      
      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr("width", containerWidth)
        .attr("height", chartHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      // Define a clip path
      svg.append("defs").append("clipPath")
        .attr("id", "chart-area-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", graphHeight);
  
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
        // console.log("[RegressionChart] Using globalYDomain:", globalYDomain);
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
        
        // console.log("[RegressionChart] Dynamically calculated Y-axis range:", {
        //   dataRange: [yMin, yMax],
        //   withRegression: [actualYMin, actualYMax],
        //   final: [finalYMin - finalYPadding, finalYMax + finalYPadding]
        // });
        yScale.domain([finalYMin - finalYPadding, finalYMax + finalYPadding]).range([graphHeight, 0]);
      }
  
      const xScale = d3.scaleLinear()
        .range([0, width]);
        
      if (globalXDomain && globalXDomain.length === 2) {
        xScale.domain(globalXDomain);
        // console.log("[RegressionChart] Using globalXDomain:", globalXDomain);
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
         .attr("text-anchor", "end")
         .attr("x", width / 2 + margin.left)
         .attr("y", graphHeight + margin.top)
         .text(independentVar)
         .style("font-size", "14px");
  
      svg.append("text")
         .attr("text-anchor", "end")
         .attr("transform", "rotate(-90)")
         .attr("y", -margin.left + 20)
         .attr("x", -graphHeight / 2)
         .text(dependentVar)
         .style("font-size", "14px");
  
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
  
      // Define colors for regression lines
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

      // Add regression lines
      models.forEach((model, i) => {
        const line = d3.line<DataPoint>()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .defined(d => !isNaN(d.y) && isFinite(d.y)); // Skip points where y is NaN or Infinity

        // Generate points for the line over the scale's domain
        const domain = xScale.domain();

        // For Logarithmic and Power models, start drawing from a small positive number to avoid errors
        const startX = (model.type === 'Logarithmic' || model.type === 'Power') 
            ? Math.max(domain[0], 0.001) 
            : domain[0];

        const numPoints = 200;
        const xPoints = Array.from({length: numPoints}, (_, j) => startX + j * (domain[1] - startX) / (numPoints - 1));

        const lineData = xPoints.map(x => ({
          x: x,
          y: calculateY(x, model.type, model.coefficients)
        }));

        svg.append("path")
          .datum(lineData)
          .attr("fill", "none")
          .attr("stroke", colorScale(i.toString()))
          .attr("stroke-width", 2.5)
          .attr("d", line)
          .attr("clip-path", "url(#chart-area-clip)"); // Apply the clip path
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

  // Находим текущую выбранную модель
  const currentModel = models.length > 0 ? models[0] : null;

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full" height={height}></svg>
      
      {/* Убираем отображение анализа остатков отсюда, так как он уже отображается на странице результатов */}
    </div>
  );
}