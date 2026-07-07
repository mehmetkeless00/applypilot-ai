"use client";

import { type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700";

export function Input({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  const input = (
    <input id={label ? id : undefined} className={cn(fieldClasses, className)} {...props} />
  );
  if (!label) return input;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {input}
    </div>
  );
}

export function Textarea({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const id = useId();
  const textarea = (
    <textarea
      id={label ? id : undefined}
      className={cn(fieldClasses, "resize-y", className)}
      {...props}
    />
  );
  if (!label) return textarea;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {textarea}
    </div>
  );
}
