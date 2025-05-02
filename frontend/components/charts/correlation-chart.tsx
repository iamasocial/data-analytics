"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"

// Имитация данных корреляционной матрицы
const correlationData = [
  { x: "price", y: "price", value: 1 },
  { x: "price", y: "quantity", value: -0.15 },
  { x: "price", y: "revenue", value: 0.78 },
  { x: "quantity", y: "price", value: -0.15 },
  { x: "quantity", y: "quantity", value: 1 },
  { x: "quantity", y: "revenue", value: 0.92 },
  { x: "revenue", y: "price", value: 0.78 },
  { x: "revenue", y: "quantity", value: 0.92 },
  { x: "revenue", y: "revenue", value: 1 },
]

export function CorrelationChart() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    // Очистка предыдущего графика
    d3.select(svgRef.current).selectAll("*").remove()

    // Размеры и отступы
    const margin = { top: 50, right: 50, bottom: 50, left: 50 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = svgRef.current.clientHeight - margin.top - margin.bottom

    // Создание SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Уникальные значения для осей
    const variables = Array.from(new Set(correlationData.map((d) => d.x)))

    // Масштабы
    const x = d3.scaleBand().domain(variables).range([0, width]).padding(0.05)

    const y = d3.scaleBand().domain(variables).range([0, height]).padding(0.05)

    // Цветовая шкала
    const colorScale = d3.scaleLinear<string>().domain([-1, 0, 1]).range(["#4a5568", "#e2e8f0", "#38a169"])

    // Добавление ячеек
    svg
      .selectAll()
      .data(correlationData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.x) || 0)
      .attr("y", (d) => y(d.y) || 0)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", (d) => colorScale(d.value))
      .style("stroke", "white")
      .style("stroke-width", 1)

    // Добавление текста значений
    svg
      .selectAll()
      .data(correlationData)
      .enter()
      .append("text")
      .attr("x", (d) => (x(d.x) || 0) + x.bandwidth() / 2)
      .attr("y", (d) => (y(d.y) || 0) + y.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text((d) => d.value.toFixed(2))
      .style("font-size", "12px")
      .style("fill", (d) => (Math.abs(d.value) > 0.5 ? "white" : "black"))

    // Добавление осей
    svg.append("g").style("font-size", "12px").call(d3.axisTop(x).tickSize(0)).select(".domain").remove()

    svg.append("g").style("font-size", "12px").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove()

    // Заголовок
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Корреляционная матрица")

    // Обработка изменения размера окна
    const handleResize = () => {
      if (!svgRef.current) return

      const newWidth = svgRef.current.clientWidth - margin.left - margin.right
      const newHeight = svgRef.current.clientHeight - margin.top - margin.bottom

      d3.select(svgRef.current)
        .attr("width", newWidth + margin.left + margin.right)
        .attr("height", newHeight + margin.top + margin.bottom)

      x.range([0, newWidth])
      y.range([0, newHeight])

      // Обновление элементов графика
      // ...
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
