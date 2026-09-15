import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Languages, User, Lock, Mail, Activity, LogIn, UserPlus } from 'lucide-react';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Treat username as email if not containing '@'
    const email = username.includes('@') ? username : (username.toLowerCase() === 'shambel121419' ? 'negeseshambel@gmail.com' : `${username}@polyglotscribe.com`);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user doc - assign admin if it matches the specific email
        const assignedRole = (email.toLowerCase() === 'negeseshambel@gmail.com' || username.toLowerCase() === 'shambel121419') ? 'admin' : 'user';
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          role: assignedRole,
          createdAt: serverTimestamp()
        });
        setSuccess('Account created successfully! You are now logged in.');
        onAuthSuccess();
      }
    } catch (err: any) {
      console.warn('Authentication notice:', err.code);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Action Required: Email/Password login is not enabled. Please go to your Firebase Console -> Authentication -> Sign-in method, and enable "Email/Password".');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid username or password.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md shadow-indigo-500/20 text-white mb-4">
            <Languages className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">PolyglotScribe</h1>
          <p className="text-slate-400 text-sm mt-2">
            {isLogin ? 'Sign in to access your workspace' : 'Create an account to get started'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-medium mb-4 text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs font-medium mb-4 text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Username or Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="negeseshambel@gmail.com or username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
