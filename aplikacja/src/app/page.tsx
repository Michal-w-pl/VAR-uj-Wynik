'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  username: string
  total_points: number
  role: string
}

interface Match {
  id: number
  api_fixture_id: number | null
  team_a: string
  team_a_flag: string
  team_b: string
  team_b_flag: string
  start_time: string
  score_a: number | null
  score_b: number | null
  status: string
}

interface League {
  id: number
  name: string
  invite_code: string
  admin_id: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ranking, setRanking] = useState<Profile[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [userPredictions, setUserPredictions] = useState<{[key: number]: { pred_a: string; pred_b: string } }>({})
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leagues' | 'ranking' | 'admin'>('dashboard')
  const [loading, setLoading] = useState(true)
  
  // Stan dla prywatnych lig
  const [myLeagues, setMyLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)
  const [leagueRanking, setLeagueRanking] = useState<Profile[]>([])
  const [newLeagueName, setNewLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  // Stan dla nowego meczu (Admin)
  const [newTeamA, setNewTeamA] = useState('')
  const [newTeamAFlag, setNewTeamAFlag] = useState('🏳️')
  const [newTeamB, setNewTeamB] = useState('')
  const [newTeamBFlag, setNewTeamBFlag] = useState('🏳️')
  const [newStartTime, setNewStartTime] = useState('')

  const router = useRouter()
  const supabase = createClient()

  // Ładowanie wszystkich danych z bazy na start
  const loadAppData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    // 1. Profil zalogowanego
    const { data: profData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profData) setProfile(profData)

    // 2. Ranking globalny
    const { data: rankData } = await supabase.from('profiles').select('*').order('total_points', { ascending: false })
    if (rankData) setRanking(rankData)

    // 3. Mecze
    const { data: matchData } = await supabase.from('matches').select('*').order('start_time', { ascending: true })
    if (matchData) setMatches(matchData)

    // 4. Typy zalogowanego użytkownika
    const { data: predData } = await supabase.from('predictions').select('*').eq('user_id', user.id)
    if (predData) {
      const predMap: any = {}
      predData.forEach(p => {
        predMap[p.match_id] = { pred_a: p.pred_a.toString(), pred_b: p.pred_b.toString() }
      })
      setUserPredictions(predMap)
    }

    // 5. Prywatne ligi użytkownika
    const { data: memberLeagues } = await supabase.from('league_members').select('league_id').eq('user_id', user.id)
    if (memberLeagues && memberLeagues.length > 0) {
      const leagueIds = memberLeagues.map(l => l.league_id)
      const { data: leaguesData } = await supabase.from('leagues').select('*').in('id', leagueIds)
      if (leaguesData) setMyLeagues(leaguesData)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAppData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ZMIANA INPUTÓW TYPOWANIA W TABELI
  const handlePredictionChange = (matchId: number, team: 'a' | 'b', value: string) => {
    setUserPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === 'a' ? 'pred_a' : 'pred_b']: value
      }
    }))
  }

  // ZAPISYWANIE TYPU DO BAZY
  const savePrediction = async (matchId: number, startTime: string) => {
    if (new Date() >= new Date(startTime)) {
      alert('Za późno! Mecz już się rozpoczął.')
      return
    }

    const matchPred = userPredictions[matchId]
    if (!matchPred || matchPred.pred_a === '' || matchPred.pred_b === '') {
      alert('Wpisz poprawny wynik przed zapisem!')
      return
    }

    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: matchId,
      pred_a: parseInt(matchPred.pred_a),
      pred_b: parseInt(matchPred.pred_b)
    }, { onConflict: 'user_id,match_id' })

    if (error) alert('Błąd zapisu: ' + error.message)
    else alert('Typ zapisany pomyślnie!')
  }

  // TWORZENIE PRYWATNEJ LIGI
  const createLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = Math.random().toString(36).substring(2, 7).toUpperCase() // Generuje kod np. XF49B
    
    const { data: newLeague, error } = await supabase.from('leagues').insert([
      { name: newLeagueName, invite_code: code, admin_id: user.id }
    ]).select().single()

    if (error) {
      alert('Błąd tworzenia ligi: ' + error.message)
      return
    }

    // Dodaj założyciela automatycznie jako członka grupy
    await supabase.from('league_members').insert([{ league_id: newLeague.id, user_id: user.id }])
    alert(`Liga utworzona! Kod zaproszenia dla znajomych: ${code}`)
    setNewLeagueName('')
    loadAppData()
  }

  // DOŁĄCZANIE DO PRYWATNEJ LIGI
  const joinLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: league, error } = await supabase.from('leagues').select('*').eq('invite_code', joinCode.toUpperCase()).single()

    if (error || !league) {
      alert('Nie znaleziono ligi o takim kodzie!')
      return
    }

    const { error: joinError } = await supabase.from('league_members').insert([
      { league_id: league.id, user_id: user.id }
    ])

    if (joinError) alert('Jesteś już członkiem tej ligi!')
    else {
      alert(`Dołączyłeś do grupy: ${league.name}`)
      setJoinCode('')
      loadAppData()
    }
  }

  // ŁADOWANIE RANKINGU DLA WYBRANEJ PRYWATNEJ LIGI
  const viewLeagueRanking = async (league: League) => {
    setSelectedLeague(league)
    const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', league.id)
    if (members) {
      const userIds = members.map(m => m.user_id)
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds).order('total_points', { ascending: false })
      if (profilesData) setLeagueRanking(profilesData)
    }
  }

  // FUNKCJA ADMINA: DODAWANIE MECZU
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('matches').insert([
      { team_a: newTeamA, team_a_flag: newTeamAFlag, team_b: newTeamB, team_b_flag: newTeamBFlag, start_time: new Date(newStartTime).toISOString() }
    ])
    alert('Mecz dodany!')
    window.location.reload()
  }

  // CZYSZCZENIE DANYCH (FUNKCJE CZYSZCZĄCE DLA ADMINA)
  const adminClearData = async (type: 'matches' | 'test_users' | 'predictions') => {
    if (!confirm('Czy na pewno chcesz nieodwracalnie USUNĄĆ te dane z bazy?')) return

    if (type === 'matches') {
      await supabase.from('matches').delete().neq('id', 0)
      alert('Wszystkie mecze zostały usunięte z bazy.');
    } else if (type === 'predictions') {
      await supabase.from('predictions').delete().neq('id', 0)
      alert('Wszystkie typy użytkowników zostały wyczyszczone.');
    } else if (type === 'test_users') {
      await supabase.from('profiles').delete().ilike('username', '%test%')
      alert('Usunięto z bazy profile zawierające frazę "test" w nazwie.');
    }
    window.location.reload()
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-bold text-xl">Ładowanie systemu Typera...</div>

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* NAGŁÓWEK */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚽</span>
          <h1 className="text-2xl font-black tracking-wider text-emerald-400">VAR-uj Wynik 2026</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-slate-400">Gracz: <span className="font-bold text-white">{profile?.username}</span></p>
            <p className="text-xs text-emerald-400 font-bold">Punkty: {profile?.total_points} pkt</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors">Wyloguj</button>
        </div>
      </header>

      {/* TAbY NAWIGACJI */}
      <nav className="flex justify-center bg-slate-800/50 border-b border-slate-800 p-2 gap-2">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>📋 Mecze i Typy</button>
        <button onClick={() => setActiveTab('leagues')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'leagues' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>👥 Mała Rywalizacja</button>
        <button onClick={() => setActiveTab('ranking')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'ranking' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>🏆 Ranking Globalny</button>
        {profile?.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'admin' ? 'bg-amber-500 text-slate-900' : 'text-amber-400 hover:bg-amber-500/10'}`}>🛡️ Panel Admina</button>
        )}
      </nav>

      {/* ZAWARTOŚĆ APP */}
      <main className="max-w-6xl mx-auto p-6">
        
        {/* TAB 1: MECZE I TYPY */}
        {activeTab === 'dashboard' && (
          <div className="grid gap-4 md:grid-cols-2">
            {matches.map((match) => {
              const isLocked = new Date() >= new Date(match.start_time);
              const currentPred = userPredictions[match.id] || { pred_a: '', pred_b: '' };
              return (
                <div key={match.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between gap-4 shadow-lg">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>📅 {new Date(match.start_time).toLocaleString('pl-PL')}</span>
                    {isLocked ? <span className="text-red-400 font-bold">🔒 Zablokowane</span> : <span className="text-emerald-400 font-bold">⏳ Otwarte do gwizdka</span>}
                  </div>
                  <div className="flex justify-between items-center my-1">
                    <div className="flex items-center gap-2 w-1/3 justify-end font-semibold text-sm">
                      <span>{match.team_a}</span><span className="text-xl">{match.team_a_flag}</span>
                    </div>
                    <div className="bg-slate-900 px-3 py-1.5 rounded-lg font-black tracking-widest text-emerald-400 border border-slate-700 text-center text-sm">
                      {match.score_a !== null ? `${match.score_a}:${match.score_b}` : 'VS'}
                    </div>
                    <div className="flex items-center gap-2 w-1/3 justify-start font-semibold text-sm">
                      <span className="text-xl">{match.team_b_flag}</span><span>{match.team_b}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-700/50 pt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Twój typ na mecz:</span>
                    <div className="flex items-center gap-1.5">
                      <input type="number" disabled={isLocked} value={currentPred.pred_a} onChange={(e) => handlePredictionChange(match.id, 'a', e.target.value)} placeholder="-" className="w-10 bg-slate-900 border border-slate-600 rounded text-center py-1 text-xs font-bold disabled:opacity-40" />
                      <span className="text-slate-500 text-xs">:</span>
                      <input type="number" disabled={isLocked} value={currentPred.pred_b} onChange={(e) => handlePredictionChange(match.id, 'b', e.target.value)} placeholder="-" className="w-10 bg-slate-900 border border-slate-600 rounded text-center py-1 text-xs font-bold disabled:opacity-40" />
                      {!isLocked && <button onClick={() => savePrediction(match.id, match.start_time)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black text-xs px-2.5 py-1 rounded transition-colors ml-2 shadow-sm">Zapisz</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 2: MAŁA RYWALIZACJA (PRYWATNE GRUPY) */}
        {activeTab === 'leagues' && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl">
                <h3 className="text-md font-bold mb-3 text-emerald-400">➕ Stwórz nową grupę znajomych</h3>
                <form onSubmit={createLeague} className="flex gap-2">
                  <input type="text" value={newLeagueName} onChange={(e) => setNewLeagueName(e.target.value)} required placeholder="Nazwa grupy (np. Biuro, Rodzina)" className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm outline-none focus:border-emerald-500" />
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-4 py-2 rounded text-sm transition-colors">Utwórz</button>
                </form>
              </div>
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl">
                <h3 className="text-md font-bold mb-3 text-emerald-400">🔑 Dołącz do istniejącej grupy</h3>
                <form onSubmit={joinLeague} className="flex gap-2">
                  <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required placeholder="Wpisz 5-znakowy kod grupy" className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm uppercase outline-none focus:border-emerald-500" />
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-4 py-2 rounded text-sm transition-colors">Dołącz</button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 h-fit">
                <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Twoje grupy:</h4>
                {myLeagues.length === 0 ? <p className="text-xs text-slate-500">Nie należysz jeszcze do żadnej grupy rywalizacji.</p> : (
                  <div className="space-y-2">
                    {myLeagues.map(l => (
                      <button key={l.id} onClick={() => viewLeagueRanking(l)} className={`w-full text-left p-3 rounded-lg border text-sm font-semibold transition-all flex justify-between items-center ${selectedLeague?.id === l.id ? 'bg-emerald-500 border-emerald-500 text-slate-900' : 'bg-slate-900 border-slate-700 hover:bg-slate-850'}`}>
                        <span>👥 {l.name}</span><span className="text-xs font-mono opacity-70">KOD: {l.invite_code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-750 border-b border-slate-700">
                  <h3 className="text-md font-bold text-emerald-400">{selectedLeague ? `Klasyfikacja grupy: ${selectedLeague.name}` : 'Wybierz grupę z listy po lewej'}</h3>
                </div>
                {selectedLeague && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 text-xs text-slate-400 font-bold uppercase border-b border-slate-700"><th className="p-3 text-center w-16">Poz</th><th className="p-3">Gracz</th><th className="p-3 text-right">Punkty razem</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-xs">
                      {leagueRanking.map((p, i) => (
                        <tr key={p.id} className={`hover:bg-slate-700/30 ${p.id === user?.id ? 'bg-emerald-500/10 font-bold' : ''}`}>
                          <td className="p-3 text-center text-slate-400">{i + 1}.</td><td className="p-3">{p.username}</td><td className="p-3 text-right text-emerald-400 font-bold font-mono">{p.total_points} pkt</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RANKING GLOBALNY */}
        {activeTab === 'ranking' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-750 border-b border-slate-700"><h3 className="text-md font-bold text-emerald-400">Klasyfikacja Generalna</h3></div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-xs text-slate-400 font-bold uppercase border-b border-slate-700"><th className="p-3 text-center w-20">Pozycja</th><th className="p-3">Nazwa Użytkownika</th><th className="p-3 text-right">Suma Punktów</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs">
                {ranking.map((player, index) => (
                  <tr key={player.id} className={`hover:bg-slate-700/30 ${player.id === user?.id ? 'bg-emerald-500/10 font-bold' : ''}`}>
                    <td className="p-3 text-center font-bold text-slate-400">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</td>
                    <td className="p-3">{player.username} {player.id === user?.id && <span className="text-[10px] bg-emerald-500 text-slate-900 px-1 rounded font-black">JA</span>}</td>
                    <td className="p-3 text-right text-emerald-400 font-mono font-bold">{player.total_points} pkt</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: UKRYTY PANEL ADMINA + CZYŚCICIEL */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-400 text-xs font-semibold">
              🛠️ Strefa Administratora: Zarządzasz meczami oraz masz dostęp do narzędzi czyszczenia bazy danych.
            </div>

            {/* SEKCJA: CZYŚCICIEL BAZY */}
            <div className="bg-slate-800 p-5 rounded-xl border border-red-500/20 shadow-md">
              <h3 className="text-sm font-bold mb-3 text-red-400 uppercase tracking-wider">⚠️ Moduł czyszczenia danych testowych</h3>
              <p className="text-slate-400 text-xs mb-4">Używaj ostrożnie. Te akcje usuwają rekordy z bazy produkcyjnej bezpowrotnie.</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => adminClearData('test_users')} className="bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 px-3 py-2 rounded text-xs font-bold transition-all">❌ Usuń konta testowe (z frazą 'test')</button>
                <button onClick={() => adminClearData('predictions')} className="bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 px-3 py-2 rounded text-xs font-bold transition-all">🧹 Resetuj i wyczyść wszystkie typy graczy</button>
                <button onClick={() => adminClearData('matches')} className="bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 px-3 py-2 rounded text-xs font-bold transition-all">🗑️ Usuń wszystkie mecze</button>
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
              <h3 className="text-xs font-bold mb-3 text-amber-400 uppercase tracking-wider">➕ Ręczne dodawanie meczu</h3>
              <form onSubmit={handleCreateMatch} className="grid gap-3 sm:grid-cols-2 md:grid-cols-5 items-end text-xs">
                <div><label className="block text-slate-400 mb-1">Gospodarz</label><input type="text" value={newTeamA} onChange={(e) => setNewTeamA(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-2 outline-none focus:border-amber-500" placeholder="np. USA" /></div>
                <div><label className="block text-slate-400 mb-1">Flaga emoji</label><input type="text" value={newTeamAFlag} onChange={(e) => setNewTeamAFlag(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center outline-none focus:border-amber-500" /></div>
                <div><label className="block text-slate-400 mb-1">Gość</label><input type="text" value={newTeamB} onChange={(e) => setNewTeamB(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-2 outline-none focus:border-amber-500" placeholder="np. Niemcy" /></div>
                <div><label className="block text-slate-400 mb-1">Flaga emoji</label><input type="text" value={newTeamBFlag} onChange={(e) => setNewTeamBFlag(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center outline-none focus:border-amber-500" /></div>
                <div><label className="block text-slate-400 mb-1">Data i godzina</label><input type="datetime-local" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-2 outline-none focus:border-amber-500" /></div>
                <div className="md:col-span-5"><button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold p-2 rounded transition-colors uppercase font-black text-xs">Opublikuj mecz</button></div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}