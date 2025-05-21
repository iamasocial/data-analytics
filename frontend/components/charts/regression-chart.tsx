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
}

export function RegressionChart({ data, models, dependentVar, independentVar }: RegressionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only runs client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Wait until mounted and basic data/ref checks pass
    if (!isMounted || !svgRef.current || !data || data.length === 0) return

    // --- D3 Setup ---
    d3.select(svgRef.current).selectAll("*").remove(); // Clear previous chart

    const margin = { top: 30, right: 100, bottom: 50, left: 60 };
    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight > 0 ? svgRef.current.clientHeight : 400;
    
    if (containerWidth <= 0) {
        console.warn("[RegressionChart] Container width is 0, skipping render.");
        return;
    } 

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    if (width <= 0 || height <= 0) {
        console.warn("[RegressionChart] Calculated chart dimensions are non-positive, skipping render.");
        return;
    } 

    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales ---
    const xMin = d3.min(data, d => d.x) || 0;
    const xMax = d3.max(data, d => d.x) || 1;
    const yMin = d3.min(data, d => d.y) || 0;
    const yMax = d3.max(data, d => d.y) || 1;

    // Add some padding to the domains
    const xPadding = (xMax - xMin) * 0.05;
    const yPadding = (yMax - yMin) * 0.05;

    const xScale = d3.scaleLinear()
      .domain([xMin - xPadding, xMax + xPadding])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([height, 0]);

    // --- Axes ---
    svg.append("g")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .call(d3.axisLeft(yScale));

    // Axis Labels
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("x", width / 2)
       .attr("y", height + margin.bottom - 10)
       .text(independentVar);

    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("transform", "rotate(-90)")
       .attr("y", -margin.left + 15)
       .attr("x", -height / 2)
       .text(dependentVar);

    // --- Draw Scatter Plot ---
    svg.selectAll("circle")
       .data(data)
       .enter()
       .append("circle")
       .attr("cx", d => xScale(d.x))
       .attr("cy", d => yScale(d.y))
       .attr("r", 4)
       .style("fill", "#4c51bf")
       .style("opacity", 0.7);

    // --- Draw Regression Lines ---
    // Generate colors for different regression models
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Generate points for regression lines
    const xPoints = d3.range(xMin - xPadding, xMax + xPadding, (xMax - xMin) / 100);
    
    // For each model, create a line
    models.forEach((model, index) => {
      const modelType = model.type;
      const color = colorScale(modelType);
      
      // Calculate y values based on model type and coefficients
      const yPoints = xPoints.map(x => {
        return calculateY(x, modelType, model.coefficients);
      });
      
      // Create line data
      const lineData = xPoints.map((x, i) => ({
        x: x,
        y: yPoints[i]
      })).filter(d => !isNaN(d.y) && d.y >= yMin - yPadding && d.y <= yMax + yPadding);
      
      // Draw the line
      const line = d3.line<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX);
      
      svg.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", line);
      
      // Add to legend
      svg.append("circle")
        .attr("cx", width + 20)
        .attr("cy", 20 + index * 25)
        .attr("r", 6)
        .style("fill", color);
      
      svg.append("text")
        .attr("x", width + 35)
        .attr("y", 20 + index * 25)
        .text(`${modelType} (R² = ${model.r_squared.toFixed(3)})`)
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");
    });

  }, [data, models, dependentVar, independentVar, isMounted]);

  // Function to calculate y values based on model type and coefficients
  function calculateY(x: number, modelType: string, coefficients: {variable_name: string, coefficient: number}[]): number {
    // Get coefficients by name or position
    const getCoef = (name: string) => {
      const coef = coefficients.find(c => c.variable_name === name);
      return coef ? coef.coefficient : 0;
    };
    
    // Handle different regression types
    switch(modelType) {
      case "Linear":
        // y = a*x + b
        return getCoef("x") * x + getCoef("const");
        
      case "Power":
        // y = a * x^b
        return getCoef("a") * Math.pow(Math.max(x, 0.00001), getCoef("b"));
        
      case "Logarithmic":
        // y = a + b*log(x)
        return getCoef("a") + getCoef("b") * Math.log(Math.max(x, 0.00001));
        
      case "Quadratic":
        // y = a*x^2 + b*x + c
        return getCoef("a") * x * x + getCoef("b") * x + getCoef("c");
        
      case "Trigonometric":
        // y = a*sin(b*x + c) + d
        return getCoef("a") * Math.sin(getCoef("b") * x + getCoef("c")) + getCoef("d");
        
      case "Sigmoid":
        // y = c / (1 + exp(-a*(x-b)))
        return getCoef("c") / (1 + Math.exp(-getCoef("a") * (x - getCoef("b"))));
        
      default:
        return 0;
    }
  }

  // Conditionally render svg only when mounted
  if (!isMounted) {
    return <div className="w-full h-80 flex items-center justify-center text-gray-500">Загрузка графика...</div>;
  }

  return (
    <div className="w-full h-80"> {/* Taller than histograms */}
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
} 