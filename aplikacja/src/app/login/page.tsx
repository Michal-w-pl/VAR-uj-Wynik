'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Łączymy się z bazą danych
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        // LOGOWANIE
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error('Błędne dane logowania.')
        
        // Po udanym logowaniu przenosimy na Dashboard
        router.push('/')
        router.refresh()
      } else {
        // REJESTRACJA
        if (!username.trim()) throw new Error('Musisz podać swoją nazwę gracza!')
        if (password.length < 6) throw new Error('Hasło musi mieć minimum 6 znaków.')

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username // <-- Tu wysyłamy Nick do bazy!
            }
          }
        })
        if (error) throw new Error('Błąd podczas rejestracji. Taki e-mail może już istnieć.')
        
        // Po udanej rejestracji przenosimy na Dashboard
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 text-white">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-500">TYPER 2026</h1>
          <p className="text-gray-400 mt-2">
            {isLogin ? 'Zaloguj się, aby typować mecze' : 'Załóż darmowe konto gracza'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-400 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Pole widoczne TYLKO podczas rejestracji */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nazwa gracza (Nick)</label>
              <input
                type="text"
                required={!isLogin}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                placeholder="np. Kowalski99"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Adres e-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="twoj@email.pl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Hasło</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors mt-6 disabled:opacity-50"
          >
            {loading ? 'Przetwarzanie...' : (isLogin ? 'Zaloguj się' : 'Zarejestruj się')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? "Nie masz jeszcze konta? " : "Masz już konto? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-green-400 hover:text-green-300 font-semibold"
          >
            {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
          </button>
        </div>

      </div>
    </div>
  )
}