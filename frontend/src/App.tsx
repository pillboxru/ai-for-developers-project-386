import { AppShell } from '@mantine/core'
import { Route, Routes } from 'react-router'
import { AppHeader } from './components/AppHeader.tsx'
import { BookPage } from './pages/BookPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ScheduleEditorPrototypePage } from './pages/ScheduleEditorPrototypePage.tsx'

function App() {
  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookPage />} />
          <Route
            path="/admin/schedule"
            element={<ScheduleEditorPrototypePage />}
          />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
