import React, { useState } from 'react'
import LoginPage from './components/LoginPage'
import ChallengePage from './components/ChallengePage'
import MainDashboard from './components/MainDashboard'

type AppState = 'login' | 'challenge' | 'dashboard'

function App() {
  const [appState, setAppState] = useState<AppState>('login')
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  const handleLogin = (userName: string) => {
    setCurrentUser(userName)
    setAppState('dashboard')
  }

  const handleLogout = () => {
    setCurrentUser(null)
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
        />
      )}
    </div>
  )
}

export default App
