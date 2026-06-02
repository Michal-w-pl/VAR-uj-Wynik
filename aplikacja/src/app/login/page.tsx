'use client'

import { useState } from 'react'
import { createClient } from '../../utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('') // Nazwa do rankingu
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isLogin) {
      // LOGOWANIE
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Błędne dane logowania.')
      else router.push('/') // Przekierowanie na stronę główną (Dashboard)
    } else {
      // REJESTRACJA
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { username: username }
        }
      })
      if (error) setError(error.message)
      else {
        alert('Rejestracja udana! Możesz się teraz zalogować.')
        setIsLogin(true)
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-white font-sans">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        <h2 className="text-2xl font-black tracking-wider text-center mb-6 text-emerald-400">
          {isLogin ? 'Logowanie do Typera' : 'Rejestracja Gracza'}
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nazwa użytkownika (widoczna w rankingu)</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Hasło</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required 
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center font-bold bg-red-500/10 py-2 rounded">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 px-4 py-3 text-slate-900 font-black tracking-wide hover:bg-emerald-600 focus:outline-none transition-colors disabled:bg-emerald-800 disabled:text-slate-400"
          >
            {loading ? 'Przetwarzanie...' : (isLogin ? 'Wejdź do gry' : 'Załóż konto')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Nie masz jeszcze konta? " : "Masz już konto? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }} 
            className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
          >
            {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
          </button>
        </div>
      </div>
    </div>
  )
}