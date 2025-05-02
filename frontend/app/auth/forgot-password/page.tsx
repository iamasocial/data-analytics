"use client"

import { useState } from "react"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/components/language-provider"
import { LanguageSwitcher } from "@/components/language-switcher"

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Пожалуйста, введите корректный email",
  }),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true)

    try {
      // Имитация API запроса
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Успешная отправка
      toast({
        title: "Ссылка отправлена",
        description: "Ссылка для сброса пароля отправлена на ваш email",
      })

      setIsSubmitted(true)
    } catch (error) {
      toast({
        title: "Ошибка отправки",
        description: "Произошла ошибка при отправке ссылки. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <Link href="/" className="text-xl font-bold">
          DataAnalytics
        </Link>
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-md">
          {!isSubmitted ? (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">{t("resetPassword")}</h1>
                <p className="text-gray-500">Введите ваш email для получения ссылки на сброс пароля</p>
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
                        Отправка...
                      </div>
                    ) : (
                      t("sendResetLink")
                    )}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <svg
                className="mx-auto h-12 w-12 text-green-500"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h2 className="text-xl font-bold">Проверьте ваш email</h2>
              <p className="text-gray-500">
                Мы отправили ссылку для сброса пароля на ваш email. Пожалуйста, проверьте вашу почту.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/auth/login">Вернуться на страницу входа</Link>
              </Button>
            </div>
          )}
          <div className="text-center text-sm">
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Вернуться на страницу входа
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
