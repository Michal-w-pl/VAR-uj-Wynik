'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

// Komponent wyświetlający piękną grafikę flagi z zewnętrznego serwera FlagCDN (odporny na Windowsa!)
const TeamFlag = ({ teamName }: { teamName: string }) => {
  const flags: Record<string, string> = {
    'Poland': 'pl', 'Argentina': 'ar', 'Brazil': 'br', 'France': 'fr', 'Germany': 'de',
    'Spain': 'es', 'England': 'gb-eng', 'Portugal': 'pt', 'Netherlands': 'nl', 'Italy': 'it',
    'Belgium': 'be', 'Croatia': 'hr', 'Uruguay': 'uy', 'Mexico': 'mx', 'United States': 'us',
    'Canada': 'ca', 'Morocco': 'ma', 'Senegal': 'sn', 'Japan': 'jp', 'South Korea': 'kr',
    'Australia': 'au', 'Ukraine': 'ua', 'Colombia': 'co', 'Ecuador': 'ec', 'Switzerland': 'ch',
    'Denmark': 'dk', 'Ghana': 'gh', 'Cameroon': 'cm', 'South Africa': 'za', 'Czechia': 'cz',
    'Bosnia-Herzegovina': 'ba', 'Paraguay': 'py', 'Qatar': 'qa', 'Serbia': 'rs', 'Chile': 'cl',
    'Peru': 'pe', 'Venezuela': 've', 'Nigeria': 'ng', 'Algeria': 'dz', 'Egypt': 'eg',
    'Mali': 'ml', 'Ivory Coast': 'ci', 'Jamaica': 'jm', 'Panama': 'pa', 'New Zealand': 'nz'
  }

  const code = flags[teamName]

  if (!code) return <span className="mx-2 text-xl">🏳️</span>

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width="28"
      alt={`Flaga ${teamName}`}
      className="inline-block mx-2 rounded shadow-sm border border-gray-700"
    />
  )
}

interface Match {
  id: number
  api_fixture_id: number
  team_a: string
  team_b: string
  start_time: string
  status: string
  score_a: number | null
  score_b: number | null
}

interface Prediction {
  match_id: number
  pred_a: number
  pred_b: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, { predA: string; predB: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Sprawdź zalogowanego użytkownika
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          window.location.href = '/login'
          return
        }
        setUser(user)

        // 2. Pobierz profil gracza (nick i punkty)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profileData)

        // 3. Pobierz wszystkie 104 mecze z terminarza
        const { data: matchesData } = await supabase
          .from('matches')
          .select('*')
          .order('start_time', { ascending: true })
        setMatches(matchesData || [])

        // 4. Pobierz dotychczasowe typy gracza, żeby uzupełnić formularze
        const { data: predsData } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', user.id)

