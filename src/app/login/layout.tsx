import type { Metadata } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Agendaí";

export const metadata: Metadata = {
  title: `Login — ${appName}`,
  description: `Entre no painel ${appName}`,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
