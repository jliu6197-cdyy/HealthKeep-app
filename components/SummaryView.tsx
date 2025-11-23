import React, { useState, useEffect } from 'react';
import { MedicalRecord } from '../types';
import { generateHealthSummary } from '../services/geminiService';
import { Sparkles, RefreshCw, ArrowLeft, Calendar, Building2, Activity, Pill, CheckCircle2, Clock } from 'lucide-react';

interface SummaryViewProps {
  records: MedicalRecord[];
  onBack: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ records, onBack }) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateHealthSummary(records);
      setSummary(result);
    } catch (err) {
      setError("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  // Advanced Custom Parser to render "Apple Style" Cards
  const renderParsedContent = (text: string) => {
    if (!text) return null;

    // Split into major sections first (based on H1 '# ')
    const sections = text.split(/^# /m).filter(s => s.trim());

    return sections.map((section, secIndex) => {
      const lines = section.split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();

      // Check if this section contains "Cards" (indicated by '### ')
      const hasCards = content.includes('### ');

      return (
        <div key={secIndex} className="mb-8 animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-1">{title}</h2>
          
          {hasCards ? (
            <div className="space-y-4">
              {content.split(/^### /m).filter(c => c.trim()).map((cardContent, cardIndex) => {
                const cardLines = cardContent.split('\n');
                const cardTitle = cardLines[0].trim(); // e.g. "2023-10-15 入院记录"
                // Extract date if present (simple regex guess)
                const dateMatch = cardTitle.match(/\d{4}-\d{2}-\d{2}/);
                const displayTitle = cardTitle.replace(/\d{4}-\d{2}-\d{2}/, '').trim() || cardTitle;
                const displayDate = dateMatch ? dateMatch[0] : '';
                
                const cardBody = cardLines.slice(1).filter(l => l.trim());

                return (
                  <div key={cardIndex} className="bg-white rounded-2xl p-5 shadow-ios-card border border-transparent hover:border-ios-blue/10 transition-colors">
                    <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{displayTitle}</h3>
                      {displayDate && (
                        <div className="flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                          <Calendar size={12} className="mr-1" />
                          {displayDate}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {cardBody.map((line, lIdx) => {
                        const cleanLine = line.replace(/^- /, '').trim();
                        if (!cleanLine) return null;

                        // Field detection for icons
                        let icon = <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 mr-2.5 flex-shrink-0" />;
                        let highlightClass = "text-gray-600";
                        
                        if (cleanLine.includes('**医院**:') || cleanLine.includes('**医院/机构**:')) {
                          icon = <Building2 size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />;
                        } else if (cleanLine.includes('**重要检查检验结果**:') || cleanLine.includes('**重要检查结果**:')) {
                          icon = <Activity size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />;
                        } else if (cleanLine.includes('**用药方案**:')) {
                          icon = <Pill size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />;
                        } else if (cleanLine.includes('**治疗效果**:')) {
                          icon = <CheckCircle2 size={16} className="text-purple-500 mr-2 mt-0.5 flex-shrink-0" />;
                        } else if (cleanLine.includes('**下次治疗时间**:')) {
                          icon = <Clock size={16} className="text-orange-500 mr-2 mt-0.5 flex-shrink-0" />;
                        }

                        // Remove bold markers for cleaner display, but keep the structure
                        const parts = cleanLine.split('**:');
                        const label = parts[0]?.replace('**', '');
                        const value = parts[1] || parts[0]; // Fallback if no split

                        if (parts.length > 1) {
                           return (
                             <div key={lIdx} className="flex items-start text-sm">
                               {icon}
                               <div className="flex-1">
                                 <span className="text-gray-500 font-medium mr-2">{label}:</span>
                                 <span className="text-gray-800">{value}</span>
                               </div>
                             </div>
                           )
                        }

                        return (
                          <div key={lIdx} className="flex items-start text-sm">
                            {icon}
                            <span className="text-gray-700 leading-relaxed">{cleanLine.replace(/\*\*/g, '')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Plain text section (like Overview)
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/50">
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap font-sans">
                {content}
              </p>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-ios-separator/50 px-4 py-3 flex items-center justify-between transition-all">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-ios-blue transition-colors group">
          <div className="flex items-center gap-1">
            <ArrowLeft size={20} className="group-active:-translate-x-1 transition-transform" />
            <span className="font-medium">返回</span>
          </div>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">智能健康档案</h1>
        <div className="w-16 flex justify-end">
           {!loading && (
              <button onClick={fetchSummary} className="p-2 text-ios-blue hover:bg-blue-50 rounded-full transition-colors">
                <RefreshCw size={20} />
              </button>
            )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto pb-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-purple-200">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">AI 智能分析</h2>
              <p className="text-xs text-gray-500 font-medium">基于 {records.length} 条病历资料自动生成</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Sparkles size={16} className="text-purple-600 animate-pulse" />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium animate-pulse">正在梳理您的健康资料...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-100">
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <button onClick={fetchSummary} className="bg-white text-red-600 px-6 py-2 rounded-full text-sm font-medium shadow-sm border border-red-100 hover:bg-red-50 transition-colors">
                重试生成
              </button>
            </div>
          ) : (
            <div>
               {renderParsedContent(summary)}
               
               <div className="mt-8 text-center">
                 <p className="text-xs text-gray-400">
                   * AI生成内容仅供参考，具体医疗建议请遵循医嘱。
                 </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryView;