import React, { useState, useEffect } from 'react'
import LoginPage from './components/LoginPage'
import ChallengePage from './components/ChallengePage'
import MainDashboard from './components/MainDashboard'
import RecommendedBooksPage from './components/RecommendedBooksPage'

type AppState = 'login' | 'challenge' | 'dashboard' | 'recommended'

function App() {
  const [appState, setAppState] = useState<AppState>('login')
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    // 세션 유지 확인
    const savedUser = localStorage.getItem('bookFamilyUser')
    if (savedUser) {
      setCurrentUser(savedUser)
      setAppState('dashboard')
    }
  }, [])

  const handleLogin = (userName: string) => {
    setCurrentUser(userName)
    localStorage.setItem('bookFamilyUser', userName)
    setAppState('dashboard')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('bookFamilyUser')
    setAppState('login')
  }

  return (
    <div className="App">
      {appState === 'login' && (
        <LoginPage
          onLogin={handleLogin}
          onShowChallenge={() => setAppState('challenge')}
        />
      )}

      {appState === 'challenge' && (
        <ChallengePage
          onBack={() => setAppState('login')}
        />
      )}

      {appState === 'dashboard' && currentUser && (
        <MainDashboard
          userName={currentUser}
          onLogout={handleLogout}
          onShowRecommended={() => setAppState('recommended')}
        />
      )}

      {appState === 'recommended' && currentUser && (
        <RecommendedBooksPage
          userName={currentUser}
          onBack={() => setAppState('dashboard')}
        />
      )}
    </div>
  )
}

export default App
