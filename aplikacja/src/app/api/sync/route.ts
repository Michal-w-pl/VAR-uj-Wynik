import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Funkcja dopasowująca flagę do angielskiej nazwy kraju
function getFlagEmoji(teamName: string): string {
  const flags: { [key: string]: string } = {
    'Poland': '🇵🇱', 'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'France': '🇫🇷',
    'Germany': '🇩🇪', 'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Portugal': '🇵🇹',
    'Netherlands': '🇳🇱', 'Italy': '🇮🇹', 'Belgium': '🇧🇪', 'Croatia': '🇭🇷',
    'Uruguay': '🇺🇾', 'Mexico': '🇲🇽', 'USA': '🇺🇸', 'Canada': '🇨🇦',
    'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Japan': '🇯🇵', 'South Korea': '🇰🇷',
    'Australia': '🇦🇺', 'Ukraine': '🇺🇦', 'Colombia': '🇨🇴', 'Ecuador': '🇪🇨',
    'Switzerland': '🇨🇭', 'Denmark': '🇩🇰', 'Ghana': '🇬🇭', 'Cameroon': '🇨🇲'
  }
  return flags[teamName] || '🏳️'
}

function calculatePoints(predA: number, predB: number, scoreA: number, scoreB: number): number {
  if (predA === scoreA && predB === scoreB) return 5
  if (Math.sign(predA - predB) === Math.sign(scoreA - scoreB)) return 2
  return 0
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
  }

  try {
    const url = 'https://api.football-data.org/v4/competitions/2000/matches'
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY! },
      next: { revalidate: 0 }
    })
    
    const apiData = await response.json()

    if (apiData.errorCode || apiData.message) {
      return NextResponse.json({ error: 'Błąd API Football-Data', szczegoly: apiData.message }, { status: 500 })
    }

    const apiEvents = apiData.matches

    if (!apiEvents || !Array.isArray(apiEvents)) {
      return NextResponse.json({ error: 'Nieprawidłowa odpowiedź', surowe_dane: apiData }, { status: 500 })
    }

    const { data: dbMatches } = await supabase.from('matches').select('*')
    const dbMatchesMap = new Map(dbMatches?.map(m => [m.api_fixture_id, m]) || [])

    const matchesToInsert = []
    let updatedCount = 0

    for (const event of apiEvents) {
      const apiId = event.id
      const isFinished = event.status === 'FINISHED'
      const startTime = event.utcDate
      
      const dbMatch = dbMatchesMap.get(apiId)

      if (!dbMatch) {
        const homeTeamName = event.homeTeam?.name || 'TBA'
        const awayTeamName = event.awayTeam?.name || 'TBA'

        matchesToInsert.push({
          api_fixture_id: apiId,
          team_a: homeTeamName,
          team_a_flag: getFlagEmoji(homeTeamName), // <-- Automatyczna flaga
          team_b: awayTeamName,
          team_b_flag: getFlagEmoji(awayTeamName), // <-- Automatyczna flaga
          start_time: startTime,
          score_a: null,
          score_b: null,
          status: 'upcoming'
        })
      } 
      else if (dbMatch && dbMatch.status !== 'finished' && isFinished) {
        const finalScoreA = event.score?.fullTime?.home ?? 0
        const finalScoreB = event.score?.fullTime?.away ?? 0

        const { data: predictions } = await supabase.from('predictions').select('*').eq('match_id', dbMatch.id)

        if (predictions && predictions.length > 0) {
          for (const pred of predictions) {
            const points = calculatePoints(pred.pred_a, pred.pred_b, finalScoreA, finalScoreB)
            await supabase.from('predictions').update({ points_earned: points }).eq('id', pred.id)

            if (points > 0) {
              const { data: currentProfile } = await supabase.from('profiles').select('total_points').eq('id', pred.user_id).single()
              if (currentProfile) {
                await supabase.from('profiles').update({ total_points: currentProfile.total_points + points }).eq('id', pred.user_id)
              }
            }
          }
        }

        await supabase.from('matches').update({ score_a: finalScoreA, score_b: finalScoreB, status: 'finished' }).eq('id', dbMatch.id)
        updatedCount++
      }
    }

    let insertedCount = 0
    if (matchesToInsert.length > 0) {
      const { error: insertError } = await supabase.from('matches').insert(matchesToInsert)
      if (!insertError) insertedCount = matchesToInsert.length
    }

    return NextResponse.json({ 
      success: true, 
      message: `Zsynchronizowano. Nowe mecze: ${insertedCount}. Zaktualizowane wyniki: ${updatedCount}.` 
    })

  } catch (err: any) {
    return NextResponse.json({ error: 'Szczegóły błędu: ' + err.message }, { status: 500 })
  }
}