        const predsMap: Record<number, { predA: string; predB: string }> = {}
        predsData?.forEach((p: any) => {
          predsMap[p.match_id] = {
            predA: p.pred_a.toString(),
            predB: p.pred_b.toString()
          }
        })
        setPredictions(predsMap)

      } catch (err) {
        console.error('Błąd ładowania danych:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Obsługa zmiany wartości w okienkach wyniku
  const handleInputChange = (matchId: number, team: 'A' | 'B', value: string) => {
    // Pozwalamy wpisywać tylko cyfry
    if (value !== '' && !/^\d+$/.test(value)) return

    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === 'A' ? 'predA' : 'predB']: value
      }
    }))
  }

  // Funkcja wysyłająca typ gracza do bazy danych
  const handleSavePrediction = async (matchId: number) => {
    const typ = predictions[matchId]
    if (!typ || typ.predA === '' || typ.predB === '') {
      setSaveStatus(prev => ({ ...prev, [matchId]: 'Wpisz oba wyniki!' }))
      return
    }

    setSaveStatus(prev => ({ ...prev, [matchId]: 'Zapisywanie...' }))

    try {
      // Sprawdzamy czy typ na ten mecz już istnieje w bazie
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .single()

      if (existing) {
        // Aktualizacja istniejącego typu
        await supabase
          .from('predictions')
          .update({
            pred_a: parseInt(typ.predA),
            pred_b: parseInt(typ.predB)
          })
          .eq('id', existing.id)
      } else {
        // Wstawienie nowego typu
        await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            match_id: matchId,
            pred_a: parseInt(typ.predA),
            pred_b: parseInt(typ.predB)
          })
      }

      setSaveStatus(prev => ({ ...prev, [matchId]: 'Zapisano! ✅' }))
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [matchId]: '' }))
      }, 2000)

    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [matchId]: 'Błąd zapisu ❌' }))
    }
  }

  // Wylogowanie
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2332] text-white">
        <div className="text-xl font-semibold animate-pulse text-green-500">Ładowanie terminarza rozgrywek...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a2332] text-white p-4 md:p-8">
      
      {/* NAGŁÓWEK DASHBOARDU */}
      <div className="max-w-6xl mx-auto bg-[#222e43] rounded-xl p-6 mb-8 border border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div>
          <h1 className="text-3xl font-extrabold text-green-500 tracking-wider">TYPER MISTRZOSTW ŚWIATA 2026</h1>
          <p className="text-gray-400 mt-1">
            Zalogowany jako: <span className="text-white font-bold">{profile?.username || 'Gracz'}</span>
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center bg-[#1a2332] px-6 py-3 rounded-lg border border-gray-600">
            <span className="block text-xs uppercase text-gray-400 font-semibold tracking-wider">Twoje Punkty</span>
            <span className="text-2xl font-black text-green-400">{profile?.total_points ?? 0} pkt</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/20 border border-red-600 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all text-sm font-medium"
          >
            Wyloguj
          </button>
        </div>
      </div>

      {/* LISTA MECZÓW DO TYPOWANIA */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-6 text-gray-300 border-l-4 border-green-500 pl-3">Terminarz i Twoje Typy</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map(match => {
            const isFinished = match.status === 'finished'
            const formattedDate = new Date(match.start_time).toLocaleString('pl-PL', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })

            return (
              <div 
                key={match.id} 
                className="bg-[#222e43] border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-gray-600 transition-all"
              >
                {/* Górna belka meczu */}
                <div className="flex justify-between items-center text-xs text-gray-400 mb-4 bg-[#1a2332]/50 p-2 rounded">
                  <span>📅 {formattedDate}</span>
                  {isFinished ? (
                    <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded">Zakończony</span>
                  ) : (
                    <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded">⏳ Otwarte do gwizdka</span>
                  )}
                </div>

                {/* Środek: Zespoły i flagi graficzne */}
                <div className="grid grid-cols-3 items-center text-center my-2">
                  <div className="flex flex-col items-center gap-2">
                    <TeamFlag teamName={match.team_a} />
                    <span className="font-bold text-sm md:text-base tracking-wide truncate max-w-full">{match.team_a}</span>
                    {isFinished && <span className="text-xl font-black text-gray-300 mt-1">{match.score_a}</span>}
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="bg-[#1a2332] text-xs font-bold px-3 py-1.5 rounded-full border border-gray-700 text-green-500">VS</span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <TeamFlag teamName={match.team_b} />
                    <span className="font-bold text-sm md:text-base tracking-wide truncate max-w-full">{match.team_b}</span>
                    {isFinished && <span className="text-xl font-black text-gray-300 mt-1">{match.score_b}</span>}
                  </div>
                </div>

                {/* Dół: Formularz wprowadzania typów */}
                <div className="mt-5 pt-4 border-t border-gray-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 font-medium">Twój typ na mecz:</span>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      disabled={isFinished}
                      value={predictions[match.id]?.predA || ''}
                      onChange={e => handleInputChange(match.id, 'A', e.target.value)}
                      className="w-12 h-9 bg-[#1a2332] border border-gray-600 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                      placeholder="-"
                    />
                    <span className="text-gray-500 font-bold">:</span>
                    <input
                      type="text"
                      maxLength={2}
                      disabled={isFinished}
                      value={predictions[match.id]?.predB || ''}
                      onChange={e => handleInputChange(match.id, 'B', e.target.value)}
                      className="w-12 h-9 bg-[#1a2332] border border-gray-600 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                      placeholder="-"
                    />

                    <button
                      onClick={() => handleSavePrediction(match.id)}
                      disabled={isFinished}
                      className="ml-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-bold text-xs rounded-lg transition-colors disabled:cursor-not-allowed shadow"
                    >
                      Zapisz
                    </button>
                  </div>
                </div>

                {/* Status zapisu typu pod każdą kartą */}
                {saveStatus[match.id] && (
                  <div className="text-center text-xs mt-2 text-green-400 font-semibold animate-pulse">
                    {saveStatus[match.id]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}