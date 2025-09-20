import { useState, useEffect } from 'react'

function Home() {
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => setMessage('Backend 연결 실패'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Sui Ports
        </h1>
        <p className="text-gray-600 mb-4">
          React + FastAPI 모놀리식 웹사이트
        </p>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-700">
            Backend Status: <span className="font-semibold">{message}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home
