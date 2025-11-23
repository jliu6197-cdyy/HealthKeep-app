import { FileText, Pill, CreditCard, Activity, Sparkles } from 'lucide-react';
import { NavItem, RecordType, MedicalRecord } from './types';

export const CATEGORIES: NavItem[] = [
  {
    id: 'admission',
    label: '出入院记录',
    icon: FileText,
    type: RecordType.ADMISSION,
    color: 'bg-blue-500',
  },
  {
    id: 'medication',
    label: '药物记录',
    icon: Pill,
    type: RecordType.MEDICATION,
    color: 'bg-green-500',
  },
  {
    id: 'billing',
    label: '费用清单',
    icon: CreditCard,
    type: RecordType.BILLING,
    color: 'bg-orange-500',
  },
  {
    id: 'lab',
    label: '检验结果',
    icon: Activity,
    type: RecordType.LAB_RESULT,
    color: 'bg-red-500',
  },
];

export const SUMMARY_NAV_ITEM: NavItem = {
  id: 'summary',
  label: '智能汇总',
  icon: Sparkles,
  color: 'bg-purple-600',
};

export const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: '1',
    type: RecordType.ADMISSION,
    title: '市中心医院 - 入院记录',
    date: '2023-10-15',
    description: '因急性肠胃炎入院，主诉腹痛伴呕吐。',
    imageUrl: 'https://picsum.photos/400/600?random=1',
  },
  {
    id: '2',
    type: RecordType.ADMISSION,
    title: '市中心医院 - 出院小结',
    date: '2023-10-20',
    description: '经抗感染、补液治疗后好转，予以出院。医嘱：清淡饮食。',
    imageUrl: 'https://picsum.photos/400/600?random=2',
  },
  {
    id: '3',
    type: RecordType.MEDICATION,
    title: '奥美拉唑肠溶胶囊',
    date: '2023-10-20',
    status: 'current',
    description: '【适应症】\n用于胃溃疡、十二指肠溃疡、应激性溃疡、反流性食管炎和卓-艾氏综合征（胃泌素瘤）。\n\n【用法用量】\n口服，不可咀嚼。主要是早晨空腹服用。\n\n【不良反应】\n偶见头痛、腹泻、恶心、皮疹等。',
    imageUrl: 'https://picsum.photos/400/400?random=3',
  },
  {
    id: '4',
    type: RecordType.MEDICATION,
    title: '头孢克肟分散片',
    date: '2023-10-15',
    status: 'past',
    description: '每日两次，每次一片。抗生素治疗。',
    imageUrl: 'https://picsum.photos/400/400?random=4',
  },
  {
    id: '7',
    type: RecordType.MEDICATION,
    title: '布洛芬缓释胶囊',
    date: '2023-09-01',
    status: 'past',
    description: '用于缓解轻至中度疼痛如头痛、关节痛、偏头痛、牙痛、肌肉痛、神经痛、痛经。也用于普通感冒或流行性感冒引起的发热。',
    imageUrl: 'https://picsum.photos/400/400?random=7',
  },
  {
    id: '8',
    type: RecordType.MEDICATION,
    title: '维生素C泡腾片',
    date: '2023-11-01',
    status: 'current',
    description: '【功能主治】\n增强机体抵抗力，用于预防和治疗各种急、慢性传染性疾病或其他疾病。\n\n【用法用量】\n将泡腾片放入一杯水中，溶解后饮用。',
    imageUrl: 'https://picsum.photos/400/400?random=8',
  },
  {
    id: '5',
    type: RecordType.BILLING,
    title: '住院费用总清单',
    date: '2023-10-20',
    description: '总计费用：3500.50元。其中医保支付2800元，自费700.50元。',
    imageUrl: 'https://picsum.photos/400/600?random=5',
  },
  {
    id: '6',
    type: RecordType.LAB_RESULT,
    title: '血常规检验报告',
    date: '2023-10-15',
    description: '白细胞计数(WBC) 12.5 (偏高)，中性粒细胞百分比 85% (偏高)。提示细菌感染。',
    imageUrl: 'https://picsum.photos/400/600?random=6',
  },
];