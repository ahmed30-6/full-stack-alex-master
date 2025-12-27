import React from 'react';
import type { NewsItem } from '../../types';
import EditableText from '../EditableText';

interface NewsPageProps {
  newsItems: NewsItem[];
  isAdmin: boolean;
  onUpdateNewsItem: (id: number, newTitle: string, newContent: string) => void;
  onAddNewsItem: () => void;
  onDeleteNewsItem: (id: number) => void;
}


const NewsPage: React.FC<NewsPageProps> = ({ newsItems, isAdmin, onUpdateNewsItem, onAddNewsItem, onDeleteNewsItem }) => {
  return (
    <div>
      <div className="flex flex-col items-start gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-800">آخر الأخبار</h1>
        {isAdmin && (
          <button
            onClick={onAddNewsItem}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            إضافة خبر جديد
          </button>
        )}
      </div>
      <div className="space-y-6">
        {newsItems.map(item => (
          <div key={item.id} className="bg-blue-800 p-6 rounded-lg shadow-lg relative group">
            <EditableText 
                isAdmin={isAdmin}
                initialText={item.title}
                onSave={(newTitle) => onUpdateNewsItem(item.id, newTitle, item.content)}
                className="text-xl font-bold text-white mb-2"
            />
            <EditableText 
                isAdmin={isAdmin}
                initialText={item.content}
                onSave={(newContent) => onUpdateNewsItem(item.id, item.title, newContent)}
                textarea
                className="text-blue-200"
            />
             {isAdmin && (
                <button
                    onClick={() => onDeleteNewsItem(item.id)}
                    className="absolute top-2 left-2 bg-red-600 hover:bg-red-700 text-white w-6 h-6 flex items-center justify-center text-lg font-bold rounded-full transition opacity-0 group-hover:opacity-100"
                    title="حذف الخبر"
                >
                    &times;
                </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsPage;
