import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="space-y-2 text-pretty">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Welcome back
        </p>
        <h1 className="text-3xl font-semibold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">
          Access the Sales Agent workspace with your Clerk account.
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-6',
            card: 'shadow-none border-none bg-transparent p-0',
          },
        }}
        fallbackRedirectUrl="/"
      />
    </div>
  )
}
