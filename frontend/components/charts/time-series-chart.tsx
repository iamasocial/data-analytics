"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"

// Имитация данных временного ряда
const timeSeriesData = [
  {
    name: "revenue",
    values: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2025, 0, i + 1),
      value: Math.random() * 1000 + 5000 + i * 50,
    })),
  },
  {
    name: "orders",
    values: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2025, 0, i + 1),
      value: Math.random() * 50 + 100 + i * 2,
    })),
  },
]

export function TimeSeriesChart() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    // Очистка предыдущего графика
    d3.select(svgRef.current).selectAll("*").remove()

    // Размеры и отступы
    const margin = { top: 30, right: 80, bottom: 50, left: 60 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = svgRef.current.clientHeight - margin.top - margin.bottom

    // Создание SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Масштаб X (общий для всех рядов)
    const x = d3
      .scaleTime()
      .domain(d3.extent(timeSeriesData[0].values, (d) => d.date) as [Date, Date])
      .range([0, width])

    // Добавление оси X
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(7)
          .tickFormat(d3.timeFormat("%d.%m") as any),
      )

    // Подпись оси X
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Дата")

    // Цвета для разных рядов
    const colors = ["#4c51bf", "#38a169"]

    // Создание графиков для каждого ряда
    timeSeriesData.forEach((data, i) => {
      // Масштаб Y (отдельный для каждого ряда)
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data.values, (d) => d.value) || 100])
        .range([height, 0])

      // Добавление оси Y
      const yAxis = svg
        .append("g")
        .attr("transform", i === 0 ? "" : `translate(${width}, 0)`)
        .call(i === 0 ? d3.axisLeft(y) : d3.axisRight(y))

      // Подпись оси Y
      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", i === 0 ? -margin.left + 15 : width + margin.right - 15)
        .attr("x", -height / 2)
        .attr("fill", colors[i])
        .text(data.name)

      // Создание линии
      const line = d3
        .line<{ date: Date; value: number }>()
        .x((d) => x(d.date))
        .y((d) => y(d.value))
        .curve(d3.curveMonotoneX)

      // Добавление линии
      svg
        .append("path")
        .datum(data.values)
        .attr("fill", "none")
        .attr("stroke", colors[i])
        .attr("stroke-width", 2)
        .attr("d", line)

      // Добавление точек
      svg
        .selectAll(`.dot-${i}`)
        .data(data.values)
        .enter()
        .append("circle")
        .attr("class", `dot-${i}`)
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.value))
        .attr("r", 3)
        .attr("fill", colors[i])
    })

    // Обработка изменения размера окна
    const handleResize = () => {
      if (!svgRef.current) return

      // Обновление размеров и перерисовка графика
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
