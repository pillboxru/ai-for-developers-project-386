import { Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout.tsx'
import { BookingPage } from './pages/BookingPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { OwnerPage } from './pages/OwnerPage.tsx'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="book" element={<BookingPage />} />
        <Route path="owner" element={<OwnerPage />} />
      </Route>
    </Routes>
  )
}

export default App
