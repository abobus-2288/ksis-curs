interface StatusBannerProps {
  message?: string;
  tone?: "info" | "error" | "success";
  onDismiss?: () => void;
}

export function StatusBanner({ message, tone = "info", onDismiss }: StatusBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={`status-banner ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{message}</span>
      {onDismiss ? (
        <button onClick={onDismiss} type="button" aria-label="Dismiss message">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
