import React from 'react';

interface LearningPathDetailPageProps {
  topicTitle: string;
  onBack: () => void;
}

const LearningPathDetailPage: React.FC<LearningPathDetailPageProps> = ({ topicTitle, onBack }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">{topicTitle}</h1>
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          العودة إلى المسار
        </button>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">محتوى الموضوع</h2>
        <p className="text-gray-700 leading-relaxed">
          هنا سيتم عرض المحتوى التعليمي المفصل لموضوع "{topicTitle}". يمكن أن يتضمن هذا المحتوى نصوصًا، صورًا، مقاطع فيديو، أو أنشطة تفاعلية لمساعدتك على فهم المادة بشكل أفضل. 
          <br /><br />
          لأغراض العرض التوضيحي، هذا مجرد نص نائب. في التطبيق الفعلي، سيتم تحميل المحتوى الديناميكي هنا.
        </p>
      </div>
    </div>
  );
};

export default LearningPathDetailPage;