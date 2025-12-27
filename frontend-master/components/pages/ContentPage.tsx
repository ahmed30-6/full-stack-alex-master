
import React from 'react';
import { MODULES, ADMIN_USER_EMAIL } from '../../constants';
import { BookOpenIcon } from '../icons';
import type { User } from '../../types';

interface ContentPageProps {
  onStartModule: (moduleId: number) => void;
  onContinueModule: (moduleId: number) => void;
  unlockedModules: number[];
  user: User;
  allModuleScores: { [email: string]: { [key: number]: { preTestScore: number | null, postTestScore: number | null } } };
}

const ContentPage: React.FC<ContentPageProps> = ({ onStartModule, onContinueModule, unlockedModules, user, allModuleScores }) => {
  const isAdmin = user.email === ADMIN_USER_EMAIL;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">الموديولات التعليمية</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULES.map(module => {
          const isUnlocked = unlockedModules.includes(module.id);
          const userScores = allModuleScores[user.email]?.[module.id];
          const preTestDone = userScores?.preTestScore !== null && userScores?.preTestScore !== undefined;
          const postTestDone = userScores?.postTestScore !== null && userScores?.postTestScore !== undefined;

          return (
            <div key={module.id} className={`p-6 rounded-lg shadow-lg text-white ${isUnlocked ? 'bg-blue-700' : 'bg-gray-500'}`}>
              <div className="flex items-center mb-4">
                <div className="p-3 bg-white/20 rounded-full mr-4">
                  <BookOpenIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{module.title}</h2>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isUnlocked ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-800'}`}>
                    {module.level}
                  </span>
                </div>
              </div>
              <p className="text-blue-100 mb-4">
                {isAdmin ? "معاينة المشرف: يمكنك بدء الاختبار." :
                 postTestDone 
                    ? "لقد أتممت هذا الموديول بنجاح." 
                    : preTestDone 
                        ? "أكمل دراسة المحتوى التعليمي." 
                        : "ابدأ بالاختبار القبلي لفتح مسار التعلم الخاص بك."
                }
              </p>
              
              {isAdmin ? (
                   <button
                    onClick={() => onStartModule(module.id)}
                    className="w-full py-2 px-4 rounded-md font-semibold transition bg-white text-blue-700 hover:bg-blue-100"
                  >
                    بدء الاختبار القبلي
                  </button>
              ) : postTestDone ? (
                  <button
                    onClick={() => onContinueModule(module.id)}
                    className="w-full py-2 px-4 rounded-md font-semibold transition bg-green-500 text-white hover:bg-green-600"
                  >
                    مراجعة المحتوى
                  </button>
              ) : preTestDone ? (
                  <button
                    onClick={() => onContinueModule(module.id)}
                    className="w-full py-2 px-4 rounded-md font-semibold transition bg-yellow-500 text-white hover:bg-yellow-600"
                  >
                    استكمال المديول
                  </button>
              ) : (
                  <button
                    onClick={() => onStartModule(module.id)}
                    disabled={!isUnlocked}
                    className={`w-full py-2 px-4 rounded-md font-semibold transition ${
                      isUnlocked
                        ? 'bg-white text-blue-700 hover:bg-blue-100'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {isUnlocked ? 'بدء الاختبار القبلي' : 'مغلق'}
                  </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default ContentPage;
