import React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

export interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
  onClose?: () => void;
}

export function Alert({ type = "info", title, message, errors, onClose }: AlertProps) {
  const configs = {
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-900",
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />,
    },
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />,
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-amber-900",
      icon: <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />,
    },
    error: {
      bg: "bg-rose-50 border-rose-200 text-rose-900",
      icon: <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />,
    },
  };

  const current = configs[type];

  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3 ${current.bg} text-sm my-3 animate-fade-in`}>
      {current.icon}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold text-sm mb-0.5">{title}</h5>}
        <p className="leading-relaxed">{message}</p>
        {errors && errors.length > 0 && (
          <ul className="mt-2 list-disc list-inside space-y-1 text-xs opacity-90">
            {errors.map((err, idx) => (
              <li key={idx}>
                {err.field ? <span className="font-semibold capitalize">{err.field}: </span> : null}
                {err.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="text-xs font-semibold px-2 py-0.5 rounded hover:bg-black/5 ml-auto"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
