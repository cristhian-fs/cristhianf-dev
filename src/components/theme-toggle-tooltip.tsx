import { Moon, Sun, SunMedium } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const THEMES = ['dark', 'light', 'sunny'] as const
type Theme = (typeof THEMES)[number]

function getCurrentTheme(): Theme {
  const el = document.documentElement
  if (el.classList.contains('dark')) return 'dark'
  if (el.classList.contains('sunny')) return 'sunny'
  return 'light'
}

function getNextTheme(current: Theme): Theme {
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
}

function applyTheme(theme: Theme) {
  const el = document.documentElement
  el.classList.add('disable-transitions')
  el.classList.remove('dark', 'light', 'sunny')
  el.classList.add(theme)
  window.getComputedStyle(el).getPropertyValue('opacity')
  requestAnimationFrame(() => el.classList.remove('disable-transitions'))
  localStorage.setItem('crisfsdev-theme', theme)
  document.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }))
}

const ThemeIcon: Record<Theme, React.ReactNode> = {
  dark: <Moon className="size-4 pointer-fine:size-3" />,
  light: <Sun className="size-4 pointer-fine:size-3" />,
  sunny: <SunMedium className="size-4 pointer-fine:size-3" />,
}

export function ThemeToggleTooltip() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    setTheme(getCurrentTheme())

    const handler = (e: Event) => setTheme((e as CustomEvent<Theme>).detail)
    document.addEventListener('theme-changed', handler)
    return () => document.removeEventListener('theme-changed', handler)
  }, [])

  function handleClick() {
    const next = getNextTheme(theme)
    applyTheme(next)
    setTheme(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className="theme-toggle-btn pointer-fine:size-6 pointer-fine:cursor-pointer pointer-fine:rounded-sm"
        >
          {ThemeIcon[theme]}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent
        className="bg-popover text-popover-foreground border"
        side="top"
        sideOffset={4}
      >
        <div className="flex items-center gap-x-2">
          <span>Toggle theme</span>
          <div className="bg-muted text-foreground flex size-4 items-center justify-center rounded-sm border font-mono">
            T
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
