import React from "react";

export function NotificationBellButton({
  unreadCount = 0,
  onClick,
  className = "",
  title = "แจ้งเตือน",
}) {
  const normalizedUnreadCount = Number(unreadCount) || 0;
  const badgeLabel =
    normalizedUnreadCount > 0
      ? normalizedUnreadCount > 99
        ? "99+"
        : `${normalizedUnreadCount}`
      : "";

  return (
    <button
      type="button"
      className={className || "relative h-10 w-10 rounded-full bg-[#F4D03E] border border-zinc-200 grid place-items-center"}
      onClick={onClick}
      data-notification-unread={badgeLabel}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    </button>
  );
}
