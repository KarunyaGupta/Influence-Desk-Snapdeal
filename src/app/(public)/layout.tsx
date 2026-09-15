import React from "react";

/**
 * Public layout — used for login and onboarding flows.
 * Login uses a split layout (hero left + form right).
 * Onboarding uses its own full-width layout from its own layout.tsx.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
