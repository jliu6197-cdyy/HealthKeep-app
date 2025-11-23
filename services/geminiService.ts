import { GoogleGenAI } from "@google/genai";
import { MedicalRecord, RecordType } from "../types";

// Helper to translate enum to Chinese for the prompt
const getTypeLabel = (type: RecordType) => {
  switch (type) {
    case RecordType.ADMISSION: return "出入院记录";
    case RecordType.MEDICATION: return "药物记录";
    case RecordType.BILLING: return "费用清单";
    case RecordType.LAB_RESULT: return "检验结果";
    default: return "其他";
  }
};

export const generateHealthSummary = async (records: MedicalRecord[]): Promise<string> => {
  if (!records || records.length === 0) {
    return "暂无记录可供分析。";
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return "API Key configuration error.";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct a textual representation of all records
  const recordsText = records.map(r => `
    - 日期: ${r.date}
    - 类型: ${getTypeLabel(r.type)}
    - 标题: ${r.title}
    - 详情: ${r.description}
    - 状态: ${r.status === 'current' ? '目前正在进行/服用' : (r.status === 'past' ? '既往/已结束' : '未标注')}
  `).join('\n');

  const prompt = `
    你是一个专业的医疗健康助手。请根据以下患者的医疗记录数据，整理生成一份清晰的健康档案。
    
    用户要求：**不要使用复杂的表格形式**。请以简单明了的列表或卡片形式展示关键信息。
    
    请按照以下结构输出（Markdown格式）：

    # 总体健康概况
    （在此处用一段简练的语言总结患者的病情、主要治疗经过和当前状态。）

    # 详细诊疗时间轴
    请将相关的记录整合为一个个具体的诊疗事件，对于每个事件，请使用 "### YYYY-MM-DD 标题" 作为开头，并严格包含以下字段（若原文未提及，请填“未记录”或“无”）：
    
    ### [日期] [事件标题]
    - **医院**: [医院名称]
    - **重要检查检验结果**: [提取关键指标或诊断结论]
    - **用药方案**: [主要药物及用法]
    - **治疗效果**: [好转/稳定/恶化等]
    - **下次治疗时间**: [如有提及请列出]

    原始数据：
    ${recordsText}
    
    请确保排版整洁，像苹果设计的界面一样简洁易读。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "无法生成摘要。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "生成摘要时发生错误，请稍后重试。";
  }
};

export const identifyMedicationFromImage = async (base64Image: string): Promise<{ name: string, description: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  // Remove data:image/jpeg;base64, prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is good for vision tasks
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        },
        {
          text: "请识别这张图片中的药物。1. 请仔细阅读**药盒上的所有文字**（OCR），准确提取通用名（如“阿莫西林胶囊”）和商品名。2. 提取其功能主治和用法用量。请返回 JSON 格式，包含两个字段：'name' (药物名称) 和 'description' (根据包装文字总结的说明书内容，使用清晰的中文，包含【适应症】【用法用量】【注意事项】等部分)。如果无法识别，name 返回 '未知药物'。"
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { name: "", description: "" };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Medication Identify Error:", error);
    throw error;
  }
};

export const analyzeImageContent = async (base64Image: string, type: RecordType): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.split(',')[1] || base64Image;

  let promptText = "";
  switch (type) {
    case RecordType.MEDICATION:
      promptText = "请分析这张药物图片。请提取以下信息并整理成精炼的文本：1. 药物名称。 2. 主要功效/适应症。 3. 用法用量。 4. 关键注意事项。请直接输出整理好的文本内容，不要输出 JSON。";
      break;
    case RecordType.LAB_RESULT:
      promptText = "请分析这张化验单/检查报告图片。1. 识别报告名称和日期。 2. **重点提取异常指标**（有箭头或标红的项），列出项目名、数值及参考范围。 3. 提取诊断意见或结论。请以“【检查结果分析】”开头，整理成易读的文本。";
      break;
    case RecordType.BILLING:
      promptText = "请分析这张医疗费用清单/发票。请提取：1. 总金额。 2. 医保支付金额（如有）。 3. 主要的费用大类（如药费、检查费等）。请简明扼要地总结费用情况。";
      break;
    case RecordType.ADMISSION:
      promptText = "请分析这张出入院记录/病历图片。请提取：1. 入院/就诊诊断。 2. 主要治疗经过。 3. 出院医嘱或建议。请整理成结构清晰的病历摘要。";
      break;
    default:
      promptText = "请分析这张医疗图片，提取其中的关键文字信息，并整理成一段简洁的描述。";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        },
        { text: promptText }
      ]
    });

    return response.text || "无法识别图片内容。";
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw error;
  }
};