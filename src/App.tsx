// Top imports
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, User, Star, Feather, Map, Play, Heart, Zap, Check, Share2, Award, CheckCircle2, XCircle, Gift, Send, Download, Focus, Ticket, MapPin, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { playFlipSound, playCollectSound, playJumpSound, playCorrectSound, playWrongSound, playVictorySound } from './lib/audio';
import { jsPDF } from 'jspdf';

import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Character {
  id: string;
  name: string;
  role: string;
  power: string;
  description: string;
  icon: any;
  image?: string; // Adicionado suporte para imagem
  color: string;
  quote: string;
}

const characters: Character[] = [
  {
    id: 'iza',
    name: 'Iza',
    role: 'A Viajante',
    power: 'Curiosidade e Imaginação',
    description: 'Uma garotinha curiosa que acaba caindo no mundo mágico das palavras.',
    icon: User,
    image: '/iza3.jpg',
    color: 'from-neon-pink to-vibrant-purple',
    quote: '"Mas por que tudo tem que ter regra?"'
  },
  {
    id: 'rei',
    name: 'O Rei Substantivo',
    role: 'Soberano das Palavras',
    power: 'Dar nome a tudo que existe',
    description: 'Governante do Reino Gramaravilha. Sem sua majestade para nomear as coisas, o reino seria um completo vazio.',
    icon: Star,
    image: '/reiperfil.jpg',
    color: 'from-electric-cyan to-vibrant-purple',
    quote: '"Se existe no meu reino, eu tenho que dar um nome!"'
  },
  {
    id: 'rainha',
    name: 'A Rainha Adjetivo',
    role: 'A Majestade da Sintaxe',
    power: 'Transformar e embelezar',
    description: 'Ela possui o dom mágico de mudar as coisas, deixando-as grandes, pequenas, bonitas, feias, brilhantes ou opacas.',
    icon: Sparkles,
    image: '/rainha.jpg',
    color: 'from-sun-yellow to-neon-pink',
    quote: '"Tudo fica melhor com um toque da rainha!"'
  },
  {
    id: 'adverbio',
    name: 'Sr. Advérbio',
    role: 'O Intensificador',
    power: 'Mudar as circunstâncias',
    description: 'Está sempre mudando o tempo, o modo e o lugar de todas as coisas que acontecem.',
    icon: Map,
    image: '/adverbio.jpg',
    color: 'from-green-500 to-electric-cyan',
    quote: '"Sempre, nunca, talvez... quem sabe?"'
  },
  {
    id: 'artigo',
    name: 'O Artigo',
    role: 'O Apresentador',
    power: 'Definir e Indefinir',
    description: 'Aquele que sempre vem na frente para apresentar quem está chegando na frase.',
    icon: Feather,
    image: '/artigo.jpg',
    color: 'from-neon-pink to-sun-yellow',
    quote: '"Eu sou O artigo, não um artigo qualquer!"'
  },
  {
    id: 'monstro',
    name: 'Monstro Gramática',
    role: 'A Grande Exceção',
    power: 'Desafiar as regras',
    description: 'Uma figura assustadora e complexa, cheia de regras difíceis de domar e muitas exceções.',
    icon: BookOpen,
    image: '/monstrogramatica.jpg',
    color: 'from-electric-cyan to-green-500',
    quote: '"Você esqueceu a vírgula antes do mas!"'
  },
  {
    id: 'narrador',
    name: 'Narrador',
    role: 'O Contador de Histórias',
    power: 'Guiar a jornada',
    description: 'Conhece cada canto do reino e guia os viajantes por essa linda aventura.',
    icon: User,
    image: '/narradorth.jpg',
    color: 'from-sun-yellow to-vibrant-purple',
    quote: '"Era uma vez, em um reino de letras..."'
  }
];

const quizQuestions = [
  {
    question: "Sabendo que o Rei Substantivo dá nome às coisas e a Rainha Adjetivo as embeleza, indique a alternativa que corresponde aos papéis de 'menina' e 'curiosa' na frase: 'A menina curiosa entrou no Reino'.",
    options: ["Verbo e Substantivo", "Substantivo e Adjetivo", "Adjetivo e Advérbio", "Artigo e Substantivo"],
    correct: 1
  },
  {
    question: "O Sr. Advérbio muda as circunstâncias das ações no Reino Gramaravilha. Na frase 'A garota correu RAPIDAMENTE do Monstro Gramática', qual a circunstância indicada pela palavra destacada?",
    options: ["Tempo", "Lugar", "Intensidade", "Modo"],
    correct: 3
  },
  {
    question: "Dona Ação (Verbo) nunca para quieta! Assinale a alternativa que contém apenas verbos na sua forma no infinitivo (sua forma base ou 'nome' da ação):",
    options: ["Correndo, Pulando, Estudando", "Alegria, Corrida, Salto", "Estudar, Aprender, Conhecer", "Correu, Estudou, Dormiu"],
    correct: 2
  },
  {
    question: "A Fada Vírgula dita o ritmo! Em qual destas situações a sua ausência altera drasticamente o sentido da frase?",
    options: ["'Não quero jogar!' / 'Não, quero jogar!'", "'Iza é aventureira' / 'Iza é linda'", "'Eu fui ao grande castelo' / 'Eu fui no enorme castelo'", "'Ele ama maçã uva e banana'"],
    correct: 0
  }
];

