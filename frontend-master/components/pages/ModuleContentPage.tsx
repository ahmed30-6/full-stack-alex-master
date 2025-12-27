

import React, { useEffect, useState } from 'react';
import { moduleContent } from '../../moduleContent';
import { apiService } from '../../src/services/apiService';

interface ModuleContentPageProps {
  onBack: () => void;
  completedLessons: number[];
  setCompletedLessons: React.Dispatch<React.SetStateAction<number[]>>;
  currentLessonIndex: number;
  currentPageIndex: number;
  onSetLesson: (index: number) => void;
  onSetPage: (index: number) => void;
  onNavigateToActivity: () => void;
  currentModuleId: number | null;
  onNavigateToContentPage: () => void;
}

const ModuleContentPage: React.FC<ModuleContentPageProps> = ({
  onBack,
  completedLessons,
  setCompletedLessons,
  currentLessonIndex,
  currentPageIndex,
  onSetLesson,
  onSetPage,
  onNavigateToActivity,
  currentModuleId,
  onNavigateToContentPage
}) => {
  // State for Module 1 backend content
  const [backendLessons, setBackendLessons] = useState<any[]>([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Fetch Module 1 content from backend
  useEffect(() => {
    if (currentModuleId === 1) {
      setIsLoadingBackend(true);
      setBackendError(null);

      apiService.getModuleContent(1)
        .then((response) => {
          // Transform backend response to match frontend lesson structure
          const transformedLessons = response.lessons.map((lesson: any) => ({
            title: lesson.title,
            pages: [lesson.body], // Backend stores full content in body
          }));
          setBackendLessons(transformedLessons);
          setIsLoadingBackend(false);
        })
        .catch((error) => {
          console.error('Error fetching Module 1 content:', error);
          setBackendError('فشل تحميل محتوى الموديول من الخادم');
          setIsLoadingBackend(false);
        });
    }
  }, [currentModuleId]);

  // Determine which lessons to use:
  // - Module 1: Use backend content
  // - Modules 2-3: Use hardcoded content from moduleContent.ts
  const lessons = currentModuleId === 1
    ? backendLessons
    : (currentModuleId ? moduleContent[currentModuleId] || [] : []);

  // Reset page to 0 when lesson changes, but only if there are lessons to display
  useEffect(() => {
    if (lessons.length > 0) {
      onSetPage(0);
    }
  }, [currentLessonIndex, onSetPage, lessons.length]);

  // Loading state for Module 1 backend content
  if (currentModuleId === 1 && isLoadingBackend) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">محتوى الموديول التعليمي</h1>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            العودة إلى المسار
          </button>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-xl text-gray-700">جاري تحميل محتوى الموديول...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state for Module 1 backend content
  if (currentModuleId === 1 && backendError) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">محتوى الموديول التعليمي</h1>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            العودة إلى المسار
          </button>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-bold">{backendError}</p>
          </div>
          <button
            onClick={onNavigateToContentPage}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            العودة إلى قائمة الموديولات
          </button>
        </div>
      </div>
    );
  }

  if (!currentModuleId || lessons.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">محتوى الموديول التعليمي</h1>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            العودة إلى المسار
          </button>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-xl text-gray-700">
            {!currentModuleId
              ? "يرجى إكمال الاختبار القبلي لأحد الموديولات أولاً للوصول إلى المحتوى التعليمي."
              : "لا يوجد محتوى تعليمي متاح لهذا الموديول بعد."
            }
          </p>
          <button
            onClick={onNavigateToContentPage}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            العودة إلى قائمة الموديولات
          </button>
        </div>
      </div>
    );
  }

  const selectedLesson = lessons[currentLessonIndex];

  if (!selectedLesson) {
    return <div className="p-8 text-center text-gray-600">الدرس غير موجود.</div>;
  }

  const isLastPage = currentPageIndex === selectedLesson.pages.length - 1;
  const pageContent = selectedLesson.pages[currentPageIndex];

  // Ensure pageContent exists before trying to render it. 
  // This handles the momentary state where lesson index changed but page index hasn't reset yet.
  if (!pageContent) {
    return <div className="p-8 text-center text-gray-600">جاري تحميل الصفحة...</div>;
  }

  const isLessonCompleted = completedLessons.includes(currentLessonIndex);
  const allLessonsCompleted = lessons.length === completedLessons.length;


  const handleSelectLesson = (index: number) => {
    const isUnlocked = index === 0 || completedLessons.includes(index - 1);
    if (isUnlocked) {
      onSetLesson(index);
    }
  };

  const handleCompleteLesson = () => {
    if (!isLessonCompleted) {
      const newCompleted = [...completedLessons, currentLessonIndex];
      setCompletedLessons(newCompleted);

      // Automatically move to the next lesson if there is one and it's not completed
      if (currentLessonIndex < lessons.length - 1 && !newCompleted.includes(currentLessonIndex + 1)) {
        onSetLesson(currentLessonIndex + 1);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < selectedLesson.pages.length - 1) {
      onSetPage(currentPageIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      onSetPage(currentPageIndex - 1);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">محتوى الموديول التعليمي</h1>
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          العودة
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Lesson List */}
        <div className="w-full md:w-80 bg-white p-6 rounded-lg shadow-lg md:order-2">
          <h3 className="text-xl font-bold text-gray-800 mb-4">الدروس</h3>
          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const isUnlocked = index === 0 || completedLessons.includes(index - 1);
              const isSelected = index === currentLessonIndex;
              const isCompleted = completedLessons.includes(index);

              return (
                <button
                  key={lesson.title}
                  onClick={() => handleSelectLesson(index)}
                  disabled={!isUnlocked}
                  className={`w-full text-right p-4 rounded-md transition flex items-center justify-between ${!isUnlocked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
                    isSelected ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400' :
                      'bg-gray-100 hover:bg-blue-100'
                    }`}
                >
                  <span className="flex-1">{lesson.title}</span>
                  {isCompleted && <span className="text-green-600 mr-2">✓</span>}
                  {!isUnlocked && <span className="text-gray-400">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-gray-100 p-6 rounded-lg shadow-inner flex flex-col md:order-1">
          <h2 className="text-2xl font-bold text-blue-700 mb-4 pb-2 border-b-2 border-blue-200">{selectedLesson.title}</h2>

          <div className="bg-white p-6 md:p-8 rounded-md shadow-lg flex-1 flex flex-col min-h-[50vh]">
            <div className="prose prose-lg max-w-none flex-grow whitespace-pre-wrap font-sans text-gray-700 text-lg leading-relaxed">
              {pageContent.split('\n').map((line, idx) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('VIDEO_EMBED:')) {
                  const videoUrl = trimmed.replace('VIDEO_EMBED:', '');
                  return (
                    <div key={idx} className="my-4 flex justify-center w-full">
                      <div className="relative w-full max-w-md aspect-video">
                        <iframe
                          src={videoUrl}
                          className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          title={`Embedded Video ${idx}`}
                        ></iframe>
                      </div>
                    </div>
                  );
                }

                if (trimmed.startsWith('PDF_LINK:')) {
                  const url = trimmed.replace('PDF_LINK:', '').trim();
                  return (
                    <p key={idx} className="break-words">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        عرض/تحميل الملف (PDF)
                      </a>
                    </p>
                  );
                }

                return <p key={idx}>{line}</p>;
              })}
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center bg-white p-3 rounded-md shadow-lg">
            <button
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg transition disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <span className="text-gray-700 font-semibold">
              صفحة {currentPageIndex + 1} من {selectedLesson.pages.length}
            </span>
            {isLastPage ? (
              <button
                onClick={handleCompleteLesson}
                disabled={isLessonCompleted}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLessonCompleted ? '✓ تم الإكمال' : 'إكمال الدرس'}
              </button>
            ) : (
              <button
                onClick={handleNextPage}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                التالي
              </button>
            )}
          </div>
        </div>
      </div>
      {allLessonsCompleted && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onNavigateToActivity}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition text-lg transform hover:scale-105"
          >
            الانتقال إلى الأنشطة
          </button>
        </div>
      )}
    </div>
  );
};

export default ModuleContentPage;
