import React from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  BarChart3, 
  Settings, 
  ArrowRight, 
  Upload,
  Cog,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LandingPageProps {
  darkMode: boolean
  setDarkMode: (dark: boolean) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate()

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  const productionLineVariants = {
    animate: {
      x: [-100, window.innerWidth + 100],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "linear"
      }
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'dark bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`border-b transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 backdrop-blur-sm border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
              <Calendar className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold">Dział Planowania Produkcji</h1>
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        className="relative overflow-hidden py-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Floating Icons */}
        <motion.div
          className="absolute top-20 left-10 opacity-20"
          variants={floatingVariants}
          animate="animate"
        >
          <Cog size={60} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />
        </motion.div>
        
        <motion.div
          className="absolute top-32 right-20 opacity-20"
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: '2s' }}
        >
          <BarChart3 size={50} className={darkMode ? 'text-green-400' : 'text-green-500'} />
        </motion.div>
        
        <motion.div
          className="absolute bottom-20 left-20 opacity-20"
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: '4s' }}
        >
          <Clock size={40} className={darkMode ? 'text-purple-400' : 'text-purple-500'} />
        </motion.div>

        {/* Animated Production Line */}
        <div className="absolute top-1/2 left-0 right-0 overflow-hidden pointer-events-none">
          <motion.div
            className="flex gap-4"
            variants={productionLineVariants}
            animate="animate"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-16 h-8 rounded ${
                  darkMode ? 'bg-blue-600' : 'bg-blue-500'
                } opacity-30 flex items-center justify-center text-white text-xs font-bold`}
              >
                ORD{i}
              </div>
            ))}
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.h1
            className="text-5xl md:text-6xl font-bold mb-6"
            variants={itemVariants}
          >
            Planowanie
            <span className={`block ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              Produkcji
            </span>
          </motion.h1>
          
          <motion.p
            className={`text-xl mb-8 max-w-2xl mx-auto ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
            variants={itemVariants}
          >
            Interaktywny wykres Gantta do zarządzania harmonogramem produkcji. 
            Planuj zlecenia, śledź marszruty i optymalizuj wykorzystanie maszyn.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={itemVariants}
          >
            <button
              onClick={() => navigate('/planner')}
              className={`flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              }`}
            >
              <Calendar size={20} />
              Otwórz harmonogram
              <ArrowRight size={20} />
            </button>
            
            <button
              onClick={() => navigate('/planner')}
              className={`flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-900 shadow-lg'
              }`}
            >
              <Upload size={20} />
              Wgraj dane
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* Feature Cards */}
      <motion.section
        className="py-20"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            variants={itemVariants}
          >
            Funkcjonalności
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              className={`p-6 rounded-xl transition-all hover:scale-105 cursor-pointer ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-750 shadow-lg' 
                  : 'bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl'
              }`}
              variants={itemVariants}
              onClick={() => navigate('/planner')}
            >
              <div className={`p-3 rounded-lg w-fit mb-4 ${
                darkMode ? 'bg-blue-600' : 'bg-blue-500'
              }`}>
                <Calendar className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Planowanie</h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Interaktywny wykres Gantta z obsługą marszrut, multi-lane na maszynach 
                i zaawansowanymi filtrami.
              </p>
            </motion.div>
            
            <motion.div
              className={`p-6 rounded-xl transition-all opacity-60 ${
                darkMode 
                  ? 'bg-gray-800 shadow-lg' 
                  : 'bg-white shadow-lg'
              }`}
              variants={itemVariants}
            >
              <div className={`p-3 rounded-lg w-fit mb-4 ${
                darkMode ? 'bg-green-600' : 'bg-green-500'
              }`}>
                <TrendingUp className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Raporty</h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Analiza wykorzystania maszyn, czasy realizacji zleceń i optymalizacja 
                procesów produkcyjnych.
              </p>
              <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                darkMode ? 'bg-yellow-600 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
              }`}>
                Wkrótce
              </span>
            </motion.div>
            
            <motion.div
              className={`p-6 rounded-xl transition-all opacity-60 ${
                darkMode 
                  ? 'bg-gray-800 shadow-lg' 
                  : 'bg-white shadow-lg'
              }`}
              variants={itemVariants}
            >
              <div className={`p-3 rounded-lg w-fit mb-4 ${
                darkMode ? 'bg-purple-600' : 'bg-purple-500'
              }`}>
                <Settings className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Ustawienia</h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Konfiguracja maszyn, kalendarzy pracy, szablonów raportów 
                i integracji z systemami ERP.
              </p>
              <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                darkMode ? 'bg-yellow-600 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
              }`}>
                Wkrótce
              </span>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className={`border-t py-8 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            © 2025 Dział Planowania Produkcji. Wszystkie prawa zastrzeżone. PM.
          </p>
        </div>
      </footer>
    </div>
  )
}