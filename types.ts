
export enum Step {
  TCLE = 0,
  PROFILE = 1,
  SYSTEMS = 2,
  EVALUATION = 3,
  PROD_INDICATORS = 4,
  BARRIERS = 5,
  SUMMARY = 6,
  SUCCESS = 7
}

export interface ProfileData {
  nomeGestor: string;
  idade: string;
  sexo: string;
  formacao: string;
  cargoEfetivo: string;
  dataAdmissao: string;
  cargoGsap: string;
  tempoGestaoGsap: string;
  regiaoGsap: string;
  quantidadeUbs: string;
  internetAcesso: string;
  computadoresQtd: string;
  computadoresSuficiencia: string;
}

export interface SystemEvaluation {
  freq?: number;
  confianca?: number;
}

export interface SurveyState {
  step: Step;
  tcle: boolean;
  profile: ProfileData;
  selectedSystems: string[];
  evaluations: Record<string, SystemEvaluation>;
  produtividade: Record<string, number>;
  produtividadeOutroNome?: string;
  barreiras: Record<string, number>;
  sugestoes: string;
}
