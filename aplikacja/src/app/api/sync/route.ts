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
    // Łączymy się z API-Football (league 1 to Mistrzostwa Świata, season 2026)
    const url = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026'
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY!
      },
      next: { revalidate: 0 }
    })
    
    const apiData = await response.json()

    // Sprawdzamy, czy API nie zwróciło błędu (np. zły klucz)
    if (apiData.errors && Object.keys(apiData.errors).length > 0) {
      return NextResponse.json({ error: 'Błąd klucza API-Football', szczegoly: apiData.errors }, { status: 500 })
    }

    const apiEvents = apiData.response

    if (!apiEvents || !Array.isArray(apiEvents)) {
      return NextResponse.json({ error: 'Nieprawidłowa odpowiedź z API sportowego.', surowe_dane: apiData }, { status: 500 })
    }

    const { data: dbMatches } = await supabase.from('matches').select('*')
    const dbMatchesMap = new Map(dbMatches?.map(m => [m.api_fixture_id, m]) || [])

    const matchesToInsert = []
    let updatedCount = 0

    for (const event of apiEvents) {
      const apiId = event.fixture.id
      // Status 'FT' (Koniec), 'AET' (Koniec po dogrywce), 'PEN' (Koniec po karnych)
      const isFinished = ['FT', 'AET', 'PEN'].includes(event.fixture.status.short)
      const startTime = event.fixture.date
      
      const dbMatch = dbMatchesMap.get(apiId)

      if (!dbMatch) {
        matchesToInsert.push({
          api_fixture_id: apiId,
          team_a: event.teams.home.name || 'TBA',
          team_a_flag: '🏳️', 
          team_b: event.teams.away.name || 'TBA',
          team_b_flag: '🏳️',
          start_time: startTime,
          score_a: null,
          score_b: null,
          status: 'upcoming'
        })
      } 
      else if (dbMatch && dbMatch.status !== 'finished' && isFinished) {
        const finalScoreA = event.goals.home ?? 0
        const finalScoreB = event.goals.away ?? 0

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
      else console.error('Błąd bazy danych podczas zapisu:', insertError)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synchronizacja (API-Football) zakończona. Dodano meczów: ${insertedCount}. Zaktualizowano: ${updatedCount}.` 
    })

  } catch (err: any) {
    console.error('Krytyczny błąd synchronizacji:', err)
    return NextResponse.json({ 
      error: 'Szczegóły błędu: ' + err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}