import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { siteConfig } from "@/config/site";

// Tempo de espera antes do chat abrir sozinho ao carregar a página (demos ao vivo).
const AUTO_OPEN_DELAY_MS = 4000;

// Validação simples de formato (contém @ e domínio com ponto) — não valida
// entregabilidade real, só a forma do texto digitado.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ChatConfirmation {
  name?: string;
  service: string;
  professional: string;
  date: string;
  time: string;
  totalPrice?: string;
}

interface ChatMessage {
  role: string;
  text: string;
  confirmation?: ChatConfirmation;
}

// Formata "2026-07-18" -> "Sexta, 18/07/2026" (DD/MM/AAAA, nunca MM/DD)
function formatarConfirmacaoData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  if (!ano || !mes || !dia) return dataIso;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" });
  const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1).split("-feira")[0];
  return `${diaSemanaCapitalizado}, ${dia}/${mes}/${ano}`;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const userInteracted = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 👇 1. Novos estados para a Memória de Longo Prazo
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [chatLiberado, setChatLiberado] = useState(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "ai", text: `Olá! Sou a recepcionista da ${siteConfig.nomeBarbeariaCurto}. Quer agendar um Corte Tradicional ou verificar horários?` }
  ]);

  // Abre o chat sozinho alguns segundos após a página carregar, para demos ao
  // vivo não perderem tempo com o clique — mas não reabre se o usuário já
  // interagiu manualmente (abrindo ou fechando) antes do timer disparar.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!userInteracted.current) setIsOpen(true);
    }, AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const toggleOpen = (value: boolean) => {
    userInteracted.current = true;
    setIsOpen(value);
  };

  const chatMutation = trpc.chatWithAI.useMutation({
    onSuccess: (data) => {
      setChatHistory((prev) => [...prev, { role: "ai", text: data?.reply || "Desculpe, ocorreu um erro de conexão.", confirmation: data?.confirmation }]);
    }
  });

  // Rola a lista de mensagens até o final sempre que uma nova mensagem chega
  // (ou o indicador "Digitando..." aparece) — sem isso, respostas novas (como
  // o cartão de confirmação) renderizam fora da área visível da caixa de chat.
  // "instant" (não "smooth"): esse efeito dispara duas vezes por troca de
  // mensagem (quando "Digitando..." aparece e de novo quando a resposta
  // chega), e duas rolagens "smooth" em sequência rápida podem se
  // interromper uma à outra, deixando o scroll parado numa posição
  // intermediária arbitrária em vez do final.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [chatHistory, chatMutation.isPending]);
  const handleSend = () => {
    if (!message.trim()) return;
    
    // 👇 Agora enviamos o telefone limpo (só os números) e o e-mail junto com a mensagem!
    chatMutation.mutate({
      message: message,
      history: chatHistory,
      telefone: telefoneCliente.replace(/\D/g, ''),
      email: emailCliente,
    });
    
    setChatHistory((prev) => [...prev, { role: "user", text: message }]);
    setMessage(""); 
  };

  // 👇 2. Função de validação e liberação do chat
  // Só o e-mail é obrigatório para liberar o chat — o WhatsApp continua
  // disponível no formulário, mas agora é opcional (não bloqueia o início
  // do atendimento se o cliente preferir não informar).
  const iniciarChat = () => {
    if (!EMAIL_REGEX.test(emailCliente.trim())) {
      alert("Por favor, insira um e-mail válido.");
      return;
    }
    setChatLiberado(true);
  };

  const emailValido = EMAIL_REGEX.test(emailCliente.trim());

