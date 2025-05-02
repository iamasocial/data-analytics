"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"

// Имитация данных распределения
const distributionData = [
  {
    name: "price",
    values: Array.from({ length: 100 }, () => Math.random() * 100 + 50),
  },
  {
    name: "quantity",
    values: Array.from({ length: 100 }, () => Math.random() * 50 + 10),
  },
  {
    name: "revenue",
    values: Array.from({ length: 100 }, () => Math.random() * 1000 + 500),
  },
]

export function DistributionChart() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    // Очистка предыдущего графика
    d3.select(svgRef.current).selectAll("*").remove()

    // Размеры и отступы
    const margin = { top: 30, right: 30, bottom: 50, left: 60 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = svgRef.current.clientHeight - margin.top - margin.bottom

    // Создание SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Цвета для разных переменных
    const colors = ["#4c51bf", "#38a169", "#e53e3e"]

    // Создание графиков для каждой переменной
    distributionData.forEach((data, i) => {
      // Масштабы
      const x = d3
        .scaleLinear()
        .domain([d3.min(data.values) || 0, d3.max(data.values) || 100])
        .range([0, width])

      // Создание гистограммы
      const histogram = d3
        .histogram()
        .value((d) => d)
        .domain(x.domain() as [number, number])
        .thresholds(x.ticks(20))

      const bins = histogram(data.values)

      // Масштаб Y
      const y = d3
        .scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(bins, (d) => d.length) || 10])

      // Добавление осей
      if (i === 0) {
        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))

        svg.append("g").call(d3.axisLeft(y))

        // Подписи осей
        svg
          .append("text")
          .attr("text-anchor", "middle")
          .attr("x", width / 2)
          .attr("y", height + margin.bottom - 10)
          .text("Значение")

        svg
          .append("text")
          .attr("text-anchor", "middle")
          .attr("transform", "rotate(-90)")
          .attr("y", -margin.left + 15)
          .attr("x", -height / 2)
          .text("Частота")
      }

      // Добавление гистограммы
      svg
        .selectAll(`.bar-${i}`)
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", `bar-${i}`)
        .attr("x", (d) => x(d.x0 || 0))
        .attr("width", (d) => Math.max(0, x(d.x1 || 0) - x(d.x0 || 0) - 1))
        .attr("y", (d) => y(d.length))
        .attr("height", (d) => height - y(d.length))
        .style("fill", colors[i])
        .style("opacity", 0.3)

      // Добавление линии плотности
      const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(100))
      const density = kde(data.values)

      // Масштабирование плотности
      const maxDensity = d3.max(density, (d) => d[1]) || 1
      const densityScale = d3
        .scaleLinear()
        .domain([0, maxDensity])
        .range([0, d3.max(bins, (d) => d.length) || 10])

      // Добавление линии
      svg
        .append("path")
        .datum(density as [number, number][])
        .attr("fill", "none")
        .attr("stroke", colors[i])
        .attr("stroke-width", 2)
        .attr(
          "d",
          d3
            .line()
            .curve(d3.curveBasis)
            .x((d) => x(d[0]))
            .y((d) => y(densityScale(d[1]))),
        )
    })

    // Добавление легенды
    const legend = svg.append("g").attr("transform", `translate(${width - 100}, 0)`)

    distributionData.forEach((data, i) => {
      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .style("fill", colors[i])

      legend
        .append("text")
        .attr("x", 20)
        .attr("y", i * 20 + 12)
        .text(data.name)
        .style("font-size", "12px")
    })

    // Функции для расчета плотности
    function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
      return (V: number[]) => X.map((x) => [x, d3.mean(V, (v) => kernel(x - v)) || 0])
    }

    function kernelEpanechnikov(k: number) {
      return (v: number) => (Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0)
    }

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
