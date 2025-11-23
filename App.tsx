import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, ChevronRight, Search, X, Camera, Image as ImageIcon, ScanLine, FileText, Sparkles, RefreshCw, UserCircle2, Activity } from 'lucide-react';
import { CATEGORIES, MOCK_RECORDS, SUMMARY_NAV_ITEM } from './constants';
import { MedicalRecord, RecordType, ViewState, UserInfo } from './types';
import RecordCard from './components/RecordCard';
import SummaryView from './components/SummaryView';
import { identifyMedicationFromImage, analyzeImageContent } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [viewState, setViewState] = useState<ViewState>('LOGIN'); // Start at LOGIN
  const [selectedCategory, setSelectedCategory] = useState<RecordType | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>(MOCK_RECORDS);
  
  // User Info State
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    gender: 'male',
    age: ''
  });

  // Medication Specific View State
  const [medicationTab, setMedicationTab] = useState<'current' | 'past'>('current');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Record Form State
  const [newRecordTitle, setNewRecordTitle] = useState('');
  const [newRecordDesc, setNewRecordDesc] = useState('');
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRecordType, setNewRecordType] = useState<RecordType>(RecordType.ADMISSION);
  const [newRecordImage, setNewRecordImage] = useState<string | null>(null);
  const [newRecordStatus, setNewRecordStatus] = useState<'current' | 'past'>('current'); // For medication

  // AI Processing State
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isAnalyzingDetail, setIsAnalyzingDetail] = useState(false);
  const [highlightAnalysis, setHighlightAnalysis] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Filtering
  const filteredRecords = useMemo(() => {
    if (!selectedCategory) return [];
    let filtered = records.filter(r => r.type === selectedCategory);
    
    // Special filter for Medication tabs
    if (selectedCategory === RecordType.MEDICATION) {
      filtered = filtered.filter(r => (r.status || 'past') === medicationTab);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedCategory, medicationTab]);

  // Handlers
  const handleLogin = () => {
    if (userInfo.name.trim()) {
      setViewState('HOME');
    }
  };

  const handleCategoryClick = (type: RecordType) => {
    setSelectedCategory(type);
    // Default to current if opening medication
    if (type === RecordType.MEDICATION) {
      setMedicationTab('current');
    }
    setViewState('CATEGORY_LIST');
  };

  const handleSummaryClick = () => {
    setViewState('SUMMARY');
  };

  const handleRecordClick = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setViewState('RECORD_DETAIL');
  };

  const handleBack = () => {
    if (viewState === 'RECORD_DETAIL') {
      setViewState('CATEGORY_LIST');
      setSelectedRecord(null);
    } else if (viewState === 'CATEGORY_LIST' || viewState === 'SUMMARY') {
      setViewState('HOME');
      setSelectedCategory(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const reader = new FileReader();
       reader.onloadend = () => {
         setNewRecordImage(reader.result as string);
       };
       reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- AI Identification (Add Flow) ---
  const handleIdentifyMedication = async () => {
    if (!newRecordImage) return;
    
    setIsIdentifying(true);
    try {
      const result = await identifyMedicationFromImage(newRecordImage);
      setNewRecordTitle(result.name);
      setNewRecordDesc(result.description);
    } catch (e) {
      alert("识别失败，请重试或手动输入。");
    } finally {
      setIsIdentifying(false);
    }
  };

  // --- AI Analysis (Detail Flow) ---
  const handleDetailAnalyze = async () => {
    if (!selectedRecord) return;

    if (!selectedRecord.imageUrl) {
      alert("该记录没有图片可供分析");
      return;
    }
    
    setIsAnalyzingDetail(true);
    try {
      const refinedDescription = await analyzeImageContent(selectedRecord.imageUrl, selectedRecord.type);
      
      // Update record in state
      const updatedRecord = { ...selectedRecord, description: refinedDescription };
      
      setRecords(prevRecords => 
        prevRecords.map(r => r.id === selectedRecord.id ? updatedRecord : r)
      );
      
      // Update selected record to reflect changes immediately
      setSelectedRecord(updatedRecord);
      
      // Trigger Highlight & Scroll
      setHighlightAnalysis(true);
      setTimeout(() => {
        if (descriptionRef.current) {
          descriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      // Remove highlight after animation
      setTimeout(() => {
        setHighlightAnalysis(false);
      }, 2500);

    } catch (e) {
      console.error(e);
      alert("分析失败，请稍后重试。");
    } finally {
      setIsAnalyzingDetail(false);
    }
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
    } catch (err) {
      console.error("Camera access error:", err);
      alert("无法访问摄像头，请确保您已授予相机权限。");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setNewRecordImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleQuickScan = () => {
    setNewRecordType(RecordType.MEDICATION);
    setNewRecordStatus('current');
    setIsAddModalOpen(true);
    // Open camera slightly after modal to ensure correct layering
    setTimeout(() => startCamera(), 100);
  };

  // Bind stream to video element when ready
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const handleAddRecord = () => {
    const newRecord: MedicalRecord = {
      id: Date.now().toString(),
      type: newRecordType,
      title: newRecordTitle || '未命名记录',
      description: newRecordDesc,
      date: newRecordDate,
      imageUrl: newRecordImage || undefined,
      status: newRecordType === RecordType.MEDICATION ? newRecordStatus : undefined,
    };
    setRecords([newRecord, ...records]);
    setIsAddModalOpen(false);
    // Reset form
    setNewRecordTitle('');
    setNewRecordDesc('');
    setNewRecordImage(null);
    setNewRecordStatus('current');
  };

  // --- RENDER HELPERS ---

  const renderLogin = () => (
    <div className="h-screen bg-white flex flex-col items-center justify-center p-8 animate-fade-in relative overflow-hidden">
       {/* Decor background */}
       <div className="absolute top-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
       <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-purple-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

       <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-10">
             <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl mx-auto flex items-center justify-center mb-6">
               <Activity size={48} className="text-white" />
             </div>
             <h1 className="text-3xl font-bold text-gray-900 tracking-tight">HealthKeep</h1>
             <p className="text-gray-500 mt-2">您的智能健康管家</p>
          </div>

          <div className="space-y-6">
             <div className="space-y-2">
               <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">姓名</label>
               <input 
                 type="text" 
                 value={userInfo.name}
                 onChange={e => setUserInfo({...userInfo, name: e.target.value})}
                 placeholder="请输入您的称呼"
                 className="w-full h-14 px-4 rounded-2xl bg-gray-50 border border-gray-100 text-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
               />
             </div>

             <div className="space-y-2">
               <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">性别</label>
               <div className="bg-gray-100 p-1 rounded-xl flex h-12 relative">
                 {/* Sliding background for segment control - simplistic implementation via class toggle */}
                 <button 
                   onClick={() => setUserInfo({...userInfo, gender: 'male'})}
                   className={`flex-1 rounded-lg text-sm font-semibold transition-all z-10 ${userInfo.gender === 'male' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                 >
                   男士
                 </button>
                 <button 
                   onClick={() => setUserInfo({...userInfo, gender: 'female'})}
                   className={`flex-1 rounded-lg text-sm font-semibold transition-all z-10 ${userInfo.gender === 'female' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                 >
                   女士
                 </button>
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">年龄</label>
               <input 
                 type="number" 
                 value={userInfo.age}
                 onChange={e => setUserInfo({...userInfo, age: e.target.value})}
                 placeholder="25"
                 className="w-full h-14 px-4 rounded-2xl bg-gray-50 border border-gray-100 text-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
               />
             </div>

             <button 
               onClick={handleLogin}
               disabled={!userInfo.name}
               className="w-full h-14 bg-ios-blue text-white rounded-2xl font-semibold text-lg shadow-lg shadow-blue-200 mt-8 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               进入应用
             </button>
          </div>
       </div>
    </div>
  );

  const renderHome = () => (
    <div className="p-6 space-y-8 animate-fade-in">
      <header className="flex justify-between items-end mb-4">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">
            {new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好'},
          </p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{userInfo.name}</h1>
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
           {userInfo.gender === 'male' ? (
              <UserCircle2 className="w-full h-full text-blue-300 p-1" strokeWidth={1.5} />
           ) : (
              <UserCircle2 className="w-full h-full text-pink-300 p-1" strokeWidth={1.5} />
           )}
        </div>
      </header>

      {/* Grid Categories */}
      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => (
          <div 
            key={cat.id}
            onClick={() => cat.type && handleCategoryClick(cat.type)}
            className="group relative bg-white rounded-3xl p-5 shadow-ios-card active:scale-95 transition-all duration-300 hover:shadow-md cursor-pointer aspect-square flex flex-col justify-between overflow-hidden"
          >
            <div className={`w-12 h-12 rounded-2xl ${cat.color} bg-opacity-10 flex items-center justify-center text-white mb-4 transition-transform group-hover:scale-110 duration-300`}>
              <div className={`p-2.5 rounded-xl ${cat.color} shadow-sm`}>
                 <cat.icon size={24} color="white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{cat.label}</h3>
              <p className="text-xs text-gray-400 mt-1">
                {records.filter(r => r.type === cat.type).length} 条记录
              </p>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
              <ChevronRight size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div 
        onClick={handleSummaryClick}
        className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
            <SUMMARY_NAV_ITEM.icon size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{SUMMARY_NAV_ITEM.label}</h3>
            <p className="text-indigo-100 text-sm opacity-90">一键生成完整病历报告</p>
          </div>
          <ChevronRight className="ml-auto opacity-70" />
        </div>
      </div>
    </div>
  );

  const renderMedicationView = () => {
     // Render Content based on Tab
     const content = medicationTab === 'current' ? (
        <div className="grid grid-cols-2 gap-4 pb-20">
           {/* Quick Scan Card */}
           <div 
             onClick={handleQuickScan}
             className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl overflow-hidden shadow-ios-card active:scale-95 transition-transform group cursor-pointer flex flex-col items-center justify-center text-white p-4 relative border-2 border-transparent hover:border-white/20"
           >
              <div className="absolute top-0 right-0 p-3 opacity-20">
                 <ScanLine size={64} />
              </div>
              <div className="bg-white/20 p-3.5 rounded-full mb-3 backdrop-blur-md shadow-inner">
                 <Camera size={26} className="text-white" />
              </div>
              <h3 className="font-semibold text-base">拍照识别</h3>
              <p className="text-[11px] text-blue-100 mt-1 text-center font-medium opacity-90">AI 自动提取药物信息</p>
           </div>

           {filteredRecords.map(record => (
             <div 
               key={record.id} 
               onClick={() => handleRecordClick(record)}
               className="bg-white rounded-2xl overflow-hidden shadow-ios-card active:scale-95 transition-transform group cursor-pointer border border-transparent hover:border-ios-blue/10 flex flex-col"
             >
               {/* Image Section */}
               <div className="aspect-square w-full bg-gray-100 relative">
                 {record.imageUrl ? (
                   <img src={record.imageUrl} alt={record.title} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-300">
                     <ImageIcon size={32} />
                   </div>
                 )}
               </div>
               
               {/* Content Section */}
               <div className="p-3 flex flex-col flex-1 justify-between">
                 <div>
                    <h3 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2 mb-1">
                      {record.title}
                    </h3>
                 </div>
                 <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-medium text-ios-blue bg-blue-50 px-2 py-0.5 rounded-full">
                       说明书
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                 </div>
               </div>
             </div>
           ))}
        </div>
     ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 pb-20">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                 <tr>
                   <th className="px-4 py-3 whitespace-nowrap">日期</th>
                   <th className="px-4 py-3">药物名称</th>
                   <th className="px-4 py-3">备注</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {filteredRecords.map(record => (
                   <tr key={record.id} onClick={() => handleRecordClick(record)} className="active:bg-gray-50 transition-colors cursor-pointer">
                     <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{record.date}</td>
                     <td className="px-4 py-3 font-medium text-gray-900">{record.title}</td>
                     <td className="px-4 py-3 text-gray-500 max-w-[100px] truncate">{record.description}</td>
                   </tr>
                 ))}
                 {filteredRecords.length === 0 && (
                   <tr>
                     <td colSpan={3} className="px-4 py-8 text-center text-gray-400">暂无既往用药记录</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
     );

     return (
       <>
         {/* Segmented Control */}
         <div className="px-4 mb-4">
            <div className="bg-gray-200/80 p-1 rounded-xl flex font-medium text-sm">
              <button 
                onClick={() => setMedicationTab('current')}
                className={`flex-1 py-1.5 rounded-lg transition-all shadow-sm ${medicationTab === 'current' ? 'bg-white text-gray-900' : 'bg-transparent text-gray-500 shadow-none'}`}
              >
                目前用药
              </button>
              <button 
                onClick={() => setMedicationTab('past')}
                className={`flex-1 py-1.5 rounded-lg transition-all shadow-sm ${medicationTab === 'past' ? 'bg-white text-gray-900' : 'bg-transparent text-gray-500 shadow-none'}`}
              >
                既往用药
              </button>
            </div>
         </div>
         <div className="px-4 flex-1 overflow-y-auto no-scrollbar">
           {content}
         </div>
       </>
     );
  };

  const renderCategoryList = () => {
    const categoryInfo = CATEGORIES.find(c => c.type === selectedCategory);
    
    return (
      <div className="flex flex-col h-full bg-ios-bg animate-slide-in-right">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-ios-separator/50 px-4 py-3 flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center text-ios-blue text-base font-medium active:opacity-50 transition-opacity">
            <span className="mr-1 text-2xl">‹</span> 返回
          </button>
          <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">
             {categoryInfo?.label}
          </h1>
          <div className="flex items-center gap-3">
             {selectedCategory === RecordType.MEDICATION && (
               <button onClick={handleQuickScan} className="text-ios-blue active:opacity-50 transition-opacity" title="拍照识别">
                 <ScanLine size={22} />
               </button>
             )}
             <button onClick={() => { setNewRecordType(selectedCategory!); setIsAddModalOpen(true); }} className="text-ios-blue active:opacity-50 transition-opacity">
               <Plus size={26} />
             </button>
          </div>
        </header>

        {selectedCategory === RecordType.MEDICATION ? (
          <div className="flex flex-col flex-1 mt-4">
            {renderMedicationView()}
          </div>
        ) : (
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
            <div className="space-y-4 pb-20">
              {filteredRecords.length > 0 ? (
                filteredRecords.map(record => (
                  <RecordCard key={record.id} record={record} onClick={handleRecordClick} />
                ))
              ) : (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <div className="bg-gray-200 p-4 rounded-full mb-4">
                      <Search size={32} className="opacity-50" />
                    </div>
                    <p>暂无记录</p>
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedRecord) return null;
    const cat = CATEGORIES.find(c => c.type === selectedRecord.type);
    const isMed = selectedRecord.type === RecordType.MEDICATION;

    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
        <header className="bg-white/90 backdrop-blur-sm px-4 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setViewState('CATEGORY_LIST')} className="p-2 rounded-full hover:bg-gray-100 -ml-2">
             <span className="text-ios-blue font-medium text-lg">关闭</span>
          </button>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${cat?.color || 'bg-gray-500'}`}>
            {isMed ? '药品说明书' : cat?.label}
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-0">
          {selectedRecord.imageUrl && (
            <div className="w-full h-80 bg-gray-100 relative group">
              <img 
                src={selectedRecord.imageUrl} 
                alt="Document" 
                className="w-full h-full object-contain bg-black/5 backdrop-blur-sm" 
              />
              {/* Floating Action Button for AI Analyze */}
              <div className="absolute bottom-4 right-4">
                 <button 
                   onClick={handleDetailAnalyze}
                   disabled={isAnalyzingDetail}
                   className="flex items-center gap-2 bg-white/90 backdrop-blur-md text-gray-800 px-4 py-2.5 rounded-full shadow-lg border border-white/50 hover:bg-white active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                   {isAnalyzingDetail ? (
                     <>
                        <RefreshCw size={16} className="animate-spin text-purple-600" />
                        <span className="text-xs font-semibold">分析中...</span>
                     </>
                   ) : (
                     <>
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-xs font-semibold">AI 智能提取</span>
                     </>
                   )}
                 </button>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">{selectedRecord.date}</p>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{selectedRecord.title}</h1>
              {isMed && selectedRecord.status === 'current' && (
                 <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">正在服用</span>
              )}
              {isMed && selectedRecord.status === 'past' && (
                 <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">既往用药</span>
              )}
            </div>

            <div 
              ref={descriptionRef}
              className={`bg-gray-50 rounded-2xl p-5 border transition-all duration-700 relative overflow-hidden ${
                highlightAnalysis 
                  ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-purple-50/40' 
                  : 'border-gray-100'
              }`}
            >
               {isAnalyzingDetail && (
                 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 flex-col gap-3">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-purple-600 animate-pulse">正在提取图片关键信息...</p>
                 </div>
               )}
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    {isMed ? '用法 / 说明' : '详细内容'}
                 </h3>
                 <div className="flex items-center gap-2">
                   {/* Duplicate Analyze button for accessibility and triggering empty image alert */}
                   <button 
                     onClick={handleDetailAnalyze}
                     className="p-1.5 rounded-full text-purple-600 hover:bg-purple-100 transition-colors"
                     title="AI 智能分析"
                   >
                      <Sparkles size={16} />
                   </button>
                   {selectedRecord.description.includes('【') && (
                      <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded border border-purple-200">
                        AI 已提取
                      </span>
                   )}
                 </div>
               </div>
               <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                 {selectedRecord.description}
               </p>
            </div>
            
            {!isMed && (
              <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3">
                 <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                   <Camera size={16} />
                 </div>
                 <div>
                    <p className="text-xs text-blue-800 font-semibold">原始资料</p>
                    <p className="text-xs text-blue-600 mt-0.5">该记录包含 {selectedRecord.imageUrl ? '1' : '0'} 张附件图片</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCamera = () => (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-fade-in">
        <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20 m-8 rounded-lg"></div>
            <p className="absolute bottom-8 text-white/70 text-sm font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                将药品包装盒放入框内拍摄
            </p>
        </div>
        <div className="h-32 bg-black flex items-center justify-between px-10 pb-6 safe-area-bottom">
            <button 
                onClick={stopCamera} 
                className="text-white text-base font-medium active:opacity-60 transition-opacity w-20 text-left"
            >
                取消
            </button>
            <button 
                onClick={capturePhoto}
                className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 active:scale-95 transition-transform shadow-lg"
            >
            </button>
            <div className="w-20"></div> {/* Spacer for layout balance */}
        </div>
    </div>
  );

  const renderAddModal = () => (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity pointer-events-auto"
        onClick={() => setIsAddModalOpen(false)}
      ></div>

      {/* Modal Content */}
      <div className="bg-white w-full sm:w-[500px] sm:rounded-3xl rounded-t-3xl p-6 shadow-ios-float transform transition-transform animate-slide-up pointer-events-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">添加新记录</h2>
          <button onClick={() => setIsAddModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="space-y-5">
           {/* Type Selection */}
           <div className="grid grid-cols-2 gap-3">
             {CATEGORIES.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => setNewRecordType(cat.type!)}
                 className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${newRecordType === cat.type 
                   ? 'border-ios-blue bg-blue-50 text-ios-blue ring-1 ring-ios-blue' 
                   : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
               >
                 <cat.icon size={18} />
                 <span className="text-sm font-medium">{cat.label}</span>
               </button>
             ))}
           </div>

           {/* Specific Medication Input: Status */}
           {newRecordType === RecordType.MEDICATION && (
             <div className="bg-gray-50 p-1 rounded-xl flex">
                <button 
                  onClick={() => setNewRecordStatus('current')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newRecordStatus === 'current' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  目前用药
                </button>
                <button 
                  onClick={() => setNewRecordStatus('past')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newRecordStatus === 'past' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  既往用药
                </button>
             </div>
           )}

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
             <input 
               type="text" 
               className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-ios-blue focus:outline-none transition-all"
               placeholder="例如：血常规检查、感冒药"
               value={newRecordTitle}
               onChange={e => setNewRecordTitle(e.target.value)}
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
             <input 
               type="date" 
               className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-ios-blue focus:outline-none"
               value={newRecordDate}
               onChange={e => setNewRecordDate(e.target.value)}
             />
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">附件图片</label>
              
              {newRecordImage ? (
                 <div className="space-y-3">
                   <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 relative bg-gray-100 group">
                     <img src={newRecordImage} alt="Preview" className="w-full h-full object-contain" />
                     <button 
                       onClick={() => setNewRecordImage(null)}
                       className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
                     >
                       <X size={16} />
                     </button>
                   </div>

                   {/* AI Button for Medication */}
                   {newRecordType === RecordType.MEDICATION && (
                     <button 
                       onClick={handleIdentifyMedication}
                       disabled={isIdentifying}
                       className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-50 text-purple-600 font-medium border border-purple-100 hover:bg-purple-100 transition-colors animate-pulse-soft"
                     >
                       {isIdentifying ? (
                         <>
                           <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                           <span>正在识别药物信息...</span>
                         </>
                       ) : (
                         <>
                           <ScanLine size={18} />
                           <span>AI 识别药物名称及说明</span>
                         </>
                       )}
                     </button>
                   )}
                 </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                   {/* Camera Button */}
                   <button 
                     onClick={startCamera}
                     className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-xl hover:border-ios-blue hover:bg-blue-50 transition-colors gap-2 group bg-gray-50/50"
                   >
                     <div className="bg-blue-100 p-2.5 rounded-full text-blue-600 group-hover:bg-blue-200 group-hover:scale-110 transition-all">
                        <Camera size={24} />
                     </div>
                     <span className="text-sm text-gray-600 font-medium">拍摄照片</span>
                   </button>

                   {/* Gallery Button */}
                   <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors gap-2 group bg-gray-50/50">
                      <div className="bg-purple-100 p-2.5 rounded-full text-purple-600 group-hover:bg-purple-200 group-hover:scale-110 transition-all">
                         <ImageIcon size={24} />
                      </div>
                      <span className="text-sm text-gray-600 font-medium">从相册选择</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                   </label>
                </div>
              )}
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
                {newRecordType === RecordType.MEDICATION ? '药物说明 / 用法' : '详细描述'}
             </label>
             <textarea 
               className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-ios-blue focus:outline-none h-24 resize-none"
               placeholder="输入检查结果数值、医嘱内容等..."
               value={newRecordDesc}
               onChange={e => setNewRecordDesc(e.target.value)}
             />
           </div>

           <button 
             onClick={handleAddRecord}
             disabled={!newRecordTitle}
             className="w-full bg-ios-blue text-white py-4 rounded-2xl font-semibold text-lg hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
           >
             保存记录
           </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ios-bg max-w-lg mx-auto shadow-2xl overflow-hidden relative font-sans text-gray-900">
      {viewState === 'LOGIN' && renderLogin()}
      {viewState === 'HOME' && renderHome()}
      {viewState === 'CATEGORY_LIST' && renderCategoryList()}
      {viewState === 'RECORD_DETAIL' && renderDetail()}
      {viewState === 'SUMMARY' && <SummaryView records={records} onBack={handleBack} />}
      
      {isAddModalOpen && renderAddModal()}
      {isCameraOpen && renderCamera()}

      {/* Floating Action Button (FAB) for Home Screen */}
      {viewState === 'HOME' && (
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="absolute bottom-8 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40 active:bg-gray-800"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};

export default App;