'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

// --- SŁOWNIKI: Flagi i polskie nazwy ---
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
    // Domyślny fallback dla braku w słowniku:
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
  id: number
  api_fixture_id: number
  team_a: string
  team_b: string
  start_time: string
  status: string
  score_a: number | null
  score_b: number | null
  // Wkrótce dodamy tu kolumnę 'group_name' do bazy!
}

export default function ProDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, { predA: string; predB: string }>>({})
  const [loading, setLoading] = useState(true)
  
  // UI States
  const [activeTab, setActiveTab] = useState('Mecze')
  const [activeGroup, setActiveGroup] = useState('WSZYSTKIE')
  const [onlyUnpredicted, setOnlyUnpredicted] = useState(false)

  const groups = ['WSZYSTKIE', 'GR. A', 'GR. B', 'GR. C', 'GR. D', 'GR. E', 'GR. F', 'GR. G', 'GR. H', 'GR. I', 'GR. J', 'GR. K', 'GR. L']
  const navItems = [
    { name: 'Start', icon: '⚽' }, { name: 'Mecze', icon: '📅' }, { name: 'Puchar', icon: '⚔️' }, 
    { name: 'Stats', icon: '📊' }, { name: 'Inni', icon: '👁️' }, { name: 'Bonus', icon: '🎯' }, 
    { name: 'Moje typy', icon: '🎯' }, { name: 'Ranking', icon: '🏆' }, { name: 'Grupy', icon: '👥' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) return window.location.href = '/login'
        setUser(user)

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)

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

  // Filtrowanie meczów
  let displayMatches = matches
  if (onlyUnpredicted) {
    displayMatches = displayMatches.filter(m => !predictions[m.id] || predictions[m.id].predA === '' || predictions[m.id].predB === '')
  }
  // Tu dodamy filtrowanie po grupie, gdy dodamy kolumnę do bazy

  const unpredictedCount = matches.filter(m => !predictions[m.id] || predictions[m.id].predA === '').length

  if (loading) return <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center text-green-500">Ładowanie interfejsu...</div>

  return (
    <div className="min-h-screen bg-[#0a0e17] text-gray-300 font-sans selection:bg-[#ccff00] selection:text-black">
      
      {/* GŁÓWNY PASEK NAWIGACJI (TOP NAV) */}
      <nav className="bg-[#111827] border-b border-gray-800 sticky top-0 z-50 flex items-center justify-between px-4 h-16 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {navItems.map(item => (
            <button 
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === item.name ? 'text-[#ccff00] border-b-2 border-[#ccff00] bg-white/5' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
          {/* Panel Admina (czerwony) */}
          <button className="flex items-center gap-2 px-4 py-2 ml-2 rounded-md text-sm font-bold text-[#ff0055] border border-[#ff0055]/30 hover:bg-[#ff0055]/10">
            ⚙️ Admin
          </button>
        </div>

        {/* PROFIL GRACZA (Prawy róg) */}
        <div className="hidden md:flex items-center gap-4 ml-8 pl-4 border-l border-gray-800">
          <div className="text-right">
            <div className="text-white font-black text-sm">{profile?.username}</div>
            <div className="text-[10px] text-gray-500 font-bold tracking-widest">#{profile?.id?.substring(0,4)} • {profile?.total_points || 0} PKT</div>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="text-gray-500 hover:text-white">✕</button>
        </div>
      </nav>

      {/* PASEK GRUP (SUB NAV) */}
      <div className="bg-[#111827] border-b border-gray-800 px-4 py-0 flex gap-6 overflow-x-auto no-scrollbar">
        {groups.map(group => (
          <button 
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`whitespace-nowrap py-4 text-xs font-black tracking-widest transition-colors ${activeGroup === group ? 'text-black bg-[#ccff00] px-4' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* FILTRY */}
        <div className="flex items-center mb-8 bg-[#111827] w-max rounded border border-gray-800 overflow-hidden">
          <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors">
            <input 
              type="checkbox" 
              checked={onlyUnpredicted}
              onChange={(e) => setOnlyUnpredicted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-[#ccff00] focus:ring-[#ccff00] bg-[#0a0e17]" 
            />
            <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Tylko niewytypowane</span>
            <span className="bg-[#ff0055] text-white text-[10px] font-black px-2 py-0.5 rounded-sm">{unpredictedCount}</span>
          </label>
        </div>

        {/* KONTENER GRUPY I MECZÓW */}
        <div className="mb-12">
          {/* Nagłówek Grupy */}
          <div className="flex items-center gap-4 mb-4 border-b border-gray-800 pb-2">
            <h2 className="bg-[#ccff00] text-black font-black px-4 py-1 text-lg">GRUPA A</h2>
            <span className="text-xs text-gray-500 font-bold tracking-widest">X/6 ROZEGRANE</span>
          </div>

          {/* Szkielet Tabeli zintegrowanej */}
          <div className="bg-[#111827] border border-gray-800 mb-6 overflow-x-auto">
            <table className="w-full text-left text-xs font-medium whitespace-nowrap">
              <thead className="text-gray-600 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 w-12">POZ</th>
                  <th className="px-4 py-3">DRUŻYNA</th>
                  <th className="px-2 py-3 text-center w-8">M</th>
                  <th className="px-2 py-3 text-center w-8">W</th>
                  <th className="px-2 py-3 text-center w-8">R</th>
                  <th className="px-2 py-3 text-center w-8">P</th>
                  <th className="px-2 py-3 text-center w-8">G+</th>
                  <th className="px-2 py-3 text-center w-8">G-</th>
                  <th className="px-2 py-3 text-center w-10">+/-</th>
                  <th className="px-4 py-3 text-center w-12 text-gray-400">PKT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {/* Zaślepka do czasu podpięcia API */}
                <tr className="hover:bg-white/5">
                  <td className="px-4 py-3 text-[#ccff00] font-black">1.</td>
                  <td className="px-4 py-3"><TeamDisplay teamName="South Africa" /></td>
                  <td className="px-2 py-3 text-center text-gray-500">0</td><td className="px-2 py-3 text-center text-gray-500">0</td><td className="px-2 py-3 text-center text-gray-500">0</td><td className="px-2 py-3 text-center text-gray-500">0</td><td className="px-2 py-3 text-center text-gray-500">0</td><td className="px-2 py-3 text-center text-gray-500">0</td>
                  <td className="px-2 py-3 text-center text-gray-500">0</td><td className="px-4 py-3 text-center text-[#ccff00] font-black text-sm">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LISTA MECZÓW (Design z obrazka) */}
          <div className="flex flex-col gap-3">
            {displayMatches.slice(0, 10).map(match => { // Pokażemy 10 dla podglądu, dopóki nie ma grup w DB
              const isFinished = match.status === 'finished'
              const dateObj = new Date(match.start_time)
              const days = ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.']
              const months = ['STYCZNIA', 'LUTEGO', 'MARCA', 'KWIETNIA', 'MAJA', 'CZERWCA', 'LIPCA', 'SIERPNIA', 'WRZEŚNIA', 'PAŹDZIERNIKA', 'LISTOPADA', 'GRUDNIA']
              const dateString = `${days[dateObj.getDay()].toUpperCase()} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`
              const timeString = dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

              const myPred = predictions[match.id]
              const hasPredicted = myPred && myPred.predA !== '' && myPred.predB !== ''

              return (
                <div key={match.id} className="flex flex-col md:flex-row items-center justify-between bg-[#111827] border-l-4 border-[#ff0055] hover:border-[#ccff00] transition-colors p-3 md:p-4 gap-4">
                  
                  {/* Data i czas */}
                  <div className="flex flex-col w-full md:w-32 shrink-0">
                    <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{dateString}</span>
                    <span className="text-xl font-black text-white">{timeString}</span>
                  </div>

                  {/* Zespoły i Wynik */}
                  <div className="flex-1 flex justify-center items-center gap-2 md:gap-6 w-full">
                    <TeamDisplay teamName={match.team_a} align="right" />
                    
                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                      <input 
                        type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} disabled={isFinished}
                        value={predictions[match.id]?.predA || ''} onChange={e => handleScoreChange(match.id, 'A', e.target.value)} onBlur={() => handleSave(match.id)}
                        className="w-10 h-12 md:w-14 md:h-14 bg-[#0a0e17] border border-gray-700 rounded-sm text-center text-xl md:text-2xl font-black text-white focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] disabled:opacity-50" 
                      />
                      <span className="text-gray-600 font-black text-xl">:</span>
                      <input 
                        type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} disabled={isFinished}
                        value={predictions[match.id]?.predB || ''} onChange={e => handleScoreChange(match.id, 'B', e.target.value)} onBlur={() => handleSave(match.id)}
                        className="w-10 h-12 md:w-14 md:h-14 bg-[#0a0e17] border border-gray-700 rounded-sm text-center text-xl md:text-2xl font-black text-white focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] disabled:opacity-50" 
                      />
                    </div>

                    <TeamDisplay teamName={match.team_b} align="left" />
                  </div>

                  {/* Status / Punkty */}
                  <div className="w-full md:w-24 flex justify-end shrink-0">
                    {isFinished ? (
                      <div className="border border-[#ff0055]/30 bg-[#ff0055]/5 text-[#ff0055] px-3 py-1 text-center font-black rounded-sm w-full md:w-auto">
                        +0 <br/><span className="text-[8px] tracking-widest uppercase">PUDŁO</span>
                      </div>
                    ) : (
                      hasPredicted ? (
                        <div className="border border-[#ccff00]/30 text-[#ccff00] px-3 py-2 text-center font-black rounded-sm w-full md:w-auto text-[10px] tracking-widest">
                          ZAPISANO
                        </div>
                      ) : (
                        <div className="border border-gray-700 text-gray-500 px-3 py-2 text-center font-black rounded-sm w-full md:w-auto text-[10px] tracking-widest">
                          CZEKA
                        </div>
                      )
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