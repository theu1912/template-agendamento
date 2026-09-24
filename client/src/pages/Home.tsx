'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MessageCircle, Instagram, Star, MapPin, Phone, Clock, CheckCircle, Share2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { trpc } from '@/lib/trpc';
import { siteConfig } from '@/config/site';

gsap.registerPlugin(ScrollTrigger);

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;

// Calcula se a barbearia está aberta agora, com base em
// siteConfig.horarioFuncionamentoSemana e no horário atual (America/Sao_Paulo).
function estaAbertoAgora(): boolean {
  const agoraSaoPaulo = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const diaKey = DIAS_SEMANA[agoraSaoPaulo.getDay()];
  const intervalosHoje = siteConfig.horarioFuncionamentoSemana[diaKey];
  const minutosAgora = agoraSaoPaulo.getHours() * 60 + agoraSaoPaulo.getMinutes();

  return intervalosHoje.some(({ abre, fecha }) => {
    const [horaAbre, minAbre] = abre.split(':').map(Number);
    const [horaFecha, minFecha] = fecha.split(':').map(Number);
    const minutosAbre = horaAbre * 60 + minAbre;
    const minutosFecha = horaFecha * 60 + minFecha;
    return minutosAgora >= minutosAbre && minutosAgora < minutosFecha;
  });
}

interface Service {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  professional: string;
  message: string;
}


// Fuso horário ajustado para não dar bug após as 21h
const dataHoje = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

// Converte "YYYY-MM-DD" (formato interno usado pelo resto do sistema — Postgres,
// IA, /admin) para um Date local. Evita usar `new Date(iso)` direto, que o
// JS interpreta como meia-noite UTC e pode exibir o dia anterior dependendo
// do fuso do navegador.
function isoParaDataLocal(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [ano, mes, dia] = iso.split('-').map(Number);
  if (!ano || !mes || !dia) return undefined;
  return new Date(ano, mes - 1, dia);
}

