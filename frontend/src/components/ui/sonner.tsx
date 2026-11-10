import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

type ToastData = { variant: "success" | "error" };

export function Toaster() {
  const { toasts } = Toast.useToastManager<ToastData>();

  return (
    <Toast.Viewport className="fixed right-4 bottom-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none">
      {toasts.map((item) => {
        const isError = item.data?.variant === "error";
        return (
          <Toast.Root
            key={item.id}
            toast={item}
            className={`flex items-start justify-between gap-4 rounded-lg border p-4 shadow-lg outline-none ${
              isError
                ? "border-red-200 bg-white text-red-900 dark:border-red-900 dark:bg-neutral-900 dark:text-red-200"
                : "border-emerald-200 bg-white text-neutral-900 dark:border-emerald-900 dark:bg-neutral-900 dark:text-neutral-50"
            }`}
          >
            <Toast.Content className="min-w-0">
              {item.title && (
                <Toast.Title className="text-sm font-semibold">
                  {item.title}
                </Toast.Title>
              )}
              {item.description && (
                <Toast.Description className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {item.description}
                </Toast.Description>
              )}
            </Toast.Content>
            <Toast.Close
              aria-label="Dismiss notification"
              className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="size-4" />
            </Toast.Close>
          </Toast.Root>
        );
      })}
    </Toast.Viewport>
  );
}
