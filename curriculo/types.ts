// mysaelsantos/velcurriculo/velcurriculo-e23dad75da69d9628af1265847d431a6b3da0e11/curriculo/types.ts

export interface PersonalInfo {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  age: string;
  maritalStatus: string;
  cnh: string;
  linkedin?: string;
  profilePicture: string;
}

export interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  startDate: string;
  endDate: string;
}

export interface Course {
  id: string;
  name: string;
  institution: string;
  completionDate: string;
}

export interface Language {
  id: string;
  language: string;
  proficiency: 'Básico' | 'Intermediário' | 'Avançado' | 'Fluente' | '';
}

export interface Style {
  template: 'template-modern' | 'template-classic' | 'template-minimalist';
  color: string;
  showQRCode: boolean;
  showLinkedinQr?: boolean;
}

// NOVO: Definição do espaçador para o QR Code
export interface QrSpacer {
  height: number;
  width: number;
  marginTop: number; // Distância do topo do bloco de texto até onde o QR code começa
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experiences: Experience[];
  education: Education[];
  courses: Course[];
  languages: Language[];
  skills: string[];
  style: Style;
}
