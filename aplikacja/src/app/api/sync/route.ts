import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    const url = `https://${process.env.RAPIDAPI_HOST}/tournaments/get-events?tournamentId=${process.env.TOURNAMENT_ID}&seasonId=${process.env.SEASON_ID}`
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST!
      },
      next: { revalidate: 0 }
    })
    
    const apiData = await response.json()
    const apiEvents = apiData.events || apiData.data?.events

    if (!apiEvents || !Array.isArray(apiEvents)) {
      return NextResponse.json({ 
        error: 'Nieprawidłowa odpowiedź z API sportowego.',
        surowe_dane: apiData 
      }, { status: 500 })
    }

    const { data: dbMatches } = await supabase.from('matches').select('*')
    const dbMatchesMap = new Map(dbMatches?.map(m => [m.api_fixture_id, m]) || [])

    const matchesToInsert = []
    let updatedCount = 0

    for (const event of apiEvents) {
      const apiId = event.id
      const isFinished = event.status?.code === 100 || event.status?.type === 'finished'
      const startTime = new Date(event.startTimestamp * 1000).toISOString()
      
      const dbMatch = dbMatchesMap.get(apiId)

      if (!dbMatch) {
        matchesToInsert.push({
          api_fixture_id: apiId,
          team_a: event.homeTeam?.name || 'TBA',
          team_a_flag: '🏳️',
          team_b: event.awayTeam?.name || 'TBA',
          team_b_flag: '🏳️',
          start_time: startTime,
          score_a: null,
          score_b: null,
          status: 'upcoming'
        })
      } 
      else if (dbMatch && dbMatch.status !== 'finished' && isFinished) {
        const finalScoreA = event.homeScore?.current || 0
        const finalScoreB = event.awayScore?.current || 0

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
      message: `Synchronizacja zakończona. Dodano nowych meczów do terminarza: ${insertedCount}. Rozliczono i zamknięto meczów: ${updatedCount}.` 
    })

  } catch (err: any) {
    console.error('Krytyczny błąd synchronizacji:', err)
    return NextResponse.json({ 
      error: 'Szczegóły błędu: ' + err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}