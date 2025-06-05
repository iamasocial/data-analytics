"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/components/language-provider"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: "Пожалуйста, введите текущий пароль",
    }),
    newPassword: z
      .string()
      .min(8, {
        message: "Пароль должен содержать минимум 8 символов",
      })
      .regex(/[A-Z]/, {
        message: "Пароль должен содержать хотя бы одну заглавную букву",
      })
      .regex(/[0-9]/, {
        message: "Пароль должен содержать хотя бы одну цифру",
      }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Пароли не совпадают",
    path: ["confirmNewPassword"],
  })

const emailSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "Пожалуйста, введите текущий пароль",
  }),
  newEmail: z.string().email({
    message: "Пожалуйста, введите корректный email",
  }),
})

type PasswordFormValues = z.infer<typeof passwordSchema>
type EmailFormValues = z.infer<typeof emailSchema>

export default function SettingsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  })

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      currentPassword: "",
      newEmail: "",
    },
  })

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsPasswordLoading(true)

    try {
      // Получаем JWT токен из localStorage
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error("Не найден токен авторизации")
      }

      // Отправляем запрос на сервер для смены пароля
      const response = await fetch('http://localhost:8080/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: data.currentPassword,
          new_password: data.newPassword
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка при смене пароля')
      }

      // Успешное изменение пароля
      toast({
        title: "Пароль изменен",
        description: "Ваш пароль был успешно изменен",
      })

      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      })
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Произошла ошибка при изменении пароля. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      })
    } finally {
      setIsPasswordLoading(false)
    }
  }

  async function onEmailSubmit(data: EmailFormValues) {
    setIsEmailLoading(true)

    try {
      // Имитация API запроса
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Успешное изменение email
      toast({
        title: "Email изменен",
        description: "Ваш email был успешно изменен",
      })

      emailForm.reset({
        currentPassword: "",
        newEmail: "",
      })
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при изменении email. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      })
    } finally {
      setIsEmailLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("profileSettings")}</h1>
        <p className="text-gray-500">Управляйте настройками вашего профиля</p>
      </div>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList>
          <TabsTrigger value="password">{t("changePassword")}</TabsTrigger>
          <TabsTrigger value="email">{t("changeEmail")}</TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>{t("changePassword")}</CardTitle>
              <CardDescription>Обновите ваш пароль для повышения безопасности</CardDescription>
            </CardHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("currentPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("newPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("confirmNewPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isPasswordLoading}>
                    {isPasswordLoading ? (
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
                        Сохранение...
                      </div>
                    ) : (
                      t("save")
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>{t("changeEmail")}</CardTitle>
              <CardDescription>Обновите ваш email адрес для получения уведомлений</CardDescription>
            </CardHeader>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("currentPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("newEmail")}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="example@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isEmailLoading}>
                    {isEmailLoading ? (
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
                        Сохранение...
                      </div>
                    ) : (
                      t("save")
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
