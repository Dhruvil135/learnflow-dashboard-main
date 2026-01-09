import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Mail, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            const response = await authApi.forgotPassword(email);
            setEmailSent(true);

            // ✅ DEV MODE: If resetUrl is returned, show it directly
            if (response.devMode && response.resetUrl) {
                setDevResetUrl(response.resetUrl);
                toast.success('Dev Mode: Reset link generated!');
            } else {
                toast.success('Reset link sent! Check your email.');
            }
        } catch (error: any) {
            console.error('Forgot password error:', error);
            setEmailSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <GraduationCap className="h-10 w-10 text-primary" />
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            SkillForge
                        </span>
                    </div>
                    <p className="text-muted-foreground">Password Recovery</p>
                </div>

                <Card className="shadow-xl border-0 bg-card/80 backdrop-blur">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Forgot Password?</CardTitle>


                    </CardHeader>

                    <CardContent>
                        {emailSent ? (
                            // Success State
                            <div className="text-center space-y-4">
                                {devResetUrl ? (
                                    // Dev Mode - Email Not Sent (Red X)
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    </div>
                                ) : (
                                    // Email Actually Sent (Green Check)
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                                        <XCircle className="h-8 w-8 text-red-600" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-lg mb-1">
                                        {devResetUrl ? '🛠️ Dev Mode' : 'Email Not Sent!'}
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        {devResetUrl
                                            ? 'Email not configured. Use the link below:'
                                            : `Account does not exists for ${email}, you need to create new account.`
                                        }
                                    </p>
                                </div>

                                {/* ✅ DEV MODE: Show clickable reset button */}
                                {devResetUrl && (() => {
                                    // Extract path from URL
                                    let resetPath = devResetUrl;
                                    try {
                                        const url = new URL(devResetUrl);
                                        resetPath = url.pathname;
                                    } catch {
                                        if (!devResetUrl.startsWith('/')) {
                                            resetPath = '/' + devResetUrl;
                                        }
                                    }
                                    return (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">Click below to reset:</p>
                                            <Button
                                                variant="default"
                                                className="w-full"
                                                onClick={() => navigate(resetPath)}
                                            >
                                                🔗 Open Reset Password Page
                                            </Button>
                                        </div>
                                    );
                                })()}

                                <div className="pt-4 space-y-2">
                                    {!devResetUrl && (
                                        <p className="text-xs text-muted-foreground">
                                            Email will not Receive
                                        </p>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => { setEmailSent(false); setDevResetUrl(null); }}
                                        className="w-full"
                                    >
                                        Try again with a different email
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // Email Form
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                            disabled={loading}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* Back to Login */}
                        <div className="mt-6 text-center">
                            <Link
                                to="/auth"
                                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
