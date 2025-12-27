import React from "react";
import { Page as PageEnum } from "../../types";

interface PostTestResultsPageProps {
  score: number;
  maxScore: number;
  passingScore: number;
  moduleId: number;
  onContinue: () => void;
}

const PostTestResultsPage: React.FC<PostTestResultsPageProps> = ({
  score,
  maxScore,
  passingScore,
  moduleId,
  onContinue,
}) => {
  const percentage = Math.round((score / maxScore) * 100);
  const passed = score >= passingScore;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            نتيجة الاختبار البعدي
          </h1>
          <p className="text-lg text-gray-600">الموديول {moduleId}</p>
        </div>

        {/* Result Circle */}
        <div className="flex justify-center mb-8">
          <div
            className={`relative w-48 h-48 rounded-full flex items-center justify-center ${
              passed ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <div
              className={`absolute inset-4 rounded-full flex flex-col items-center justify-center ${
                passed ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <div
                className={`text-5xl font-bold ${
                  passed ? "text-green-600" : "text-red-600"
                }`}
              >
                {percentage}%
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {score} / {maxScore}
              </div>
            </div>
          </div>
        </div>

        {/* Pass/Fail Status */}
        <div className="text-center mb-8">
          {passed ? (
            <>
              <div className="text-2xl font-bold text-green-600 mb-2">
                ✅ مبروك! لقد نجحت
              </div>
              <p className="text-gray-600">
                لقد حققت درجة النجاح المطلوبة ({passingScore} من {maxScore})
              </p>
              <p className="text-gray-600 mt-2">
                يمكنك الآن الانتقال إلى الموديول التالي
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-red-600 mb-2">
                ❌ للأسف، لم تحقق درجة النجاح
              </div>
              <p className="text-gray-600">
                تحتاج إلى {passingScore} درجة على الأقل للنجاح
              </p>
              <p className="text-gray-600 mt-2">
                يمكنك مراجعة المحتوى والمحاولة مرة أخرى
              </p>
            </>
          )}
        </div>

        {/* Score Breakdown */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-gray-700 mb-4">تفاصيل النتيجة:</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">الإجابات الصحيحة:</span>
              <span className="font-bold text-green-600">{score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">الإجابات الخاطئة:</span>
              <span className="font-bold text-red-600">{maxScore - score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">إجمالي الأسئلة:</span>
              <span className="font-bold text-gray-800">{maxScore}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-gray-600">النسبة المئوية:</span>
              <span
                className={`font-bold text-xl ${
                  passed ? "text-green-600" : "text-red-600"
                }`}
              >
                {percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className={`px-8 py-4 rounded-lg font-bold text-white text-lg transition-all transform hover:scale-105 ${
              passed
                ? "bg-green-500 hover:bg-green-600"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {passed ? "متابعة إلى الموديول التالي" : "العودة إلى المحتوى"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostTestResultsPage;
