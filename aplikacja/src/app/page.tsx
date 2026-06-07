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

  const [activeTab, setActiveTab] = useState<'matches' | 'groups' | 'bonus'>('matches')
  const [matchPhase, setMatchPhase] = useState<'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'finals'>('group')

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, { predA: string; predB: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<Record<number, string>>({})
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

  const filteredMatches = matches.filter(match => {
    const matchDate = new Date(match.start_time).getTime()
    const endOfGroups = new Date('2026-06-28T00:00:00Z').getTime()
    const endOfR32 = new Date('2026-07-04T00:00:00Z').getTime()
    const endOfR16 = new Date('2026-07-09T00:00:00Z').getTime()
    const endOfQF = new Date('2026-07-13T00:00:00Z').getTime()
    const endOfSF = new Date('2026-07-17T00:00:00Z').getTime()

    switch (matchPhase) {
      case 'group': return matchDate < endOfGroups
      case 'r32': return matchDate >= endOfGroups && matchDate < endOfR32
      case 'r16': return matchDate >= endOfR32 && matchDate < endOfR16
      case 'qf': return matchDate >= endOfR16 && matchDate < endOfQF
      case 'sf': return matchDate >= endOfQF && matchDate < endOfSF
      case 'finals': return matchDate >= endOfSF
      default: return true
    }
  })

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

  const handleRevealOthers = async (matchId: number) => {
    setLoadingOthers(prev => ({ ...prev, [matchId]: true }))
    try {
      const { data } = await supabase.from('predictions').select('*').eq('match_id', matchId)
      const mapped = (data || []).map(p => {
        const userProfile = leaderboard.find(u => u.id === p.user_id)
        return { ...p, username: userProfile?.username || 'Gracz' }
      })
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
    // Zmieniamy min-h-screen i dodajemy padding bottom (pb-24), żeby treść nie wchodziła pod dolną belkę
    <div className="min-h-screen bg-[#1a2332] text-white p-2 md:p-8 font-sans pb-24 md:pb-24">
      
      {/* HEADER (Tylko logo, profil, wyloguj - BEZ ZAKŁADEK) */}
      <div className="max-w-7xl mx-auto bg-[#222e43] rounded-xl p-4 md:p-6 mb-6 border border-gray-700 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-green-500 tracking-wider">TYPER 2026</h1>
          <p className="text-gray-400 mt-1">Gracz: <span className="text-white font-bold">{profile?.username}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center bg-[#1a2332] px-4 py-2 rounded-lg border border-gray-600">
            <span className="block text-[10px] uppercase text-gray-400 font-bold">Punkty</span>
            <span className="text-xl font-black text-green-400">{profile?.total_points ?? 0}</span>
          </div>
          <button onClick={handleLogout} className="px-3 py-2 bg-red-600/20 border border-red-600 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all text-xs font-bold">
            Wyloguj
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEWA KOLUMNA: TABELA GRACZY */}
        <div className="order-2 lg:order-1 lg:col-span-1">
          <div className="bg-[#222e43] border border-gray-700 rounded-xl p-5 sticky top-4 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-white border-l-4 border-green-500 pl-3">🏆 Tabela Graczy</h2>
            <div className="flex flex-col gap-2">
              {leaderboard.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between bg-[#1a2332] p-2 md:p-3 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className={`font-black text-sm md:text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                      {index + 1}.
                    </span>
                    <span className="font-semibold text-gray-200 text-sm md:text-base">{player.username}</span>
                  </div>
                  <span className="font-bold text-green-400 text-sm md:text-base">{player.total_points} pkt</span>
                </div>
              ))}
              {leaderboard.length === 0 && <span className="text-gray-500 text-sm">Brak graczy w ligach.</span>}
            </div>
          </div>
        </div>

        {/* PRAWA KOLUMNA: DYNAMICZNA ZAWARTOŚĆ NA PODSTAWIE AKTYWNEJ ZAKŁADKI Z DOLNEGO MENU */}
        <div className="order-1 lg:order-2 lg:col-span-3">
          
          {/* --- ZAKŁADKA 1: MECZE --- */}
          {activeTab === 'matches' && (
            <>
              {/* SUB-NAWIGACJA FAZ TURNIEJU */}
              <div className="bg-[#222e43] p-2 rounded-xl mb-6 border border-gray-700 shadow flex flex-wrap gap-2 justify-center lg:justify-start">
                <button onClick={() => setMatchPhase('group')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${matchPhase === 'group' ? 'bg-green-600 text-white shadow' : 'bg-[#1a2332] text-gray-400 hover:text-white'}`}>Faza Grupowa</button>
                <button onClick={() => setMatchPhase('r32')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${matchPhase === 'r32' ? 'bg-green-600 text-white shadow' : 'bg-[#1a2332] text-gray-400 hover:text-white'}`}>1/16 Finału</button>
                <button onClick={() => setMatchPhase('r16')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${matchPhase === 'r16' ? 'bg-green-600 text-white shadow' : 'bg-[#1a2332] text-gray-400 hover:text-white'}`}>1/8 Finału</button>
                <button onClick={() => setMatchPhase('qf')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${matchPhase === 'qf' ? 'bg-green-600 text-white shadow' : 'bg-[#1a2332] text-gray-400 hover:text-white'}`}>Ćwierćfinały</button>
                <button onClick={() => setMatchPhase('sf')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${matchPhase === 'sf' ? 'bg-green-600 text-white shadow' : 'bg-[#1a2332] text-gray-400 hover:text-white'}`}>Półfinały</button>
                <button onClick={() => setMatchPhase('finals')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${matchPhase === 'finals' ? 'bg-green-600 text-white shadow' : 'bg-[#1a2332] text-gray-400 hover:text-white'}`}>Finały</button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredMatches.map(match => {
                  const isFinished = match.status === 'finished'
                  const hasStarted = new Date(match.start_time).getTime() <= Date.now()
                  const formattedDate = new Date(match.start_time).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

                  let statusLabel = <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">⏳ Otwarte do gwizdka</span>
                  if (isFinished) statusLabel = <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Zakończony</span>
                  else if (hasStarted) statusLabel = <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">⚽ W trakcie</span>

                  return (
                    <div key={match.id} className="bg-[#222e43] border border-gray-700 rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-gray-600 transition-all">
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-4 bg-[#1a2332]/50 p-2 rounded">
                        <span>📅 {formattedDate}</span>
                        {statusLabel}
                      </div>

                      <div className="grid grid-cols-3 items-center text-center my-2">
                        <div className="flex flex-col items-center gap-2">
                          <TeamFlag teamName={match.team_a} />
                          <span className="font-bold text-xs md:text-sm tracking-wide truncate max-w-full" title={match.team_a}>{match.team_a}</span>
                          {hasStarted && <span className="text-xl font-black text-gray-300 mt-1">{match.score_a ?? '-'}</span>}
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="bg-[#1a2332] text-xs font-bold px-2 py-1 rounded border border-gray-700 text-green-500">VS</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <TeamFlag teamName={match.team_b} />
                          <span className="font-bold text-xs md:text-sm tracking-wide truncate max-w-full" title={match.team_b}>{match.team_b}</span>
                          {hasStarted && <span className="text-xl font-black text-gray-300 mt-1">{match.score_b ?? '-'}</span>}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-700/60 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                          <span className="text-xs text-gray-400 font-medium">Twój typ:</span>
                          <div className="flex items-center gap-2">
                            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} disabled={hasStarted} value={predictions[match.id]?.predA || ''} onChange={e => handleInputChange(match.id, 'A', e.target.value)} className="w-10 h-10 bg-[#1a2332] border border-gray-600 rounded text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 text-white" placeholder="-" />
                            <span className="text-gray-500 font-bold">:</span>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} disabled={hasStarted} value={predictions[match.id]?.predB || ''} onChange={e => handleInputChange(match.id, 'B', e.target.value)} className="w-10 h-10 bg-[#1a2332] border border-gray-600 rounded text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 text-white" placeholder="-" />
                            {!hasStarted && <button onClick={() => handleSavePrediction(match.id)} className="ml-2 px-3 py-2 h-10 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded shadow">Zapisz</button>}
                          </div>
                        </div>

                        {saveStatus[match.id] && <div className="text-center text-xs text-green-400 font-semibold animate-pulse">{saveStatus[match.id]}</div>}

                        {hasStarted && (
                          <div className="mt-2 pt-3 border-t border-gray-700/40">
                            {matchOthers[match.id] ? (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase text-gray-500 mb-1 font-bold">Typy innych:</p>
                                {matchOthers[match.id].map(p => (
                                  <div key={p.id} className="flex justify-between items-center bg-[#1a2332] px-2 py-1 rounded border border-gray-700/50">
                                    <span className="font-semibold text-gray-300 text-xs">{p.username}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded text-xs">{p.pred_a} : {p.pred_b}</span>
                                      {p.points_earned > 0 && <span className="text-[10px] font-bold text-yellow-400">+{p.points_earned}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <button onClick={() => handleRevealOthers(match.id)} disabled={loadingOthers[match.id]} className="w-full py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 rounded text-xs font-bold transition-colors">
                                {loadingOthers[match.id] ? 'Ładowanie...' : '👁️ Odkryj typy innych'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredMatches.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500 font-medium">Brak meczów w tej fazie.</div>
                )}
              </div>
            </>
          )}

          {/* --- ZAKŁADKA 2: TABELE GRUPOWE --- */}
          {activeTab === 'groups' && (
            <div className="bg-[#222e43] border border-gray-700 rounded-xl p-8 text-center shadow-lg">
              <h2 className="text-2xl font-bold text-gray-300 mb-4">Tabele Grupowe (Live)</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Tutaj wkrótce podepniemy bezpośrednie połączenie z API (Football-Data), aby na żywo pobierać rozkład punktów we wszystkich grupach MŚ 2026.
              </p>
              <div className="animate-pulse flex justify-center space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
              </div>
            </div>
          )}

          {/* --- ZAKŁADKA 3: ZŁOTE STRZAŁY --- */}
          {activeTab === 'bonus' && (
            <div className="bg-[#222e43] border border-gray-700 rounded-xl p-8 text-center shadow-lg">
              <h2 className="text-2xl font-bold text-yellow-500 mb-4">🎯 Złote Strzały (Wkrótce)</h2>
              <p className="text-gray-400 max-w-lg mx-auto">
                Miejsce na wytypowanie Mistrza Świata, Króla Strzelców i Czarnego Konia przed rozpoczęciem turnieju. Punkty bonusowe mogą wywrócić tabelę do góry nogami w dniu finału!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- NOWOCZESNA DOLNA NAWIGACJA (BOTTOM NAV BAR) w stylu Spotify --- */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#161e2c]/95 backdrop-blur-md border-t border-gray-800 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center px-2 py-2">
          
          <button 
            onClick={() => setActiveTab('matches')} 
            className={`flex flex-col items-center justify-center p-2 w-1/3 transition-colors ${activeTab === 'matches' ? 'text-green-500' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'matches' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span className="text-[10px] font-semibold tracking-wider">Mecze</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('groups')} 
            className={`flex flex-col items-center justify-center p-2 w-1/3 transition-colors ${activeTab === 'groups' ? 'text-green-500' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'groups' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-[10px] font-semibold tracking-wider">Tabele</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('bonus')} 
            className={`flex flex-col items-center justify-center p-2 w-1/3 transition-colors ${activeTab === 'bonus' ? 'text-green-500' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'bonus' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-[10px] font-semibold tracking-wider">Bonusy</span>
          </button>

        </div>
      </nav>
    </div>
  )
}