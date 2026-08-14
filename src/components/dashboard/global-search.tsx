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

export function GlobalSearch() {
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full relative flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent group"
      >
        <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        <span className="flex-1 text-left hidden sm:inline-flex">Search everything...</span>
        <span className="flex-1 text-left sm:hidden">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-slate-300 bg-slate-100 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Core Pages">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/students"))}>
              <GraduationCap className="mr-2 h-4 w-4" />
              <span>Students Directory</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/staff"))}>
              <Briefcase className="mr-2 h-4 w-4" />
              <span>Staff Management</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Academics">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/results"))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Results & Grading</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/exam-questions"))}>
              <ClipboardList className="mr-2 h-4 w-4" />
              <span>Exam Questions</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/lesson-notes"))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Lesson Notes</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Finance">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/finance/invoices"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Invoices & Billing</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/finance/payroll"))}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Payroll</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/system"))}>
              <Database className="mr-2 h-4 w-4" />
              <span>System Config</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
