'use client';

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Calculator, Calendar, CreditCard, Settings, User, GraduationCap, LayoutDashboard, Database, Briefcase, FileText, ClipboardList } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

import { allNavLinks, navConfig, iconMap } from "@/lib/auth-guard"

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Flat list of all links
  const links = Object.values(allNavLinks);

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground bg-muted hover:bg-accent border border-border rounded-full transition-colors"
          title="Search pages (Ctrl + K)"
          aria-label="Search pages"
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full relative flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 border border-border rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent group"
        >
          <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="flex-1 text-left hidden sm:inline-flex">Search pages...</span>
          <span className="flex-1 text-left sm:hidden">Search...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span>Ctrl</span> <span>K</span>
          </kbd>
        </button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            {links.map((link, idx) => {
              const Icon = link.icon && iconMap[link.icon] ? iconMap[link.icon] : LayoutDashboard;
              return (
               <CommandItem key={idx} onSelect={() => runCommand(() => router.push(link.path))}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{link.label}</span>
               </CommandItem>
              );
            })}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <CommandShortcut>Ctrl+P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>Ctrl+S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
