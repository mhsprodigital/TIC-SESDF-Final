import React, { useState } from 'react';
import { 
  ShieldCheck, User, Monitor, Activity, 
  AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Save, 
  Wifi, BarChart3, LayoutGrid, FileText
} from 'lucide-react';
import { Step, SurveyState, ProfileData } from './types';
import { 
  SISTEMAS_SES, 
  FERRAMENTAS_PROD, 
  BARREIRAS_LIST, 
  REGIOES_SAUDE, 
  SEXO_OPCOES,
  FORMACOES,
  CARGOS_EFETIVOS,
  CARGOS_GSAP,
  UBS_VINCULADAS,
  INTERNET_OPCOES,
  PC_OPCOES,
  PC_SUFICIENCIA_OPCOES
} from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<SurveyState>({
    step: Step.TCLE,
    tcle: false,
    profile: {
      nomeGestor: '',
      idade: '',
      sexo: '',
      formacao: '',
      cargoEfetivo: '',
      dataAdmissao: '',
      cargoGsap: '',
      tempoGestaoGsap: '',
      regiaoGsap: '',
      quantidadeUbs: '',
      internetAcesso: '',
      computadoresQtd: '',
      computadoresSuficiencia: ''
    },
    selectedSystems: [],
    evaluations: {},
    produtividade: {},
    barreiras: {},
    sugestoes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const next = () => { window.scrollTo(0,0); setState(s => ({ ...s, step: s.step + 1 })); };
  const back = () => { window.scrollTo(0,0); setState(s => ({ ...s, step: s.step - 1 })); };

  const updateProfile = (field: keyof ProfileData, value: string) => {
    setState(s => ({ ...s, profile: { ...s.profile, [field]: value } }));
  };

  const toggleSystem = (sys: string) => {
    setState(s => {
      const selected = s.selectedSystems.includes(sys)
        ? s.selectedSystems.filter(x => x !== sys)
        : [...s.selectedSystems, sys];
      return { ...s, selectedSystems: selected };
    });
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // Formatar os dados de forma linear (uma coluna por campo)
      const flatData: Record<string, any> = {
        "Data e Hora": new Date().toLocaleString('pt-BR'),
        "Nome": state.profile.nomeGestor,
        "Idade": state.profile.idade,
        "Sexo": state.profile.sexo,
        "Formação": state.profile.formacao,
        "Cargo Efetivo": state.profile.cargoEfetivo,
        "Data de Admissão": state.profile.dataAdmissao,
        "Cargo GSAP": state.profile.cargoGsap,
        "Tempo de Gestão": state.profile.tempoGestaoGsap,
        "Região de Saúde": state.profile.regiaoGsap,
        "Quantidade de UBS": state.profile.quantidadeUbs,
        "Acesso à Internet": state.profile.internetAcesso,
        "Quantidade de Computadores": state.profile.computadoresQtd,
        "Suficiência de Computadores": state.profile.computadoresSuficiencia,
      };

      // Sistemas
      SISTEMAS_SES.forEach(sys => {
        if (state.selectedSystems.includes(sys)) {
          flatData[`Sistema: ${sys} (Frequência)`] = state.evaluations[sys]?.freq || '';
          flatData[`Sistema: ${sys} (Confiança)`] = state.evaluations[sys]?.confianca || '';
        } else {
          flatData[`Sistema: ${sys} (Frequência)`] = 'Não utiliza';
          flatData[`Sistema: ${sys} (Confiança)`] = 'Não utiliza';
        }
      });

      // Produtividade
      FERRAMENTAS_PROD.forEach(tool => {
        flatData[`Produtividade: ${tool}`] = state.produtividade[tool] || '';
      });
      flatData['Produtividade: Outros (Especificado)'] = state.produtividadeOutroNome || '';

      // Barreiras
      BARREIRAS_LIST.forEach(barreira => {
        flatData[`Barreira: ${barreira}`] = state.barreiras[barreira] || '';
      });

      flatData['Sugestões'] = state.sugestoes;

      // Enviar para o Google Sheets via Apps Script
      let scriptUrl = (import.meta as any).env.VITE_GOOGLE_SCRIPT_URL;
      
      // Fallback robusto caso a variável de ambiente não esteja configurada ou esteja vazia no Netlify
      if (!scriptUrl || scriptUrl === 'undefined' || scriptUrl.trim() === '') {
        scriptUrl = "https://script.google.com/macros/s/AKfycbyJZCvRKcIMS43viQOBGJH64AOv-NTcwM706_2Hj2c/exec";
      }
      
      // Limpar aspas acidentais que podem ocorrer ao colar no Netlify
      scriptUrl = scriptUrl.replace(/^["']|["']$/g, '').trim();

      // CORREÇÃO CRÍTICA: URLs terminadas em /dev NÃO funcionam no Netlify (bloqueio de cookies de terceiros).
      // O Google Apps Script exige que chamadas externas usem a URL de implantação /exec.
      if (scriptUrl.endsWith('/dev')) {
        scriptUrl = scriptUrl.replace(/\/dev$/, '/exec');
      }

      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          // Mudando para 'cors' ou omitindo para que o navegador lide com a requisição normalmente
          // O Google Apps Script com "Qualquer pessoa" permite requisições cross-origin
          headers: {
            'Content-Type': 'text/plain;charset=utf-8', // text/plain evita o preflight OPTIONS em muitos casos
          },
          body: JSON.stringify(flatData)
        });
        
        // Se a requisição não falhou na rede, consideramos sucesso
        next();
      } catch (fetchErr) {
        console.error("Erro no fetch:", fetchErr);
        // Em caso de erro de CORS, o fetch lança uma exceção.
        // Como o Google Apps Script as vezes retorna um redirecionamento opaco que o fetch bloqueia,
        // vamos tentar um método alternativo (form submission invisível) se o fetch falhar.
        
        try {
          console.log("Tentando método alternativo de envio (form)...");
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = scriptUrl;
          form.target = 'hidden_iframe';
          
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'data'; // O Apps Script precisa ser ajustado para ler e.parameter.data
          input.value = JSON.stringify(flatData);
          form.appendChild(input);
          
          const iframe = document.createElement('iframe');
          iframe.name = 'hidden_iframe';
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          document.body.appendChild(form);
          
          form.submit();
          
          // Limpeza após alguns segundos
          setTimeout(() => {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          }, 5000);
          
          next();
        } catch (fallbackErr) {
          console.error("Erro no fallback:", fallbackErr);
          throw new Error("Falha na requisição de rede.");
        }
      }
    } catch (err) {
      console.error("Erro ao finalizar:", err);
      alert("Houve um erro ao salvar seus dados. Verifique as permissões do Google Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProfileValid = () => {
    const p = state.profile;
    return p.nomeGestor && p.idade && p.sexo && p.formacao && p.cargoEfetivo && p.dataAdmissao && 
           p.cargoGsap && p.tempoGestaoGsap && p.regiaoGsap && p.quantidadeUbs && 
           p.internetAcesso && p.computadoresQtd && p.computadoresSuficiencia;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-10 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight mb-4">
              Gestão da Informação na Atenção Primária à Saúde: Uso de Sistemas e Ferramentas Digitais pelos Gestores do Distrito Federal
            </h1>
            <div className="space-y-1">
              <p className="text-blue-100 text-[11px] font-bold uppercase tracking-widest opacity-80">
                Pesquisadores: Letícia Dinegri, Marco Antônio Ferreira Almeida, Matheus Henrique de Sousa, Yonara Cerqueira Ferreira
              </p>
              <p className="text-blue-100 text-[11px] font-bold uppercase tracking-widest opacity-80">
                Instituição: Fundação de Ensino e Pesquisa em Ciências da Saúde (FEPECS)
              </p>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/20">
            <div 
              className="h-full bg-yellow-400 transition-all duration-700 ease-out" 
              style={{ width: `${(state.step / 7) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="p-8 md:p-14">
          
          {state.step === Step.TCLE && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-4 text-blue-600">
                <ShieldCheck size={32} strokeWidth={2.5} />
                <h2 className="text-2xl font-black">Termo de Consentimento Livre e Esclarecido (TCLE)</h2>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 text-slate-600 leading-relaxed text-sm md:text-base space-y-6 shadow-inner custom-scrollbar overflow-y-auto max-h-[400px]">
                <p>Você está convidado(a) a participar da pesquisa intitulada <strong>"Gestão da Informação na Atenção Primária à Saúde: Uso de Sistemas e Ferramentas Digitais pelos Gestores do Distrito Federal"</strong>, conduzida por pesquisadores da FEPECS.</p>
                <p><strong>Objetivo:</strong> O presente estudo tem como finalidade realizar um diagnóstico detalhado do ecossistema tecnológico da SES-DF, identificando gargalos, potencialidades e o nível de integração das ferramentas digitais na rotina da Atenção Primária.</p>
                <p><strong>Segurança e Privacidade:</strong> Garantimos que sua participação é estritamente anônima. Os dados coletados são criptografados de ponta a ponta, assegurando que nenhuma resposta possa ser vinculada à sua identidade ou à sua unidade de saúde específica. As informações serão tratadas de forma agregada para fins de análise estatística e científica.</p>
                <p><strong>Participação:</strong> A sua colaboração é voluntária e você pode interromper o preenchimento a qualquer momento, sem qualquer penalidade. O tempo estimado é de 15 minutos.</p>
                <p>Ao selecionar a option "Li e concordo", você declara estar ciente dos objetivos e da proteção dos seus dados, consentindo com a sua utilização para este diagnóstico.</p>
              </div>
              <label className="flex items-center gap-4 p-6 bg-blue-50/50 rounded-2xl cursor-pointer border-2 border-transparent hover:border-blue-200 transition-all group">
                <input 
                  type="checkbox" 
                  checked={state.tcle} 
                  onChange={e => setState({...state, tcle: e.target.checked})} 
                  className="w-6 h-6 accent-blue-600 rounded" 
                />
                <span className="text-sm font-bold text-blue-900 group-hover:text-blue-700">Li e concordo em participar da pesquisa conforme os termos acima.</span>
              </label>
              <button 
                onClick={next} 
                disabled={!state.tcle} 
                className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex justify-center items-center gap-3"
              >
                Começar agora <ChevronRight size={22} />
              </button>
            </div>
          )}

          {state.step === Step.PROFILE && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex items-center gap-4 text-blue-600">
                <User size={32} strokeWidth={2.5} />
                <h2 className="text-2xl font-black">Bloco 1: Perfil do Gestor e da Unidade</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Nome do Gestor*</label>
                  <p className="text-[10px] text-slate-400 italic mb-1">O nome é um dado protegido e não haverá publicação ou exposição de nomes ou marcadores identificadores de pessoas.</p>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.nomeGestor} onChange={e => updateProfile('nomeGestor', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Idade*</label>
                  <input type="number" className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.idade} onChange={e => updateProfile('idade', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Sexo*</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.sexo} onChange={e => updateProfile('sexo', e.target.value)}>
                    <option value="">Selecione...</option>
                    {SEXO_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Formação*</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.formacao} onChange={e => updateProfile('formacao', e.target.value)}>
                    <option value="">Selecione...</option>
                    {FORMACOES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Cargo Efetivo*</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.cargoEfetivo} onChange={e => updateProfile('cargoEfetivo', e.target.value)}>
                    <option value="">Selecione...</option>
                    {CARGOS_EFETIVOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Data Admissão*</label>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.dataAdmissao} onChange={e => updateProfile('dataAdmissao', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Cargo na GSAP*</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.cargoGsap} onChange={e => updateProfile('cargoGsap', e.target.value)}>
                    <option value="">Selecione...</option>
                    {CARGOS_GSAP.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Tempo na atual GSAP*</label>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.tempoGestaoGsap} onChange={e => updateProfile('tempoGestaoGsap', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Região*</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.regiaoGsap} onChange={e => updateProfile('regiaoGsap', e.target.value)}>
                    <option value="">Selecione...</option>
                    {REGIOES_SAUDE.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">UBS Vinculadas*</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={state.profile.quantidadeUbs} onChange={e => updateProfile('quantidadeUbs', e.target.value)}>
                    <option value="">Selecione...</option>
                    {UBS_VINCULADAS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-8 bg-blue-50/30 rounded-[2rem] space-y-8 border border-blue-100">
                <h4 className="font-bold text-blue-900 flex items-center gap-2"><Wifi size={20}/> Infraestrutura</h4>
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700">Sua unidade tem acesso à internet?*</label>
                  <div className="grid grid-cols-1 gap-2">
                    {INTERNET_OPCOES.map(opt => (
                      <button key={opt} onClick={() => updateProfile('internetAcesso', opt)} className={`text-left p-4 rounded-xl border-2 font-medium transition-all text-sm ${state.profile.internetAcesso === opt ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}> {opt} </button>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Quantos computadores possui a área administrativa da sua unidade?*</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PC_OPCOES.map(v => (
                        <button key={v} onClick={() => updateProfile('computadoresQtd', v)} className={`py-3 rounded-xl font-bold border-2 transition-all text-xs ${state.profile.computadoresQtd === v ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Essa quantidade de PCs está suficiente para exercício da gestão da sua unidade?*</label>
                    <div className="grid grid-cols-1 gap-2">
                      {PC_SUFICIENCIA_OPCOES.map(v => (
                        <button key={v} onClick={() => updateProfile('computadoresSuficiencia', v)} className={`text-left px-4 py-2 rounded-xl font-bold border-2 transition-all text-[11px] ${state.profile.computadoresSuficiencia === v ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={back} className="flex-1 py-5 border-2 border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 flex justify-center items-center gap-2"><ChevronLeft size={20}/> Voltar</button>
                <button onClick={next} disabled={!isProfileValid()} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex justify-center items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400">Prosseguir <ChevronRight size={20}/></button>
              </div>
            </div>
          )}

          {state.step === Step.SYSTEMS && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="flex items-center gap-4 text-blue-600">
                <Monitor size={32} strokeWidth={2.5} />
                <h2 className="text-2xl font-black">Bloco II: Inventário</h2>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Selecione, na lista abaixo, os sistemas do GDF que você utiliza regularmente em sua unidade para desempenhar suas atividades profissionais.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar p-2">
                {SISTEMAS_SES.map(sys => (
                  <button key={sys} onClick={() => toggleSystem(sys)} className={`p-4 text-[10px] md:text-xs font-black rounded-2xl border-2 text-left transition-all leading-tight h-16 flex items-center justify-between ${state.selectedSystems.includes(sys) ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'}`}>
                    <span>{sys}</span>
                    {state.selectedSystems.includes(sys) && <CheckCircle size={14} />}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={back} className="flex-1 py-5 border-2 border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 flex justify-center items-center gap-2"><ChevronLeft size={20}/> Voltar</button>
                <button onClick={next} disabled={state.selectedSystems.length === 0} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex justify-center items-center gap-2">Continuar ({state.selectedSystems.length}) <ChevronRight size={20}/></button>
              </div>
            </div>
          )}

          {state.step === Step.EVALUATION && (
            <div className="space-y-12 animate-in slide-in-from-right duration-500">
              <div className="flex items-center gap-4 text-blue-600">
                <Activity size={32} strokeWidth={2.5} />
                <h2 className="text-2xl font-black">Avaliação</h2>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Para cada sistema, indique a frequência de uso semanal e o nível de confiança nas informações do sistema (escala de 1 a 5).
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <div>
                  <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3">Escala de frequência</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                    <li><strong className="text-blue-700">1</strong> – Nunca</li>
                    <li><strong className="text-blue-700">2</strong> – Raramente</li>
                    <li><strong className="text-blue-700">3</strong> – Às vezes</li>
                    <li><strong className="text-blue-700">4</strong> – Frequentemente</li>
                    <li><strong className="text-blue-700">5</strong> – Todos os dias</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-3">Escala de confiança</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                    <li><strong className="text-indigo-700">1</strong> – Nenhuma confiança</li>
                    <li><strong className="text-indigo-700">2</strong> – Baixa confiança</li>
                    <li><strong className="text-indigo-700">3</strong> – Confiança moderada</li>
                    <li><strong className="text-indigo-700">4</strong> – Alta confiança</li>
                    <li><strong className="text-indigo-700">5</strong> – Confiança total</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-10 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {state.selectedSystems.map(sys => (
                  <div key={sys} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 space-y-8">
                    <h3 className="text-lg font-black text-blue-700 uppercase tracking-wide">{sys}</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Frequência (1-5):</p>
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(v => (
                            <button key={v} onClick={() => setState(s => ({ ...s, evaluations: { ...s.evaluations, [sys]: { ...s.evaluations[sys], freq: v } } }))} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${state.evaluations[sys]?.freq === v ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Confiança (1-5):</p>
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(v => (
                            <button key={v} onClick={() => setState(s => ({ ...s, evaluations: { ...s.evaluations, [sys]: { ...s.evaluations[sys], confianca: v } } }))} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${state.evaluations[sys]?.confianca === v ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700'}`}>{v}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={back} className="flex-1 py-5 border-2 border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 flex justify-center items-center gap-2"><ChevronLeft size={20}/> Voltar</button>
                <button onClick={next} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex justify-center items-center gap-2">Próximo <ChevronRight size={20}/></button>
              </div>
            </div>
          )}

          {state.step === Step.PROD_INDICATORS && (
            <div className="space-y-10 animate-in slide-in-from-right duration-500">
              <div className="flex items-center gap-4 text-blue-600">
                <BarChart3 size={32} strokeWidth={2.5} />
                <h2 className="text-2xl font-black">Produtividade</h2>
              </div>
              
              <p className="text-sm text-slate-600 font-medium">
                Quais ferramentas ou recursos não institucionais você utiliza para apoiar a gestão da sua unidade?
              </p>

              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3">Escala de frequência</h4>
                <ul className="text-xs text-slate-600 font-medium flex flex-wrap gap-x-6 gap-y-2 items-center">
                  <li className="flex items-center gap-1"><strong className="text-blue-700">1</strong> – Nunca</li>
                  <li className="flex items-center gap-1"><strong className="text-blue-700">2</strong> – Raramente</li>
                  <li className="flex items-center gap-1"><strong className="text-blue-700">3</strong> – Às vezes</li>
                  <li className="flex items-center gap-1"><strong className="text-blue-700">4</strong> – Frequentemente</li>
                  <li className="flex items-center gap-1"><strong className="text-blue-700">5</strong> – Todos os dias</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {FERRAMENTAS_PROD.map(tool => (
                  <div key={tool} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-black text-blue-900">{tool}</p>
                      {tool === "Outros" && state.produtividade[tool] > 0 && (
                        <input 
                          type="text" 
                          placeholder="Especifique a ferramenta..." 
                          className="mt-3 w-full p-3 text-sm bg-white rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={state.produtividadeOutroNome || ''}
                          onChange={e => setState(s => ({ ...s, produtividadeOutroNome: e.target.value }))}
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(v => (
                        <button key={v} onClick={() => setState(s => ({ ...s, produtividade: { ...s.produtividade, [tool]: v } }))} className={`w-10 h-10 text-sm font-bold rounded-xl border-2 transition-all ${state.produtividade[tool] === v ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={back} className="flex-1 py-5 border-2 border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 flex justify-center items-center gap-2"><ChevronLeft size={20}/> Voltar</button>
                <button onClick={next} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex justify-center items-center gap-2">Próximo <ChevronRight size={20}/></button>
              </div>
            </div>
          )}

          {state.step === Step.BARRIERS && (
            <div className="space-y-10 animate-in slide-in-from-right duration-500">
              <div className="flex items-center gap-4 text-rose-600">
                <AlertTriangle size={32} strokeWidth={2.5} />
                <h2 className="text-2xl font-black">Barreiras</h2>
              </div>
              
              <p className="text-sm text-slate-600 font-medium">
                O uso dos sistemas oficiais do GDF pode apresentar algumas barreiras no dia a dia de trabalho. Avalie, na escala de 1 a 5, o quanto cada uma das barreiras listadas abaixo dificulta a utilização dessas ferramentas em suas atividades.
              </p>

              <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100">
                <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-3">Legenda da escala</h4>
                <ul className="text-xs text-slate-600 font-medium flex flex-wrap gap-x-6 gap-y-2 items-center">
                  <li className="flex items-center gap-1"><strong className="text-rose-700">1</strong> – Não dificulta</li>
                  <li className="flex items-center gap-1"><strong className="text-rose-700">2</strong> – Dificulta pouco</li>
                  <li className="flex items-center gap-1"><strong className="text-rose-700">3</strong> – Dificulta moderadamente</li>
                  <li className="flex items-center gap-1"><strong className="text-rose-700">4</strong> – Dificulta bastante</li>
                  <li className="flex items-center gap-1"><strong className="text-rose-700">5</strong> – Dificulta muito / é uma barreira crítica</li>
                </ul>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {BARREIRAS_LIST.map(barreira => (
                  <div key={barreira} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="text-sm font-black text-rose-900 flex-1">{barreira}</p>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(v => (
                        <button key={v} onClick={() => setState(s => ({ ...s, barreiras: { ...s.barreiras, [barreira]: v } }))} className={`w-10 h-10 text-sm font-bold rounded-xl border-2 transition-all ${state.barreiras[barreira] === v ? 'bg-rose-600 border-rose-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-700'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={back} className="flex-1 py-5 border-2 border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 flex justify-center items-center gap-2"><ChevronLeft size={20}/> Voltar</button>
                <button onClick={next} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex justify-center items-center gap-2">Resumo <ChevronRight size={20}/></button>
              </div>
            </div>
          )}

          {state.step === Step.SUMMARY && (
            <div className="space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="flex items-center gap-4 text-indigo-600">
                <FileText size={32} strokeWidth={2.5} />
                <h2 className="text-2xl font-black">Finalizar</h2>
              </div>
              <p className="text-slate-600 text-center font-medium">Ao clicar em submeter, suas respostas serão salvas com segurança no banco de dados da pesquisa oficial da SES-DF.</p>
              <div className="flex gap-4">
                <button onClick={back} className="flex-1 py-5 border-2 border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 flex justify-center items-center gap-2"><ChevronLeft size={20}/> Ajustar</button>
                <button onClick={handleFinish} disabled={isSubmitting} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all flex justify-center items-center gap-3">
                  {isSubmitting ? 'Salvando...' : 'Submeter Respostas'} <Save size={22} />
                </button>
              </div>
            </div>
          )}

          {state.step === Step.SUCCESS && (
            <div className="text-center space-y-8 animate-in zoom-in duration-700 py-10">
              <div className="flex justify-center"><CheckCircle size={80} className="text-green-500" /></div>
              <h2 className="text-4xl font-black text-slate-800">Sucesso!</h2>
              <p className="text-slate-600 font-medium max-w-md mx-auto">Suas respostas foram recebidas e registradas com sucesso no banco de dados da pesquisa. Obrigado por contribuir para o diagnóstico digital da APS no DF.</p>
              <button onClick={() => window.location.reload()} className="inline-flex py-4 px-12 bg-slate-800 text-white rounded-2xl font-bold items-center gap-2"> Novo Diagnóstico </button>
            </div>
          )}

        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SES-DF - FEPECS - ESPDF - Programa de Residencia Multiprofissional em Gestão de Políticas Públicas para a Saúde</p>
        </div>
      </div>
    </div>
  );
};

export default App;