import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('v4p_user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('v4p_token') ?? null)

  function login(userData, jwt) {
    setUser(userData)
    setToken(jwt)
    localStorage.setItem('v4p_user', JSON.stringify(userData))
    localStorage.setItem('v4p_token', jwt)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('v4p_user')
    localStorage.removeItem('v4p_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
