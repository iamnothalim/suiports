import React, { useState } from "react";
import { X, Calendar, Hash, FileText, Clock } from "lucide-react";

interface CreatePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (predictionData: PredictionData) => void;
}

interface PredictionData {
  game_id: string;
  prediction: string;
  option_a: string;
  option_b: string;
  duration: number; // hours (calculated from deadline)
  deadline: string; // deadline date
}

const CreatePredictionModal: React.FC<CreatePredictionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<PredictionData>({
    game_id: "",
    prediction: "",
    option_a: "",
    option_b: "",
    duration: 24,
    deadline: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validation
      if (!formData.game_id.trim()) {
        setError("Please enter a game ID.");
        return;
      }
      if (!formData.prediction.trim()) {
        setError("Please enter prediction content.");
        return;
      }
      if (!formData.option_a.trim()) {
        setError("Please enter option A.");
        return;
      }
      if (!formData.option_b.trim()) {
        setError("Please enter option B.");
        return;
      }
      if (!formData.deadline) {
        setError("Please select a deadline date.");
        return;
      }

      // Validate deadline is in the future
      const deadlineDate = new Date(formData.deadline);
      const now = new Date();
      if (deadlineDate <= now) {
        setError("Deadline must be in the future.");
        return;
      }

      // Calculate duration in hours from deadline
      const durationHours = Math.ceil(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      if (durationHours < 1 || durationHours > 168) {
        setError("Deadline must be between 1 hour and 7 days from now.");
        return;
      }

      // Update formData with calculated duration
      const updatedFormData = {
        ...formData,
        duration: durationHours,
      };

      await onSubmit(updatedFormData);

      // Reset form
      setFormData({
        game_id: "",
        prediction: "",
        option_a: "",
        option_b: "",
        duration: 24,
        deadline: "",
      });
      onClose();
    } catch (error: any) {
      setError(error.message || "Failed to create prediction event.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            🎯 Create Prediction Event
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
              Game ID
            </label>
            <div className="relative">
              <Hash
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                name="game_id"
                value={formData.game_id}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., MANU_vs_LIV_20250115"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Unique game identifier (e.g., team_name_date_time)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prediction Content
            </label>
            <div className="relative">
              <FileText
                className="absolute left-3 top-3 text-gray-400"
                size={20}
              />
              <textarea
                name="prediction"
                value={formData.prediction}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Manchester United will beat Liverpool 2-1. Son Heung-min will score the first goal."
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Please enter specific prediction content
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Option A
            </label>
            <input
              type="text"
              name="option_a"
              value={formData.option_a}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Win"
            />
            <p className="text-xs text-gray-500 mt-1">
              First choice (e.g., Win, Transfer, Score goal)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Option B
            </label>
            <input
              type="text"
              name="option_b"
              value={formData.option_b}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Lose"
            />
            <p className="text-xs text-gray-500 mt-1">
              Second choice (e.g., Lose, No transfer, No goal)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Betting Deadline
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select when betting should end (1 hour to 7 days from now)
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              💡 Prediction Event Guide
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>
                • Created predictions can be viewed in the Prediction Game tab
              </li>
              <li>• Other users can participate in betting</li>
              <li>• Results will be revealed after the betting period ends</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-2 px-4 rounded-md hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "🎯 Create Prediction Event"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePredictionModal;
