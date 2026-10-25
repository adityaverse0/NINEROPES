"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

export interface NavBarProps {
  items: NavItem[]
  className?: string
  activeTab?: string
  onTabChange?: (name: string) => void
  layoutId?: string
}

// Universal Link component compatible with React SPA & standard links
const Link: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }> = ({
  href,
  onClick,
  children,
  className,
  ...props
}) => {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (href === '#' || href.startsWith('#')) {
          e.preventDefault()
        }
        onClick?.(e)
      }}
      className={className}
      {...props}
    >
      {children}
    </a>
  )
}

export function NavBar({
  items,
  className,
  activeTab: externalActiveTab,
  onTabChange,
  layoutId = "lamp",
}: NavBarProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(items[0]?.name || '')

  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab

  const handleSelect = (name: string) => {
    setInternalActiveTab(name)
    onTabChange?.(name)
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 sm:gap-2 bg-background/90 border border-border backdrop-blur-md py-1 px-1 sm:px-1.5 rounded-full shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab.toLowerCase() === item.name.toLowerCase()

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => handleSelect(item.name)}
              className={cn(
                "relative cursor-pointer text-xs sm:text-sm font-medium px-2.5 sm:px-6 py-1.5 sm:py-2 rounded-full transition-colors select-none",
                "text-muted-foreground hover:text-foreground active:scale-95",
                isActive && "bg-muted text-primary font-semibold",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden flex items-center justify-center p-0.5">
                <Icon size={18} strokeWidth={2.2} />
              </span>
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 w-full bg-primary/10 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                  }}
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-1 bg-primary rounded-t-full">
                    <div className="absolute w-10 sm:w-12 h-5 bg-primary/25 rounded-full blur-sm -top-2 -left-2" />
                    <div className="absolute w-6 sm:w-8 h-5 bg-primary/20 rounded-full blur-xs -top-1" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
