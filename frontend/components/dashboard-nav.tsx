"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTranslation } from "@/components/language-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Menu, User, Upload, BarChart2, Settings, LogOut } from "lucide-react"

export function DashboardNav() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const routes = [
    {
      href: "/dashboard",
      label: t("dashboard"),
      icon: <BarChart2 className="mr-2 h-4 w-4" />,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/upload",
      label: t("uploadData"),
      icon: <Upload className="mr-2 h-4 w-4" />,
      active: pathname === "/dashboard/upload",
    },
    {
      href: "/dashboard/settings",
      label: t("profileSettings"),
      icon: <Settings className="mr-2 h-4 w-4" />,
      active: pathname === "/dashboard/settings",
    },
  ]

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Открыть меню</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <nav className="flex flex-col gap-4 pt-4">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      route.active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {route.icon}
                    {route.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="text-xl font-bold">
            DataAnalytics
          </Link>
          <nav className="ml-8 hidden lg:flex lg:items-center lg:gap-4">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  route.active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {route.icon}
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
                <span className="sr-only">Открыть меню пользователя</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  {t("profileSettings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/auth/login">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