export default function App() {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [collected, setCollected] = useState<Record<string, boolean>>({});
  const [jumpingCards, setJumpingCards] = useState<Record<string, boolean>>({});

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // New Features State
  const [energyCount, setEnergyCount] = useState(0);
  const [globalEnergy, setGlobalEnergy] = useState(15420); // Simulated global start state
  const [particles, setParticles] = useState<{ id: number, x: number }[]>([]);
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);
  
  const [challengeWord, setChallengeWord] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengeEmail, setChallengeEmail] = useState('');
  const [challengePhone, setChallengePhone] = useState('');
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);

  const [showBookModal, setShowBookModal] = useState(false);
  const [bookPage, setBookPage] = useState(0);

  const handleDownloadPDF = () => {
    playCollectSound();
    
    // Create new PDF instance
    const doc = new jsPDF();
    
    // Colors and Fonts Configurations
    doc.setTextColor(255, 20, 147); // neon-pink
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Iza no Reino Gramaravilha", 105, 30, { align: "center" });

    doc.setTextColor(0, 0, 0); // pure-black
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text("Curiosidades Exclusivas da Peça", 105, 45, { align: "center" });
    
    // Add line separator
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(20, 50, 190, 50);

    doc.setFontSize(12);
    
    const curiosities = [
      "Curiosidade #1: A Fada Vírgula",
      "Você sabia que a Fada Vírgula costumava ser bailarina? Ela dita o ritmo das frases e ensina os outros moradores a respirar e dançar nas pausas!",
      "",
      "Curiosidade #2: O Motor do Reino",
      "Os verbos são o motor do reino! Sem eles, todos ficariam parados no tempo. Quando um verbo de ação passa correndo, até as montanhas tremem!",
      "",
      "Curiosidade #3: O Tempero Mágico",
      "Os advérbios são como temperos na Gramaravilha. Tente comer uma maçã 'vagarosamente' e depois 'explosivamente'. O advérbio muda completamente a ação!",
      "",
      "Curiosidade #4: O Monstro da Gramática",
      "Iza encontra o Monstro da Gramática, um ser gigantesco e assustador, mas que no fundo apenas adora devorar palavras proparoxítonas porque acha o som delas delicioso.",
      "",
      "Curiosidade #5: A Realeza e os Nomes",
      "O Rei Substantivo é quem dá nome a absolutamente tudo no reino. A lenda diz que antes dele ser coroado, as cadeiras eram chamadas de 'aquilo de sentar' e as maçãs de 'coisa vermelha de morder'.",
      "",
      "Curiosidade #6: Fronteiras Imaginárias",
      "O inventor 'Lápis Mágico' foi quem desenhou as fronteiras e as leis de pontuação do Reino Gramaravilha. Dizem que sem ele, a imaginação não teria limites nem direção!"
    ];

    let yOffset = 65;
    
    curiosities.forEach(line => {
      // If title
      if (line.startsWith("Curiosidade #")) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(138, 43, 226); // purpleish
        doc.text(line, 20, yOffset);
        yOffset += 8;
      } else if (line === "") {
        yOffset += 4;
      } else {
        // Body text
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        // Automatically wrap text
        const splitText = doc.splitTextToSize(line, 170);
        doc.text(splitText, 20, yOffset);
        yOffset += (splitText.length * 6) + 4;
      }
      
      // Auto page break
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 30;
      }
    });

    // Final Footer
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.text("Aguardamos você no espetáculo! - Equipe do Reino Gramaravilha", 105, 285, { align: "center" });

    doc.save('Reino_Gramaravilha_Ebook.pdf');
  };

  // Simulate global energy incrementing
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalEnergy(prev => prev + Math.floor(Math.random() * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendEnergy = () => {
    playCollectSound();
    setEnergyCount(prev => prev + 1);
    setGlobalEnergy(prev => prev + 1);
    const newParticle = { id: Date.now(), x: Math.random() * 100 - 50 };
    setParticles(prev => [...prev, newParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1500);
  };

  const handleFlip = (id: string) => {
    // Easter Egg: Monstro Gramática
    if (id === 'monstro') {
      playJumpSound();
      setJumpingCards(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setJumpingCards(prev => ({ ...prev, [id]: false })), 500);
    } else {
      playFlipSound();
    }
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCollect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    playCollectSound();
    setCollected(prev => ({ ...prev, [id]: true }));
  };

  const progress = Object.values(collected).filter(Boolean).length;
  const total = characters.length;
  const isAllCollected = progress === total;

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === quizQuestions[currentQuestion].correct;
    setIsAnswerCorrect(isCorrect);
    
    if (isCorrect) {
      playCorrectSound();
      setScore(prev => prev + 1);
    } else {
      playWrongSound();
    }
    
    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswerCorrect(null);
      } else {
        playVictorySound();
        setShowQuizResult(true);
      }
    }, 1500);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowQuizResult(false);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Iza no Reino Gramaravilha',
      text: 'Eu testei meus conhecimentos, li o livro mágico e enviei energia para o espetáculo Iza no Reino Gramaravilha! Venha participar você também! ✨🎭📚',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert("Link copiado para a área de transferência!");
      }
    } catch (err) {
      console.log('Erro ao compartilhar', err);
    }
  };

  return (
    <div className="min-h-screen bg-vibrant-purple font-sans text-pure-white selection:bg-neon-pink/50 pb-32">
      {/* Header Interativo */}
      <header className="flex flex-col sm:flex-row justify-between items-center sm:items-end p-6 border-b-4 border-pure-black bg-vibrant-purple/90 sticky top-0 z-50 backdrop-blur-md gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-[-1px] leading-[0.9] skew-title text-transparent bg-clip-text bg-gradient-to-r from-pure-white to-electric-cyan" style={{ textShadow: '3px 3px 0px var(--color-pure-black)' }}>
            Iza no Reino<br/>Gramaravilha
          </h1>
          <div className="flex gap-2 items-center mt-2">
            <span className="bg-sun-yellow text-pure-black px-2 py-0.5 font-extrabold uppercase text-[10px] inline-block rotate-subtitle">
              Colecionável Digital
            </span>
            <span className="bg-electric-cyan border-2 border-pure-black text-pure-black px-2 py-0.5 font-extrabold uppercase text-[10px] inline-block shadow-[2px_2px_0px_var(--color-pure-black)] animate-pulse flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" /> Energia Global: {globalEnergy.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#bilheteria" className="bg-sun-yellow border-4 border-pure-black text-pure-black rounded-lg px-4 py-2 font-black uppercase shadow-[4px_4px_0px_var(--color-pure-black)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_var(--color-pure-black)] transition-all flex items-center gap-2 group">
            <Ticket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Ingresso Dourado</span>
            <span className="sm:hidden">Comprar</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-12 pb-12 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-[-2px] leading-[0.9] mb-4 skew-title" style={{ textShadow: '6px 6px 0px var(--color-pure-black)' }}>
            Iza no Reino <br className="hidden sm:block" /> Gramaravilha
          </h1>
          <p className="bg-sun-yellow text-pure-black px-3 py-1 font-extrabold uppercase text-sm inline-block rotate-subtitle mb-8 mx-auto">
            Descubra os personagens mágicos que dão vida às palavras. 
            Vire as cartas e complete sua coleção!
          </p>
          
          <div className="inline-flex items-center gap-4 bg-pure-white border-4 border-pure-black rounded-full px-6 py-3 shadow-[12px_12px_0px_var(--color-pure-black)] mb-8">
            <Sparkles className="w-5 h-5 text-neon-pink" />
            <span className="font-extrabold text-pure-black uppercase text-sm">
              Cartas Coletadas: <span className="font-black text-vibrant-purple">{progress}/{total}</span>
            </span>
            <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden ml-2 border-2 border-pure-black">
              <motion.div 
                className="h-full bg-gradient-to-r from-neon-pink to-vibrant-purple"
                initial={{ width: 0 }}
                animate={{ width: `${(progress / total) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Deck Grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {characters.map((char, index) => {
          const isFlipped = flippedCards[char.id];
          const isCollected = collected[char.id];
          const Icon = char.icon;
          const isJumping = jumpingCards[char.id];

          return (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isJumping ? { y: [0, -40, 0], scale: [1, 1.1, 1] } : { opacity: 1, y: 0 }}
              transition={isJumping ? { duration: 0.4, ease: "easeInOut" } : { duration: 0.6, delay: index * 0.1 }}
              className="relative aspect-[3/4] cursor-pointer group"
              onClick={() => handleFlip(char.id)}
              style={{ perspective: '1000px' }}
            >
              {/* Animated Inner Container */}
              <motion.div
                className="w-full h-full relative preserve-3d"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front of Card */}
                <div 
                  className="absolute inset-0 backface-hidden rounded-3xl p-[2px] w-full h-full shadow-2xl"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${char.color} opacity-20 group-hover:opacity-100 transition-opacity duration-500 rounded-[20px] blur-xl`} />
                  <div className={`relative w-full h-full bg-pure-white border-[4px] border-pure-black rounded-[24px] overflow-hidden flex flex-col`} style={{ boxShadow: '12px 12px 0px var(--color-pure-black)' }}>
                    <div className={`h-1/2 w-full bg-gradient-to-b ${char.color} p-6 flex flex-col justify-between relative`}>
                       {char.image && (
                         <div className="absolute inset-0 overflow-hidden border-b-4 border-pure-black">
                           <img 
                             src={char.image} 
                             alt={char.name} 
                             className="w-full h-full object-cover mix-blend-overlay opacity-80"
                             referrerPolicy="no-referrer"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-pure-black/50 via-transparent to-transparent" />
                         </div>
                       )}
                       <div className="flex justify-between items-start w-full relative z-10">
                          <div className="bg-pure-black/40 backdrop-blur-md border-2 border-pure-black rounded-full p-2">
                             <Icon className="w-6 h-6 text-pure-white" />
                          </div>
                          {isCollected && (
                            <div className="bg-sun-yellow text-pure-black text-xs font-black uppercase px-3 py-1 rounded-full border-2 border-pure-black shadow-[4px_4px_0px_var(--color-pure-black)] flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              CAPTURADO
                            </div>
                          )}
                       </div>
                    </div>
                    <div className="p-8 flex flex-col flex-grow items-center justify-center text-center relative bg-pure-white">
                       <h3 className="text-2xl font-black text-pure-black uppercase mb-2">{char.name}</h3>
                       <p className="text-pure-black font-extrabold uppercase tracking-widest text-xs opacity-70">{char.role}</p>
                       <p className="text-xs text-pure-black/50 mt-6 mt-auto font-bold uppercase tracking-widest">Toque para virar</p>
                    </div>
                  </div>
                </div>

                {/* Back of Card */}
                <div 
                  className="absolute inset-0 backface-hidden rounded-[24px] border-[4px] border-pure-black bg-pure-white p-8 flex flex-col items-center justify-between shadow-[12px_12px_0px_var(--color-pure-black)] text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="w-full">
                    <div className="mb-6 flex justify-center">
                       <div className={`p-4 rounded-full bg-gradient-to-br ${char.color} border-4 border-pure-black shadow-[4px_4px_0px_var(--color-pure-black)]`}>
                         <Icon className="w-8 h-8 text-pure-black" />
                       </div>
                    </div>
                    <h4 className="text-vibrant-purple text-xs font-black tracking-widest uppercase mb-4">
                      Poder Gramatical
                    </h4>
                    <p className="text-pure-black font-extrabold text-lg leading-snug mb-6">
                      {char.power}
                    </p>
                    <p className="text-pure-black/80 font-bold text-sm leading-relaxed mb-8">
                      {char.description}
                    </p>
                    <div className="relative">
                      <div className="absolute -left-2 -top-4 text-4xl text-neon-pink font-black">"</div>
                      <p className="text-pure-black italic font-bold text-sm relative z-10 px-4">
                        {char.quote}
                      </p>
                    </div>
                  </div>

                  {!isCollected ? (
                    <button 
                      onClick={(e) => handleCollect(e, char.id)}
                      className={`w-full py-4 mt-8 rounded-full border-4 border-pure-black bg-gradient-to-r ${char.color} text-pure-black font-black text-sm uppercase tracking-wider shadow-[6px_6px_0px_var(--color-pure-black)] hover:shadow-[4px_4px_0px_var(--color-pure-black)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center gap-2`}
                    >
                      <Sparkles className="w-4 h-4 text-pure-black" />
                      COLECIONAR
                    </button>
                  ) : (
                    <div className="w-full py-4 mt-8 rounded-full border-4 border-pure-black bg-pure-white text-pure-black/60 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                       Capturado
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Quiz Section */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-6 lg:px-8 mt-24"
      >
        <div className="bg-pure-white border-[4px] border-pure-black rounded-[24px] overflow-hidden shadow-[12px_12px_0px_var(--color-pure-black)] relative">
          <div className="p-4 bg-sun-yellow border-b-4 border-pure-black flex items-center justify-between">
            <h2 className="text-pure-black font-black text-xl uppercase tracking-widest flex items-center gap-2">
              <Award className="w-6 h-6" /> Teste antes do Espetáculo
            </h2>
            <div className="flex gap-2">
              <div className="text-pure-black font-extrabold uppercase text-xs">
                Acertos: <span className="text-neon-pink text-lg">{score}</span>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 bg-vibrant-purple relative overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-pure-white) 2px, transparent 2px), linear-gradient(90deg, var(--color-pure-white) 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>

             <AnimatePresence mode="wait">
               {!showQuizResult ? (
                 <motion.div 
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="relative z-10"
                 >
                   <div className="inline-block bg-pure-black text-sun-yellow px-4 py-1 rounded-full font-black text-sm uppercase tracking-widest border-2 border-sun-yellow mb-6">
                      Pergunta {currentQuestion + 1} de {quizQuestions.length}
                   </div>
                   <h3 className="text-2xl md:text-3xl font-black text-pure-white mb-8 leading-snug drop-shadow-md">
                     {quizQuestions[currentQuestion].question}
                   </h3>
                   <div className="flex flex-col gap-4">
                     {quizQuestions[currentQuestion].options.map((option, index) => {
                       let buttonStyle = "bg-pure-white border-pure-black text-pure-black hover:bg-gray-100 hover:translate-x-1";
                       
                       if (selectedAnswer !== null) {
                         if (index === quizQuestions[currentQuestion].correct) {
                           buttonStyle = "bg-green-400 border-pure-black text-pure-black scale-[1.02] translate-x-2 shadow-[4px_4px_0px_var(--color-pure-black)]";
                         } else if (index === selectedAnswer) {
                           buttonStyle = "bg-neon-pink border-pure-black text-pure-white scale-95 opacity-50";
                         } else {
                           buttonStyle = "bg-pure-white/50 border-pure-black/50 text-pure-black/50 scale-95 opacity-50";
                         }
                       }

                       return (
                         <button
                           key={index}
                           disabled={selectedAnswer !== null}
                           onClick={() => handleAnswerSelect(index)}
                           className={`w-full text-left font-extrabold text-lg p-5 rounded-2xl border-[3px] transition-all flex items-center justify-between ${buttonStyle}`}
                         >
                           <span>{option}</span>
                           {selectedAnswer !== null && index === quizQuestions[currentQuestion].correct && (
                             <CheckCircle2 className="w-6 h-6 text-pure-black" />
                           )}
                           {selectedAnswer === index && index !== quizQuestions[currentQuestion].correct && (
                             <XCircle className="w-6 h-6 text-pure-white" />
                           )}
                         </button>
                       );
                     })}
                   </div>
                 </motion.div>
               ) : (
                 <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 text-center py-8"
                 >
                   <div className="w-24 h-24 bg-neon-pink rounded-full border-[4px] border-pure-black shadow-[8px_8px_0px_var(--color-pure-black)] mx-auto flex items-center justify-center mb-6">
                     <Award className="w-12 h-12 text-pure-white" />
                   </div>
                   <h3 className="text-4xl font-black uppercase tracking-tight text-pure-white mb-4 skew-title inline-block drop-shadow-md">
                     Quiz Concluído!
                   </h3>
                   <p className="text-xl font-bold text-pure-white/90 mb-8">
                     Você acertou <span className="text-sun-yellow text-3xl font-black px-2">{score}</span> de {quizQuestions.length} perguntas!
                   </p>
                   <div className="flex flex-col sm:flex-row gap-4 justify-center">
                     <button 
                       onClick={resetQuiz}
                       className="px-8 py-4 bg-transparent border-4 border-pure-white text-pure-white font-black uppercase rounded-full hover:bg-pure-white hover:text-vibrant-purple transition-colors"
                     >
                       Tentar Novamente
                     </button>
                     <button 
                       onClick={handleShare}
                       className="px-8 py-4 bg-electric-cyan border-4 border-pure-black text-pure-black font-black uppercase rounded-full shadow-[6px_6px_0px_var(--color-pure-black)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0px_var(--color-pure-black)] transition-all flex items-center justify-center gap-2"
                     >
                       <Share2 className="w-5 h-5" /> Compartilhar
                     </button>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Video Section (Fragmento da Peça) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-6 lg:px-8 mt-24 mb-12"
      >
        <div className="bg-pure-white border-[4px] border-pure-black rounded-[24px] overflow-hidden shadow-[12px_12px_0px_var(--color-pure-black)] relative">
          <div className="p-4 bg-pure-black flex items-center justify-between">
            <h2 className="text-neon-pink font-black text-xl uppercase tracking-widest flex items-center gap-2">
              <Play className="fill-current w-5 h-5" /> Fragmento Mágico
            </h2>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-neon-pink"></div>
              <div className="w-3 h-3 rounded-full bg-sun-yellow"></div>
              <div className="w-3 h-3 rounded-full bg-electric-cyan"></div>
            </div>
          </div>
          <div className="aspect-video bg-vibrant-purple relative flex items-center justify-center overflow-hidden">
            {/* O CONTEÚDO DO VÍDEO ENTRARÁ AQUI */}
            {!isAllCollected ? (
              <div className="flex flex-col items-center text-center p-8 z-10 w-full h-full justify-center bg-gradient-to-br from-vibrant-purple to-pure-black">
                <div className="bg-sun-yellow p-4 rounded-full border-4 border-pure-black mb-4 shadow-[4px_4px_0px_var(--color-pure-black)] animate-pulse">
                  <BookOpen className="w-12 h-12 text-pure-black" />
                </div>
                <h3 className="text-3xl font-black text-pure-white uppercase mb-2 skew-title inline-block">
                  Cena Trancada!
                </h3>
                <p className="text-pure-white/80 font-bold max-w-md mt-2">
                  Você precisa colecionar os {total} personagens do reino primeiro para desbloquear este momento especial da peça!
                </p>
              </div>
            ) : (
               <div className="w-full h-full relative">
                 {/* Vídeo desbloqueado */}
                 <video 
                   src="/cortevideo.mp4" 
                   controls 
                   playsInline
                   className="w-full h-full object-cover"
                   poster="/iza3.jpg"
                 >
                    Seu navegador não suporta o formato de vídeo.
                 </video>
               </div>
            )}
            
            {/* Linhas de grade de fundo só para estilo */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-pure-black) 2px, transparent 2px), linear-gradient(90deg, var(--color-pure-black) 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>
          </div>
        </div>
      </motion.div>

      {/* Desafio da Camiseta Section */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-6 lg:px-8 mt-24 pb-24"
      >
        <div className="bg-electric-cyan border-[4px] border-pure-black rounded-[24px] p-8 md:p-12 relative overflow-hidden shadow-[12px_12px_0px_var(--color-pure-black)]">
           <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
             <Gift className="w-48 h-48 text-pure-black rotate-12" />
           </div>
           <div className="relative z-10">
             <div className="inline-flex items-center gap-2 bg-pure-black text-pure-white px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest border-2 border-pure-black mb-6 shadow-[4px_4px_0px_var(--color-pure-black)]">
               <Gift className="w-4 h-4 text-neon-pink" /> 
               Desafio Final
             </div>
             <h2 className="text-3xl md:text-5xl font-black text-pure-black uppercase mb-4 skew-title leading-[0.9]">
               Crie sua <br className="hidden md:block"/> Palavra Mágica
             </h2>
             <p className="text-pure-black/80 font-bold max-w-lg mb-8">
               Se você pudesse inventar uma nova palavra para o Reino Gramaravilha, qual seria e o que ela faria? A resposta mais criativa ganha uma <strong className="text-pure-black bg-sun-yellow px-1">Camiseta Exclusiva</strong> do espetáculo!
             </p>

             <AnimatePresence mode="wait">
               {!challengeSubmitted ? (
                 <motion.form 
                   key="form"
                   exit={{ opacity: 0, scale: 0.9 }}
                   className="space-y-4 max-w-lg"
                   onSubmit={async (e) => { 
                     e.preventDefault(); 
                     setIsSubmittingChallenge(true);
                     try {
                        await addDoc(collection(db, "challengeResponses"), {
                          word: challengeWord,
                          description: challengeDescription,
                          email: challengeEmail,
                          phone: challengePhone,
                          createdAt: new Date().toISOString()
                        });
                        playVictorySound(); 
                        setChallengeSubmitted(true); 
                     } catch (error) {
                        try {
                           handleFirestoreError(error, OperationType.CREATE, "challengeResponses");
                        } catch (handledError) {
                           alert("Houve um erro ao enviar seu desafio. O sistema de segurança bloqueou o envio. Se o problema persistir, fale conosco.");
                        }
                     } finally {
                        setIsSubmittingChallenge(false);
                     }
                   }}
                 >
                   <input required value={challengeWord} onChange={e => setChallengeWord(e.target.value)} type="text" placeholder="Sua palavra mágica..." className="w-full bg-pure-white border-4 border-pure-black rounded-xl px-4 py-3 font-bold text-pure-black placeholder:text-pure-black/40 focus:outline-none focus:ring-4 focus:ring-neon-pink transition-all shadow-[4px_4px_0px_var(--color-pure-black)]" disabled={isSubmittingChallenge} />
                   <textarea required value={challengeDescription} onChange={e => setChallengeDescription(e.target.value)} rows={3} placeholder="O que ela faz? (ex: Ela transforma tristeza em alegria...)" className="w-full bg-pure-white border-4 border-pure-black rounded-xl px-4 py-3 font-bold text-pure-black placeholder:text-pure-black/40 focus:outline-none focus:ring-4 focus:ring-neon-pink transition-all shadow-[4px_4px_0px_var(--color-pure-black)] resize-none" disabled={isSubmittingChallenge} />
                   <input required value={challengeEmail} onChange={e => setChallengeEmail(e.target.value)} type="email" placeholder="Seu e-mail para contato" className="w-full bg-pure-white border-4 border-pure-black rounded-xl px-4 py-3 font-bold text-pure-black placeholder:text-pure-black/40 focus:outline-none focus:ring-4 focus:ring-neon-pink transition-all shadow-[4px_4px_0px_var(--color-pure-black)]" disabled={isSubmittingChallenge} />
                    <input required value={challengePhone} onChange={e => setChallengePhone(e.target.value)} type="tel" placeholder="Seu WhatsApp ou Telefone" className="w-full bg-pure-white border-4 border-pure-black rounded-xl px-4 py-3 font-bold text-pure-black placeholder:text-pure-black/40 focus:outline-none focus:ring-4 focus:ring-neon-pink transition-all shadow-[4px_4px_0px_var(--color-pure-black)]" disabled={isSubmittingChallenge} />
                   <button type="submit" disabled={isSubmittingChallenge} className="w-full disabled:opacity-50 bg-vibrant-purple text-pure-white font-black uppercase tracking-wider py-4 rounded-xl border-4 border-pure-black shadow-[6px_6px_0px_var(--color-pure-black)] flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_var(--color-pure-black)] transition-all">
                      <Send className="w-5 h-5" /> {isSubmittingChallenge ? 'Enviando...' : 'Enviar Desafio'}
                   </button>
                 </motion.form>
               ) : (
                 <motion.div 
                   key="success"
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="bg-pure-white border-4 border-pure-black rounded-xl p-8 max-w-lg shadow-[6px_6px_0px_var(--color-pure-black)]"
                 >
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-2xl font-black text-pure-black uppercase mb-2">Desafio Enviado!</h3>
                    <p className="text-pure-black/80 font-bold">Fique de olho no seu e-mail. Se a sua palavra for a escolhida pelo Rei Substantivo, entraremos em contato!</p>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
        </div>
      </motion.div>

      {/* E-book and Extras Section */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-6 lg:px-8 mt-24"
      >
        <div className="bg-vibrant-purple border-[4px] border-sun-yellow rounded-[24px] p-8 md:p-12 relative overflow-hidden shadow-[12px_12px_0px_var(--color-sun-yellow)] flex flex-col md:flex-row items-center gap-8">
           <div className="md:w-1/2 relative z-10">
             <div className="inline-flex items-center gap-2 bg-pure-black text-sun-yellow px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest border-2 border-sun-yellow mb-6 shadow-[4px_4px_0px_var(--color-pure-black)]">
               <BookOpen className="w-4 h-4" /> Biblioteca Real
             </div>
             
             <h2 className="text-3xl md:text-5xl font-black text-pure-white uppercase mb-4 skew-title leading-[0.9]">
               O Livro Digital <br className="hidden md:block"/> da Gramática
             </h2>
             <p className="text-pure-white/90 font-bold mb-8">
               Mergulhe ainda mais fundo no Reino Gramaravilha! Baixe o nosso e-book maravilhoso contendo curiosidades do elenco, as regras mágicas completas e ilustrações exclusivas do espetáculo.
             </p>

             <button 
               onClick={() => setShowBookModal(true)}
               className="bg-electric-cyan text-pure-black font-black uppercase tracking-wider px-8 py-4 rounded-xl shadow-[6px_6px_0px_var(--color-pure-black)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_var(--color-pure-black)] transition-all flex items-center justify-center gap-2 border-[3px] border-pure-black active:scale-95"
             >
               <Download className="w-6 h-6" /> Abrir Livro Digital
             </button>
           </div>
           
           <div className="md:w-1/2 flex justify-center relative">
             <div className="absolute inset-0 bg-sun-yellow/20 blur-3xl rounded-full"></div>
             <div className="relative transform rotate-6 hover:-rotate-2 transition-transform duration-500">
               <div className="bg-pure-white p-2 pb-6 border-4 border-pure-black rounded-sm shadow-[12px_12px_0px_var(--color-pure-black)] relative max-w-[280px]">
                 <div className="w-full h-48 bg-neon-pink border-2 border-pure-black mb-4 flex items-center justify-center overflow-hidden relative">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook-paper.png')] opacity-50 mix-blend-multiply"></div>
                   <BookOpen className="w-24 h-24 text-pure-black opacity-20 absolute -right-4 -bottom-4" />
                   <h3 className="text-pure-white font-black text-center text-3xl skew-title z-10 px-4" style={{ textShadow: "2px 2px 0 #000" }}>
                     Gramaravilha
                   </h3>
                 </div>
                 <div className="space-y-2">
                   <div className="h-2 bg-pure-black/10 rounded-full w-full"></div>
                   <div className="h-2 bg-pure-black/10 rounded-full w-3/4"></div>
                   <div className="h-2 bg-pure-black/10 rounded-full w-5/6"></div>
                 </div>
                 <div className="absolute top-4 right-4 bg-sun-yellow border-2 border-pure-black font-black text-pure-black uppercase text-[10px] px-2 py-1 rotate-12 shadow-[2px_2px_0px_var(--color-pure-black)]">
                   E-book
                 </div>
               </div>
             </div>
           </div>
        </div>
      </motion.div>

      {/* Agenda Section */}
      <div id="bilheteria" className="max-w-5xl mx-auto px-6 lg:px-8 mt-24 pb-48">
        <div className="flex flex-col md:flex-row gap-8">
           <div className="md:w-1/3">
             <h2 className="text-3xl font-black uppercase mb-4 flex items-center gap-3">
               <Calendar className="w-8 h-8 text-sun-yellow" /> Em Cartaz
             </h2>
             <p className="text-pure-white/80 font-bold mb-6">
               O Reino Gramaravilha pode estar pertinho de você! Confira as datas das próximas paradas da nossa turnê e garanta seu lugar.
             </p>
           </div>
           <div className="md:w-2/3 space-y-4">
              {[
                { date: "29 de Abril de 2026", time: "20h00", local: "Teatro Monte Calvario", city: "Cidade" }
              ].map((show, idx) => (
                <div key={idx} className="bg-pure-white text-pure-black border-[3px] border-pure-black rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[6px_6px_0px_var(--color-pure-black)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_var(--color-pure-black)] transition-all cursor-pointer group">
                   <div className="flex flex-col">
                     <span className="font-extrabold text-vibrant-purple text-lg uppercase">{show.date}</span>
                     <span className="font-bold flex items-center gap-1.5 opacity-70 text-sm mt-1">
                       <MapPin className="w-4 h-4" /> {show.local} • {show.time}
                     </span>
                   </div>
                   <a 
                     href="https://wa.me/5531991873104?text=Ol%C3%A1%2C%20gostaria%20de%20comprar%20um%20ingresso%20para%20o%20espet%C3%A1culo%20Iza%20no%20Reino%20Gramaravilha!"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="bg-sun-yellow text-pure-black border-2 border-pure-black font-black uppercase tracking-wider px-6 py-3 rounded-xl shadow-[4px_4px_0px_var(--color-pure-black)] hover:bg-electric-cyan hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_var(--color-pure-black)] transition-all flex items-center justify-center gap-2"
                   >
                     <Ticket className="w-5 h-5" /> Comprar Ingresso
                   </a>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Floating Interaction Bar (Bottom) */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.5 }}
        className="fixed bottom-4 left-4 right-4 md:right-auto md:w-auto z-50 bg-pure-black border-[4px] border-sun-yellow rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-4 md:gap-6 shadow-[8px_8px_0px_var(--color-neon-pink)]"
      >
        <div className="flex flex-row sm:flex-col items-center sm:items-start justify-center w-full sm:w-auto gap-3 sm:gap-0 border-b sm:border-b-0 sm:border-r border-sun-yellow/20 pb-2 sm:pb-0 sm:pr-4">
          <span className="text-pure-white/60 text-[10px] uppercase font-black tracking-widest leading-none">
            Status
          </span>
          <span className="text-pure-white font-black text-sm md:text-lg skew-title flex items-center gap-1">
            {isAllCollected ? (
              <span className="text-sun-yellow flex gap-1"><Check className="w-4 h-4 md:w-5 md:h-5"/> Concluído!</span>
            ) : (
              <span className="text-electric-cyan text-xs md:text-sm">Colecione seu Deck!</span>
            )}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center sm:justify-start">
          <button 
             onClick={handleShare}
             className="bg-sun-yellow text-pure-black border-2 border-pure-black rounded-xl p-2 md:p-2.5 px-4 font-black text-[10px] md:text-xs uppercase tracking-wider shadow-[3px_3px_0px_var(--color-pure-black)] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span>Compartilhar</span>
          </button>
          
          <button 
             onClick={() => setShowBookModal(true)}
             className="bg-vibrant-purple text-pure-white border-2 border-pure-black rounded-xl p-2 md:p-2.5 px-4 font-black text-[10px] md:text-xs uppercase tracking-wider shadow-[3px_3px_0px_var(--color-pure-black)] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Livro Digital</span>
          </button>

          <div className="relative shrink-0">
            <button 
               onClick={handleSendEnergy}
               className="bg-electric-cyan overflow-hidden relative border-2 border-pure-black text-pure-black rounded-xl p-2 md:p-2.5 px-4 font-black text-[10px] md:text-xs uppercase tracking-wider shadow-[3px_3px_0px_var(--color-pure-black)] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Zap className={`fill-current w-4 h-4 shrink-0 ${energyCount > 0 ? "text-sun-yellow" : "text-pure-black"}`} /> 
              <span>Energia {energyCount > 0 && `(${energyCount})`}</span>
            </button>
            <AnimatePresence>
                {particles.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 1, y: 0, x: p.x, scale: 0.5 }}
                    animate={{ opacity: 0, y: -150, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-0 left-1/2 -ml-3 pointer-events-none z-50 text-sun-yellow"
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Book Modal */}
      <AnimatePresence>
        {showBookModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-pure-black/80 backdrop-blur-sm p-4 md:p-12 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-sun-yellow w-full max-w-2xl border-[4px] border-pure-black rounded-[24px] shadow-[16px_16px_0px_var(--color-neon-pink)] flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-4 border-b-4 border-pure-black flex justify-between items-center bg-pure-white">
                <h3 className="font-black text-2xl uppercase tracking-wider text-pure-black flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-vibrant-purple" /> Biblioteca Real
                </h3>
                <button onClick={() => setShowBookModal(false)} className="bg-pure-black text-pure-white p-2 rounded-full hover:bg-neon-pink transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/notebook-paper.png')] bg-cover flex-grow text-pure-black font-medium leading-relaxed relative min-h-[300px]">
                 
                 {bookPage === 0 && (
                   <motion.div initial={{opacity: 0, x: -20}} animate={{opacity: 1, x: 0}}>
                     <h2 className="text-4xl font-black mb-6 text-vibrant-purple skew-title">O Livro Secreto da Gramática</h2>
                     <p className="mb-4 text-lg">
                       Este é o <strong>Grimório do Rei Substantivo</strong>. Reza a lenda que dentro do Reino Gramaravilha, cada palavra tem vida própria...
                     </p>
                     <div className="bg-pure-white/80 border-2 border-pure-black p-4 rounded-xl mb-6 shadow-[4px_4px_0px_var(--color-pure-black)]">
                       <h4 className="font-black text-xl mb-2 text-neon-pink flex items-center gap-2"><Sparkles className="w-5 h-5"/> Curiosidade #1</h4>
                       <p>Você sabia que a Fada Vírgula costumava ser bailarina? Ela dita o ritmo das frases e ensina os outros moradores a respirar e dançar nas pausas!</p>
                     </div>
                   </motion.div>
                 )}

                 {bookPage === 1 && (
                   <motion.div initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}}>
                     <h2 className="text-3xl font-black mb-6 text-electric-cyan skew-title" style={{textShadow: "1px 1px 0 #000"}}>A Magia dos Verbos</h2>
                     <p className="mb-4 text-lg">
                       Os verbos são o motor do reino! Sem eles, todos ficariam parados no tempo. Quando um verbo de ação passa correndo, até as montanhas tremem!
                     </p>
                     <div className="bg-sun-yellow/80 border-2 border-pure-black p-4 rounded-xl mb-6 shadow-[4px_4px_0px_var(--color-pure-black)]">
                       <h4 className="font-black text-xl mb-2 text-pure-black flex items-center gap-2" ><Zap className="w-5 h-5"/> O Poder do Advérbio</h4>
                       <p>Os advérbios são como temperos. Tente comer uma maçã "vagarosamente" e depois "explosivamente". O advérbio muda completamente a ação!</p>
                     </div>
                   </motion.div>
                 )}

                 {bookPage === 2 && (
                   <motion.div initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} className="text-center">
                     <h2 className="text-3xl font-black mb-6 text-vibrant-purple skew-title">Coleção Completa</h2>
                     <p className="mb-6 text-lg">
                       Curtiu essa leitura rápida? Baixe o PDF completo e guarde toda a sabedoria da Gramaravilha direto no seu dispositivo!
                     </p>
                     <div className="flex justify-center mt-4">
                       <button onClick={handleDownloadPDF} className="bg-electric-cyan border-4 border-pure-black text-pure-black font-black uppercase px-8 py-4 rounded-xl shadow-[4px_4px_0px_var(--color-pure-black)] flex items-center gap-3 hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_var(--color-pure-black)] transition-all">
                         <Download className="w-6 h-6" /> Baixar E-book (PDF)
                       </button>
                     </div>
                   </motion.div>
                 )}
                 
                 {/* Navigation */}
                 <div className="mt-8 pt-4 border-t-2 border-pure-black/20 flex justify-between items-center">
                   <button 
                     onClick={() => setBookPage(p => Math.max(0, p - 1))}
                     disabled={bookPage === 0}
                     className="bg-pure-white border-2 border-pure-black p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neon-pink hover:text-pure-white transition-colors shadow-[2px_2px_0px_var(--color-pure-black)]"
                   >
                     <ChevronLeft className="w-6 h-6" />
                   </button>
                   <span className="font-black text-xs uppercase tracking-widest text-pure-black/60">Página {bookPage + 1} de 3</span>
                   <button 
                     onClick={() => setBookPage(p => Math.min(2, p + 1))}
                     disabled={bookPage === 2}
                     className="bg-pure-white border-2 border-pure-black p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-electric-cyan transition-colors shadow-[2px_2px_0px_var(--color-pure-black)]"
                   >
                     <ChevronRight className="w-6 h-6" />
                   </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
