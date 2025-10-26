'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatUzbekPhoneNumber, validateUzbekPhoneNumber } from '@/utils/phoneUtils'

export default function DebugPage() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearResults = () => {
    setResults([])
  }

  const testEnvironmentVariables = () => {
    addResult('Testing environment variables...')
    addResult(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}`)
    addResult(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}`)
  }

  const testSupabaseConnection = async () => {
    setLoading(true)
    addResult('Testing Supabase connection...')
    
    try {
      const { error } = await supabase.from('markets').select('count').limit(1)
      if (error) {
        addResult(`❌ Supabase connection error: ${error.message}`)
      } else {
        addResult('✅ Supabase connection successful')
      }
    } catch (error) {
      addResult(`❌ Supabase connection exception: ${error}`)
    }
    
    setLoading(false)
  }

  const testDatabaseTables = async () => {
    setLoading(true)
    addResult('Testing database tables...')
    
    const tables = ['markets', 'user_profiles', 'block_shop_combinations']
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1)
        if (error) {
          addResult(`❌ Table ${table}: ${error.message}`)
          addResult(`   Error details: ${JSON.stringify(error, null, 2)}`)
        } else {
          addResult(`✅ Table ${table}: exists`)
        }
      } catch (error) {
        addResult(`❌ Table ${table}: exception - ${error}`)
      }
    }
    
    // Test user_profiles table specifically
    addResult('Testing user_profiles table insert...')
    try {
      const testUserId = `test-${Date.now()}`
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: testUserId,
          full_name: 'Test User',
          telephone: '+998901234567'
        })
        .select()
        .single()
      
      if (error) {
        addResult(`❌ user_profiles insert test failed: ${error.message}`)
        addResult(`   Error details: ${JSON.stringify(error, null, 2)}`)
      } else {
        addResult(`✅ user_profiles insert test successful`)
        // Clean up test data
        await supabase.from('user_profiles').delete().eq('user_id', testUserId)
      }
    } catch (error) {
      addResult(`❌ user_profiles insert test exception: ${error}`)
    }
    
    setLoading(false)
  }

  const testPhoneFormatting = () => {
    addResult('Testing phone number formatting...')
    
    const testPhones = ['901234567', '+998901234567', '998901234567', 'invalid']
    
    testPhones.forEach(phone => {
      const formatted = formatUzbekPhoneNumber(phone)
      const isValid = validateUzbekPhoneNumber(phone)
      addResult(`Phone: ${phone} -> Formatted: ${formatted} -> Valid: ${isValid ? 'Yes' : 'No'}`)
    })
  }

  const testRegistrationData = () => {
    addResult('Testing registration data structure...')
    
    const testData = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      telephone: '+998901234567'
    }
    
    addResult(`Email valid: ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testData.email)}`)
    addResult(`Password length >= 6: ${testData.password.length >= 6}`)
    addResult(`Full name not empty: ${testData.fullName.trim().length > 0}`)
    addResult(`Phone number valid: ${/^\+998[0-9]{9}$/.test(testData.telephone)}`)
  }

  const testAuthSignup = async () => {
    setLoading(true)
    addResult('Testing auth signup (dry run)...')
    
    try {
      // Test with a unique email to avoid conflicts
      const testEmail = `test-${Date.now()}@example.com`
      const testData = {
        email: testEmail,
        password: 'password123',
        fullName: 'Test User',
        telephone: '+998901234567'
      }
      
      addResult(`Testing with email: ${testEmail}`)
      
      const { data, error } = await supabase.auth.signUp({
        email: testData.email,
        password: testData.password,
        options: {
          data: {
            full_name: testData.fullName,
            telephone: testData.telephone,
          }
        }
      })
      
      if (error) {
        addResult(`❌ Auth signup error: ${error.message}`)
        addResult(`Error details: ${JSON.stringify(error, null, 2)}`)
      } else {
        addResult(`✅ Auth signup successful: ${data?.user?.id}`)
      }
    } catch (error) {
      addResult(`❌ Auth signup exception: ${error}`)
    }
    
    setLoading(false)
  }

  const runAllTests = async () => {
    clearResults()
    addResult('🚀 Running all diagnostic tests...')
    
    testEnvironmentVariables()
    await testSupabaseConnection()
    await testDatabaseTables()
    testPhoneFormatting()
    testRegistrationData()
    await testAuthSignup()
    
    addResult('✅ All tests completed!')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Registration Debug Tool</h1>
            
            <div className="mb-6">
              <button
                onClick={runAllTests}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mr-2"
              >
                {loading ? 'Running Tests...' : 'Run All Tests'}
              </button>
              
              <button
                onClick={clearResults}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Clear Results
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Individual Tests:</h3>
              <div className="space-x-2 space-y-2">
                <button
                  onClick={testEnvironmentVariables}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Test Environment
                </button>
                <button
                  onClick={testSupabaseConnection}
                  disabled={loading}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Test Supabase
                </button>
                <button
                  onClick={testDatabaseTables}
                  disabled={loading}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  Test Tables
                </button>
                <button
                  onClick={testPhoneFormatting}
                  className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                >
                  Test Phone
                </button>
                <button
                  onClick={testRegistrationData}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                >
                  Test Data
                </button>
                <button
                  onClick={testAuthSignup}
                  disabled={loading}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Test Signup
                </button>
              </div>
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-gray-500">Click &quot;Run All Tests&quot; to start debugging...</div>
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
