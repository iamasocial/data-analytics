/**
 * Утилиты для работы с графиками и расчета масштаба
 */

import { calculateY as calculateYFromRegressionChart } from "@/components/charts/regression-chart";

// Интерфейсы для работы с данными
interface DataPoint {
  x: number;
  y: number;
}

interface RegressionCoefficient {
  variable_name?: string;
  variableName?: string;
  coefficient: number;
}

/**
 * Вычисляет глобальный масштаб для оси Y всех графиков регрессии
 * @param dataPoints Точки данных
 * @param models Модели регрессии
 * @returns Масштаб для оси Y или undefined, если данных недостаточно
 */
export function calculateGlobalYDomain(
  dataPoints: DataPoint[], 
  models: Array<{
    regression_type?: string;
    regressionType?: string;
    coefficients: RegressionCoefficient[];
  }>
): [number, number] | undefined {
  if (!dataPoints || dataPoints.length === 0) {
    return undefined;
  }
  
  // Извлекаем все Y значения из точек данных
  let allYValues = dataPoints.map(dp => dp.y);
  
  // Также учитываем значения из моделей регрессии
  if (models && models.length > 0) {
    const xData = dataPoints.map(dp => dp.x);
    const xMin = Math.min(...xData);
    const xMax = Math.max(...xData);
    const xRange = xMax - xMin;
    
    // Создаем точки для проверки значений регрессии
    const numXPointsForScale = 200; // Больше точек - более точный масштаб
    const xPointsForScale = Array.from(
      { length: numXPointsForScale }, 
      (_, i) => xMin + (i / (numXPointsForScale - 1)) * xRange
    );
    
    // Если все X одинаковые, просто используем одну точку
    if (xRange === 0) {
      xPointsForScale.length = 0;
      xPointsForScale.push(xMin);
    }
    
    // Рассчитываем Y для каждой модели на наборе точек X
    models.forEach(model => {
      // Получаем имя функции regType из регрессионной модели
      const regType = model.regression_type || model.regressionType || "";
      
      // Получаем коэффициенты модели
      const coefficients = model.coefficients || [];
      
      // Рассчитываем Y для каждой точки X
      const modelYs = xPointsForScale.map(x => {
        // Используем функцию calculateY из компонента RegressionChart
        const y = calculateYFromRegressionChart(x, regType, coefficients);
        return isNaN(y) || !isFinite(y) ? null : y;
      }).filter((y): y is number => y !== null);
      
      // Добавляем все Y значения в общий массив
      allYValues = [...allYValues, ...modelYs];
    });
  }
  
  // Находим минимальное и максимальное значения Y
  if (allYValues.length === 0) return undefined;
  
  const yMin = Math.min(...allYValues);
  const yMax = Math.max(...allYValues);
  
  // Добавляем отступ 10% для лучшего отображения
  const yPadding = Math.max((yMax - yMin) * 0.1, 0.1); // Минимум 0.1 если yMax === yMin
  
  return [yMin - yPadding, yMax + yPadding];
} 