// Converte um Date local de volta para "YYYY-MM-DD" — mesmo formato ISO que
// o resto do sistema já espera (só a exibição muda, não o valor salvo).
function dataLocalParaIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Campo de data customizado (Popover + react-day-picker em pt-BR), substitui
// o <input type="date"> nativo cujo formato de exibição (DD/MM vs MM/DD)
// depende do idioma do navegador/SO do visitante. O valor exposto via
// onChange continua sendo a string ISO "YYYY-MM-DD" — só a exibição muda.
function DateField({
  value,
  onChange,
  minIso,
  disabled,
}: {
  value: string;
  onChange: (iso: string) => void;
  minIso: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selecionada = isoParaDataLocal(value);
  const minima = isoParaDataLocal(minIso);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`w-full border-2 border-gray-100 focus:border-[#D4AF37] rounded-xl h-12 font-medium bg-gray-50/50 px-3 flex items-center justify-between text-left outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            selecionada ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          <span>{selecionada ? format(selecionada, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}</span>
          <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={selecionada}
          defaultMonth={selecionada || minima}
          onSelect={(data) => {
            if (!data) return;
            onChange(dataLocalParaIso(data));
            setOpen(false);
          }}
          disabled={minima ? { before: minima } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}


const maskPhone = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 15);
};

// Extrai a parte numérica e o sufixo (ex: "+") de valores de estatística
// como "500+", para animar a contagem sem perder o sufixo.
function parseStatValue(value: string): { num: number; suffix: string } {
  const match = value.match(/^(\d+)(.*)$/);
  return match ? { num: parseInt(match[1], 10), suffix: match[2] } : { num: 0, suffix: value };
}

// Ornamento decorativo dos títulos de seção: duas linhas horizontais com um
// ponto na cor de acento no meio, entre o texto-etiqueta (eyebrow) e o título
// principal. `justify` controla o alinhamento (esquerda por padrão, aceita
// classes responsivas como "justify-center md:justify-start"). Cor sempre lida
// de siteConfig.corAcento em tempo de execução — nunca hex hardcoded.
function SectionOrnament({ justify = 'justify-start' }: { justify?: string }) {
  const accent = siteConfig.corAcento;
  return (
    <div className={`flex items-center gap-3 my-3 ${justify}`} aria-hidden="true">
      <span className="h-px w-8 md:w-12" style={{ backgroundColor: accent, opacity: 0.5 }} />
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
      <span className="h-px w-8 md:w-12" style={{ backgroundColor: accent, opacity: 0.5 }} />
    </div>
  );
}

// Divisória curva entre seções: um SVG posicionado no rodapé da seção atual,
// preenchido com a cor de fundo da PRÓXIMA seção, criando o efeito de corte
// orgânico em vez do encontro reto padrão entre blocos empilhados.
function WaveDivider({ fill }: { fill: string }) {
  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none" aria-hidden="true">
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-10 md:h-16 block">
        <path fill={fill} d="M0,40 C240,90 480,0 720,40 C960,80 1200,10 1440,40 L1440,100 L0,100 Z" />
      </svg>
    </div>
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const statsAnosRef = useRef<HTMLHeadingElement>(null);
  const statsClientesRef = useRef<HTMLHeadingElement>(null);

  // Badge "Aberto agora" — recalcula a cada minuto para não ficar desatualizado
  // numa demo longa.
  const [aberto, setAberto] = useState(estaAbertoAgora);
  useEffect(() => {
    const intervalo = setInterval(() => setAberto(estaAbertoAgora()), 60_000);
    return () => clearInterval(intervalo);
  }, []);

  // Animações de entrada ao rolar a página (GSAP ScrollTrigger). Cada seção
  // pode marcar elementos filhos com uma direção específica
  // (.gsap-from-top/-left/-right/-bottom) para variar o movimento em vez de
  // repetir sempre o mesmo fade+slide-up — seções sem nenhum filho marcado
  // caem no fallback genérico (também mais lento que antes).
  useEffect(() => {
    const ctx = gsap.context(() => {
      const DURATION = 1.6;
      const STAGGER = 0.15;

      gsap.utils.toArray<HTMLElement>('.gsap-fade-section').forEach((section) => {
        // Cada gsap.from() precisa do SEU PRÓPRIO objeto de scrollTrigger —
        // o plugin ScrollTrigger muta o objeto de config que recebe (anexa a
        // animação e outros dados internos nele), então reaproveitar o MESMO
        // objeto literal em várias chamadas gsap.from() da mesma seção é
        // inseguro: a criação seguinte pode herdar a mutação da anterior e
        // nunca disparar de verdade. Bug real observado: nas seções com só 1
        // elemento por grupo (História, Avaliações, Localização) o reuso não
        // dava pra perceber porque "por acaso" funcionava; na seção Serviços,
        // com 14 cards com stagger no segundo grupo (.gsap-from-bottom), o
        // ScrollTrigger desse grupo nunca disparava — os cards ficavam presos
        // no estado inicial (opacity 0, translateY 60px), com a seção
        // parecendo "sumida" (confirmado via getBoundingClientRect/computed
        // style num browser real).
        const makeScrollTrigger = () => ({
          trigger: section,
          start: 'top 82%',
          toggleActions: 'play none none none',
        });

        const fromTop = section.querySelectorAll<HTMLElement>('.gsap-from-top');
        const fromLeft = section.querySelectorAll<HTMLElement>('.gsap-from-left');
        const fromRight = section.querySelectorAll<HTMLElement>('.gsap-from-right');
        const fromBottom = section.querySelectorAll<HTMLElement>('.gsap-from-bottom');
        const hasDirectionalChildren = fromTop.length || fromLeft.length || fromRight.length || fromBottom.length;

        if (fromTop.length) {
          gsap.from(fromTop, { opacity: 0, y: -50, duration: DURATION, stagger: STAGGER, ease: 'power2.out', scrollTrigger: makeScrollTrigger() });
        }
        if (fromLeft.length) {
          gsap.from(fromLeft, { opacity: 0, x: -70, duration: DURATION, stagger: STAGGER, ease: 'power2.out', scrollTrigger: makeScrollTrigger() });
        }
        if (fromRight.length) {
          gsap.from(fromRight, { opacity: 0, x: 70, duration: DURATION, stagger: STAGGER, ease: 'power2.out', scrollTrigger: makeScrollTrigger() });
        }
        if (fromBottom.length) {
          gsap.from(fromBottom, { opacity: 0, y: 60, duration: DURATION, stagger: STAGGER, ease: 'power2.out', scrollTrigger: makeScrollTrigger() });
        }

        // Fallback: seção sem nenhum filho marcado com direção — mantém o
        // comportamento antigo (fade + slide-up), só que mais perceptível.
        if (!hasDirectionalChildren) {
          gsap.from(section, {
            opacity: 0,
            y: 50,
            duration: 1.8,
            ease: 'power2.out',
            scrollTrigger: makeScrollTrigger(),
          });
        }
      });

      // Contadores animados da seção "A Nossa Essência" — sobem de 0 até o
      // valor real de siteConfig quando a seção entra na viewport.
      [
        { el: statsAnosRef.current, target: siteConfig.statsAnosHistoria },
        { el: statsClientesRef.current, target: siteConfig.statsClientesSatisfeitos },
      ].forEach(({ el, target }) => {
        if (!el) return;
        const { num, suffix } = parseStatValue(target);
        const counter = { val: 0 };
        gsap.to(counter, {
          val: num,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
          onUpdate: () => {
            el.textContent = `${Math.round(counter.val)}${suffix}`;
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // 1. Cérebro conectando a Equipe do Admin com o site público — antes lia
  // do localStorage (só "funcionava" se o visitante abrisse o site no MESMO
  // navegador em que o dono editou o painel, o que nunca acontece de
  // verdade com um cliente real). Agora lê do Postgres via rota pública
  // (server/routers.ts, professionals.listPublic) — mesma fonte que
  // alimenta o prompt do chatbot, então site e IA nunca mais divergem.
  // Fallback pro site.ts só cobre o instante de carregamento inicial da
  // query (ou uma falha de rede) — o banco normalmente já vem semeado.
  const { data: profissionaisDb } = trpc.professionals.listPublic.useQuery();
  const professionals = useMemo(() => {
    if (profissionaisDb && profissionaisDb.length > 0) {
      return profissionaisDb.map((p: any) => ({
        id: String(p.id),
        name: p.nome,
        specialty: p.especialidade || "Especialidade a definir"
      }));
    }
    return siteConfig.profissionais.map((p) => ({
      id: String(p.id),
      name: p.nome,
      specialty: "Especialidade a definir"
    }));
  }, [profissionaisDb]);

  // 2. Cérebro conectando os Preços do Admin com o site público — mesma
  // migração de localStorage para o banco (tabela `services`, rota pública
  // services.listPublic). O estado local continua existindo só pra guardar
  // a seleção do cliente no formulário (`selected`), preservada entre
  // refetches da query por id.
  const { data: servicosDb } = trpc.services.listPublic.useQuery();
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    if (servicosDb && servicosDb.length > 0) {
      setServices((anteriores) => {
        const selecaoPorId = new Map(anteriores.map((s) => [s.id, s.selected]));
        return servicosDb.map((s: any) => ({
          id: String(s.id),
          name: s.nome,
          price: Number(s.preco),
          selected: selecaoPorId.get(String(s.id)) ?? false,
        }));
      });
    }
  }, [servicosDb]);
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', phone: '', service: '', date: '', time: '',
    professional: '', message: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  
  const isDataPassada = formData.date ? formData.date < dataHoje : false;

  const { data: horariosLivres, isLoading: carregandoHorarios, refetch: refetchHorarios } = trpc.appointments.getAvailableTimes.useQuery(
    { date: formData.date || "", professional: formData.professional || "" },
    { enabled: !!formData.date && !!formData.professional && !isDataPassada }
  );

  const createAppointmentMutation = trpc.appointments.create.useMutation();
  const selectedServices = services.filter(s => s.selected);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedServicesText = selectedServices.map(s => s.name).join(', ');

  const toggleService = (id: string) => {
    setServices(services.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  const openScheduleModal = () => {
    if (selectedServices.length === 0) {
      toast.error("Seleção Obrigatória", {
        description: <span style={{ color: '#1A1A1A', fontWeight: '500' }}>Por favor, escolha pelo menos um serviço antes de agendar.</span>,
        duration: 4000,
        style: {
          background: '#FFFFFF',
          color: '#1A1A1A',
          border: '2px solid #800020',
          borderRadius: '24px',
          fontFamily: 'serif',
          fontSize: '16px'
        }
      });
      document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setFormData(prev => ({ ...prev, service: selectedServicesText }));
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.professional) {
      toast.error("Profissional Ausente", {
        description: <span style={{ color: '#1A1A1A', fontWeight: '500' }}>Por favor, escolha qual barbeiro irá lhe atender.</span>,
        duration: 4000,
        style: { background: '#FFFFFF', color: '#1A1A1A', border: '2px solid #800020', borderRadius: '24px', fontFamily: 'serif', fontSize: '16px' }
      });
      return;
    }

    // DateField não é um <input> nativo, então não participa da validação
    // HTML5 "required" do <form> como o <input type="date"> antigo fazia —
    // precisa da mesma checagem explícita aqui.
    if (!formData.date) {
      toast.error("Data Ausente", {
        description: <span style={{ color: '#1A1A1A', fontWeight: '500' }}>Por favor, escolha uma data para o agendamento.</span>,
        duration: 4000,
        style: { background: '#FFFFFF', color: '#1A1A1A', border: '2px solid #800020', borderRadius: '24px', fontFamily: 'serif', fontSize: '16px' }
      });
      return;
    }

    const dataParaServidor = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone.replace(/\D/g, ''), 
      message: formData.message || "",
      services: `${selectedServicesText} (com ${formData.professional})`, 
      totalPrice: totalPrice.toString(), 
      appointmentDate: formData.date,
      appointmentTime: formData.time,
      professional: formData.professional
    };

    createAppointmentMutation.mutate(dataParaServidor, {
      onSuccess: () => {
        refetchHorarios();

        // Notificação (webhook Make.com) já é disparada pelo server em
        // appointments.create — não duplicar a chamada aqui.
        setSuccessMessage('Agendamento realizado com sucesso!');
        setFormData({ name: '', email: '', phone: '', service: '', date: '', time: '', professional: '',  message: '' });
        setTimeout(() => setShowScheduleModal(false), 3000);
      },
      onError: (error) => {
        console.error("Erro do tRPC:", error);
        toast.error("Erro no Servidor", {
          description: <span style={{ color: '#1A1A1A', fontWeight: '500' }}>O horário não está mais disponível ou os dados são inválidos.</span>,
          style: { background: '#FFFFFF', color: '#1A1A1A', border: '2px solid #800020', borderRadius: '24px' }
        });
      }
    });
  };

  const compartilharSite = async () => {
    const dadosCompartilhamento = {
      title: siteConfig.nomeBarbearia,
      text: `Confira a ${siteConfig.nomeBarbearia}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(dadosCompartilhamento);
      } catch {
        // Usuário cancelou o compartilhamento nativo — não é um erro, ignora.
      }
      return;
    }

    // Fallback para navegadores sem Web Share API (ex: desktop sem suporte):
    // copia o link para a área de transferência.
    try {
      await navigator.clipboard.writeText(dadosCompartilhamento.url);
      toast.success("Link copiado!", {
        description: <span style={{ color: '#1A1A1A', fontWeight: '500' }}>O link do site foi copiado para a área de transferência.</span>,
        duration: 3000,
        style: { background: '#FFFFFF', color: '#1A1A1A', border: '2px solid #D4AF37', borderRadius: '24px', fontFamily: 'serif', fontSize: '16px' }
      });
    } catch {
      toast.error("Não foi possível copiar o link", {
        description: <span style={{ color: '#1A1A1A', fontWeight: '500' }}>Copie o endereço da página manualmente na barra do navegador.</span>,
        style: { background: '#FFFFFF', color: '#1A1A1A', border: '2px solid #800020', borderRadius: '24px' }
      });
    }
  };

  const abrirWhatsAppServicoEspecial = () => {
    const mensagem = encodeURIComponent(
      siteConfig.servicoEspecial.ctaMensagem.replace("{SERVICO_ESPECIAL}", siteConfig.servicoEspecial.titulo)
    );
    window.open(`https://wa.me/${siteConfig.whatsappNumero}?text=${mensagem}`, '_blank');
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col font-sans scroll-smooth relative">
      {/* MENU NAVEGAÇÃO */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-40 border-b border-[#D4AF37]/20 shadow-sm">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center">
            <img 
              src={siteConfig.logoUrl} 
              alt={siteConfig.logoAlt} 
              className="h-12 md:h-16 w-auto transition-all" 
            />
          </div>
          <div className="hidden lg:flex items-center gap-6">
            <a href="#historia" className="text-gray-700 hover:text-[#800020] transition-colors font-medium text-sm">HISTÓRIA</a>
            <a href="#servicos" className="text-gray-700 hover:text-[#800020] transition-colors font-medium text-sm">SERVIÇOS</a>
            {siteConfig.servicoEspecial.habilitado && (
              <a href={`#${siteConfig.servicoEspecial.anchorId}`} className="text-gray-700 hover:text-[#800020] transition-colors font-medium text-sm">{siteConfig.servicoEspecial.titulo.toUpperCase()}</a>
            )}
            <a href="#localizacao" className="text-gray-700 hover:text-[#800020] transition-colors font-medium text-sm">LOCALIZAÇÃO</a>
          </div>
          <Button onClick={openScheduleModal} className="bg-[#800020] hover:bg-[#600018] text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_20px_-6px_rgba(128,0,32,0.6)]">
            AGENDAR
          </Button>
        </div>
      </nav>

      {/* HEADER / HERO SECTION */}
      <section className="pt-32 pb-20 md:pb-32 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-[#D4AF37] font-semibold text-sm tracking-widest">DESDE {siteConfig.anoFundacao}</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                      aberto ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${aberto ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {aberto ? 'Aberto agora' : 'Fechado agora'}
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-[#800020] leading-tight">
                  Unindo o Clássico e o Moderno
                </h1>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                {siteConfig.slogan.replace("{ANO}", siteConfig.anoFundacao)}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-start items-center">
                <Button onClick={openScheduleModal} className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C49A27] text-[#800020] font-bold px-8 py-6 text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_-8px_rgba(212,175,55,0.7)]">
                  AGENDAR AGORA
                </Button>
                {siteConfig.servicoEspecial.habilitado && (
                  <Button variant="outline" className="w-full sm:w-auto border-2 border-[#800020] text-[#800020] hover:bg-[#800020] hover:text-white font-bold px-8 py-6 text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_-8px_rgba(128,0,32,0.5)]">
                    <a href={`#${siteConfig.servicoEspecial.anchorId}`}>{siteConfig.servicoEspecial.titulo.toUpperCase()}</a>
                  </Button>
                )}
              </div>
            </div>
            <div className="relative h-96 md:h-full min-h-[400px] rounded-2xl overflow-hidden shadow-2xl">
              <img src={siteConfig.heroImageUrl} alt={`Barbearia ${siteConfig.nomeBarbearia}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#800020]/30 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: HISTÓRIA */}
      <section id="historia" className="gsap-fade-section py-20 md:py-32 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="gsap-from-left grid grid-cols-2 gap-4 relative">
              <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600" alt="Corte Clássico" className="rounded-2xl shadow-lg object-cover h-64 w-full" />
              <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600" alt="Barbearia" className="rounded-2xl shadow-lg object-cover h-64 w-full mt-12" />
            </div>
            <div className="gsap-from-right space-y-6">
              <p className="text-[#D4AF37] font-semibold text-sm tracking-widest">A NOSSA ESSÊNCIA</p>
              <SectionOrnament />
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#800020]">Tradição e Maestria em Cada Corte</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                {siteConfig.sobre}
              </p>
              <p className="text-gray-600 leading-relaxed text-lg">
                {siteConfig.sobreComplemento}
              </p>
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                <div>
                  <h4 ref={statsAnosRef} className="text-4xl font-black text-[#D4AF37] mb-1">0</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Anos de História</p>
                </div>
                <div>
                  <h4 ref={statsClientesRef} className="text-4xl font-black text-[#D4AF37] mb-1">0</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Clientes Satisfeitos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
{/* SEÇÃO: AVALIAÇÕES / SOCIAL PROOF (ROTATIVA) */}
      <section className="gsap-fade-section relative py-16 bg-white overflow-hidden border-t border-b border-gray-50">
        <style>
          {`
            @keyframes scroll-reviews {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-scroll-reviews {
              display: flex;
              width: max-content;
              animation: scroll-reviews 40s linear infinite;
            }
            .animate-scroll-reviews:hover {
              animation-play-state: paused;
            }
          `}
        </style>
        
        <div className="gsap-from-top container mb-10 text-center">
          <p className="text-[#D4AF37] font-semibold text-sm tracking-widest uppercase mb-2">Aprovação Máxima</p>
          <SectionOrnament justify="justify-center" />
          <h3 className="text-3xl md:text-4xl font-serif font-bold text-[#800020]">O que dizem nossos clientes</h3>
        </div>

        <div className="gsap-from-bottom w-full overflow-hidden relative">
          {/* Gradientes laterais para efeito de fade suave */}
          <div className="absolute top-0 left-0 w-16 md:w-32 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-16 md:w-32 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
          
          <div className="animate-scroll-reviews gap-6 px-4 cursor-pointer">
            {/* Array duplicado para o scroll infinito funcionar perfeitamente sem cortes */}
            {[...siteConfig.depoimentos, ...siteConfig.depoimentos].map((review, i) => (
              <div key={i} className="w-[300px] md:w-[400px] bg-gray-50 p-8 rounded-2xl border border-gray-100 shrink-0 shadow-sm hover:border-[#D4AF37] transition-colors">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} className="w-5 h-5 text-[#D4AF37] fill-[#D4AF37]" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm md:text-base italic mb-6">"{review.texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#800020] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {review.nome.charAt(0)}
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-sm">{review.nome}</p>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">Google Local</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <WaveDivider fill="#F9FAFB" />
      </section>


      {/* SEÇÃO: SERVIÇOS */}
      <section id="servicos" className="gsap-fade-section relative py-20 md:py-32 bg-gray-50 border-t border-b border-gray-100">
        {/* Glow sutil nos cards de serviço, usando a cor de acento do siteConfig */}
        <style>
          {`
            .service-card-glow {
              --glow-color: ${siteConfig.corAcento};
            }
            .service-card-glow:hover {
              box-shadow: 0 0 0 1px var(--glow-color), 0 0 26px -4px var(--glow-color), 0 14px 30px -14px rgba(0,0,0,0.2);
            }
            .service-card-glow.is-selected {
              box-shadow: 0 0 0 1px var(--glow-color), 0 0 22px -6px var(--glow-color);
            }
          `}
        </style>
        <div className="container">
          <div className="gsap-from-top space-y-4 mb-12 text-center md:text-left">
            <p className="text-[#D4AF37] font-semibold text-sm tracking-widest">NOSSOS SERVIÇOS</p>
            <SectionOrnament justify="justify-center md:justify-start" />
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#800020]">Excelência em Cada Detalhe</h2>
          </div>

          {/* transition-[...] listado explicitamente (sem "opacity"/transform) porque
              esses cards também são alvo do gsap-from-bottom (scroll reveal) — uma
              transição CSS "all"/opacity nas MESMAS propriedades que o GSAP escreve a
              cada frame trava a animação (o card fica preso em opacity:0 pra sempre,
              mesmo com o tween do GSAP terminando normalmente). Bug real encontrado e
              confirmado via browser real (tween.progress() chegava a 1, computed
              opacity nunca saía de 0). */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {services.map(service => (
              <div
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`gsap-from-bottom service-card-glow p-6 rounded-2xl cursor-pointer transition-[color,background-color,border-color,box-shadow] duration-300 border-2 shadow-sm hover:shadow-md hover:-translate-y-1 ${
                  service.selected ? 'is-selected bg-[#800020] text-white border-[#800020] transform -translate-y-1' : 'bg-white text-gray-800 border-gray-200 hover:border-[#D4AF37]'
                } ${service.name === 'Combo (Corte + Barba)' && !service.selected ? 'border-[#D4AF37] border-4' : ''}`}
              >
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">{service.name}</h3>
                  <p className={`text-3xl font-black tracking-tight ${service.selected ? 'text-[#D4AF37]' : 'text-[#800020]'}`}>R$ {service.price}</p>
                  <div className={`text-xs font-bold tracking-wider uppercase flex items-center gap-2 ${service.selected ? 'text-white' : 'text-gray-400'}`}>
                    {service.selected ? <><CheckCircle className="w-4 h-4 text-[#D4AF37]"/> Selecionado</> : 'Clique para Escolher'}
                  </div>
                </div>
              </div>
            ))}
          </div>

{/* BARRA DE RESUMO INTERATIVA (CHECKOUT) */}
          <div className="bg-gradient-to-r from-[#800020] to-[#500010] p-6 md:p-8 rounded-2xl shadow-[0_10px_40px_-15px_rgba(128,0,32,0.6)] border-b-4 md:border-b-0 md:border-l-8 border-[#D4AF37] flex flex-col md:flex-row justify-between items-center gap-6 mt-12 relative overflow-hidden transition-all duration-500">
            
            {/* Efeito de brilho de fundo na barra */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            <div className="relative z-10 text-center md:text-left flex-1">
              <p className="text-white/60 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Resumo da sua escolha</p>
              <p className="text-white font-medium text-lg">
                Serviços selecionados: <span className="text-[#D4AF37] font-black text-2xl ml-2">{selectedServices.length}</span>
              </p>
            </div>
            
            <div className="relative z-10 text-center md:text-right md:pr-8 md:border-r border-white/10">
              <p className="text-white/60 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Valor Total</p>
              <p className="text-4xl font-black text-[#D4AF37] tracking-tighter">
                <span className="text-xl text-[#D4AF37]/70 mr-1">R$</span>{totalPrice.toFixed(2)}
              </p>
            </div>

            <div className="relative z-10 w-full md:w-auto mt-2 md:mt-0">
               <Button 
                 onClick={openScheduleModal} 
                 disabled={selectedServices.length === 0}
                 className={`w-full md:w-auto px-8 py-7 text-sm font-black tracking-widest rounded-xl transition-all duration-300 ${
                   selectedServices.length > 0
                   ? 'bg-[#D4AF37] text-[#800020] hover:bg-white hover:scale-105 hover:-translate-y-0.5 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_10px_30px_-6px_rgba(212,175,55,0.7)] animate-pulse'
                   : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'
                 }`}
               >
                 {selectedServices.length > 0 ? 'FINALIZAR AGENDAMENTO' : 'SELECIONE UM SERVIÇO'}
               </Button>
            </div>
          </div>
        </div>
        {/* Cor da onda acompanha a próxima seção real (Serviço Especial escuro, se
            habilitado, senão a seção de Localização, branca). */}
        <WaveDivider fill={siteConfig.servicoEspecial.habilitado ? '#111111' : '#FFFFFF'} />
      </section>

{/* SEÇÃO: SERVIÇO ESPECIAL (opcional, omitida se desabilitada no config) */}
      {siteConfig.servicoEspecial.habilitado && (
        <section id={siteConfig.servicoEspecial.anchorId} className="gsap-fade-section py-24 bg-[#111111] relative border-t border-b border-[#D4AF37]/30">
          {/* Efeito de luz sutil no fundo */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-[#D4AF37]/5 blur-[120px] pointer-events-none"></div>

          <div className="container mx-auto px-4 relative z-10">

            {/* Header da Seção */}
            <div className="gsap-from-top text-center max-w-3xl mx-auto mb-16">
              <span className="text-[#D4AF37] font-bold text-sm tracking-[0.3em] uppercase mb-4 block">{siteConfig.servicoEspecial.tag}</span>
              <SectionOrnament justify="justify-center" />
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight">
                {siteConfig.servicoEspecial.titulo}
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                {siteConfig.servicoEspecial.descricao}
              </p>
            </div>

            {/* Grid de itens do serviço especial */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
              {siteConfig.servicoEspecial.itens.map((item, index) => (
                <div key={index} className="gsap-from-bottom bg-white/5 border border-white/10 p-8 rounded-2xl hover:border-[#D4AF37]/50 transition-colors">
                  <div className="mb-4"><Star className="w-8 h-8 text-[#D4AF37]" /></div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.titulo}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Call to Action: Orçamento Customizado */}
            <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 text-center shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Monte o Pacote Perfeito</h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Fale com a gente para montar um atendimento sob medida, com os serviços e horário que funcionam melhor para você.
              </p>
              <button onClick={abrirWhatsAppServicoEspecial} className="bg-[#1A1A1A] hover:bg-[#800020] text-white font-black px-10 py-5 rounded-xl text-lg shadow-lg hover:shadow-[0_14px_35px_-10px_rgba(128,0,32,0.7)] transition-all duration-300 hover:scale-105 hover:-translate-y-1 w-full sm:w-auto">
                {siteConfig.servicoEspecial.ctaTexto}
              </button>
              <p className="text-xs text-gray-400 mt-6 uppercase tracking-widest font-bold">
                Espaço sujeito à disponibilidade de agenda
              </p>
            </div>

          </div>
        </section>
      )}

      {/* SEÇÃO: LOCALIZAÇÃO E CONTATO */}
      <section id="localizacao" className="gsap-fade-section relative py-20 md:py-32 bg-white overflow-hidden">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="gsap-from-left space-y-10">
              <div>
                <p className="text-[#D4AF37] font-semibold text-sm tracking-widest mb-2">VENHA NOS VISITAR</p>
                <SectionOrnament />
                <h2 className="text-4xl font-serif font-bold text-[#800020]">O Seu Refúgio em {siteConfig.bairroCidade.split(',')[0]?.trim() || siteConfig.bairroCidade}</h2>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-start gap-5 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#D4AF37] transition-colors">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <MapPin className="text-[#800020] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">Endereço</h4>
                    <p className="text-gray-600">{siteConfig.endereco}<br/>{siteConfig.bairroCidade}</p>
                  </div>
                </div>

                <div className="flex items-start gap-5 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#D4AF37] transition-colors">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <Clock className="text-[#800020] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">Horário de Funcionamento</h4>
                    <p className="text-gray-600" style={{ whiteSpace: 'pre-line' }}>{siteConfig.horarioFuncionamentoDetalhado}</p>
                  </div>
                </div>

                <div className="flex items-start gap-5 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#D4AF37] transition-colors">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <Phone className="text-[#800020] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">Contato</h4>
                    <p className="text-gray-600">{siteConfig.telefoneExibicao}<br/>{siteConfig.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="gsap-from-right h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-50 relative bg-gray-100 flex items-center justify-center">
               <iframe 
                 src={siteConfig.googleMapsEmbedUrl} 
                 width="100%" 
                 height="100%" 
                 style={{ border: 0 }} 
                 allowFullScreen={true} 
                 loading="lazy" 
                 referrerPolicy="no-referrer-when-downgrade"
               ></iframe>
            </div>
          </div>
        </div>
        <WaveDivider fill={siteConfig.corPrimaria} />
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1A1A1A] pt-16 pb-8 border-t-[8px] border-[#800020]">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 border-2 border-[#D4AF37] flex items-center justify-center p-1">
                  <div className="w-full h-full bg-[#800020] flex items-center justify-center">
                    <span className="text-[#D4AF37] font-serif font-black text-lg">{siteConfig.nomeBarbeariaCurto.charAt(0)}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-white text-2xl tracking-[0.2em] uppercase">{siteConfig.nomeBarbeariaCurto}</span>
                </div>
              </div>

              <p className="text-gray-400 leading-relaxed max-w-sm mb-8">
                {siteConfig.footerDescricao}
              </p>
              <div className="flex gap-3">
                <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#800020] hover:border-[#800020] text-white transition-all"><Instagram className="w-5 h-5" /></a>
                <a href={`https://wa.me/${siteConfig.whatsappNumero}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:border-[#D4AF37] text-white hover:text-[#800020] transition-all"><MessageCircle className="w-5 h-5" /></a>
                <button onClick={compartilharSite} title="Compartilhar site" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:border-[#D4AF37] text-white hover:text-[#800020] transition-all"><Share2 className="w-5 h-5" /></button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white text-lg mb-6 tracking-wide">Navegação</h4>
              <ul className="space-y-3">
                <li><a href="#historia" className="text-gray-400 hover:text-[#D4AF37] transition-colors">História</a></li>
                <li><a href="#servicos" className="text-gray-400 hover:text-[#D4AF37] transition-colors">Serviços</a></li>
                {siteConfig.servicoEspecial.habilitado && (
                  <li><a href={`#${siteConfig.servicoEspecial.anchorId}`} className="text-gray-400 hover:text-[#D4AF37] transition-colors">{siteConfig.servicoEspecial.titulo}</a></li>
                )}
                <li><a href="#localizacao" className="text-gray-400 hover:text-[#D4AF37] transition-colors">Localização</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-lg mb-6 tracking-wide">Atendimento</h4>
              <ul className="space-y-3">
                <li className="text-gray-400">{siteConfig.bairroCidade}</li>
                <li className="text-gray-400">{siteConfig.telefoneExibicao}</li>
                <li><a href="#servicos" onClick={openScheduleModal} className="text-[#D4AF37] font-bold hover:underline">Agendar Horário</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} {siteConfig.nomeBarbeariaCurto} Barbearia. Todos os direitos reservados.
            </p>
            <p className="text-gray-500 text-sm">
              Desenvolvido por <a href={`https://wa.me/${siteConfig.desenvolvedorWhatsapp}?text=${encodeURIComponent(siteConfig.desenvolvedorMensagem)}`} target="_blank" rel="noopener noreferrer" className="font-bold text-gray-300 hover:text-[#D4AF37] transition-colors underline decoration-[#D4AF37]/50 underline-offset-4">{siteConfig.desenvolvedorNome}</a>
            </p>
          </div>
        </div>
      </footer>

      {/* MODAL DE AGENDAMENTO */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto md:overflow-hidden p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-serif font-bold text-[#800020]">Agendar Atendimento</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-6">
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
              <div className="truncate pr-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serviços Selecionados</p>
                <p className="text-sm font-bold text-gray-800 truncate">{selectedServicesText}</p>
              </div>
              <div className="text-right whitespace-nowrap">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                <p className="text-lg font-black text-[#800020]">R$ {totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-widest border-b border-gray-100 pb-2">1. Seus Dados</h3>
                
                <Input type="text" placeholder="Nome completo *" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full border-2 border-gray-100 focus:border-[#D4AF37] rounded-xl h-12 font-medium bg-gray-50/50" required />
                
                <div className="grid grid-cols-2 gap-3">
                  <Input type="tel" placeholder="Celular *" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: maskPhone(e.target.value) }))} className="w-full border-2 border-gray-100 focus:border-[#D4AF37] rounded-xl h-12 font-medium bg-gray-50/50" required />
                  <Input type="email" placeholder="E-mail *" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full border-2 border-gray-100 focus:border-[#D4AF37] rounded-xl h-12 font-medium bg-gray-50/50" required />
                </div>
                <Textarea placeholder="Observação para o barbeiro? (Opcional)" value={formData.message} onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))} className="w-full border-2 border-gray-100 focus:border-[#D4AF37] rounded-xl resize-none h-20 font-medium bg-gray-50/50" />
              </div>

              <div className="space-y-4 flex flex-col">
                <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-widest border-b border-gray-100 pb-2">2. O Agendamento</h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {professionals.map((pro: any) => (
                    <div
                      key={pro.id}
                      onClick={() => setFormData(prev => ({ ...prev, professional: pro.name }))}
                      className={`p-2 border-2 rounded-xl cursor-pointer text-center transition-all flex flex-col justify-center items-center min-h-[5rem] ${
                        formData.professional === pro.name ? 'border-[#800020] bg-[#800020]/10 shadow-sm' : 'border-gray-100 hover:border-[#D4AF37]'
                      }`}
                    >
                      <p className="font-bold text-[#800020] text-sm">{pro.name}</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight">{pro.specialty}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Data *</label>
                    <DateField value={formData.date} onChange={date => setFormData(prev => ({ ...prev, date }))} minIso={dataHoje} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Horário *</label>
                    <select
                      value={formData.time}
                      onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      disabled={!formData.date || !formData.professional || carregandoHorarios || isDataPassada}
                      className="w-full border-2 border-gray-100 focus:border-[#D4AF37] rounded-xl h-12 bg-white disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer font-bold text-sm"
                      required
                    >
                      <option value="" disabled>
                        {isDataPassada 
                          ? "Data indisponível" 
                          : (!formData.date || !formData.professional ? "Selecione..." : carregandoHorarios ? "Buscando..." : "Horários livres")}
                      </option>
                        {!isDataPassada && horariosLivres?.map((slot: any) => (
                        <option key={slot.time} value={slot.time} disabled={!slot.available} className={!slot.available ? "text-red-700 bg-gray-200" : "text-gray-900"}>
                          {slot.time} {!slot.available ? " (Indisponível)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-auto pt-4 space-y-3">
                  {successMessage && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-xl">
                      <p className="text-green-700 font-bold text-center text-sm">{successMessage}</p>
                      <p className="text-green-700/70 text-center text-xs mt-1">
                        Precisa cancelar ou remarcar? Fale conosco no{' '}
                        <a
                          href={`https://wa.me/${siteConfig.whatsappNumero}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline"
                        >
                          WhatsApp
                        </a>
                        .
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)} className="flex-1 border-2 border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-bold h-14 rounded-xl transition-all duration-300 hover:scale-105">CANCELAR</Button>
                  <Button type="submit" disabled={!formData.professional || !formData.date || isDataPassada || createAppointmentMutation.isPending} className="flex-[2] bg-[#800020] hover:bg-[#600018] text-white font-black h-14 rounded-xl shadow-lg text-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_28px_-8px_rgba(128,0,32,0.7)] disabled:hover:scale-100">
                    {createAppointmentMutation.isPending ? "AGENDANDO..." : "CONFIRMAR"}
                  </Button>
                </div>
                </div>

              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* BOTÃO FLUTUANTE DO WHATSAPP */}
      <a
        href={`https://wa.me/${siteConfig.whatsappNumero}?text=${encodeURIComponent(`Olá! Gostaria de agendar um horário na ${siteConfig.nomeBarbeariaCurto}.`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-8 h-8"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </a>

    </div>
  );
}