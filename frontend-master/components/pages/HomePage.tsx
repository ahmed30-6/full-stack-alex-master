
import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div>
      <div className="bg-blue-700 text-white p-6 md:p-8 rounded-xl shadow-lg mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً بك في بيئة التعلم التكيفية التشاركية</h1>
        <p className="text-base md:text-lg text-blue-100">
          هنا تبدأ رحلتك التعليمية. تهدف هذه الدراسة إلى تزويدك بالمهارات اللازمة من خلال بيئة تعليمية مبتكرة.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-4">عزيزي الطالب</h2>
          <p className="text-gray-700 leading-relaxed">
            أهلاً ومرحباً بك في بيئة التعلم التكيفية التشاركية التي صُممت بهدف تنمية بعض مهارات تطوير المكتبات الافتراضية ثلاثية الأبعاد وذلك لما لها من أهمية كبيره بسبب تدفق المعلومات والتقدم التكنولوجي حيث تسمح للمستخدمين بالوصول إلى المعلومات والمواد من خلال الإنترنت وتسهم في تنمية مهارات التعلم الذاتي وإتاحة التجوال في المكتبة والتعرف على مصادر معلوماتها بالتصفح والاطلاع.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
           <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-4">تعليمات بيئة التعلم</h2>
           <div className="text-gray-700 space-y-4">
             <p>يرجى إتباع التعليمات التالية قبل البدء في الدراسة:</p>
             <ol className="list-decimal list-inside space-y-2 bg-gray-50 p-4 rounded-md">
                <li>أجب عن الاختبارات القبلية المتاحة في بيئة التعلم لتحديد مستواك المعرفي.</li>
                <li>استطلع على الموديول المتاح لك قم بقراءة أهدافه ومحتواه بدقة.</li>
                <li>إبدا بدراسة كل موديول وفقاً لترتيب الموضوعات.</li>
                <li>قم بالتشارك مع زملائك لحل الأنشطة الموجودة في نهاية كل موضوع.</li>
             </ol>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
