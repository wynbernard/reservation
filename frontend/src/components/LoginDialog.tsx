import { useState, type FormEvent } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiUrl } from "@/lib/api"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: (email: string, role: string) => void
}

export default function LoginDialog({ open, onOpenChange, onSuccess }: Props) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
    const [loading, setLoading] = useState(false)

    function handleOpenChange(next: boolean) {
        if (!next) {
            setEmail("")
            setPassword("")
            setErrors({})
            setShowPassword(false)
        }
        onOpenChange(next)
    }

    async function handleSubmit(ev: FormEvent) {
        ev.preventDefault()
        const e: typeof errors = {}
        if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email"
        if (password.length < 6) e.password = "Password must be at least 6 characters"
        setErrors(e)
        if (Object.keys(e).length > 0) return

        setLoading(true)
        try {
            const res = await fetch(apiUrl("Login/Login.php"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            const text = await res.text()
            let data: {
                success?: boolean
                message?: string
                user?: { role?: string }
            } = {}
            try {
                data = JSON.parse(text)
            } catch {
                throw new Error("Server error: received non-JSON response from server.")
            }

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Invalid email or password")
            }
            if (!data.user?.role) {
                throw new Error("Server response did not include the user role")
            }

            onSuccess(email, data.user.role)
            handleOpenChange(false)
        } catch (err) {
            setErrors({ form: err instanceof Error ? err.message : "Something went wrong" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="border bg-white p-8 text-neutral-900 shadow-2xl sm:max-w-md dark:bg-neutral-900 dark:text-neutral-50">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Welcome back</DialogTitle>
                    <DialogDescription>Log in to manage your reservations.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                        {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                            <Input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowPassword((s) => !s)}
                                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                    </div>

                    {errors.form && <p className="text-destructive text-sm">{errors.form}</p>}

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        {loading ? "Logging in..." : "Log in"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}