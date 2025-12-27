
import React, { useState } from 'react';
import EditableText from '../EditableText';
import type { CognitiveLevel } from '../../types';

interface LearningPathPageProps {
  onSelectTopic: (topic: string) => void;
  onNavigateToGroupFormation: () => void;
  isAdmin: boolean;
  description: string;
  onUpdateDescription: (newText: string) => void;
  generalGoal: string;
  onUpdateGeneralGoal: (newText: string) => void;
  objectives: string;
  onUpdateObjectives: (newText: string) => void;
  level: CognitiveLevel;
}

const LearningPathPage: React.FC<LearningPathPageProps> = ({ 
  onSelectTopic, 
  onNavigateToGroupFormation, 
  isAdmin, 
  description, 
  onUpdateDescription, 
  generalGoal,
  onUpdateGeneralGoal,
  objectives,
  onUpdateObjectives,
  level 
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'objectives'>('general');

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">مسار التعلم المخصص لك</h1>
      <div className="bg-white p-8 rounded-xl shadow-lg space-y-6">
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-6 rounded-r-lg">
          <h2 className="text-2xl font-bold mb-4">{`مسار التعلم: المستوى ${level}`}</h2>
          <div className="relative mb-6">
            <EditableText 
              isAdmin={isAdmin}
              initialText={description}
              onSave={onUpdateDescription}
              textarea
            />
          </div>
          
          {/* Tabs for Goal and Objectives */}
          <div className="mt-8">
              <div className="flex border-b border-gray-300 mb-4">
                  <button
                    className={`py-2 px-6 font-bold text-lg transition-colors duration-200 ${activeTab === 'general' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
                    onClick={() => setActiveTab('general')}
                  >
                      الهدف العام
                  </button>
                  <button
                    className={`py-2 px-6 font-bold text-lg transition-colors duration-200 ${activeTab === 'objectives' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
                    onClick={() => setActiveTab('objectives')}
                  >
                      الأهداف التعليمية
                  </button>
              </div>

              {activeTab === 'general' && (
                 <div className="animate-fadeIn">
                    <EditableText 
                        isAdmin={isAdmin}
                        initialText={generalGoal}
                        onSave={onUpdateGeneralGoal}
                        textarea
                        className="text-gray-700 leading-relaxed bg-white p-4 rounded border border-blue-200 text-lg"
                    />
                 </div>
              )}

              {activeTab === 'objectives' && (
                 <div className="animate-fadeIn">
                    <EditableText 
                        isAdmin={isAdmin}
                        initialText={objectives}
                        onSave={onUpdateObjectives}
                        textarea
                        className="text-gray-700 leading-relaxed bg-white p-4 rounded border border-blue-200 whitespace-pre-line text-lg"
                    />
                 </div>
              )}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <button
          onClick={onNavigateToGroupFormation}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition text-lg transform hover:scale-105"
        >
          تكوين المجموعات التشاركية
        </button>
      </div>
    </div>
  );
};

export default LearningPathPage;
