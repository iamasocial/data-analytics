"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/components/language-provider"
import { Upload, X, FileText, FileSpreadsheet, FileJson, AlertCircle, CheckCircle2 } from "lucide-react"

export default function UploadPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Проверка размера файла (200 МБ = 200 * 1024 * 1024 байт)
      const maxSize = 200 * 1024 * 1024
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > maxSize) {
          toast({
            title: "Файл слишком большой",
            description: `Файл "${file.name}" превышает максимальный размер в 200 МБ`,
            variant: "destructive",
          })
          return false
        }

        // Проверка типа файла
        const extension = file.name.split(".").pop()?.toLowerCase()
        if (!["csv", "xlsx", "json"].includes(extension || "")) {
          toast({
            title: "Неподдерживаемый формат",
            description: `Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются только CSV, XLSX и JSON`,
            variant: "destructive",
          })
          return false
        }

        return true
      })

      setFiles((prev) => [...prev, ...validFiles])
    },
    [toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/json": [".json"],
    },
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "csv":
        return <FileText className="h-6 w-6 text-blue-500" />
      case "xlsx":
        return <FileSpreadsheet className="h-6 w-6 text-green-500" />
      case "json":
        return <FileJson className="h-6 w-6 text-orange-500" />
      default:
        return <FileText className="h-6 w-6 text-gray-500" />
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)

    // Имитация загрузки с прогрессом - оставляем для визуализации
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        // Остановим имитацию прогресса, если достигли 95% до ответа сервера
        if (prev >= 95) {
          // clearInterval(interval); // Не останавливаем интервал здесь
          return prev; // Держим 95% пока нет ответа
        }
        return prev + 5;
      })
    }, 200);

    const fileToUpload = files[0]; // <<-- Пока отправляем только первый файл

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload); // 'file' - имя поля, которое ожидает Go

      const response = await fetch('http://localhost:8080/api/analyze', { // <<-- URL Go API
        method: 'POST',
        body: formData,
      });

      clearInterval(interval); // Останавливаем имитацию прогресса
      setUploadProgress(100); // Устанавливаем прогресс на 100

      if (!response.ok) {
        let errorMsg = `API Error: ${response.status}`;
        try {
           const errorData = await response.json();
           errorMsg += ` - ${errorData.error || JSON.stringify(errorData)}`;
        } catch (jsonError) {
            errorMsg += ` - ${await response.text()}`;
        }
        console.error(errorMsg);
        throw new Error(errorMsg); // Передаем ошибку в catch блок
      }

      const result = await response.json();
      console.log('Analysis Result:', result);
      setUploadStatus("success");

      toast({
        title: t("uploadSuccess"),
        description: "Анализ успешно завершен.", // Можно обновить сообщение
      });

      // TODO: Обработать результат 'result'
      // Например, извлечь ID результата и перенаправить
      // const resultId = result.analysisId; // Предположим, что API возвращает ID
      // router.push(`/dashboard/results/${resultId}`);

      // Пока просто перенаправляем на дашборд через 2 сек
       setTimeout(() => {
         router.push("/dashboard");
       }, 2000);


    } catch (error) {
      clearInterval(interval);
      setUploadStatus("error");
      setUploadProgress(0); // Сбрасываем прогресс при ошибке
      console.error("Upload failed:", error);

      toast({
        title: t("uploadError"),
        description: error instanceof Error ? error.message : "Произошла ошибка при отправке или анализе файла.",
        variant: "destructive",
      });
      // Разблокируем кнопку после ошибки через некоторое время
      setTimeout(() => { setUploading(false); }, 500);
    } finally {
      // Убрано из finally, чтобы кнопка оставалась заблокированной при успехе до редиректа
      // Если нужно разблокировать кнопку при успехе раньше, можно вернуть сюда:
      // setTimeout(() => { setUploading(false); }, 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("uploadData")}</h1>
        <p className="text-gray-500">Загрузите файлы для анализа данных</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary hover:bg-primary/5"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-4">
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? "Отпустите файлы для загрузки" : t("dragAndDrop")}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t("supportedFormats")}</p>
                <p className="text-sm text-gray-500 mt-1">{t("maxFileSize")}</p>
              </div>
              <Button type="button" disabled={uploading}>
                Выбрать файлы
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Выбранные файлы</h3>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading}>
                  Очистить все
                </Button>
              </div>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.name)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={uploading}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Удалить файл</span>
                    </Button>
                  </div>
                ))}
              </div>

              {uploadStatus !== "idle" && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {uploadStatus === "uploading"
                        ? "Загрузка..."
                        : uploadStatus === "success"
                          ? "Загрузка завершена"
                          : "Ошибка загрузки"}
                    </span>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  {uploadStatus === "success" && (
                    <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Файлы успешно загружены и отправлены на анализ</span>
                    </div>
                  )}
                  {uploadStatus === "error" && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Произошла ошибка при загрузке файлов</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full md:w-auto">
                  {uploading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Загрузка...
                    </div>
                  ) : (
                    "Загрузить и анализировать"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
