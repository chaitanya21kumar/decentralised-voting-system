import toast from "react-hot-toast";

/**
 * Shows a simple toast notification.
 */
export const showToast = (message: string, type: "success" | "error", id?: string) => {
  if (id) toast.dismiss(id);
  else toast.dismiss();

  if (type === "success") {
    toast.success(message, { id });
  } else {
    toast.error(message, { id });
  }
};

/**
 * Shows a toast for a promise-based async operation.
 * Automatically dismisses existing toasts before showing new ones.
 */
export const showToastPromise = (
  promise: Promise<any>,
  messages: {
    loading: string;
    success: string;
    error: string | ((err: any) => string);
  }
) => {
  toast.dismiss(); // dismiss all previous toasts before showing this one

  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err) => {
      if (typeof messages.error === "function") return messages.error(err);
      return messages.error;
    },
  });
};
