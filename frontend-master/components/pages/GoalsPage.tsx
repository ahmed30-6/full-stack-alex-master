import React from 'react';

const GoalsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-red-600 mb-6">أهداف بيئة التعلم</h1>

      <div className="mb-8 p-4 bg-gray-200 rounded-lg">
        <img src="https://picsum.photos/seed/banner/1200/200" alt="بانر بيئة التعلم" className="w-full h-auto rounded-md shadow-md" />
      </div>

      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-green-600 mb-4 border-b-2 border-green-200 pb-2">الأهداف العامة</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>تنمية مهارات تطوير المكتبات الافتراضية لدى الطلاب.</li>
            <li>تحسين قدرة الطلاب على التعلم الذاتي والتشاركي.</li>
            <li>قياس أثر بيئات التعلم المختلفة (التكيفية مقابل التشاركية).</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-green-600 mb-4 border-b-2 border-green-200 pb-2">الأهداف التعليمية</h2>
          <p className="text-gray-700 mb-4">بعد الانتهاء من هذه الوحدة، يجب أن يكون الطالب قادرًا على:</p>
          <ul className="list-decimal list-inside space-y-2 text-gray-700">
            <li>تصميم مكتبة افتراضية باستخدام الأدوات المتاحة.</li>
            <li>إدارة المحتوى الرقمي بفعالية داخل المكتبة.</li>
            <li>التعاون مع الزملاء لإنشاء مشروع مكتبة تشاركية.</li>
            <li>تقييم فعالية المكتبات الافتراضية في دعم التعلم.</li>
          </ul>
        </div>
      </div>
      
       <div className="mt-8 flex justify-end">
         <button className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition">
            التالي
         </button>
       </div>
    </div>
  );
};

export default GoalsPage;
