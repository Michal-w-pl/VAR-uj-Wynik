'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

// --- SŁOWNIK: Flagi i polskie nazwy (Zaktualizowany dla 48 państw MŚ 2026) ---
const TeamDisplay = ({ teamName, align = 'left' }: { teamName: string, align?: 'left' | 'right' }) => {
  const normalizedName = teamName.trim()
  
  const translations: Record<string, { code: string, pl: string }> = {
    'Poland': { code: 'pl', pl: 'Polska' }, 'Argentina': { code: 'ar', pl: 'Argentyna' }, 
    'Brazil': { code: 'br', pl: 'Brazylia' }, 'France': { code: 'fr', pl: 'Francja' }, 
    'Germany': { code: 'de', pl: 'Niemcy' }, 'Spain': { code: 'es', pl: 'Hiszpania' }, 
    'England': { code: 'gb-eng', pl: 'Anglia' }, 'Portugal': { code: 'pt', pl: 'Portugalia' }, 
    'Netherlands': { code: 'nl', pl: 'Holandia' }, 'Italy': { code: 'it', pl: 'Włochy' },
    'Belgium': { code: 'be', pl: 'Belgia' }, 'Croatia': { code: 'hr', pl: 'Chorwacja' }, 
    'Uruguay': { code: 'uy', pl: 'Urugwaj' }, 'Mexico': { code: 'mx', pl: 'Meksyk' }, 
    'United States': { code: 'us', pl: 'USA' }, 'USA': { code: 'us', pl: 'USA' }, 
    'Canada': { code: 'ca', pl: 'Kanada' }, 'Morocco': { code: 'ma', pl: 'Maroko' }, 
    'Senegal': { code: 'sn', pl: 'Senegal' }, 'Japan': { code: 'jp', pl: 'Japonia' },
    'South Korea': { code: 'kr', pl: 'Korea Płd.' }, 'Korea Republic': { code: 'kr', pl: 'Korea Płd.' }, 
    'Australia': { code: 'au', pl: 'Australia' }, 'Ukraine': { code: 'ua', pl: 'Ukraina' },
    'Colombia': { code: 'co', pl: 'Kolumbia' }, 'Ecuador': { code: 'ec', pl: 'Ekwador' }, 
    'Switzerland': { code: 'ch', pl: 'Szwajcaria' }, 'Denmark': { code: 'dk', pl: 'Dania' }, 
    'Ghana': { code: 'gh', pl: 'Ghana' }, 'Cameroon': { code: 'cm', pl: 'Kamerun' }, 
    'South Africa': { code: 'za', pl: 'RPA' }, 'Czechia': { code: 'cz', pl: 'Czechy' }, 
    'Czech Republic': { code: 'cz', pl: 'Czechy' }, 'Serbia': { code: 'rs', pl: 'Serbia' },
    'Bosnia-Herzegovina': { code: 'ba', pl: 'Bośnia i Herc.' }, 'New Zealand': { code: 'nz', pl: 'Nowa Zelandia' },
    'Qatar': { code: 'qa', pl: 'Katar' }, 'Mali': { code: 'ml', pl: 'Mali' }, 'Peru': { code: 'pe', pl: 'Peru' },
    'Panama': { code: 'pa', pl: 'Panama' }, 'Jamaica': { code: 'jm', pl: 'Jamajka' },
    'Ivory Coast': { code: 'ci', pl: 'WKS' }, 'Venezuela': { code: 've', pl: 'Wenezuela' },
    'Nigeria': { code: 'ng', pl: 'Nigeria' }, 'Algeria': { code: 'dz', pl: 'Algieria' },
    'Austria': { code: 'at', pl: 'Austria' }, 'Jordan': { code: 'jo', pl: 'Jordania' },
    'Scotland': { code: 'gb-sct', pl: 'Szkocja' }, 'Haiti': { code: 'ht', pl: 'Haiti' },
    'Turkey': { code: 'tr', pl: 'Turcja' }, 'Türkiye': { code: 'tr', pl: 'Turcja' },
    'Curaçao': { code: 'cw', pl: 'Curaçao' }, 'Cape Verde Islands': { code: 'cv', pl: 'Rep. Zielonego Przylądka' },
    'Cabo Verde': { code: 'cv', pl: 'Rep. Zielonego Przylądka' },
    'Iraq': { code: 'iq', pl: 'Irak' }, 'Norway': { code: 'no', pl: 'Norwegia' },
    'Congo DR': { code: 'cd', pl: 'DR Konga' }, 'Uzbekistan': { code: 'uz', pl: 'Uzbekistan' },
    'Paraguay': { code: 'py', pl: 'Paragwaj' }, 'Iran': { code: 'ir', pl: 'Iran' }, 
    'Saudi Arabia': { code: 'sa', pl: 'Arabia Saudyjska' }
  }

  const teamData = translations[normalizedName] || { code: null, pl: teamName }
  const Flag = teamData.code ? (
    <img src={`https://flagcdn.com/w40/${teamData.code}.png`} width="24" alt="flaga" className="rounded-sm shadow-sm" />
  ) : <span className="text-sm">🏳️</span>

  if (align === 'right') {
    return (
      <div className="flex items-center justify-end gap-3 w-32 md:w-48">
        <span className="font-bold text-gray-200 text-sm md:text-base text-right truncate">{teamData.pl}</span>
        {Flag}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-start gap-3 w-32 md:w-48">
      {Flag}
      <span className="font-bold text-gray-200 text-sm md:text-base text-left truncate">{teamData.pl}</span>
    </div>
  )
}

interface Match {
  id: number; api_fixture_id: number; team_a: string; team_b: string; start_time: string; status: string; score_a: number | null; score_b: number | null;
}

// BAZA DANYCH DRUŻYN W GRUPACH (Oficjalne grupy MŚ 2026, wyzerowane statystyki)
const groupsData: Record<string, any[]> = {
  'GR. A': [ { name: 'Mexico', w: 0, r: 0, p: 0, pts: 0 }, { name: 'South Africa', w: 0, r: 0, p: 0, pts: 0 }, { name: 'South Korea', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Czechia', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. B': [ { name: 'Canada', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Bosnia-Herzegovina', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Qatar', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Switzerland', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. C': [ { name: 'Brazil', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Morocco', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Haiti', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Scotland', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. D': [ { name: 'United States', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Paraguay', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Australia', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Turkey', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. E': [ { name: 'Germany', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Curaçao', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Ivory Coast', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Ecuador', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. F': [ { name: 'Netherlands', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Japan', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Sweden', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Tunisia', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. G': [ { name: 'Belgium', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Egypt', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Iran', w: 0, r: 0, p: 0, pts: 0 }, { name: 'New Zealand', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. H': [ { name: 'Spain', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Cape Verde Islands', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Saudi Arabia', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Uruguay', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. I': [ { name: 'France', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Senegal', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Iraq', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Norway', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. J': [ { name: 'Argentina', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Algeria', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Austria', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Jordan', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. K': [ { name: 'Portugal', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Congo DR', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Uzbekistan', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Colombia', w: 0, r: 0, p: 0, pts: 0 } ],
  'GR. L': [ { name: 'England', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Croatia', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Ghana', w: 0, r: 0, p: 0, pts: 0 }, { name: 'Panama', w: 0, r: 0, p: 0, pts: 0 } ]
}

export default function ProDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, { predA: string; predB: string }>>({})
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState('Start')
  const [activeGroup, setActiveGroup] = useState('WSZYSTKIE')
  const [onlyUnpredicted, setOnlyUnpredicted] = useState(false)

  const groupsList = ['WSZYSTKIE', 'GR. A', 'GR. B', 'GR. C', 'GR. D', 'GR. E', 'GR. F', 'GR. G', 'GR. H', 'GR. I', 'GR. J', 'GR. K', 'GR. L']
  const navItems = [
    { name: 'Start', icon: '⚽' }, { name: 'Mecze', icon: '📅' }, { name: 'Puchar', icon: '⚔️' }, 
    { name: 'Grupy', icon: '👥' }, { name: 'Moje typy', icon: '🎯' }, { name: 'Ranking', icon: '🏆' }, 
    { name: 'Bonus', icon: '🎁' }, { name: 'Inni', icon: '👁️' }, { name: 'Stats', icon: '📊' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) return window.location.href = '/login'
        setUser(user)

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)

        const { data: lbData } = await supabase.from('profiles').select('*').order('total_points', { ascending: false })
        setLeaderboard(lbData || [])

        const { data: mData } = await supabase.from('matches').select('*').order('start_time', { ascending: true })
        setMatches(mData || [])

        const { data: pData } = await supabase.from('predictions').select('*').eq('user_id', user.id)
        const pMap: any = {}
        pData?.forEach((p: any) => { pMap[p.match_id] = { predA: p.pred_a.toString(), predB: p.pred_b.toString() } })
        setPredictions(pMap)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleScoreChange = (matchId: number, team: 'A' | 'B', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], [team === 'A' ? 'predA' : 'predB']: value } }))
  }

  const handleSave = async (matchId: number) => {
    const p = predictions[matchId]
    if (!p || p.predA === '' || p.predB === '') return
    
    const { data: existing } = await supabase.from('predictions').select('id').eq('user_id', user.id).eq('match_id', matchId).single()
    if (existing) {
      await supabase.from('predictions').update({ pred_a: parseInt(p.predA), pred_b: parseInt(p.predB) }).eq('id', existing.id)
    } else {
      await supabase.from('predictions').insert({ user_id: user.id, match_id: matchId, pred_a: parseInt(p.predA), pred_b: parseInt(p.predB) })
    }
  }

  // --- LOGIKA FILTROWANIA MECZÓW ---
  const endOfGroups = new Date('2026-06-29T00:00:00Z').getTime()
  
  const groupMatches = matches.filter(m => new Date(m.start_time).getTime() < endOfGroups)
  const knockoutMatches = matches.filter(m => new Date(m.start_time).getTime() >= endOfGroups)
  const myPredictedMatches = matches.filter(m => predictions[m.id] && predictions[m.id].predA !== '' && predictions[m.id].predB !== '')
  const upcomingMatches = matches.filter(m => new Date(m.start_time).getTime() > Date.now()).slice(0, 3)

  let displayMatches = activeTab === 'Mecze' ? groupMatches : activeTab === 'Puchar' ? knockoutMatches : activeTab === 'Moje typy' ? myPredictedMatches : []
  
  // Filtrowanie po wybranej grupie
  if (['Mecze', 'Moje typy'].includes(activeTab) && activeGroup !== 'WSZYSTKIE') {
    const teamsInActiveGroup = groupsData[activeGroup]?.map(t => t.name) || []
    displayMatches = displayMatches.filter(match => 
      teamsInActiveGroup.includes(match.team_a) || teamsInActiveGroup.includes(match.team_b)
    )
  }

  // Filtrowanie pustych typów
  if (onlyUnpredicted) {
    displayMatches = displayMatches.filter(m => !predictions[m.id] || predictions[m.id].predA === '' || predictions[m.id].predB === '')
  }

  const unpredictedCount = matches.filter(m => !predictions[m.id] || predictions[m.id].predA === '').length
  const myRank = leaderboard.findIndex(p => p.id === user?.id) + 1

  // --- RENDERING TABELI GRUPOWEJ ---
  const renderGroupTable = (groupName: string) => {
    const teams = groupsData[groupName]
    if (!teams) return null

    return (
      <div className="bg-[#111827] border border-gray-800 mb-6 overflow-x-auto shadow-md">
        <table className="w-full text-left text-xs font-medium whitespace-nowrap">
          <thead className="text-gray-600 border-b border-gray-800 bg-[#0c1322]">
            <tr>
              <th className="px-4 py-3 w-12">POZ</th>
              <th className="px-4 py-3">DRUŻYNA</th>
              <th className="px-2 py-3 text-center w-8">M</th>
              <th className="px-2 py-3 text-center w-8">W</th>
              <th className="px-2 py-3 text-center w-8">R</th>
              <th className="px-2 py-3 text-center w-8">P</th>
              <th className="px-4 py-3 text-center w-12 text-gray-400">PKT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {teams.map((team, idx) => (
              <tr key={team.name} className="hover:bg-white/5">
                <td className={`px-4 py-3 font-black ${idx === 0 ? 'text-[#ccff00]' : idx === 1 ? 'text-white' : 'text-gray-500'}`}>{idx + 1}.</td>
                <td className="px-4 py-3"><TeamDisplay teamName={team.name} /></td>
                <td className="px-2 py-3 text-center text-gray-500">{team.w + team.r + team.p}</td>
                <td className="px-2 py-3 text-center text-gray-500">{team.w}</td>
                <td className="px-2 py-3 text-center text-gray-500">{team.r}</td>
                <td className="px-2 py-3 text-center text-gray-500">{team.p}</td>
                <td className={`px-4 py-3 text-center font-black text-sm ${idx === 0 ? 'text-[#ccff00]' : idx === 1 ? 'text-white' : 'text-gray-400'}`}>{team.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // --- RENDERING LISTY MECZÓW ---
  const renderMatchList = (matchList: Match[], emptyMessage: string = "Brak meczów.") => {
    if (matchList.length === 0) return <div className="text-center py-12 text-gray-500 font-medium bg-[#111827] rounded border border-gray-800 shadow-sm">{emptyMessage}</div>
    
    return (
      <div className="flex flex-col gap-3">
        {matchList.map(match => { 
          const isFinished = match.status === 'finished'
          const dateObj = new Date(match.start_time)
          const days = ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.']
          const months = ['STYCZNIA', 'LUTEGO', 'MARCA', 'KWIETNIA', 'MAJA', 'CZERWCA', 'LIPCA', 'SIERPNIA', 'WRZEŚNIA', 'PAŹDZIERNIKA', 'LISTOPADA', 'GRUDNIA']
          const dateString = `${days[dateObj.getDay()].toUpperCase()}, ${dateObj.getDate()} ${months[dateObj.getMonth()]}`
          const timeString = dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

          return (
            <div key={match.id} className="flex flex-col md:flex-row items-center justify-between bg-[#111827] border-l-4 border-transparent hover:border-[#ccff00] transition-colors p-3 md:p-4 gap-4 shadow-sm group">
              <div className="flex flex-col w-full md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-gray-800 pb-2 md:pb-0">
                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{dateString}</span>
                <span className="text-xl font-black text-white">{timeString}</span>
              </div>
              <div className="flex-1 flex justify-center items-center gap-2 md:gap-6 w-full">
                <TeamDisplay teamName={match.team_a} align="right" />
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} disabled={isFinished} value={predictions[match.id]?.predA || ''} onChange={e => handleScoreChange(match.id, 'A', e.target.value)} onBlur={() => handleSave(match.id)} className="w-10 h-12 md:w-14 md:h-14 bg-[#0a0e17] border border-gray-700 rounded-sm text-center text-xl md:text-2xl font-black text-white focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] disabled:opacity-50" />
                  <span className="text-gray-600 font-black text-xl">:</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} disabled={isFinished} value={predictions[match.id]?.predB || ''} onChange={e => handleScoreChange(match.id, 'B', e.target.value)} onBlur={() => handleSave(match.id)} className="w-10 h-12 md:w-14 md:h-14 bg-[#0a0e17] border border-gray-700 rounded-sm text-center text-xl md:text-2xl font-black text-white focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] disabled:opacity-50" />
                </div>
                <TeamDisplay teamName={match.team_b} align="left" />
              </div>
              <div className="w-full md:w-24 flex justify-end shrink-0">
                {isFinished ? (
                  <div className="border border-[#ff0055]/30 bg-[#ff0055]/5 text-[#ff0055] px-3 py-1 text-center font-black rounded-sm w-full md:w-auto text-xs">
                    ZAKOŃCZONY
                  </div>
                ) : predictions[match.id]?.predA ? (
                  <div className="border border-[#ccff00]/30 text-[#ccff00] px-3 py-2 text-center font-black rounded-sm w-full md:w-auto text-[10px] tracking-widest bg-[#ccff00]/5">
                    ZAPISANO
                  </div>
                ) : (
                  <div className="border border-gray-700 text-gray-500 px-3 py-2 text-center font-black rounded-sm w-full md:w-auto text-[10px] tracking-widest">
                    DO TYPU
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center text-[#ccff00] font-black tracking-widest uppercase">Wczytywanie...</div>

  return (
    <div className="min-h-screen bg-[#0a0e17] text-gray-300 font-sans selection:bg-[#ccff00] selection:text-black">
      
      {/* TOP NAV */}
      <nav className="bg-[#111827] border-b border-gray-800 sticky top-0 z-50 flex items-center justify-between px-4 h-16 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {navItems.map(item => (
            <button key={item.name} onClick={() => { setActiveTab(item.name); setActiveGroup('WSZYSTKIE'); setOnlyUnpredicted(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === item.name ? 'text-[#ccff00] border-b-2 border-[#ccff00] bg-white/5' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
              <span>{item.icon}</span> <span className="hidden sm:inline">{item.name}</span>
            </button>
          ))}
          {profile?.is_admin && <button className="flex items-center gap-2 px-4 py-2 ml-2 rounded-md text-sm font-bold text-[#ff0055] border border-[#ff0055]/30 hover:bg-[#ff0055]/10">Admin</button>}
        </div>
        <div className="hidden md:flex items-center gap-4 ml-8 pl-4 border-l border-gray-800">
          <div className="text-right">
            <div className="text-white font-black text-sm">{profile?.username}</div>
            <div className="text-[10px] text-gray-500 font-bold tracking-widest">#{myRank} • {profile?.total_points || 0} PKT</div>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="text-gray-500 hover:text-[#ff0055] font-bold">✕ Wyloguj</button>
        </div>
      </nav>

      {/* SUB NAV GRUPY */}
      {['Mecze', 'Grupy', 'Moje typy'].includes(activeTab) && (
        <div className="bg-[#111827] border-b border-gray-800 px-4 py-0 flex gap-6 overflow-x-auto no-scrollbar">
          {groupsList.map(group => (
            <button key={group} onClick={() => setActiveGroup(group)} className={`whitespace-nowrap py-4 text-xs font-black tracking-widest transition-colors ${activeGroup === group ? 'text-black bg-[#ccff00] px-4' : 'text-gray-500 hover:text-gray-300'}`}>
              {group}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
        
        {/* ==================== ZAKŁADKA: START ==================== */}
        {activeTab === 'Start' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 md:p-10 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">🏆</div>
                <h1 className="text-4xl font-black text-white mb-2">Witaj, <span className="text-[#ccff00]">{profile?.username}</span>!</h1>
                <p className="text-gray-400 font-medium mb-8 max-w-lg">Turniej startuje już 11 czerwca. Przygotuj swoje typy na nadchodzące mecze, aby zdobyć punkty do klasyfikacji generalnej.</p>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-[#0a0e17] border border-gray-700 rounded-lg p-4 w-40">
                    <span className="block text-[10px] text-gray-500 tracking-widest font-bold mb-1">TWOJE PUNKTY</span>
                    <span className="text-3xl font-black text-white">{profile?.total_points || 0}</span>
                  </div>
                  <div className="bg-[#0a0e17] border border-gray-700 rounded-lg p-4 w-40">
                    <span className="block text-[10px] text-gray-500 tracking-widest font-bold mb-1">TWOJE MIEJSCE</span>
                    <span className="text-3xl font-black text-[#ccff00]">#{myRank}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4 pl-4 border-l-4 border-[#ccff00]">Najbliższe spotkania</h3>
                {renderMatchList(upcomingMatches, "Brak nadchodzących spotkań.")}
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6">Top 5 Ligi</h3>
                <div className="flex flex-col gap-3">
                  {leaderboard.slice(0,5).map((player, idx) => (
                    <div key={player.id} className="flex justify-between items-center bg-[#0a0e17] p-3 rounded border border-gray-800">
                      <div className="flex items-center gap-3">
                        <span className={`font-black ${idx === 0 ? 'text-[#ccff00]' : 'text-gray-500'}`}>{idx + 1}.</span>
                        <span className="font-bold text-gray-200">{player.username}</span>
                      </div>
                      <span className="font-black text-white">{player.total_points}</span>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('Ranking')} className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 rounded text-xs font-bold tracking-widest transition-colors">ZOBACZ PEŁNĄ TABELĘ</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ZAKŁADKA: MECZE / MOJE TYPY ==================== */}
        {['Mecze', 'Moje typy'].includes(activeTab) && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div className="flex items-center gap-4 border-b border-gray-800 pb-2 w-full sm:w-auto">
                <h2 className="bg-[#ccff00] text-black font-black px-4 py-1 text-lg uppercase">
                  {activeGroup === 'WSZYSTKIE' ? (activeTab === 'Moje typy' ? 'WYTYPOWANE: WSZYSTKIE GRUPY' : 'FAZA GRUPOWA') : activeGroup}
                </h2>
              </div>
              {activeTab === 'Mecze' && (
                <label className="flex items-center gap-3 px-4 py-2 bg-[#111827] rounded border border-gray-800 cursor-pointer hover:bg-white/5 transition-colors w-full sm:w-auto">
                  <input type="checkbox" checked={onlyUnpredicted} onChange={(e) => setOnlyUnpredicted(e.target.checked)} className="w-4 h-4 text-[#ccff00] bg-[#0a0e17] border-gray-600 rounded" />
                  <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Tylko niewytypowane</span>
                  <span className="bg-[#ff0055] text-white text-[10px] font-black px-2 py-0.5 rounded-sm">{unpredictedCount}</span>
                </label>
              )}
            </div>
            {activeGroup !== 'WSZYSTKIE' && renderGroupTable(activeGroup)}
            {renderMatchList(displayMatches, activeTab === 'Moje typy' ? "Brak wytypowanych spotkań w wybranym widoku." : "Brak spotkań w tej grupie.")}
          </div>
        )}

        {/* ==================== ZAKŁADKA: GRUPY ==================== */}
        {activeTab === 'Grupy' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest border-l-4 border-[#ccff00] pl-4">Tabele Grupowe</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(activeGroup === 'WSZYSTKIE' ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] : [activeGroup.replace('GR. ', '')]).map(groupLetter => (
                <div key={groupLetter} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-gradient-to-r from-[#1a2332] to-[#111827] px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="font-black text-[#ccff00] text-lg">Grupa {groupLetter}</h3>
                  </div>
                  {renderGroupTable(`GR. ${groupLetter}`)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== ZAKŁADKA: PUCHAR ==================== */}
        {activeTab === 'Puchar' && (
          <div>
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest border-l-4 border-[#ccff00] pl-4">Faza Pucharowa</h2>
            {renderMatchList(displayMatches, "Brak meczów fazy pucharowej w bazie.")}
          </div>
        )}

        {/* ==================== ZAKŁADKA: RANKING ==================== */}
        {activeTab === 'Ranking' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest border-l-4 border-[#ccff00] pl-4">Klasyfikacja Typerów</h2>
            <div className="flex flex-col gap-3">
              {leaderboard.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between bg-[#111827] border border-gray-800 p-4 rounded-md shadow-sm hover:border-gray-600 transition-colors">
                  <div className="flex items-center gap-4 md:gap-6">
                    <span className={`w-8 text-center font-black text-2xl ${index === 0 ? 'text-[#ccff00]' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                      {index + 1}.
                    </span>
                    <span className="font-bold text-gray-200 text-lg md:text-xl">{player.username}</span>
                  </div>
                  <span className="font-black text-2xl md:text-3xl text-white">{player.total_points} <span className="text-[10px] text-gray-500 tracking-widest">PKT</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== ZAKŁADKA: BONUS ==================== */}
        {activeTab === 'Bonus' && (
          <div className="max-w-5xl mx-auto">
             <h2 className="text-2xl font-black text-white uppercase tracking-widest border-l-4 border-[#ff0055] pl-4 mb-8">Złote Strzały</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'MISTRZ ŚWIATA', points: '+20 PKT', desc: 'Wytypuj kto wzniesie puchar.', icon: '🏆' },
                  { title: 'KRÓL STRZELCÓW', points: '+15 PKT', desc: 'Kto zdobędzie najwięcej goli?', icon: '⚽' },
                  { title: 'CZARNY KOŃ', points: '+10 PKT', desc: 'Drużyna spoza Top15, która zajdzie najdalej.', icon: '🐴' }
                ].map(bonus => (
                  <div key={bonus.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-center hover:border-[#ff0055] transition-colors group cursor-pointer">
                    <div className="text-5xl mb-4 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{bonus.icon}</div>
                    <h3 className="font-black text-white text-lg mb-1">{bonus.title}</h3>
                    <p className="text-xs text-gray-500 mb-4 h-8">{bonus.desc}</p>
                    <div className="text-[#ff0055] font-black tracking-widest border border-[#ff0055]/30 bg-[#ff0055]/5 py-2 rounded">
                      {bonus.points}
                    </div>
                  </div>
                ))}
             </div>
             <p className="text-center text-gray-500 text-sm mt-12 font-medium">Baza pytań bonusowych zostanie zintegrowana w kolejnym kroku.</p>
          </div>
        )}

        {/* ==================== ZAKŁADKI UI PLACEHOLDERS (Inni, Stats) ==================== */}
        {['Inni', 'Stats'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-6 opacity-50">🚧</span>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Moduł w przygotowaniu</h2>
            <p className="text-gray-500 max-w-md text-sm">
              Zakładka <span className="text-[#ccff00] font-bold">{activeTab}</span> zbiera dane i zostanie udostępniona po rozegraniu pierwszej kolejki spotkań fazy grupowej.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}