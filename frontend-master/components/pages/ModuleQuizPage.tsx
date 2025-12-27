
import React, { useState, useEffect } from 'react';
import EditableText from '../EditableText';
import { MODULES } from '../../constants';
import InlineEditable from '../InlineEditable';

interface AnswerOption {
  answerText: string;
  isCorrect: boolean;
}

interface Question {
  questionText: string;
  answerOptions: AnswerOption[];
}
interface ModuleQuizPageProps {
  onComplete: (score: number, timeTaken: number) => void;
  questions: Question[];
  onUpdateQuestion: (index: number, newText: string) => void;
  isAdmin: boolean;
  onUpdateAnswerText: (questionIndex: number, answerIndex: number, newText: string) => void;
  onSetCorrectAnswer: (questionIndex: number, correctAnserIndex: number) => void;
  currentModuleId: number | null;
}

const ModuleQuizPage: React.FC<ModuleQuizPageProps> = ({ onComplete, questions, onUpdateQuestion, isAdmin, onUpdateAnswerText, onSetCorrectAnswer, currentModuleId }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
	const [showScore, setShowScore] = useState(false);
	const [score, setScore] = useState(0);
    const [time, setTime] = useState(0);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (showScore) return;

        const timerId = setInterval(() => {
          setTime(prevTime => prevTime + 1);
        }, 1000);
    
        return () => {
          clearInterval(timerId);
        };
    }, [showScore]);

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const handleAnswerOptionClick = (isCorrect: boolean) => {
        if (isAdmin && isEditing) {
            return;
        }

		if (isCorrect) {
			setScore(score + 1);
		}

		const nextQuestion = currentQuestion + 1;
		if (nextQuestion < questions.length) {
			setCurrentQuestion(nextQuestion);
		} else {
			setShowScore(true);
		}
	};
    
    const handleAdminPass = () => {
        onComplete(questions.length, time);
    }

    const question = questions[currentQuestion];
    if (!question) {
        return <div>Loading question...</div>; // Safety check
    }

    const module = MODULES.find(m => m.id === currentModuleId);
    const moduleTitle = module ? module.title : `الموديول ${currentModuleId}`;

    return (
        <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-center p-2 sm:p-4">
             <div className="w-full max-w-4xl">
                <div className='bg-white p-4 sm:p-8 rounded-xl shadow-lg w-full'>
                    <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">الاختبار القبلي: {moduleTitle}</h1>
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                            <div className="bg-gray-700 text-white text-base md:text-lg font-mono px-3 py-1.5 rounded-lg shadow-md">
                                <span>الوقت: {formatTime(time)}</span>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-white transition text-sm ${isEditing ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                >
                                    {isEditing ? 'إنهاء التعديل' : 'تعديل الاختبار'}
                                </button>
                            )}
                        </div>
                    </div>

                    {showScore ? (
                        <div className='text-center pt-8'>
                            <h2 className='text-3xl font-bold text-orange-500 mb-4'>النتيجة النهائية</h2>
                            <p className='text-2xl text-gray-700 mb-2'>
                                لقد حصلت على <span className="font-bold text-blue-600">{score}</span> من <span className="font-bold text-blue-600">{questions.length}</span>
                            </p>
                            <p className="mt-4 text-lg text-gray-800">
                                شكرًا لأدائك. سيتم الآن نقلك إلى مسار التعلم الخاص بك.
                            </p>
                            <button onClick={() => onComplete(score, time)} className="mt-8 bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition text-lg">
                                إنهاء والانتقال إلى مسار التعلم
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className='mb-6'>
                                <div className='text-xl font-semibold text-gray-600 mb-4'>
                                    <span>السؤال {currentQuestion + 1}</span>/{questions.length}
                                </div>
                                <div className="relative">
                                    <EditableText
                                        isAdmin={isAdmin && isEditing}
                                        initialText={question.questionText}
                                        onSave={(newText) => onUpdateQuestion(currentQuestion, newText)}
                                        textarea
                                    />
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {question.answerOptions.map((answerOption, index) => (
                                     <div key={index} className="flex items-center space-x-2 bg-blue-100 border-2 border-blue-200 rounded-lg pr-4 rtl:space-x-reverse">
                                        {isAdmin && isEditing && (
                                            <input
                                                type="radio"
                                                name={`q-${currentQuestion}-correct`}
                                                checked={answerOption.isCorrect}
                                                onChange={() => onSetCorrectAnswer(currentQuestion, index)}
                                                className="form-radio h-5 w-5 text-green-600"
                                            />
                                        )}
                                        <button 
                                          onClick={() => handleAnswerOptionClick(answerOption.isCorrect)} 
                                          className={`w-full text-blue-800 font-semibold py-4 px-2 rounded-lg transition text-right text-lg flex ${isAdmin && isEditing ? 'cursor-default' : 'hover:bg-blue-200'}`}
                                        >
                                            <InlineEditable
                                                isAdmin={isAdmin && isEditing}
                                                initialText={answerOption.answerText}
                                                onSave={(newText) => onUpdateAnswerText(currentQuestion, index, newText)}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {isAdmin && (
                                <div className="mt-6 text-center">
                                    <button
                                        onClick={handleAdminPass}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition"
                                    >
                                        تجاوز الاختبار (للمشرف)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
             </div>
        </div>
    );
};

export default ModuleQuizPage;
