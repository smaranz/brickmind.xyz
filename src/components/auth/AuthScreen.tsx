import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Lock,
    Mail,
    Layout,
    Sparkles,
    ArrowRight,
    Boxes,
    Hammer,
    ShieldCheck,
    AlertCircle,
    Loader2
} from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth-store";
import { cn } from "@/lib/utils";

export function AuthScreen() {
    const [isSignUp, setIsSignUp] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const { signIn, signUp, status, error } = useAuthStore();
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isSignUp) {
                await signUp(email, password);
            } else {
                await signIn(email, password);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FCF6E5] flex flex-col items-center justify-center p-4 selection:bg-yellow-200">
            {/* Background Decorative Bricks */}
            <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
                <div className="absolute top-10 left-10 text-8xl rotate-12">🧱</div>
                <div className="absolute top-1/4 right-20 text-6xl -rotate-12">🧱</div>
                <div className="absolute bottom-20 left-1/4 text-7xl rotate-45">🧱</div>
                <div className="absolute bottom-1/3 right-1/4 text-9xl -rotate-6">🧱</div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="h-20 w-20 bg-yellow-400 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                            <Boxes className="h-10 w-10 text-black" />
                        </div>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-2 -right-2 bg-red-500 border-2 border-black rounded-lg p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <Sparkles className="h-4 w-4 text-white" />
                        </motion.div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-black">BRICKMIND</h1>
                    <p className="text-gray-600 font-bold mt-1 uppercase tracking-widest text-xs">AI LEGO Architect</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    {/* Header Tabs */}
                    <div className="flex border-b-4 border-black bg-gray-50">
                        <button
                            onClick={() => setIsSignUp(false)}
                            className={cn(
                                "flex-1 py-4 font-black transition-all",
                                !isSignUp ? "bg-white text-black" : "text-gray-400 hover:text-black hover:bg-gray-100"
                            )}
                        >
                            SIGN IN
                        </button>
                        <div className="w-1 bg-black" />
                        <button
                            onClick={() => setIsSignUp(true)}
                            className={cn(
                                "flex-1 py-4 font-black transition-all",
                                isSignUp ? "bg-white text-black" : "text-gray-400 hover:text-black hover:bg-gray-100"
                            )}
                        >
                            CREATE ACCOUNT
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 border-2 border-red-500 p-4 rounded-2xl flex items-start gap-3"
                                >
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-bold text-red-700 leading-tight">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-black text-black ml-1 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 border-4 border-black rounded-2xl py-4 pl-12 pr-4 font-bold text-black focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-all placeholder:text-gray-400"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-black text-black ml-1 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 border-4 border-black rounded-2xl py-4 pl-12 pr-4 font-bold text-black focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-all placeholder:text-gray-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative group"
                        >
                            <div className="absolute inset-0 bg-black rounded-2xl translate-y-1.5" />
                            <div className={cn(
                                "relative flex items-center justify-center gap-3 py-4 rounded-2xl border-4 border-black font-black transition-all active:translate-y-1 text-black",
                                isSignUp ? "bg-green-400" : "bg-yellow-400"
                            )}>
                                {isLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <span>{isSignUp ? "START BUILDING" : "CONTINUE TO WORKSHOP"}</span>
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>

                        {/* Terms/Footer */}
                        <div className="text-center">
                            <p className="text-xs font-bold text-gray-400 leading-relaxed max-w-[280px] mx-auto">
                                By continuing, you agree to follow the code of the LEGO Architect and build only within the grid.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Feature Highlights */}
                <div className="mt-12 grid grid-cols-3 gap-4 px-2">
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="h-12 w-12 bg-blue-100 rounded-xl border-2 border-black flex items-center justify-center mb-2">
                            <ShieldCheck className="h-6 w-6 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-500">Secure</span>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -4 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="h-12 w-12 bg-purple-100 rounded-xl border-2 border-black flex items-center justify-center mb-2">
                            <Sparkles className="h-6 w-6 text-purple-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-500">AI Powered</span>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -4 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="h-12 w-12 bg-red-100 rounded-xl border-2 border-black flex items-center justify-center mb-2">
                            <Hammer className="h-6 w-6 text-red-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-500">LDU Grid</span>
                    </motion.div>
                </div>
            </motion.div>

            {/* Footer Branding */}
            <div className="mt-12 flex items-center gap-2 text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                <Layout className="h-3 w-3" />
                <span>System Version 2.0.4-LDU</span>
            </div>
        </div>
    );
}
