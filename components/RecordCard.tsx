import React from 'react';
import { MedicalRecord } from '../types';
import { Calendar } from 'lucide-react';

interface RecordCardProps {
  record: MedicalRecord;
  onClick: (record: MedicalRecord) => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onClick }) => {
  return (
    <div 
      onClick={() => onClick(record)}
      className="bg-white rounded-2xl p-4 shadow-ios-card active:scale-95 transition-transform duration-200 cursor-pointer border border-transparent hover:border-ios-blue/20"
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold text-ios-gray bg-gray-100 px-2 py-1 rounded-md">
             {record.date}
          </span>
        </div>
        
        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
          {record.title}
        </h3>
        
        <p className="text-sm text-gray-500 line-clamp-3 mb-3 flex-grow">
          {record.description}
        </p>

        {record.imageUrl && (
          <div className="mt-auto h-32 w-full rounded-xl overflow-hidden bg-gray-50 relative">
             <img 
               src={record.imageUrl} 
               alt={record.title} 
               className="w-full h-full object-cover"
               loading="lazy"
             />
             <div className="absolute inset-0 bg-black/5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordCard;
