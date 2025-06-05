"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/components/language-provider"
import { Upload, FileText, Eye, Trash2, BarChart2, PieChart } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

// Интерфейс для данных с бэкенда
interface AnalysisRun {
  id: number; 
  user_id: number; 
  file_name: string;
  run_at: string; 
  selected_analyses: string[];
  dependent_variable?: string | null;
  independent_variable?: string | null;
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRun[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false)
  const [analysisToDelete, setAnalysisToDelete] = useState<number | null>(null)

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    console.log("[DashboardPage] Attempting to get token from localStorage with key 'authToken'.");
    const token = localStorage.getItem('authToken');
    console.log("[DashboardPage] Token from localStorage (key 'authToken'):", token);

    if (!token) {
      console.error("[DashboardPage] Token not found in localStorage (key 'authToken').");
      // Возможно, здесь стоит перенаправить на страницу логина
      // setLoading(false); // Убедитесь, что загрузка сбрасывается, если токена нет
      return;
    }
    console.log("[DashboardPage] Token found (key 'authToken'), proceeding to fetch history.");

    try {
      const response = await fetch('http://localhost:8080/api/analyses/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка при загрузке истории: ${response.statusText}`);
      }

      const data: AnalysisRun[] = await response.json();
      setAnalysisHistory(data);
    } catch (err: any) {
      setError(err.message || 'Произошла неизвестная ошибка.');
      console.error("Fetch history error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setAnalysisToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (analysisToDelete === null) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Требуется авторизация');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8080/api/analyses/history/${analysisToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка при удалении анализа: ${response.statusText}`);
      }
      
      // Обновляем список после удаления
      setAnalysisHistory(prevHistory => 
        prevHistory.filter(item => item.id !== analysisToDelete)
      );
      
      // Показываем уведомление об успехе
      toast({
        title: t("deleteSuccess"),
        description: `ID: ${analysisToDelete}`,
        variant: "default",
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка при удалении анализа');
      console.error("Delete analysis error:", err);
      
      // Показываем уведомление об ошибке
      toast({
        title: t("deleteError"),
        description: err.message || t("deleteError"),
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setAnalysisToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setAnalysisToDelete(null);
  };

  const displayedHistory = analysisHistory;

  if (loading) {
    // Можно добавить более явный индикатор загрузки для таблицы истории
    // return <div className="space-y-6"><p>Загрузка дашборда...</p></div>
  }

  if (error && analysisHistory.length === 0) {
    return <div className="space-y-6"><p className="text-red-500">Ошибка загрузки истории: {error}</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-gray-500">Управляйте вашими данными и анализами</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">
            <Upload className="mr-2 h-4 w-4" />
            {t("uploadData")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего анализов</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayedHistory.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{t("analysisHistory")}</CardTitle>
              <CardDescription>История ваших загрузок и анализов данных</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p>Загрузка истории...</p>}
          {error && analysisHistory.length === 0 && <p className="text-red-500">Не удалось загрузить историю: {error}</p>}
          {!loading && !error && displayedHistory.length === 0 && (
            <p className="text-center py-6 text-gray-500">История анализов пуста.</p>
          )}
          {!loading && displayedHistory.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>Файл</TableHead>
                  <TableHead>Выбранные анализы</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.run_at).toLocaleDateString()}</TableCell>
                    <TableCell>{item.file_name}</TableCell>
                    <TableCell>
                      {item.selected_analyses.map(analysis => t(analysis)).join(', ')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/results/${item.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">{t("view")}</span>
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50" 
                          onClick={() => handleDeleteClick(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t("delete")}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" disabled>
            Предыдущая
          </Button>
          <Button variant="outline" disabled>
            Следующая
          </Button>
        </CardFooter>
      </Card>
      
      {/* Диалог подтверждения удаления */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
