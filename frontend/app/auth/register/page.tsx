"use client"

import { useState } from "react"
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

const registerSchema = z
  .object({
    email: z.string().email({
      message: "Пожалуйста, введите корректный email",
    }),
    password: z
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
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true)

    try {
      // Имитация API запроса
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Успешная регистрация
      toast({
        title: "Регистрация успешна",
        description: "Вы успешно зарегистрировались в системе",
      })

      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Ошибка регистрации",
        description: "Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.",
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
            <h1 className="text-2xl font-bold">{t("register")}</h1>
            <p className="text-gray-500">Создайте аккаунт для доступа к платформе</p>
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
                      <Input placeholder="••••••••" type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" autoComplete="new-password" {...field} />
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
                    Регистрация...
                  </div>
                ) : (
                  t("register")
                )}
              </Button>
            </form>
          </Form>
          <div className="text-center text-sm">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              {t("login")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
