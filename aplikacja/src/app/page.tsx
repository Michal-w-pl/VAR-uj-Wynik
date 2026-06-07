'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

const TeamFlag = ({ teamName }: { teamName: string }) => {
  const normalizedName = teamName.trim()
  
  const flags: Record<string, string> = {
    'Poland': 'pl', 'Argentina': 'ar', 'Brazil': 'br', 'France': 'fr', 'Germany': 'de',
    'Spain': 'es', 'England': 'gb-eng', 'Portugal': 'pt', 'Netherlands': 'nl', 'Italy': 'it',
    'Belgium': 'be', 'Croatia': 'hr', 'Uruguay': 'uy', 'Mexico': 'mx', 'United States': 'us',
    'USA': 'us', 'Canada': 'ca', 'Morocco': 'ma', 'Senegal': 'sn', 'Japan': 'jp',
    'South Korea': 'kr', 'Korea Republic': 'kr', 'Australia': 'au', 'Ukraine': 'ua',
    'Colombia': 'co', 'Ecuador': 'ec', 'Switzerland': 'ch', 'Denmark': 'dk', 'Ghana': 'gh',
    'Cameroon': 'cm', 'South Africa': 'za', 'Czechia': 'cz', 'Czech Republic': 'cz',
    'Bosnia-Herzegovina': 'ba', 'Bosnia and Herzegovina': 'ba', 'Paraguay': 'py',
    'Qatar': 'qa', 'Serbia': 'rs', 'Chile': 'cl', 'Peru': 'pe', 'Venezuela': 've',
    'Nigeria': 'ng', 'Algeria': 'dz', 'Egypt': 'eg', 'Mali': 'ml', 'Ivory Coast': 'ci',
    'Côte d\'Ivoire': 'ci', 'Jamaica': 'jm', 'Panama': 'pa', 'New Zealand': 'nz',
    'Saudi Arabia': 'sa', 'Iran': 'ir', 'IR Iran': 'ir', 'Costa Rica': 'cr', 'Tunisia': 'tn',
    'Wales': 'gb-wls', 'Scotland': 'gb-sct', 'Republic of Ireland': 'ie', 'Northern Ireland': 'gb-nir',
    'Sweden': 'se', 'Norway': 'no', 'Finland': 'fi', 'Iceland': 'is', 'Austria': 'at',
    'Hungary': 'hu', 'Turkey': 'tr', 'Türkiye': 'tr', 'Greece': 'gr', 'Romania': 'ro',
    'Slovakia': 'sk', 'Slovenia': 'si', 'Albania': 'al', 'North Macedonia': 'mk', 'Georgia': 'ge',
    'Bolivia': 'bo', 'Honduras': 'hn', 'El Salvador': 'sv', 'United Arab Emirates': 'ae',
    'Iraq': 'iq', 'Oman': 'om', 'China PR': 'cn', 'China': 'cn', 'Uzbekistan': 'uz',
    'Bahrain': 'bh', 'Syria': 'sy', 'Zambia': 'zm', 'Burkina Faso': 'bf', 'Guinea': 'gn',
    'Curaçao': 'cw', 'Cape Verde Islands': 'cv', 'Haiti': 'ht', 'Jordan': 'jo', 'Congo DR': 'cd'
  }

  const code = flags[normalizedName]

  if (!code) return <span className="mx-2 text-xl cursor-help" title={`Brak we słowniku: ${teamName}`}>🏳️</span>

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width="28"
      alt={`Flaga ${teamName}`}
      title={teamName}
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

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, { predA: string; predB: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<Record<number, string>>({})
  
  // NOWE STANY DLA TABELI GRACZY I MGŁY WOJNY
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [matchOthers, setMatchOthers] = useState<Record<number, any[]>>({})
  const [loadingOthers, setLoadingOthers] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          window.location.href = '/login'
          return
        }
        setUser(user)

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(profileData)

        // POBIERZ TABELĘ GRACZY
        const { data: lbData } = await supabase.from('profiles').select('*').order('total_points', { ascending: false })
        setLeaderboard(lbData || [])

        const { data: matchesData } = await supabase.from('matches').select('*').order('start_time', { ascending: true })
        setMatches(matchesData || [])

        const { data: predsData } = await supabase.from('predictions').select('*').eq('user_id', user.id)

        const predsMap: Record<number, { predA: string; predB: string }> = {}
        predsData?.forEach((p: any) => {
          predsMap[p.match_id] = { predA: p.pred_a.toString(), predB: p.pred_b.toString() }
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

  const handleInputChange = (matchId: number, team: 'A' | 'B', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], [team === 'A' ? 'predA' : 'predB']: value } }))
  }

  const handleSavePrediction = async (matchId: number) => {
    const typ = predictions[matchId]
    if (!typ || typ.predA === '' || typ.predB === '') {
      setSaveStatus(prev => ({ ...prev, [matchId]: 'Wpisz oba wyniki!' }))
      return
    }

    setSaveStatus(prev => ({ ...prev, [matchId]: 'Zapisywanie...' }))

    try {
      const { data: existing } = await supabase.from('predictions').select('id').eq('user_id', user.id).eq('match_id', matchId).single()

      if (existing) {
        await supabase.from('predictions').update({ pred_a: parseInt(typ.predA), pred_b: parseInt(typ.predB) }).eq('id', existing.id)
      } else {
        await supabase.from('predictions').insert({ user_id: user.id, match_id: matchId, pred_a: parseInt(typ.predA), pred_b: parseInt(typ.predB) })
      }

      setSaveStatus(prev => ({ ...prev, [matchId]: 'Zapisano! ✅' }))
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [matchId]: '' })), 2000)
    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [matchId]: 'Błąd zapisu ❌' }))
    }
  }

  // NOWA FUNKCJA: Odkrywanie typów innych (Mgła Wojny)
  const handleRevealOthers = async (matchId: number) => {
    setLoadingOthers(prev => ({ ...prev, [matchId]: true }))
    try {
      const { data } = await supabase.from('predictions').select('*').eq('match_id', matchId)
      
      const mapped = (data || []).map(p => {
        const userProfile = leaderboard.find(u => u.id === p.user_id)
        return {
          ...p,
          username: userProfile?.username || 'Gracz'
        }
      })
      
      // Sortujemy, żeby pokazać alfabetycznie (lub według zdobytych punktów w meczu)
      mapped.sort((a, b) => (b.points_earned || 0) - (a.points_earned || 0))
      
      setMatchOthers(prev => ({ ...prev, [matchId]: mapped }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOthers(prev => ({ ...prev, [matchId]: false }))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2332] text-white">
        <div className="text-xl font-semibold animate-pulse text-green-500">Pobieranie najnowszych statystyk...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a2332] text-white p-4 md:p-8 font-sans">
      
      <div className="max-w-7xl mx-auto bg-[#222e43] rounded-xl p-6 mb-8 border border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl">
        <div>
          <h1 className="text-3xl font-extrabold text-green-500 tracking-wider">TYPER 2026</h1>
          <p className="text-gray-400 mt-1">
            Zalogowany jako: <span className="text-white font-bold">{profile?.username || 'Gracz'}</span>
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center bg-[#1a2332] px-6 py-3 rounded-lg border border-gray-600 shadow-inner">
            <span className="block text-xs uppercase text-gray-400 font-semibold tracking-wider">Twoje Punkty</span>
            <span className="text-2xl font-black text-green-400">{profile?.total_points ?? 0}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/20 border border-red-600 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all text-sm font-medium"
          >
            Wyloguj
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEWA KOLUMNA: TABELA GRACZY (Na telefonie pojawia się jako pierwsza!) */}
        <div className="order-1 lg:order-2 lg:col-span-1">
          <div className="bg-[#222e43] border border-gray-700 rounded-xl p-5 sticky top-4 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-white border-l-4 border-green-500 pl-3">🏆 Tabela Graczy</h2>
            <div className="flex flex-col gap-2">
              {leaderboard.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between bg-[#1a2332] p-3 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                      {index + 1}.
                    </span>
                    <span className="font-semibold text-gray-200">{player.username}</span>
                  </div>
                  <span className="font-bold text-green-400">{player.total_points} pkt</span>
                </div>
              ))}
              {leaderboard.length === 0 && <span className="text-gray-500 text-sm">Brak graczy w lidze.</span>}
            </div>
          </div>
        </div>

        {/* PRAWA KOLUMNA: MECZE */}
        <div className="order-2 lg:order-1 lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-300 border-l-4 border-green-500 pl-3">Terminarz i Twoje Typy</h2>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {matches.map(match => {
              const isFinished = match.status === 'finished'
              const hasStarted = new Date(match.start_time).getTime() <= Date.now() // Blokada po pierwszym gwizdku
              const formattedDate = new Date(match.start_time).toLocaleString('pl-PL', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })

              // Dynamiczny status meczu
              let statusLabel = <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">⏳ Otwarte do gwizdka</span>
              if (isFinished) {
                statusLabel = <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Zakończony</span>
              } else if (hasStarted) {
                statusLabel = <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">⚽ W trakcie gry</span>
              }

              return (
                <div key={match.id} className="bg-[#222e43] border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-gray-600 transition-all">
                  
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-4 bg-[#1a2332]/50 p-2 rounded">
                    <span>📅 {formattedDate}</span>
                    {statusLabel}
                  </div>

                  <div className="grid grid-cols-3 items-center text-center my-2">
                    <div className="flex flex-col items-center gap-2">
                      <TeamFlag teamName={match.team_a} />
                      <span className="font-bold text-sm md:text-base tracking-wide truncate max-w-full" title={match.team_a}>{match.team_a}</span>
                      {hasStarted && <span className="text-xl font-black text-gray-300 mt-1">{match.score_a ?? '-'}</span>}
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="bg-[#1a2332] text-xs font-bold px-3 py-1.5 rounded-full border border-gray-700 text-green-500">VS</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <TeamFlag teamName={match.team_b} />
                      <span className="font-bold text-sm md:text-base tracking-wide truncate max-w-full" title={match.team_b}>{match.team_b}</span>
                      {hasStarted && <span className="text-xl font-black text-gray-300 mt-1">{match.score_b ?? '-'}</span>}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-700/60 flex flex-col gap-3">
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs text-gray-400 font-medium">Twój typ:</span>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          disabled={hasStarted}
                          value={predictions[match.id]?.predA || ''}
                          onChange={e => handleInputChange(match.id, 'A', e.target.value)}
                          className="w-12 h-10 bg-[#1a2332] border border-gray-600 rounded-lg text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                          placeholder="-"
                        />
                        <span className="text-gray-500 font-bold">:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          disabled={hasStarted}
                          value={predictions[match.id]?.predB || ''}
                          onChange={e => handleInputChange(match.id, 'B', e.target.value)}
                          className="w-12 h-10 bg-[#1a2332] border border-gray-600 rounded-lg text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                          placeholder="-"
                        />

                        {!hasStarted && (
                          <button
                            onClick={() => handleSavePrediction(match.id)}
                            className="ml-2 px-4 py-2 h-10 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition-colors shadow"
                          >
                            Zapisz
                          </button>
                        )}
                      </div>
                    </div>

                    {saveStatus[match.id] && (
                      <div className="text-center text-xs text-green-400 font-semibold animate-pulse">
                        {saveStatus[match.id]}
                      </div>
                    )}

                    {/* MGŁA WOJNY - Widoczne tylko, gdy mecz się rozpoczął */}
                    {hasStarted && (
                      <div className="mt-2 pt-3 border-t border-gray-700/40">
                        {matchOthers[match.id] ? (
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-bold">Typy z ligi:</p>
                            {matchOthers[match.id].map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-[#1a2332] px-3 py-2 rounded-lg border border-gray-700/50">
                                <span className="font-semibold text-gray-300 text-sm">{p.username}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">
                                    {p.pred_a} : {p.pred_b}
                                  </span>
                                  {p.points_earned !== null && p.points_earned > 0 && (
                                    <span className="text-xs font-bold text-yellow-400">+{p.points_earned} pkt</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {matchOthers[match.id].length === 0 && (
                              <p className="text-xs text-gray-500 italic">Nikt w lidze nie zdążył wytypować tego meczu.</p>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleRevealOthers(match.id)}
                            disabled={loadingOthers[match.id]}
                            className="w-full py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors uppercase tracking-wider"
                          >
                            {loadingOthers[match.id] ? 'Ładowanie danych...' : '👁️ Odkryj typy innych graczy'}
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}