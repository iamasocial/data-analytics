"use client"

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface BoxPlotData {
  variable_name?: string;
  column_name?: string;
  min_value: number;
  q1: number;
  median: number;
  q3: number;
  max_value: number;
  outliers: number[];
}

interface BoxPlotChartProps {
  data: BoxPlotData;
}

export function BoxPlotChart({ data }: BoxPlotChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !svgRef.current || !data) return;

    const { min_value, q1, median, q3, max_value, outliers, variable_name, column_name } = data;
    const displayName = column_name || variable_name || "";

    // Check for NaN values, skip if essential data is missing
    if ([min_value, q1, median, q3, max_value].some(isNaN)) {
      console.warn(`[BoxPlotChart] Skipping chart for ${displayName} due to NaN values in core data.`);
      // Optionally render a placeholder indicating missing data
       d3.select(svgRef.current).selectAll("*").remove();
       d3.select(svgRef.current)
         .append("text")
         .attr("x", "50%")
         .attr("y", "50%")
         .attr("text-anchor", "middle")
         .attr("dominant-baseline", "middle")
         .text("Нет данных для Box Plot");
      return;
    }

    d3.select(svgRef.current).selectAll("*").remove(); // Clear previous chart

    const margin = { top: 10, right: 30, bottom: 30, left: 40 }; // Adjusted margins
    const containerWidth = svgRef.current.clientWidth;
    // Use a fixed height suitable for a single horizontal box plot
    const containerHeight = 100;

    if (containerWidth <= 0) return; 

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return; 

    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Find overall min/max including outliers for the scale
    const allValues = [min_value, q1, median, q3, max_value, ...(outliers || [])]; 
    const dataMin = d3.min(allValues) ?? 0;
    const dataMax = d3.max(allValues) ?? 1;

    // Create X scale
    const xScale = d3.scaleLinear()
      .domain([dataMin, dataMax])
      .nice()
      .range([0, width]);

    // Draw the X axis
    svg.append("g")
       .attr("transform", `translate(0, ${height})`)
       .call(d3.axisBottom(xScale).ticks(5));

    // Draw the main box (Q1 to Q3)
    const boxY = height / 4; // Position the box vertically
    const boxHeight = height / 2;
    svg.append("rect")
       .attr("x", xScale(q1))
       .attr("y", boxY)
       .attr("width", xScale(q3) - xScale(q1))
       .attr("height", boxHeight)
       .attr("stroke", "black")
       .style("fill", "#a7b8f8"); // Light blue

    // Draw median line
    svg.append("line")
       .attr("x1", xScale(median))
       .attr("y1", boxY)
       .attr("x2", xScale(median))
       .attr("y2", boxY + boxHeight)
       .attr("stroke", "black");

    // Draw whiskers
    // Min whisker line
    svg.append("line")
       .attr("x1", xScale(min_value))
       .attr("y1", height / 2)
       .attr("x2", xScale(q1))
       .attr("y2", height / 2)
       .attr("stroke", "black");
    // Min whisker vertical bar
    svg.append("line")
       .attr("x1", xScale(min_value))
       .attr("y1", boxY)
       .attr("x2", xScale(min_value))
       .attr("y2", boxY + boxHeight)
       .attr("stroke", "black");

    // Max whisker line
    svg.append("line")
       .attr("x1", xScale(q3))
       .attr("y1", height / 2)
       .attr("x2", xScale(max_value))
       .attr("y2", height / 2)
       .attr("stroke", "black");
    // Max whisker vertical bar
    svg.append("line")
       .attr("x1", xScale(max_value))
       .attr("y1", boxY)
       .attr("x2", xScale(max_value))
       .attr("y2", boxY + boxHeight)
       .attr("stroke", "black");

    // Draw outliers
    if (outliers && outliers.length > 0) {
      svg.selectAll("outlierDot")
         .data(outliers)
         .enter()
         .append("circle")
           .attr("cx", d => xScale(d))
           .attr("cy", height / 2)
           .attr("r", 2)
           .style("fill", "#ff0000"); // Red for outliers
    }

  }, [data, isMounted]);

  if (!isMounted) {
    return <div className="w-full h-24 flex items-center justify-center text-gray-500">Загрузка графика...</div>; // Adjusted height
  }

  return (
    <div className="w-full h-24"> {/* Adjusted height for horizontal box plot */}
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
} 