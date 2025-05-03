import AuthGuard from "@/components/AuthGuard"

export default function ReservationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard>{children}</AuthGuard>
} 