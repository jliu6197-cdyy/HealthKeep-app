import React from 'react';

export enum RecordType {
  ADMISSION = 'ADMISSION', // 出入院记录
  MEDICATION = 'MEDICATION', // 药物使用记录
  BILLING = 'BILLING', // 费用清单
  LAB_RESULT = 'LAB_RESULT', // 检查检验结果
}

export interface UserInfo {
  name: string;
  gender: 'male' | 'female';
  age: string;
}

export interface MedicalRecord {
  id: string;
  type: RecordType;
  title: string;
  date: string;
  description: string; // Used for description or Drug Instructions
  imageUrl?: string; // URL for the image
  tags?: string[];
  status?: 'current' | 'past'; // Specific for Medication: currently taking or past history
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  type?: RecordType; // If undefined, it's a special view (like Summary)
  color: string;
}

export type ViewState = 'LOGIN' | 'HOME' | 'CATEGORY_LIST' | 'RECORD_DETAIL' | 'SUMMARY';