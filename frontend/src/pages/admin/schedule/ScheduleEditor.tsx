import { Grid } from '@mantine/core'
import { useState } from 'react'
import type { Booking, Schedule } from '../../../api/generated/types.gen.ts'
import { draftFromSchedule } from './scheduleDraft.ts'
import { WeekMatrix } from './WeekMatrix.tsx'

interface ScheduleEditorProps {
  schedule: Schedule
  bookings: Booking[]
  timeZone: string
}

export function ScheduleEditor({ schedule }: ScheduleEditorProps) {
  const [draft, setDraft] = useState(() => draftFromSchedule(schedule))

  return (
    <Grid gap="xl" mt="lg">
      <Grid.Col span={{ base: 12, md: 8 }}>
        <WeekMatrix
          weekly={draft.weekly}
          onChange={(weekly) => setDraft({ ...draft, weekly })}
        />
      </Grid.Col>
    </Grid>
  )
}
