import React, { useState } from 'react'
import { X, Calendar, Hash, FileText, Clock } from 'lucide-react'

interface CreatePredictionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (predictionData: PredictionData) => void
}

interface PredictionData {
  game_id: string
  prediction: string
  option_a: string
  option_b: string
  duration: number // hours
}

const CreatePredictionModal: React.FC<CreatePredictionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<PredictionData>({
    game_id: '',
    prediction: '',
    option_a: '',
    option_b: '',
    duration: 24
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // 유효성 검사
      if (!formData.game_id.trim()) {
        setError('게임 ID를 입력해주세요.')
        return
      }
      if (!formData.prediction.trim()) {
        setError('예측 내용을 입력해주세요.')
        return
      }
      if (!formData.option_a.trim()) {
        setError('옵션 A를 입력해주세요.')
        return
      }
      if (!formData.option_b.trim()) {
        setError('옵션 B를 입력해주세요.')
        return
      }
      if (formData.duration < 1 || formData.duration > 168) {
        setError('베팅 기간은 1시간에서 168시간(7일) 사이여야 합니다.')
        return
      }

      await onSubmit(formData)
      
      // 폼 초기화
      setFormData({
        game_id: '',
        prediction: '',
        option_a: '',
        option_b: '',
        duration: 24
      })
      onClose()
    } catch (error: any) {
      setError(error.message || '예측 이벤트 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === 'duration' ? parseInt(value) || 0 : value
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            🎯 예측 이벤트 생성
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              게임 ID
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                name="game_id"
                value={formData.game_id}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: MANU_vs_LIV_20250115"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              고유한 게임 식별자 (예: 팀명_날짜_시간)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              예측 내용
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={20} />
              <textarea
                name="prediction"
                value={formData.prediction}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 맨체스터 유나이티드가 리버풀을 2-1로 이길 것입니다. 손흥민이 첫 골을 넣을 것입니다."
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              구체적인 예측 내용을 입력해주세요
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              옵션 A
            </label>
            <input
              type="text"
              name="option_a"
              value={formData.option_a}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 승리"
            />
            <p className="text-xs text-gray-500 mt-1">
              첫 번째 선택지 (예: 승리, 이적한다, 골을 넣는다)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              옵션 B
            </label>
            <input
              type="text"
              name="option_b"
              value={formData.option_b}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 패배"
            />
            <p className="text-xs text-gray-500 mt-1">
              두 번째 선택지 (예: 패배, 이적하지 않는다, 골을 넣지 않는다)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              베팅 기간 (시간)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                required
                min="1"
                max="168"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="24"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              1시간 ~ 168시간(7일) 사이로 설정 가능
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 예측 이벤트 안내</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 생성된 예측은 예측 게임 탭에서 확인할 수 있습니다</li>
              <li>• 다른 사용자들이 베팅에 참여할 수 있습니다</li>
              <li>• 베팅 기간이 지나면 결과가 공개됩니다</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-2 px-4 rounded-md hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '생성 중...' : '🎯 예측 이벤트 생성'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreatePredictionModal
