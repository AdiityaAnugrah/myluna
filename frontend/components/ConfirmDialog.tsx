"use client"

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
import { ReactNode } from "react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onCancel?: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] border-none shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 pt-4 border-t gap-2 sm:gap-0">
          <AlertDialogCancel 
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            className="rounded-full px-6"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              // We don't necessarily want to close it if we are navigating, 
              // but router.push/back are async.
              onOpenChange(false);
            }}
            className={`rounded-full px-6 ${
              variant === "destructive" 
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200" 
                : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