const maskPhone = (value: string) => {
  // Remove imediatamente tudo que não for número
  let v = value.replace(/\D/g, "");
  
  // Aplica a máscara visual dependendo do tamanho (Telefone Fixo vs Celular)
  if (v.length <= 10) {
    v = v.replace(/^(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    v = v.replace(/^(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
  }
  
  // Trava no limite máximo de 15 caracteres no formato: (XX) XXXXX-XXXX
  return v.substring(0, 15);
};

  return (
    // Cores do widget lidas de siteConfig em tempo de execução via CSS custom
    // properties (não hex hardcoded) — permite usar Tailwind normalmente
    // (bg-[var(--chat-accent)], focus:border-[var(--chat-accent)], etc.),
    // inclusive em pseudo-classes como :focus/:hover, o que um style inline
    // sozinho não conseguiria.
    <div
      className="fixed bottom-28 right-6 z-50"
      style={{ '--chat-accent': siteConfig.corDestaque, '--chat-gold': siteConfig.corAcento } as React.CSSProperties}
    >
      {isOpen && (
        <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl w-80 h-96 min-w-[300px] min-h-[400px] max-w-md max-h-[80vh] mb-4 resize overflow-auto p-[2px]">
          
          <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden">
            
            <div className="bg-[var(--chat-accent)] text-white p-4 flex justify-between items-center shadow-md shrink-0">
              <div>
                <h3 className="font-bold tracking-wide">{siteConfig.nomeBarbeariaCurto} AI</h3>
                <p className="text-xs text-white/70">Recepção</p>
              </div>
              <button onClick={() => toggleOpen(false)} className="hover:bg-black/20 p-1 rounded transition-colors">
                <X size={20} />
                <span className="text-white font-bold text-xl tracking-wider">IA</span>
              </button>
            </div>

            {/* 👇 3. CONTROLE DE FLUXO: Tela de Boas-vindas vs Chat Original */}
            {!chatLiberado ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm" style={{ backgroundColor: `${siteConfig.corDestaque}1A` }}>
                  <Mail className="text-[var(--chat-accent)] w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Bem-vindo(a)! 💈</h2>
                <p className="text-sm text-gray-500 mb-6">Para agilizar seu atendimento, insira seu e-mail:</p>

                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="border-2 border-gray-200 focus:border-[var(--chat-accent)] p-3 rounded-xl w-full text-center font-bold text-gray-700 outline-none transition-colors mb-3"
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && iniciarChat()}
                />

                <input
                  type="tel"
                  maxLength={15}
                  placeholder="(41) 99999-9999 (opcional)"
                  className="border-2 border-gray-200 focus:border-[var(--chat-accent)] p-3 rounded-xl w-full text-center font-bold text-gray-700 outline-none transition-colors mb-4"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(maskPhone(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && iniciarChat()}
                />

                <button
                  onClick={iniciarChat}
                  disabled={!emailValido}
                  className="bg-[var(--chat-accent)] text-white px-6 py-3 rounded-xl font-bold w-full disabled:opacity-50 hover:brightness-90 transition-colors shadow-md"
                >
                  Iniciar Atendimento
                </button>
              </div>
            ) : (
              <>
                {/* 🚀 O SEU CHAT ORIGINAL RENDERIZA AQUI */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col space-y-3">
                  {chatHistory.map((msg, i) => (
                    msg.confirmation ? (
                      <div
                        key={i}
                        // shrink-0: sem isso, o card colapsa quase a zero de altura — como é
                        // item de um flex column com overflow-hidden, o flexbox reseta a
                        // min-height automática dele de "auto" (tamanho do conteúdo) para 0,
                        // deixando o algoritmo de flex encolher o card quando o container de
                        // mensagens fica sem espaço, e o próprio overflow-hidden então corta
                        // o conteúdo já encolhido (só sobra uma linha da borda dourada visível).
                        className="self-start max-w-[90%] rounded-xl border-2 shadow-sm overflow-hidden shrink-0"
                        style={{ borderColor: siteConfig.corAcento }}
                      >
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-white font-bold text-sm"
                          style={{ backgroundColor: siteConfig.corDestaque }}
                        >
                          <CheckCircle2 size={18} style={{ color: siteConfig.corAcento }} />
                          Agendado!
                        </div>
                        <div className="bg-white px-4 py-3 space-y-1">
                          <p className="text-gray-800 font-bold text-sm">{msg.confirmation.service}</p>
                          <p className="text-gray-600 text-xs">
                            com {msg.confirmation.professional} • {formatarConfirmacaoData(msg.confirmation.date)} às {msg.confirmation.time}
                          </p>
                        </div>
                        <p className="bg-gray-50 px-4 py-2 text-[10px] text-gray-500 border-t border-gray-100">
                          Precisa cancelar ou remarcar? Fale com a gente no{' '}
                          <a
                            href={`https://wa.me/${siteConfig.whatsappNumero}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline"
                            style={{ color: siteConfig.corDestaque }}
                          >
                            WhatsApp
                          </a>
                          .
                        </p>
                      </div>
                    ) : (
                      <div
                        key={i}
                        className={`p-3 rounded-xl text-sm max-w-[85%] shadow-sm ${
                          msg.role === 'ai'
                            ? 'bg-white border border-gray-100 text-gray-800 self-start rounded-tl-none'
                            : 'bg-[var(--chat-accent)] text-white self-end rounded-tr-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )
                  ))}
                  {chatMutation.isPending && (
                    <div className="bg-white border border-gray-100 text-gray-800 p-3 rounded-xl rounded-tl-none self-start max-w-[85%] text-sm shadow-sm flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[var(--chat-accent)]" /> Digitando...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t bg-white flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escreva sua dúvida..."
                    className="flex-1 p-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[var(--chat-accent)] transition-colors"
                    disabled={chatMutation.isPending}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={chatMutation.isPending || !message.trim()}
                    className="bg-[var(--chat-accent)] text-white p-2 rounded-lg hover:brightness-90 transition-colors disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => toggleOpen(true)}
          className="bg-[var(--chat-accent)] text-white rounded-full shadow-2xl hover:brightness-90 transition-all hover:scale-110 flex items-center justify-center mt-2 h-12 w-12 md:h-14 md:w-14"
        >
          <span className="font-bold text-base md:text-xl tracking-wider">IA</span>
        </button>
      )}
    </div>
  );
}