"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/components/language-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { clearAllAuthData } from "@/lib/auth"

const loginSchema = z.object({
  email: z.string().email({
    message: "Пожалуйста, введите корректный email",
  }),
  password: z.string().min(1, {
    message: "Пожалуйста, введите пароль",
  }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // При загрузке страницы входа очищаем все токены авторизации
  useEffect(() => {
    // Очистка всех данных авторизации при открытии страницы входа
    if (typeof window !== 'undefined') {
      console.log("Страница входа: удаляем все данные авторизации");
      clearAllAuthData();
      console.log("Проверка очистки:", localStorage.getItem('authToken'));
    }
  }, [])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Попытка получить сообщение об ошибке от сервера, если оно есть
        // или стандартное сообщение, если тело ответа не JSON или пустое
        let errorMessage = "Login failed";
        try {
            const parsedError = await response.json();
            errorMessage = parsedError.error || JSON.stringify(parsedError);
        } catch (e) {
            // Если тело ответа не JSON или произошла другая ошибка парсинга
            const textError = await response.text(); 
            errorMessage = textError || `HTTP error ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      // TODO: Сохранить токен (responseData.token) в localStorage или Zustand/Context
      // console.log("Login successful, token:", responseData.token);
      if (responseData.token) {
        localStorage.setItem("authToken", responseData.token);
        console.log("Login successful, token saved to localStorage:", responseData.token);
      } else {
        console.error("Login successful, but no token received from server.");
        throw new Error("No token received from server after login.");
      }

      toast({
        title: "Вход выполнен",
        description: "Вы успешно вошли в систему",
      })

      router.push("/dashboard") // Перенаправляем на дашборд после успешного входа
    } catch (error) {
      toast({
        title: "Ошибка входа",
        description: error instanceof Error ? error.message : "Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <Link href="/" className="text-xl font-bold">
            DataAnalytics
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-md">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">{t("login")}</h1>
            <p className="text-gray-500">Войдите в свой аккаунт для доступа к платформе</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input placeholder="example@example.com" type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end">
                <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
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
                    Вход...
                  </div>
                ) : (
                  t("login")
                )}
              </Button>
            </form>
          </Form>
          <div className="text-center text-sm">
            Нет аккаунта?{" "}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              {t("register")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
