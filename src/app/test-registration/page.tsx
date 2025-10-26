'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { formatUzbekPhoneNumber, validateUzbekPhoneNumber } from '@/utils/phoneUtils'

export default function TestRegistrationPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const { signUp } = useAuth()
  const router = useRouter()

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearResults = () => {
    setResults([])
  }

  const testRegistration = async () => {
    setLoading(true)
    clearResults()
    
    addResult('Starting registration test...')
    
    // Test data
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'password123'
    const testFullName = 'Test User'
    const testTelephone = '+998901234567'
    
    setEmail(testEmail)
    setPassword(testPassword)
    setFullName(testFullName)
    setTelephone(testTelephone)
    
    addResult(`Test data: ${testEmail}, ${testFullName}, ${testTelephone}`)
    
    try {
      addResult('Calling signUp function...')
      const { error } = await signUp(testEmail, testPassword, testFullName, testTelephone)
      
      addResult(`SignUp result: ${error ? 'ERROR' : 'SUCCESS'}`)
      
      if (error) {
        addResult(`Error details: ${error.message}`)
        addResult(`Error type: ${error.constructor.name}`)
      } else {
        addResult('Registration successful! Should redirect to login...')
        
        // Test redirect
        addResult('Testing redirect to login page...')
        setTimeout(() => {
          addResult('Redirecting now...')
          router.push('/login?message=Test registration successful!')
        }, 2000)
      }
    } catch (error) {
      addResult(`Exception: ${error}`)
    }
    
    setLoading(false)
  }

  const testManualRegistration = async () => {
    setLoading(true)
    clearResults()
    
    addResult('Starting manual registration test...')
    
    const testEmail = `manual-${Date.now()}@example.com`
    const testPassword = 'password123'
    const testFullName = 'Manual Test User'
    const testTelephone = '+998901234567'
    
    addResult(`Test data: ${testEmail}, ${testFullName}, ${testTelephone}`)
    
    try {
      addResult('Step 1: Formatting phone number...')
      const formattedTelephone = formatUzbekPhoneNumber(testTelephone)
      addResult(`Formatted phone: ${formattedTelephone}`)
      
      addResult('Step 2: Validating phone number...')
      const isValidPhone = validateUzbekPhoneNumber(testTelephone)
      addResult(`Phone valid: ${isValidPhone}`)
      
      if (!isValidPhone) {
        addResult('Phone validation failed, stopping test')
        setLoading(false)
        return
      }
      
      addResult('Step 3: Calling signUp...')
      const { error } = await signUp(testEmail, testPassword, testFullName, formattedTelephone)
      
      addResult(`Step 4: SignUp completed - ${error ? 'ERROR' : 'SUCCESS'}`)
      
      if (error) {
        addResult(`Error message: ${error.message}`)
        addResult(`Error stack: ${error.stack}`)
      } else {
        addResult('Step 5: Registration successful!')
        addResult('Step 6: Testing redirect...')
        
        setTimeout(() => {
          addResult('Step 7: Redirecting to login...')
          window.location.href = '/login?message=Manual test successful!'
        }, 3000)
      }
    } catch (error) {
      addResult(`Exception caught: ${error}`)
      addResult(`Exception stack: ${error instanceof Error ? error.stack : 'No stack'}`)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">🧪 Registration Test Page</h1>
            
            <div className="mb-6">
              <button
                onClick={testRegistration}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mr-2"
              >
                {loading ? 'Testing...' : 'Test Registration Flow'}
              </button>
              
              <button
                onClick={testManualRegistration}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 mr-2"
              >
                {loading ? 'Testing...' : 'Test Manual Registration'}
              </button>
              
              <button
                onClick={clearResults}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Clear Results
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Test Form:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="test@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="password123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Test User"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telephone</label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="+998901234567"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-gray-500">Click a test button to start debugging...</div>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


