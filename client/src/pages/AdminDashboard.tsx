// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { XCircle, Phone, Mail, FileText, CheckCircle, Clock, Users, UserPlus, Settings, Lock, BarChart3, Save, Receipt, MessageCircle, AlertCircle, LogOut, ChevronDown, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { siteConfig } from "@/config/site";
import { formatBRL } from "@/lib/utils";

const TODOS_SERVICOS: { nome: string; preco: number }[] = [...siteConfig.servicos];

// Fuso horário ajustado (mesmo padrão do Home.tsx) para não dar bug após as 21h.
const dataHojeIso = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

const formatarDataBR = (dataIso) => {
  if (!dataIso) return "-";
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataIso;
};

// O fluxo do formulário do site grava "(com Profissional X)" dentro do
// próprio texto do serviço no banco (server/routers.ts, appointments.create)
// — não mexido aqui, só removido da exibição, já que o profissional já
// aparece separado logo abaixo.
const formatarServicoExibido = (services) => {
  if (!services) return "";
  return services.replace(/\s*\(com [^)]*\)\s*$/i, "");
};

const STATUS_LABEL = { pendente: "Pendente", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado" };
const STATUS_DOT = { pendente: "bg-yellow-500", confirmado: "bg-blue-500", concluido: "bg-green-500", cancelado: "bg-red-500" };

export function EditarAgendamento({ agendamentoId, servicosAtuais, onSalvar }) {
  const stringOriginal = servicosAtuais.join(", ");
  const [servicosSelecionados, setServicosSelecionados] = useState(() => {
    return TODOS_SERVICOS.filter(s => stringOriginal.includes(s.nome)).map(s => s.nome);
  });
  
  const atualizarMutacao = trpc.appointments.atualizarServicos.useMutation();

  const guardarAlteracoes = () => {
    const novoPreco = servicosSelecionados.reduce((total, nome) => {
      const servico = TODOS_SERVICOS.find(s => s.nome === nome);
      return total + (servico ? servico.preco : 0);
    }, 0);
    const profissionalMatch = stringOriginal.match(/\(com .*?\)/);
    const profissional = profissionalMatch ? ` ${profissionalMatch[0]}` : "";
    const stringFinal = servicosSelecionados.join(", ") + profissional;
    
    atualizarMutacao.mutate({ id: Number(agendamentoId), novosServicos: stringFinal, novoPreco: String(novoPreco) }, {
      onSuccess: () => { 
        alert("Serviços atualizados com sucesso!"); 
        if (onSalvar) onSalvar(); 
      },
      onError: (err) => {
        alert("Erro ao atualizar no servidor. Verifique se a rota 'atualizarServicos' está no seu routers.ts!");
        if (onSalvar) onSalvar();
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TODOS_SERVICOS.map(servico => {
          const isSelected = servicosSelecionados.includes(servico.nome);
          return (
            <div key={servico.nome} onClick={() => {
              if (isSelected) setServicosSelecionados(servicosSelecionados.filter(s => s !== servico.nome));
              else setServicosSelecionados([...servicosSelecionados, servico.nome]);
            }} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-200'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-gray-600'}`}>{servico.nome}</p>
                <p className="text-xs font-semibold text-[#D4AF37]">R$ {servico.preco}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={guardarAlteracoes} disabled={atualizarMutacao.isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg mt-2">
        {atualizarMutacao.isLoading ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
}

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  const [showDialog, setShowDialog] = useState(false);
  const [showFuncionarioModal, setShowFuncionarioModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGastosModal, setShowGastosModal] = useState(false);

  const { data, isLoading, isFetching, refetch } = trpc.appointments.list.useQuery();
  const appointments = Array.isArray(data) ? data : [];

  const [abaAtiva, setAbaAtiva] = useState("agenda"); 
  const [filtroBarbeiro, setFiltroBarbeiro] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("pendentes");
  
  const [donoAutenticado, setDonoAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  // Senha validada no servidor (auth.verificarSenhaGerente), nunca no client —
  // uma variável VITE_* iria pro bundle e apareceria no DevTools de qualquer
  // visitante, mesmo sem acesso ao /admin.
  const verificarSenhaGerenteMutation = trpc.auth.verificarSenhaGerente.useMutation({
    onSuccess: () => setDonoAutenticado(true),
    onError: () => alert("Senha Incorreta"),
  });
  const tentarDesbloquearGerente = () => {
    if (!senhaInput || verificarSenhaGerenteMutation.isPending) return;
    verificarSenhaGerenteMutation.mutate({ senha: senhaInput });
  };

  // --- GERENCIAMENTO DE BARBEIROS ---
  const [listaBarbeiros, setListaBarbeiros] = useState(() => {
    const saved = localStorage.getItem("barbershop_barbeiros");
    if (saved) return JSON.parse(saved);
    return [...siteConfig.profissionais];
  });
  useEffect(() => localStorage.setItem("barbershop_barbeiros", JSON.stringify(listaBarbeiros)), [listaBarbeiros]);

  const [novoBarbeiroNome, setNovoBarbeiroNome] = useState("");
  const [novoBarbeiroComissao, setNovoBarbeiroComissao] = useState("");
  const [novoBarbeiroEspecialidade, setNovoBarbeiroEspecialidade] = useState("");

  const adicionarBarbeiro = () => {
    if (!novoBarbeiroNome) return alert("Digite o nome do barbeiro!");
    if (!novoBarbeiroEspecialidade) return alert("Digite a especialização do barbeiro!");
    setListaBarbeiros([...listaBarbeiros, { id: Math.random(), nome: novoBarbeiroNome, comissao: Number(novoBarbeiroComissao || 50), especialidade: novoBarbeiroEspecialidade }]);
    setNovoBarbeiroNome("");
    setNovoBarbeiroComissao("");
    setNovoBarbeiroEspecialidade("");
  };
  const removerBarbeiro = (id) => setListaBarbeiros(listaBarbeiros.filter(b => b.id !== id));

  // --- GERENCIAMENTO DE PREÇOS (SERVIÇOS) ---
  const [listaServicos, setListaServicos] = useState(() => {
    const saved = localStorage.getItem("barbershop_servicos");
    if (saved) return JSON.parse(saved);
    return TODOS_SERVICOS.map((s, i) => ({ id: i, ...s }));
  });
  useEffect(() => localStorage.setItem("barbershop_servicos", JSON.stringify(listaServicos)), [listaServicos]);

  const atualizarPrecoServico = (id, novoPreco) => {
    setListaServicos(listaServicos.map(s => s.id === id ? { ...s, preco: Number(novoPreco) } : s));
  };

  // --- GESTÃO DE SAÍDAS DE CAIXA ---
  const [listaGastos, setListaGastos] = useState(() => {
    const savedGastos = localStorage.getItem("barbershop_gastos");
    if (savedGastos) return JSON.parse(savedGastos);
    return [
      { id: 1, descricao: "Aluguel do Espaço", valor: 1500, expiraEm: "" },
      { id: 2, descricao: "Luz e Água", valor: 350, expiraEm: "" },
      { id: 3, descricao: "Produtos e Lâminas", valor: 200, expiraEm: "" }
    ];
  });

  useEffect(() => {
    localStorage.setItem("barbershop_gastos", JSON.stringify(listaGastos));
  }, [listaGastos]);

  const [novoGastoDesc, setNovoGastoDesc] = useState("");
  const [novoGastoValor, setNovoGastoValor] = useState("");
  const [novoGastoData, setNovoGastoData] = useState("");
  
  const totalGastos = listaGastos.reduce((acc, g) => acc + g.valor, 0);

  const adicionarGasto = () => {
    if (!novoGastoDesc || !novoGastoValor) return alert("Preencha a descrição e o valor!");
    setListaGastos([...listaGastos, { 
      id: Math.random(), 
      descricao: novoGastoDesc, 
      valor: Number(novoGastoValor),
      expiraEm: novoGastoData 
    }]);
    setNovoGastoDesc("");
    setNovoGastoValor("");
    setNovoGastoData("");
  };

  const removerGasto = (id) => setListaGastos(listaGastos.filter(g => g.id !== id));

  // --- FILTRAGEM INTELIGENTE ---
  const agendamentosFiltrados = appointments.filter(app => {
    if (filtroBarbeiro !== "Todos" && app.professional !== filtroBarbeiro && !app.services?.includes(filtroBarbeiro)) return false;
    if (filtroStatus === "pendentes" && (app.status === "concluido" || app.status === "cancelado")) return false;
    if (filtroStatus === "historico" && (app.status === "pendente" || app.status === "confirmado")) return false;
    return true;
  });

  const hoje = new Date();
  const proximos30Dias = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const dadosFinanceiros30Dias = proximos30Dias.map(dataString => {
    const agendamentosDoDia = appointments.filter(app => app.appointmentDate === dataString && app.status !== 'cancelado');
    const faturamentoDia = agendamentosDoDia.reduce((soma, app) => soma + Number(app.totalPrice || 0), 0);
    const partes = dataString.split('-');
    const dataFormatada = partes.length === 3 ? `${partes[2]}/${partes[1]}` : dataString;
    return { dataObj: dataString, dataFormatada, faturamento: faturamentoDia, contagem: agendamentosDoDia.length };
  });

  const totalFaturamento30Dias = dadosFinanceiros30Dias.reduce((acc, dia) => acc + dia.faturamento, 0);
  const totalClientes30Dias = dadosFinanceiros30Dias.reduce((acc, dia) => acc + dia.contagem, 0);
  const lucroLiquido = totalFaturamento30Dias - totalGastos;
  const ticketMedio = totalClientes30Dias > 0 ? (totalFaturamento30Dias / totalClientes30Dias) : 0;
  const maiorFaturamentoDia = Math.max(...dadosFinanceiros30Dias.map(d => d.faturamento), 1);

  const calcularClientesSumidos = () => {
    const historico = {};
    const dataAtual = new Date();
    appointments.forEach(app => {
      if(app.status === 'cancelado' || !app.appointmentDate || !app.phone) return;
      const appDate = new Date(app.appointmentDate + 'T12:00:00');
      if(appDate > dataAtual) return;
      if(!historico[app.phone]) {
        historico[app.phone] = { nome: app.name, phone: app.phone, ultimaVisita: appDate };
      } else {
        if(appDate > historico[app.phone].ultimaVisita) {
          historico[app.phone].ultimaVisita = appDate;
        }
      }
    });
    const LIMITE_DIAS = 30; 
    return Object.values(historico).map((cliente: any) => {
      const diffTime = Math.abs(dataAtual.getTime() - cliente.ultimaVisita.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...cliente, diasSumido: diffDays };
    }).filter(cliente => cliente.diasSumido >= LIMITE_DIAS).sort((a, b) => b.diasSumido - a.diasSumido); 
  };

  const clientesSumidos = calcularClientesSumidos();

  const resgatarCliente = (cliente) => {
    const numeroLimpo = cliente.phone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Fala ${cliente.nome.split(' ')[0]}, tudo bem? Já faz uns ${cliente.diasSumido} dias desde o seu último corte com a gente! \n\nQue tal dar um trato no visual essa semana? Tenho um horário livre e consigo fazer um desconto especial pra você. Me avisa se posso marcar! ✂️🔥`);
    window.open(`https://wa.me/55${numeroLimpo}?text=${mensagem}`, '_blank');
  };

  const updateStatusMutation = trpc.appointments.updateStatus.useMutation();
  const deleteMutation = trpc.appointments.delete.useMutation();

  const handleStatusUpdate = (newStatus: string) => {
    if (selectedAppointment) {
      updateStatusMutation.mutate({ id: selectedAppointment.id, status: newStatus }, {
        onSuccess: () => { refetch(); setShowDialog(false); }
      });
    }
  };

  // --- REMARCAR HORÁRIO (mantém o resto do agendamento, só troca data/hora) ---
  const [novaDataReagendar, setNovaDataReagendar] = useState("");
  const [novoHorarioReagendar, setNovoHorarioReagendar] = useState("");
  const isNovaDataPassada = novaDataReagendar ? novaDataReagendar < dataHojeIso : false;

  const { data: horariosDisponiveisReagendar, isLoading: carregandoHorariosReagendar } = trpc.appointments.getAvailableTimes.useQuery(
    { date: novaDataReagendar || "", professional: selectedAppointment?.professional || "", excludeId: selectedAppointment?.id },
    { enabled: !!novaDataReagendar && !!selectedAppointment?.professional && !isNovaDataPassada }
  );

  const remarcarMutation = trpc.appointments.reschedule.useMutation();

  const abrirGerenciar = (app: any) => {
    setSelectedAppointment(app);
    setShowDialog(true);
    setNovaDataReagendar("");
    setNovoHorarioReagendar("");
  };

  const confirmarRemarcacao = () => {
    if (!selectedAppointment || !novaDataReagendar || !novoHorarioReagendar) return;
    remarcarMutation.mutate(
      { id: selectedAppointment.id, appointmentDate: novaDataReagendar, appointmentTime: novoHorarioReagendar },
      {
        onSuccess: () => {
          alert("Agendamento remarcado com sucesso!");
          refetch();
          setShowDialog(false);
        },
        onError: (err) => {
          alert(err.message || "Não foi possível remarcar — horário indisponível.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#800020] flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {siteConfig.nomeBarbeariaCurto.charAt(0)}
            </div>
            <div className="text-sm">
              <span className="font-semibold text-gray-900">{siteConfig.nomeBarbeariaCurto}</span>
              <span className="text-gray-400"> · Painel</span>
            </div>
          </div>
          <button onClick={() => setLocation("/")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
        <div className="container overflow-x-auto">
          <nav className="flex gap-6 w-max min-w-full">
            <button onClick={() => setAbaAtiva("agenda")} className={`shrink-0 whitespace-nowrap -mb-px pb-2.5 border-b-2 text-sm transition-colors ${abaAtiva === "agenda" ? "text-gray-900 border-[#800020] font-medium" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
              Agenda
            </button>
            <button onClick={() => setAbaAtiva("dono")} className={`shrink-0 whitespace-nowrap -mb-px pb-2.5 border-b-2 text-sm transition-colors ${abaAtiva === "dono" ? "text-gray-900 border-[#800020] font-medium" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
              Financeiro
            </button>
          </nav>
        </div>
      </div>

      <div className="container py-8 max-w-7xl mx-auto">
        {abaAtiva === "dono" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {!donoAutenticado ? (
              <Card className="max-w-md mx-auto p-10 text-center bg-white shadow-2xl border-t-8 border-[#800020]">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-10 h-10 text-[#800020]" /></div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">Área do Gerente</h3>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">Confirme sua identidade para acessar os dados de faturamento e despesas.</p>
                <input type="password" placeholder="Senha" className="w-full border-2 border-gray-100 focus:border-[#800020] outline-none rounded-xl p-4 mb-4 text-center font-bold text-xl tracking-[0.3em]" value={senhaInput} onChange={e => setSenhaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && tentarDesbloquearGerente()} />
                <Button onClick={tentarDesbloquearGerente} disabled={verificarSenhaGerenteMutation.isPending} className="w-full bg-[#800020] hover:bg-[#600018] text-white font-bold py-4 rounded-xl text-lg shadow-lg">{verificarSenhaGerenteMutation.isPending ? "Verificando..." : "Desbloquear Painel"}</Button>
              </Card>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
                    <div className="p-5">
                      <p className="text-sm text-gray-500">Faturamento bruto · 30 dias</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{formatBRL(totalFaturamento30Dias)}</p>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-500">Despesas · 30 dias</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-red-600">{formatBRL(-totalGastos)}</p>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-500">Lucro líquido · 30 dias</p>
                      <p className={`mt-1 text-2xl font-semibold tabular-nums ${lucroLiquido >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatBRL(lucroLiquido)}</p>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-500">Ticket médio · 30 dias</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{formatBRL(ticketMedio)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-1 bg-white shadow-xl border-2 border-green-100 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-6 bg-green-50/50 border-b border-green-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><MessageCircle className="text-green-600 w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-gray-800">Máquina de Vendas (CRM)</h3>
                        <p className="text-xs text-gray-500">Resgate de Clientes Inativos</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-3">
                      {clientesSumidos.length === 0 ? (
                        <div className="text-center py-10">
                          <AlertCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                          <p className="text-gray-500 font-bold">Todos os clientes estão ativos!</p>
                          <p className="text-sm text-gray-400">Nenhum cliente ausente há mais de 30 dias.</p>
                        </div>
                      ) : (
                        clientesSumidos.map((cliente, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-green-300 transition-all">
                            <div>
                              <p className="font-bold text-sm text-gray-800">{cliente.nome.split(' ')[0]}</p>
                              <p className="text-[10px] font-bold text-red-500 uppercase">Ausente: {cliente.diasSumido} dias</p>
                            </div>
                            <Button onClick={() => resgatarCliente(cliente)} size="sm" className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold px-3 rounded-lg shadow-md flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" /> Resgatar
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="lg:col-span-2 bg-white shadow-xl border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="p-6 bg-gray-50 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3"><BarChart3 className="text-[#800020]" /><h3 className="font-bold text-gray-800">Projeção Financeira Diária</h3></div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {dadosFinanceiros30Dias.map((dia) => (
                        <div key={dia.dataObj} className="p-4 flex items-center justify-between border-b border-gray-50 hover:bg-blue-50/30 transition-all">
                          <span className="font-bold text-gray-600 w-20 capitalize">{dia.dataFormatada}</span>
                          <div className="flex-1 px-8 hidden md:block">
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${(dia.faturamento / maiorFaturamentoDia) * 100}%` }}></div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col">
                            <span className={`font-semibold tabular-nums text-lg ${dia.faturamento > 0 ? 'text-green-600' : 'text-gray-300'}`}>{formatBRL(dia.faturamento)}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{dia.contagem} atendimentos</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                  <Card className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                    <Users className="w-8 h-8 text-[#800020] mb-3" />
                    <h4 className="font-bold mb-4">Gestão de Equipe</h4>
                    <Button onClick={() => setShowFuncionarioModal(true)} className="w-full bg-[#800020] text-white font-bold rounded-xl">Novo Profissional</Button>
                  </Card>
                  <Card className="p-6 bg-white border-2 border-red-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                    <Receipt className="w-8 h-8 text-red-600 mb-3" />
                    <h4 className="font-bold mb-4">Saídas de Caixa</h4>
                    <Button onClick={() => setShowGastosModal(true)} variant="outline" className="w-full border-red-600 text-red-600 hover:bg-red-50 font-bold rounded-xl">Gerenciar Despesas</Button>
                  </Card>
                  <Card className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                    <Settings className="w-8 h-8 text-gray-500 mb-3" />
                    <h4 className="font-bold mb-4">Ajustes da Loja</h4>
                    <Button onClick={() => setShowConfigModal(true)} variant="outline" className="w-full border-gray-300 text-gray-600 font-bold rounded-xl">Configurações globais</Button>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {abaAtiva === "agenda" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Agenda <span className="text-sm font-normal text-gray-400">· {agendamentosFiltrados.length} agendamento{agendamentosFiltrados.length === 1 ? "" : "s"}</span>
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  <div className="inline-flex items-center bg-gray-100 rounded-md p-1 h-9 w-full sm:w-auto">
                    <button onClick={() => setFiltroStatus("pendentes")} className={`flex-1 sm:flex-none px-3 h-full rounded text-sm transition-all ${filtroStatus === "pendentes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Fila ativa</button>
                    <button onClick={() => setFiltroStatus("historico")} className={`flex-1 sm:flex-none px-3 h-full rounded text-sm transition-all ${filtroStatus === "historico" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Histórico</button>
                  </div>
                  <div className="relative w-full sm:w-52">
                    <select className="appearance-none w-full h-9 border border-gray-200 rounded-md pl-3 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#800020]/50 focus:ring-1 focus:ring-[#800020]/20" value={filtroBarbeiro} onChange={e => setFiltroBarbeiro(e.target.value)}>
                      <option value="Todos">Todos os profissionais</option>
                      {listaBarbeiros.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button onClick={() => refetch()} className="h-9 flex items-center justify-center gap-2 border border-gray-200 rounded-md px-4 text-sm text-gray-700 hover:bg-gray-50 w-full sm:w-auto">
                    <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-6 text-xs font-medium text-gray-500">Cliente</th>
                      <th className="p-6 text-xs font-medium text-gray-500">Serviço</th>
                      <th className="p-6 text-xs font-medium text-gray-500 text-center">Horário</th>
                      <th className="p-6 text-xs font-medium text-gray-500">Status</th>
                      <th className="p-6 text-xs font-medium text-gray-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {agendamentosFiltrados.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="p-6">
                          <p className="font-bold text-gray-900">{app.name}</p>
                          {app.phone && <div className="flex items-center gap-2 text-gray-400 mt-1"><Phone className="w-3 h-3" /><span className="text-xs">{app.phone}</span></div>}
                          {app.email && <div className="flex items-center gap-2 text-gray-400 mt-1"><Mail className="w-3 h-3" /><span className="text-xs">{app.email}</span></div>}
                        </td>
                        <td className="p-6">
                          <p className="text-sm text-gray-800">{formatarServicoExibido(app.services)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{app.professional} · {formatBRL(Number(app.totalPrice || 0))}</p>
                        </td>
                        <td className="p-6 text-center">
                          <p className="text-sm font-bold text-gray-900 tabular-nums">{app.appointmentTime || '--:--'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatarDataBR(app.appointmentDate)}</p>
                        </td>
                        <td className="p-6">
                          <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[app.status] || "bg-gray-400"}`} />
                            {STATUS_LABEL[app.status] || app.status}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <button onClick={() => abrirGerenciar(app)} className="text-sm text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50">Abrir</button>
                            <button onClick={() => window.confirm(`Apagar ficha de ${app.name}?`) && deleteMutation.mutate({ id: app.id })} className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"><XCircle className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL 1: GESTÃO DE SAÍDAS DE CAIXA */}
      <Dialog open={showGastosModal} onOpenChange={setShowGastosModal}>
        <DialogContent className="max-w-md rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-600 flex items-center gap-3"><Receipt className="w-8 h-8" /> Gestão de Saídas</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100">
              <p className="text-xs text-red-400 font-black uppercase mb-1">Total de Despesas Fixas</p>
              <h2 className="text-3xl font-black text-red-600">{formatBRL(totalGastos)}</h2>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {listaGastos.map(g => (
                <div key={g.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-sm font-bold text-gray-600 block">{g.descricao}</span>
                    {g.expiraEm && <span className="text-[10px] font-bold text-red-400 uppercase">Expira em: {formatarDataBR(g.expiraEm)}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-800">{formatBRL(g.valor)}</span>
                    <button onClick={() => removerGasto(g.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Remover Gasto">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {listaGastos.length === 0 && <p className="text-center text-sm text-gray-400 font-bold py-4">Nenhum gasto cadastrado.</p>}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <p className="text-xs font-black text-gray-400 uppercase">Adicionar Nova Despesa</p>
              <div className="flex flex-col gap-2">
                <input type="text" placeholder="Ex: Internet" className="w-full border-2 border-gray-100 p-3 rounded-xl text-sm font-bold outline-none focus:border-red-500" value={novoGastoDesc} onChange={(e) => setNovoGastoDesc(e.target.value)} />
                <div className="flex gap-2">
                  <input type="number" placeholder="R$ Preço" className="w-1/3 border-2 border-gray-100 p-3 rounded-xl text-sm font-bold outline-none focus:border-red-500" value={novoGastoValor} onChange={(e) => setNovoGastoValor(e.target.value)} />
                  <input type="date" className="flex-1 border-2 border-gray-100 p-3 rounded-xl text-sm font-bold text-gray-500 outline-none focus:border-red-500" value={novoGastoData} onChange={(e) => setNovoGastoData(e.target.value)} title="Data de Vencimento (Opcional)" />
                  <Button onClick={adicionarGasto} className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 h-auto shadow-md">ADD</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: GESTÃO DE EQUIPE */}
      <Dialog open={showFuncionarioModal} onOpenChange={setShowFuncionarioModal}>
        <DialogContent className="max-w-md p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#800020] flex items-center gap-3"><Users className="w-8 h-8" /> Gestão de Equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              <p className="text-xs font-black text-gray-400 uppercase">Equipe Atual</p>
              {listaBarbeiros.map(barbeiro => (
                <div key={barbeiro.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">💈 {barbeiro.nome}</span>
                    <span className="text-[10px] text-gray-500">{barbeiro.especialidade || "Especialidade a definir"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-green-600">{barbeiro.comissao}%</span>
                    <button onClick={() => removerBarbeiro(barbeiro.id)} className="text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-black text-gray-400 uppercase">Adicionar Novo</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Nome" className="flex-1 border-2 border-gray-100 p-3 rounded-xl text-sm font-bold outline-none focus:border-[#800020]" value={novoBarbeiroNome} onChange={(e) => setNovoBarbeiroNome(e.target.value)} />
                <input type="number" placeholder="Comissão %" className="w-28 border-2 border-gray-100 p-3 rounded-xl text-sm font-bold outline-none focus:border-[#800020]" value={novoBarbeiroComissao} onChange={(e) => setNovoBarbeiroComissao(e.target.value)} />
              </div>
              <input type="text" placeholder="Ex: Especialista em Fade e Barba" className="w-full border-2 border-gray-100 p-3 rounded-xl text-sm font-bold outline-none focus:border-[#800020]" value={novoBarbeiroEspecialidade} onChange={(e) => setNovoBarbeiroEspecialidade(e.target.value)} />
              <Button onClick={adicionarBarbeiro} className="w-full bg-[#800020] text-white font-black py-3 h-auto rounded-xl shadow-lg mt-2">CADASTRAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: AJUSTES DA LOJA */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-800 flex items-center gap-3"><Settings className="w-8 h-8" /> Configurações</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-400 uppercase">Tabela de Preços (Visível no Site)</p>
              <div className="space-y-2 border-2 border-gray-50 p-3 rounded-xl bg-gray-50/50">
                {listaServicos.map(servico => (
                  <div key={servico.id} className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-600">{servico.nome}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-gray-400">R$</span>
                      <input type="number" value={servico.preco} onChange={(e) => atualizarPrecoServico(servico.id, e.target.value)} className="w-16 border-2 border-gray-200 p-1 text-center rounded text-xs font-bold text-[#D4AF37] outline-none focus:border-[#D4AF37]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-black text-red-400 uppercase">Segurança Mestre</p>
              <input type="password" placeholder="Mudar Senha do Painel" className="w-full border-2 border-red-50 p-3 rounded-xl text-sm font-bold focus:border-red-500 outline-none" />
            </div>

            <Button onClick={() => setShowConfigModal(false)} className="w-full bg-[#800020] text-white font-black py-4 h-auto rounded-xl shadow-lg mt-2">SALVAR ALTERAÇÕES</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: FICHA DO AGENDAMENTO (GERENCIAR) */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-gray-800 mb-6">
              Ficha do Agendamento #{selectedAppointment?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 border-2 border-gray-50 bg-gray-50/50 shadow-inner rounded-2xl">
                  <h4 className="font-black text-[#800020] flex items-center gap-2 mb-4 text-sm uppercase"><Users className="w-4 h-4" /> Cliente</h4>
                  <p className="text-lg font-bold">{selectedAppointment.name}</p>
                  {selectedAppointment.phone && <p className="text-sm text-gray-500 font-bold">{selectedAppointment.phone}</p>}
                  {selectedAppointment.email && <p className="text-sm text-gray-500 font-bold">{selectedAppointment.email}</p>}
                </Card>
                <Card className="p-5 border-2 border-gray-50 bg-gray-50/50 shadow-inner rounded-2xl">
                  <h4 className="font-black text-[#D4AF37] flex items-center gap-2 mb-4 text-sm uppercase"><Clock className="w-4 h-4" /> Horário</h4>
                  <p className="text-lg font-black text-[#800020]">{selectedAppointment.appointmentTime || '--:--'}h</p>
                  <p className="text-sm font-bold text-gray-500">{formatarDataBR(selectedAppointment.appointmentDate)}</p>
                  <p className="text-xs font-black text-[#D4AF37] mt-2 uppercase tracking-tighter">PROFISSIONAL: {selectedAppointment.professional}</p>
                </Card>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-100">
                <h4 className="font-black text-blue-800 flex items-center gap-2 mb-4 uppercase text-sm"><FileText className="w-4 h-4" /> Ajustar Serviços Prestados</h4>
                <EditarAgendamento agendamentoId={selectedAppointment.id} servicosAtuais={selectedAppointment.services ? selectedAppointment.services.split(', ') : []} onSalvar={() => { refetch(); setShowDialog(false); }} />
              </div>

              <div className="bg-amber-50/50 p-6 rounded-2xl border-2 border-amber-100">
                <h4 className="font-black text-amber-800 flex items-center gap-2 mb-4 uppercase text-sm"><Clock className="w-4 h-4" /> Remarcar Horário</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nova Data</label>
                    <input
                      type="date"
                      min={dataHojeIso}
                      value={novaDataReagendar}
                      onChange={(e) => { setNovaDataReagendar(e.target.value); setNovoHorarioReagendar(""); }}
                      className="w-full border-2 border-gray-100 focus:border-amber-500 outline-none rounded-xl h-12 px-3 font-medium bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Novo Horário</label>
                    <select
                      value={novoHorarioReagendar}
                      onChange={(e) => setNovoHorarioReagendar(e.target.value)}
                      disabled={!novaDataReagendar || isNovaDataPassada || carregandoHorariosReagendar}
                      className="w-full border-2 border-gray-100 focus:border-amber-500 outline-none rounded-xl h-12 bg-white disabled:bg-gray-100 disabled:text-gray-400 font-bold text-sm"
                    >
                      <option value="" disabled>
                        {isNovaDataPassada
                          ? "Data indisponível"
                          : (!novaDataReagendar ? "Escolha a data" : carregandoHorariosReagendar ? "Buscando..." : "Horários livres")}
                      </option>
                      {!isNovaDataPassada && horariosDisponiveisReagendar?.map((slot: any) => (
                        <option key={slot.time} value={slot.time} disabled={!slot.available}>
                          {slot.time}{!slot.available ? " (Ocupado)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  onClick={confirmarRemarcacao}
                  disabled={!novaDataReagendar || !novoHorarioReagendar || isNovaDataPassada || remarcarMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-6 text-sm mt-4 rounded-xl"
                >
                  {remarcarMutation.isPending ? "Remarcando..." : "Confirmar Remarcação"}
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Ações de Fluxo de Atendimento</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => handleStatusUpdate('confirmado')} className="border-blue-200 bg-blue-50 text-blue-700 h-14 font-black rounded-xl hover:bg-blue-100">CONFIRMAR</Button>
                  <Button variant="outline" onClick={() => handleStatusUpdate('concluido')} className="border-green-200 bg-green-50 text-green-700 h-14 font-black rounded-xl hover:bg-green-100">CONCLUÍDO</Button>
                  <Button variant="outline" onClick={() => handleStatusUpdate('pendente')} className="border-yellow-200 bg-yellow-50 text-yellow-700 h-14 font-black rounded-xl hover:bg-yellow-100">PENDENTE</Button>
                  <Button variant="outline" onClick={() => handleStatusUpdate('cancelado')} className="border-red-200 bg-red-50 text-red-700 h-14 font-black rounded-xl hover:bg-red-100">CANCELAR</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}