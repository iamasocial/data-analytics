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
    // Wait until mounted and basic data/ref checks pass
    if (!isMounted || !svgRef.current || !data || data.bins.length < 2 || data.frequencies.length === 0) return

    // --- Data Preparation ---
    // Ensure bins and frequencies match up (N+1 edges, N frequencies)
    const bins = data.bins;
    const frequencies = data.frequencies;
    if (bins.length !== frequencies.length + 1) {
      console.error("[DistributionChart] Histogram data mismatch: bins.length must be frequencies.length + 1");
      return;
    }

    // --- D3 Setup ---
    d3.select(svgRef.current).selectAll("*").remove(); // Clear previous chart

    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
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
    const xMin = bins[0];
    const xMax = bins[bins.length - 1];
    const yMax = d3.max(frequencies) || 1;

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

    // --- Axes ---
    svg.append("g")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(xScale).ticks(Math.min(10, bins.length)).tickSizeOuter(0));

    svg.append("g")
       .call(d3.axisLeft(yScale));

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
    // Create data pairs for bars: {x0, x1, frequency}
    const barData = frequencies.map((freq, i) => ({
        x0: bins[i],
        x1: bins[i+1],
        frequency: freq
    }));

    svg.selectAll("rect")
       .data(barData)
       .enter()
       .append("rect")
       .attr("x", d => xScale(d.x0))
       .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1)) // Add padding between bars
       .attr("y", d => yScale(d.frequency))
       .attr("height", d => height - yScale(d.frequency))
       .style("fill", "#4c51bf"); // Use a single color

  }, [data, variableName, isMounted]); // Add isMounted to dependency array

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
