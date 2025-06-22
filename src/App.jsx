import React, { useState, useEffect, useRef } from 'react'; // Importa useRef
import './style.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Íconos sólidos y de marcas
import { faRobot, faChartLine, faHeadset, faCheck, faStar, faPlusCircle, faQuestionCircle, faInfoCircle, faLightbulb, faCreditCard, faComments, faUsers, faCalendarAlt, faListOl, faDollarSign, faTools, faHandshake, faShoppingCart, faConciergeBell, faTasks, faBullhorn } from '@fortawesome/free-solid-svg-icons'; 
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'; // Importación correcta para faWhatsapp

// Importa y carga Stripe.js
const loadStripeScript = () => {
  return new Promise((resolve) => {
    if (window.Stripe) {
      resolve(window.Stripe); 
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve(window.Stripe);
    document.head.appendChild(script);
  });
};

const App = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'Básico', 
    message: ''
  });

  // NUEVOS ESTADOS PARA EL FORMULARIO DE PAGO DIRECTO
  const [directPaymentName, setDirectPaymentName] = useState('');
  const [directPaymentEmail, setDirectPaymentEmail] = useState('');

  const [planes, setPlanes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState({}); 

  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [errorPlanes, setErrorPlanes] = useState(null);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [errorFeatures, setErrorFeatures] = useState(null);
  const [stripePromise, setStripePromise] = useState(null); 

  // ESTADOS PARA EL CHATBOT DEMO MEJORADO
  const [chatHistory, setChatHistory] = useState([]); 
  const [currentMessage, setCurrentMessage] = useState(''); 
  const [selectedDemoFeatures, setSelectedDemoFeatures] = useState({ 
    whatsapp: false,
    humanAgent: false,
    leadQualification: false,
    faqResponder: false, 
    dataCollection: false, 
    productRecommendation: false, 
  });
  const [demoContext, setDemoContext] = useState(null); 

  // Referencia para el scroll a la sección de pago
  const directPaymentSectionRef = useRef(null);

  // CLAVE PUBLICABLE DE STRIPE (¡MODO DE PRUEBA!)
  const STRIPE_PUBLIC_KEY = 'pk_test_51RcVgRCMnk8vxlKvTECJwdsLCz2PlvqjWJGdem4i9odVOFsy8wxSN618xqAq3nKvmw8UWsPM3AyvqI5s1y1ybnjq006pPAgkOh'; 

  // Cargar Stripe.js cuando el componente se monta
  useEffect(() => {
    loadStripeScript().then((Stripe) => {
      setStripePromise(Stripe(STRIPE_PUBLIC_KEY));
    });
  }, []);

  // useEffect para cargar los planes
  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        const response = await fetch('/api/planes');
        if (!response.ok) {
          throw new Error(`Error HTTP! status: ${response.status}`);
        }
        const data = await response.json();
        setPlanes(data);
        if (data.length > 0) {
          // Inicializa el plan en el formulario de contacto y en el pago directo
          setFormData(prev => ({ ...prev, plan: data[0].nombre }));
          // directPaymentName and directPaymentEmail are kept empty initially
        }
      } catch (error) {
        console.error("Error al obtener los planes:", error);
        setErrorPlanes("No se pudieron cargar los planes. Por favor, intente más tarde.");
      } finally {
        setLoadingPlanes(false);
      }
    };
    fetchPlanes();
  }, []);

  // useEffect para cargar las funciones adicionales
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await fetch('/api/features');
        if (!response.ok) {
          throw new Error(`Error HTTP! status: ${response.status}`);
        }
        const data = await response.json();
        setFeatures(data);
        const initialSelected = data.reduce((acc, feature) => {
          acc[feature.id] = false;
          return acc;
        }, {});
        setSelectedFeatures(initialSelected);
      } catch (error) {
        console.error("Error al obtener las funciones:", error);
        setErrorFeatures("No se pudieron cargar las funciones adicionales.");
      } finally {
        setLoadingFeatures(false);
      }
    };
    fetchFeatures();
  }, []);

  const handleFeatureToggle = (featureId) => {
    setSelectedFeatures(prev => {
      const newState = {
        ...prev,
        [featureId]: !prev[featureId]
      };
      return newState;
    });
  };

  const calculateTotalPrice = () => {
    let total = 0;
    const currentPlan = planes.find(p => p.nombre === formData.plan); // Usa formData.plan
    if (currentPlan) {
      total += currentPlan.precio;
    }

    features.forEach(feature => {
      if (selectedFeatures[feature.id]) {
        total += feature.precio;
      }
    });
    return total.toFixed(2);
  };

  // NUEVA FUNCION: Selecciona el plan y desplaza la vista al formulario de pago
  const handleSelectPlanForPayment = (planName) => {
    setFormData(prev => ({ ...prev, plan: planName }));
    if (directPaymentSectionRef.current) {
      directPaymentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };


  // Manejador de clic para iniciar el proceso de pago con Stripe
  const handleCheckout = async () => {
    // Usa los nuevos estados de pago directo
    if (!directPaymentName || !directPaymentEmail || !formData.plan) {
      alert("Por favor, completa tu nombre y email en la sección de pago para proceder.");
      return;
    }

    try {
      const selectedFeatureIds = features
        .filter(f => selectedFeatures[f.id])
        .map(f => f.id); 

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: formData.plan, // Usa el plan seleccionado del estado general
          selectedFeaturesIds: selectedFeatureIds, 
          email: directPaymentEmail, // Usa el email del formulario de pago directo
          name: directPaymentName,   // Usa el nombre del formulario de pago directo
          totalPrice: calculateTotalPrice() 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json(); 
        throw new Error(errorData.error || 'Error al crear la sesión de pago en el servidor.');
      }

      const session = await response.json(); 
      
      const stripe = await stripePromise;
      if (stripe) {
        const result = await stripe.redirectToCheckout({
          sessionId: session.id,
        });

        if (result.error) {
          alert(result.error.message); 
        }
      } else {
        alert("La librería de Stripe no está cargada correctamente. Por favor, asegúrate de que el script de Stripe se carga una sola vez y que no hay bloqueadores de anuncios.");
      }

    } catch (error) {
      console.error('Error durante el proceso de pago:', error);
      alert('Hubo un error al iniciar el proceso de pago: ' + error.message + '. Por favor, asegúrate de que el servidor de Flask esté funcionando correctamente y que tu clave pública de Stripe sea válida.');
    }
  };

  // Manejador del envío del formulario de contacto (GENERAL)
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    try {
      const selectedFeatureDetails = features
        .filter(f => selectedFeatures[f.id])
        .map(f => ({ id: f.id, nombre: f.nombre, precio: f.precio }));

      const dataToSend = {
        ...formData, 
        selectedFeatures: selectedFeatureDetails, 
        totalPrice: calculateTotalPrice() 
      };

      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor al enviar formulario');
      }

      const responseData = await response.json();
      alert(`¡Gracias ${formData.name}! ${responseData.message}`);

      // Resetear el formulario de contacto (no el de pago directo)
      setFormData({
        name: '',
        email: '',
        phone: '',
        plan: planes.length > 0 ? planes[0].nombre : 'Básico',
        message: ''
      });
      // Resetear el estado de las funciones seleccionadas a su estado inicial (ninguna seleccionada)
      const initialSelected = features.reduce((acc, feature) => {
        acc[feature.id] = false;
        return acc;
      }, {});
      setSelectedFeatures(initialSelected);

    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      alert('Hubo un error al enviar el formulario. Por favor intenta nuevamente.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // --- FUNCIONES PARA EL CHATBOT DEMO MEJORADO ---

  // Manejador para enviar mensajes en el chat del demo
  const handleSendMessage = (e) => { 
    e.preventDefault(); 
    if (currentMessage.trim() === '') return; 

    const userMsg = currentMessage;

    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setCurrentMessage(''); 

    setTimeout(() => {
      const botMsg = getBotResponse(userMsg);
      setChatHistory(prev => [...prev, { sender: 'bot', text: botMsg }]);
    }, 500); 
  };


  // Manejador para alternar las funciones de demo y reiniciar el chat
  const handleDemoFeatureToggle = (featureName) => {
    setSelectedDemoFeatures(prev => ({
      ...prev,
      [featureName]: !prev[featureName]
    }));
    setChatHistory([]); // Reinicia el chat al cambiar las funciones
    setDemoContext(null); // Reinicia cualquier contexto de conversación
  };

  // Función principal para simular la respuesta del bot, ahora más compleja
  const getBotResponse = (userMsg) => {
    const lowerMsg = userMsg.toLowerCase().trim();

    // 1. Manejar contexto de conversación (flujos multi-turno)
    if (demoContext === 'data_collection_step1') {
        setDemoContext('data_collection_step2');
        return `¡Gracias, ${userMsg}! Ahora, por favor, ingresa tu email para que podamos enviarte más información.`;
    }
    if (demoContext === 'data_collection_step2') {
        // Validación simple de email. En un bot real sería más robusto.
        if (lowerMsg.includes("@") && lowerMsg.includes(".")) {
            setDemoContext(null); // Finaliza el contexto de recopilación
            return `¡Excelente, recibimos tu email ${userMsg}! Un representante se pondrá en contacto contigo pronto. Esto demuestra nuestra capacidad de recopilar información de forma conversacional.`;
        } else {
            return `Ese no parece ser un email válido. Por favor, ingresa un email válido.`;
        }
    }
    if (demoContext === 'product_reco_step1') {
        setDemoContext('product_reco_step2');
        return `Interesante. ¿Qué es lo más importante para ti en una solución de chatbot: el ${userMsg} o el presupuesto?`;
    }
    if (demoContext === 'product_reco_step2') {
        setDemoContext(null); // Finaliza el contexto de recomendación
        if (lowerMsg.includes("presupuesto") || lowerMsg.includes("costo")) {
            return `Si tu prioridad es el presupuesto, te recomendaría nuestro plan "Básico", que ofrece una excelente relación calidad-precio para empezar.`;
        } else if (lowerMsg.includes("funcionalidad") || lowerMsg.includes("características")) {
            return `Si tu prioridad es la funcionalidad, te sugeriría explorar nuestro plan "Premium", que ofrece todas las funcionalidades avanzadas para una experiencia completa.`;
        } else {
            return `Entendido. Basado en tu interés en ${userMsg}, nuestros planes Avanzado o Premium podrían ser ideales. Puedes ver sus detalles en la sección "Planes".`;
        }
    }


    // 2. Manejar funciones de demo activadas (palabras clave específicas)
    // PRIORIDAD: Respuestas específicas de funcionalidades de demo si están activas
    if (selectedDemoFeatures.whatsapp && (lowerMsg.includes("whatsapp") || lowerMsg.includes("multicanal") || lowerMsg.includes("telegram"))) {
        return "¡Absolutamente! Este bot puede integrarse fácilmente con WhatsApp y otros canales como Telegram, permitiéndote ofrecer soporte continuo donde tus clientes ya están. Si deseas explorar más, haz clic en el botón 'Hablar con un Experto por WhatsApp' flotante en la esquina inferior derecha.";
    }

    if (selectedDemoFeatures.humanAgent && (lowerMsg.includes("agente") || lowerMsg.includes("humano") || lowerMsg.includes("hablar con alguien"))) {
        return "Entendido. Un momento, por favor. Te estoy conectando con uno de nuestros agentes humanos especializados. Esto es posible con nuestra función de 'Transferencia a Agente Humano'. Haz clic en el botón 'Hablar con un Experto por WhatsApp' flotante en la esquina inferior derecha para continuar.";
    }

    if (selectedDemoFeatures.faqResponder) {
        if (lowerMsg.includes("horario") || lowerMsg.includes("abierto")) {
            return "Nuestras oficinas están abiertas de lunes a viernes, de 9 AM a 6 PM (hora local de Guernica, Argentina). ¡Siempre listos para atenderte!";
        } else if (lowerMsg.includes("devoluciones") || lowerMsg.includes("reembolso")) {
            return "Nuestra política de devoluciones permite solicitar un reembolso completo dentro de los 30 días posteriores a la compra, bajo ciertas condiciones. ¿Necesitas más detalles?";
        } else if (lowerMsg.includes("soporte") || lowerMsg.includes("ayuda")) {
            return "Ofrecemos soporte 24/7 para nuestros planes Avanzado y Premium. Para el plan Básico, el soporte es por email en horario de oficina.";
        }
    }

    if (selectedDemoFeatures.leadQualification) {
        if (lowerMsg.includes("industria") || lowerMsg.includes("negocio")) {
            return "¡Claro! Para ofrecerte el mejor servicio, ¿podrías indicarme a qué industria pertenece tu negocio (ej. retail, salud, servicios, manufactura)?";
        } else if (lowerMsg.includes("retail") || lowerMsg.includes("comercio") || lowerMsg.includes("ventas")) {
            return "Entendido, la industria minorista es clave para la automatización. ¿Te gustaría que el bot gestionara consultas de productos o el estado de pedidos?";
        } else if (lowerMsg.includes("salud") || lowerMsg.includes("clinica") || lowerMsg.includes("hospital")) {
            return "Perfecto, en salud la confidencialidad es vital. Nuestro bot puede agendar citas y responder FAQs de forma segura. ¿Qué te interesa más?";
        } else if (lowerMsg.includes("servicios") || lowerMsg.includes("consultoria")) {
            return "Excelente, los bots pueden optimizar la atención al cliente en servicios. ¿Te gustaría automatizar la reserva de citas o el soporte inicial?";
        }
    }


    // 3. Iniciar flujos de demo si se activan y el usuario usa una frase clave para iniciar
    if (selectedDemoFeatures.dataCollection && (lowerMsg.includes("recopilar datos") || lowerMsg.includes("captar datos") || lowerMsg.includes("iniciar registro")) && demoContext === null) {
        setDemoContext('data_collection_step1'); // Inicia el flujo de recopilación de datos
        return "¡Claro! Con gusto te demostraré cómo nuestro bot puede recopilar información. Para empezar, ¿cuál es tu nombre?";
    }

    if (selectedDemoFeatures.productRecommendation && (lowerMsg.includes("recomendar plan") || lowerMsg.includes("que plan") || lowerMsg.includes("ayuda a elegir")) && demoContext === null) {
        setDemoContext('product_reco_step1'); // Inicia el flujo de recomendación de producto
        return "¡Excelente! Para recomendarte el plan ideal, ¿podrías decirme cuál es el principal desafío de tu negocio en este momento? (ej. automatización, soporte 24/7, generación de leads)";
    }

    // 4. Respuestas predefinidas generales (if no demo feature or context is relevant)
    if (lowerMsg.includes("hola")) {
      return "¡Hola! Soy IABOT, tu asistente virtual. ¿En qué puedo ayudarte hoy? Para explorar nuestras capacidades, puedes activar las funciones de demo en la parte superior del chat.";
    } else if (lowerMsg.includes("precio") || lowerMsg.includes("costo") || lowerMsg.includes("planes")) {
      return "Puedes ver nuestros planes y funciones adicionales en las secciones 'Planes' y 'Funciones Adicionales' de esta página. ¡Haz clic para explorar! Si tienes preguntas específicas, ¡prueba activar las funciones de demo!";
    } else if (lowerMsg.includes("gracias")) {
      return "¡De nada! Estoy aquí para ayudarte a transformar tu negocio.";
    } else if (lowerMsg.includes("contacto")) {
      return "Si deseas una demo personalizada o tienes más preguntas, puedes contactarnos a través del formulario al final de la página. También puedes hacer clic en el botón 'Hablar con un Experto por WhatsApp' flotante en la esquina inferior derecha.";
    } 

    // 5. Respuesta por defecto si nada de lo anterior se activa y el bot sugiere WhatsApp
    if (userMsg.length > 0) {
      return `Has dicho: "${userMsg}". Este es un demo básico. Para experimentar más, activa las funcionalidades en la parte superior del chat y prueba los botones de sugerencia o frases clave. Si necesitas ayuda más específica, te sugiero hacer clic en el botón 'Hablar con un Experto por WhatsApp' flotante.`;
    }
    return "¿Podrías repetir eso? Para una demo más avanzada, selecciona las funcionalidades y usa las sugerencias.";
  };

  // Genera botones de sugerencia dinámicamente basados en el contexto y las funciones activas
  const getSuggestionButtons = () => {
    let suggestions = [];

    // Sugerencias basadas en el contexto activo (tienen prioridad)
    if (demoContext === 'data_collection_step1') {
        suggestions.push({ text: "Mi nombre es [Tu Nombre]", key: "Mi nombre es Juan" });
    } else if (demoContext === 'data_collection_step2') {
        suggestions.push({ text: "miemail@ejemplo.com", key: "miemail@ejemplo.com" });
    } else if (demoContext === 'product_reco_step1') {
        suggestions.push({ text: "Automatización", key: "automatizacion" });
        suggestions.push({ text: "Soporte 24/7", key: "soporte 24/7" });
        suggestions.push({ text: "Generación de leads", key: "generacion de leads" });
    } else if (demoContext === 'product_reco_step2') {
        suggestions.push({ text: "El presupuesto", key: "presupuesto" });
        suggestions.push({ text: "La funcionalidad", key: "funcionalidad" });
    } else { // Sugerencias si no hay contexto activo, basadas en funciones de demo
        // Sugerencias generales siempre disponibles
        suggestions.push({ text: "Hola", key: "hola" });
        suggestions.push({ text: "¿Qué planes tienen?", key: "planes" });
        suggestions.push({ text: "Contacto", key: "contacto" });
        
        if (selectedDemoFeatures.whatsapp) {
            suggestions.push({ text: "Demo WhatsApp", key: "whatsapp" });
        }
        if (selectedDemoFeatures.humanAgent) {
            suggestions.push({ text: "Conectar con un agente", key: "hablar con alguien" });
        }
        if (selectedDemoFeatures.leadQualification) {
            suggestions.push({ text: "¿Cuál es mi industria?", key: "industria" });
            suggestions.push({ text: "Mi negocio es de retail", key: "retail" });
        }
        if (selectedDemoFeatures.faqResponder) {
            suggestions.push({ text: "Horarios de atención", key: "horario" });
            suggestions.push({ text: "Política de devoluciones", key: "devoluciones" });
            suggestions.push({ text: "¿Necesito soporte?", key: "soporte" });
        }
        if (selectedDemoFeatures.dataCollection) {
            suggestions.push({ text: "Recopilar mis datos", key: "recopilar datos" });
        }
        if (selectedDemoFeatures.productRecommendation) {
            suggestions.push({ text: "Recomendarme un plan", key: "recomendar plan" });
        }
    }
    
    // Filtramos duplicados para que los botones sean únicos (por su 'key')
    const uniqueSuggestions = [];
    const seen = new Set();
    for (const suggestion of suggestions) {
        if (!seen.has(suggestion.key)) {
            uniqueSuggestions.push(suggestion);
            seen.add(suggestion.key);
        }
    }

    return uniqueSuggestions;
  };


  return (
    <>
      {/* Navbar - Sección de navegación principal */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
        <div className="container">
          <a className="navbar-brand" href="#">IABOT Soluciones</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link" href="#features-section">Características</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#services-section">Nuestros Servicios</a> {/* Este es el enlace corregido */}
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#plans-section">Planes</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#addons-section">Funciones Adicionales</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#direct-payment-section">Pagar Ahora</a> 
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#demo-section">Demo</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#testimonials-section">Testimonios</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contact-section">Contacto</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section - Sección principal de bienvenida */}
      <section className="hero d-flex align-items-center">
        <div className="container text-center">
          <h1 className="display-4 fw-bold mb-4">Transforma tu negocio con chatbots inteligentes</h1>
          <p className="lead mb-5">Automatiza la atención al cliente, genera leads y aumenta tus ventas con nuestra solución de IA</p>
          <div className="d-flex justify-content-center gap-3">
            <a href="#plans-section" className="btn btn-custom btn-lg">Ver Planes</a>
            <a href="#demo-section" className="btn btn-outline-light btn-lg">Probar Demo</a>
          </div>
        </div>
      </section>

      {/* Features Section - Sección de características de IABOT */}
      <section id="features-section" className="py-5">
        <div className="container">
          <h2 className="text-center mb-5">¿Por qué elegir IABOT?</h2>
          <div className="row">
            <div className="col-md-4 text-center mb-4">
              <div className="feature-icon mb-3">
                <FontAwesomeIcon icon={faRobot} size="3x" />
              </div>
              <h3>IA Avanzada</h3>
              <p>Chatbots que aprenden y mejoran continuamente con tecnología de última generación.</p>
            </div>
            <div className="col-md-4 text-center mb-4">
              <div className="feature-icon mb-3">
                <FontAwesomeIcon icon={faChartLine} size="3x" />
              </div>
              <h3>Resultados Medibles</h3>
              <p>Reportes detallados del rendimiento y conversiones generadas por tu chatbot.</p>
            </div>
            <div className="col-md-4 text-center mb-4">
              <div className="feature-icon mb-3">
                <FontAwesomeIcon icon={faHeadset} size="3x" />
              </div>
              <h3>Soporte 24/7</h3>
              <p>Nuestro equipo está disponible para ayudarte en cualquier momento.</p>
            </div>
          </div>
        </div>
      </section>

      {/* REVISADA: Sección de Servicios (Enfoque en el Cliente) */}
      <section id="services-section" className="py-5 bg-secondary text-white">
        <div className="container">
          <h2 className="text-center mb-5">Transforma la Interacción con tus Clientes en WhatsApp</h2>
          <p className="lead text-center mb-5">Ofrecemos soluciones de agentes inteligentes que se adaptan al crecimiento de tu empresa, automatizando la atención, potenciando tus ventas y mejorando la experiencia del cliente directamente en WhatsApp.</p>
          
          <div className="row text-center">
            {/* Servicio 1: Venta y Generación de Leads */}
            <div className="col-md-4 mb-4">
              <div className="service-item p-4 rounded shadow-sm h-100 bg-darker-color">
                <FontAwesomeIcon icon={faShoppingCart} size="3x" className="text-primary mb-3" />
                <h3 className="h5">Vende Más y Genera Leads</h3>
                <p>Nuestros agentes te ayudan a capturar clientes potenciales 24/7, recomendar productos o servicios de forma inteligente y guiar a tus usuarios en el proceso de compra.</p>
              </div>
            </div>
            {/* Servicio 2: Atención al Cliente Profesional */}
            <div className="col-md-4 mb-4">
              <div className="service-item p-4 rounded shadow-sm h-100 bg-darker-color">
                <FontAwesomeIcon icon={faConciergeBell} size="3x" className="text-primary mb-3" />
                <h3 className="h5">Atención al Cliente Inteligente</h3>
                <p>Resuelve dudas frecuentes al instante, brinda soporte personalizado y transfiere conversaciones a un agente humano cuando sea necesario, sin esperas ni fricciones.</p>
              </div>
            </div>
            {/* Servicio 3: Agenda y Gestión Automatizada */}
            <div className="col-md-4 mb-4">
              <div className="service-item p-4 rounded shadow-sm h-100 bg-darker-color">
                <FontAwesomeIcon icon={faCalendarAlt} size="3x" className="text-primary mb-3" />
                <h3 className="h5">Agenda Citas y Tareas Automáticas</h3>
                <p>Automatiza la reserva de citas, gestiona recordatorios y organiza tareas de seguimiento directamente desde WhatsApp, optimizando el tiempo de tu equipo.</p>
              </div>
            </div>
            {/* Servicio 4: Clasificación y Calificación */}
            <div className="col-md-4 mb-4">
              <div className="service-item p-4 rounded shadow-sm h-100 bg-darker-color">
                <FontAwesomeIcon icon={faTasks} size="3x" className="text-primary mb-3" />
                <h3 className="h5">Clasificación y Cualificación de Clientes</h3>
                <p>Identifica y segmenta a tus clientes automáticamente según sus intereses y necesidades, permitiéndote enfocar tus esfuerzos en los prospectos más valiosos.</p>
              </div>
            </div>
            {/* Servicio 5: Comunicación Masiva y Marketing */}
            <div className="col-md-4 mb-4">
              <div className="service-item p-4 rounded shadow-sm h-100 bg-darker-color">
                <FontAwesomeIcon icon={faBullhorn} size="3x" className="text-primary mb-3" />
                <h3 className="h5">Campañas y Notificaciones Efectivas</h3>
                <p>Envía mensajes masivos y personalizados para tus campañas de marketing, lanzamientos o notificaciones importantes, llegando a toda tu audiencia al instante.</p>
              </div>
            </div>
             {/* Servicio 6: Escalabilidad y Adaptabilidad */}
             <div className="col-md-4 mb-4">
              <div className="service-item p-4 rounded shadow-sm h-100 bg-darker-color">
                <FontAwesomeIcon icon={faHandshake} size="3x" className="text-primary mb-3" />
                <h3 className="h5">Solución Escalable y a tu Medida</h3>
                <p>Nuestros agentes crecen contigo. Desde una solución básica hasta integraciones complejas con tus sistemas existentes, adaptamos la tecnología a tus necesidades.</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-5">
            <a href="#demo-section" className="btn btn-outline-light btn-lg me-3">¡Prueba nuestro Bot Demo!</a>
            <a href="#contact-section" className="btn btn-custom btn-lg">Quiero un Agente Inteligente</a>
          </div>
        </div>
      </section>

      {/* Plans Section - Sección para mostrar los planes de suscripción dinámicamente */}
      <section id="plans-section" className="py-5">
        <div className="container">
          <h2 className="text-center mb-5">Nuestros Planes</h2>
          <div className="row">
            {loadingPlanes ? (
              <p className="text-center">Cargando planes...</p>
            ) : errorPlanes ? (
              <p className="text-center text-danger">{errorPlanes}</p>
            ) : planes.length === 0 ? (
              <p className="text-center">No hay planes disponibles en este momento.</p>
            ) : (
              planes.map((plan, index) => (
                <div className="col-md-4 mb-4" key={plan.id || index}>
                  <div className={`plan-card p-4 rounded shadow-sm h-100 ${index === 1 ? 'popular' : ''}`}>
                    <h3 className="plan-title">{plan.nombre}</h3>
                    <div className="price h4 mb-3">${plan.precio}<span className="fs-6">/mes</span></div>
                    <ul className="mb-4 list-unstyled">
                      {plan.descripcion && plan.descripcion.split('\n').map((item, i) => (
                        <li key={i}><FontAwesomeIcon icon={faCheck} className="me-2" /> {item}</li>
                      ))}
                    </ul>
                    <button
                      className={`btn ${index === 1 ? 'btn-light' : 'btn-custom'} w-100`}
                      onClick={() => handleSelectPlanForPayment(plan.nombre)} 
                    >
                      Contratar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Sección de Funciones Adicionales - Permite al usuario seleccionar extras */}
      <section id="addons-section" className="py-5">
        <div className="container">
          <h2 className="text-center mb-5">Funciones Adicionales</h2>
          <div className="row justify-content-center">
            {loadingFeatures ? (
              <p className="text-center">Cargando funciones...</p>
            ) : errorFeatures ? (
              <p className="text-center text-danger">{errorFeatures}</p>
            ) : features.length === 0 ? (
              <p className="text-center">No hay funciones adicionales disponibles.</p>
            ) : (
              features.map(feature => (
                <div className="col-md-4 col-sm-6 mb-4" key={feature.id}>
                  <div className={`feature-addon-card p-3 rounded shadow-sm h-100 ${selectedFeatures[feature.id] ? 'bg-info text-white' : 'bg-secondary text-white'}`}
                       style={{ cursor: 'pointer' }}
                       onClick={() => handleFeatureToggle(feature.id)}>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faPlusCircle} className="me-2" />
                      <h5 className="mb-0">{feature.nombre}</h5>
                      <span className="ms-auto h5 mb-0">${feature.precio}</span>
                    </div>
                    <p className="text-muted small mb-2">{feature.descripcion}</p>
                    {selectedFeatures[feature.id] ? (
                      <span className="badge bg-success">Seleccionado</span>
                    ) : (
                      <span className="badge bg-warning text-dark">Click para añadir</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* NUEVA Sección de Pago Directo */}
      <section id="direct-payment-section" className="py-5 bg-dark text-white" ref={directPaymentSectionRef}>
        <div className="container text-center">
          <h2 className="mb-4">¡Listo para Pagar!</h2>
          <p className="lead mb-4">Confirma tu selección y procede al pago de forma segura con Stripe.</p>

          {/* Resumen del precio total estimado (replicado aquí) */}
          <div className="text-center mt-3 p-4 bg-light text-dark rounded shadow-lg mx-auto" style={{ maxWidth: '500px' }}>
            <h3 className="mb-3">Tu Selección:</h3>
            <p className="h5 mb-2">Plan: <strong className="text-primary">{formData.plan}</strong></p>
            <p className="h6 mb-2">Funciones Adicionales:</p>
            <ul className="list-unstyled mb-3">
                {features.filter(f => selectedFeatures[f.id]).map(f => (
                    <li key={f.id} className="ms-3"><FontAwesomeIcon icon={faCheck} className="me-2 text-success" /> {f.nombre} (${f.precio})</li>
                ))}
                {features.filter(f => selectedFeatures[f.id]).length === 0 && (
                    <li className="ms-3 text-muted">Ninguna función adicional seleccionada.</li>
                )}
            </ul>
            <h4 className="fw-bold">TOTAL A PAGAR: <span className="display-5 fw-bold text-primary">${calculateTotalPrice()}</span></h4>
          </div>

          <div className="row justify-content-center mt-4">
            <div className="col-lg-6">
              <form className="row g-3">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tu Nombre (requerido para Stripe)"
                    required
                    value={directPaymentName}
                    onChange={(e) => setDirectPaymentName(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Tu Email (requerido para Stripe)"
                    required
                    value={directPaymentEmail}
                    onChange={(e) => setDirectPaymentEmail(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <button type="button" className="btn btn-custom btn-lg mt-3" onClick={handleCheckout}>
                    <FontAwesomeIcon icon={faCreditCard} className="me-2" /> Proceder al Pago Seguro con Stripe
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>


      {/* Demo Section - Sección de demostración del bot (MEJORADA) */}
      <section id="demo-section" className="py-5">
        <div className="container text-center">
          <h2 className="mb-4">Prueba nuestro Bot</h2>
          <p className="lead mb-4">Interactúa con un ejemplo de nuestro chatbot y descubre su potencial.</p>
          
          {/* Contenedor del Chatbot Demo */}
          <div className="chatbot-container bg-darker-color rounded shadow-lg p-4 mx-auto" style={{ maxWidth: '600px', height: '550px', display: 'flex', flexDirection: 'column' }}>
            {/* Controles de funciones de demo */}
            <div className="demo-features-controls mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="fw-bold mb-2">Activar funciones de demo:</p>
              <div className="d-flex flex-wrap gap-3 justify-content-center">
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="whatsappSwitch" 
                    checked={selectedDemoFeatures.whatsapp} 
                    onChange={() => handleDemoFeatureToggle('whatsapp')} 
                  />
                  <label className="form-check-label" htmlFor="whatsappSwitch">Integración WhatsApp</label>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="humanAgentSwitch" 
                    checked={selectedDemoFeatures.humanAgent} 
                    onChange={() => handleDemoFeatureToggle('humanAgent')} 
                  />
                  <label className="form-check-label" htmlFor="humanAgentSwitch">Transferencia a Agente Humano</label>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="leadQualSwitch" 
                    checked={selectedDemoFeatures.leadQualification} 
                    onChange={() => handleDemoFeatureToggle('leadQualification')} 
                  />
                  <label className="form-check-label" htmlFor="leadQualSwitch">Calificación de Lead</label>
                </div>
                 <div className="form-check form-switch"> 
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="faqResponderSwitch" 
                    checked={selectedDemoFeatures.faqResponder} 
                    onChange={() => handleDemoFeatureToggle('faqResponder')} 
                  />
                  <label className="form-check-label" htmlFor="faqResponderSwitch">FAQs Inteligentes</label>
                </div>
                <div className="form-check form-switch"> 
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="dataCollectionSwitch" 
                    checked={selectedDemoFeatures.dataCollection} 
                    onChange={() => handleDemoFeatureToggle('dataCollection')} 
                  />
                  <label className="form-check-label" htmlFor="dataCollectionSwitch">Recopilación de Datos</label>
                </div>
                 <div className="form-check form-switch"> 
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="productRecommendationSwitch" 
                    checked={selectedDemoFeatures.productRecommendation} 
                    onChange={() => handleDemoFeatureToggle('productRecommendation')} 
                  />
                  <label className="form-check-label" htmlFor="productRecommendationSwitch">Recomendación de Plan</label>
                </div>
              </div>
            </div>

            {/* Historial de mensajes */}
            <div className="chat-history flex-grow-1 overflow-auto p-3 mb-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
              {chatHistory.length === 0 ? (
                <p className="text-muted text-center mt-5">¡Hola! Activa funciones de demo y usa las sugerencias para empezar.</p>
              ) : (
                chatHistory.map((msg, index) => (
                  <div key={index} className={`d-flex mb-2 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div className={`message-bubble p-2 rounded ${msg.sender === 'user' ? 'bg-primary text-dark' : 'bg-secondary text-white'}`} style={{ maxWidth: '80%' }}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Botones de sugerencia */}
            <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                {getSuggestionButtons().map((suggestion, index) => (
                    <button 
                        key={index} 
                        className="btn btn-outline-light btn-sm suggestion-button" 
                        onClick={() => {
                            setCurrentMessage(suggestion.text);
                            handleSendMessage({ preventDefault: () => {} }); 
                        }}
                    >
                        {suggestion.text}
                    </button>
                ))}
            </div>

            {/* Input para el nuevo mensaje */}
            <form onSubmit={handleSendMessage} className="d-flex gap-2">
              <input
                type="text"
                className="form-control flex-grow-1"
                placeholder="Escribe tu mensaje..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
              />
              <button type="submit" className="btn btn-custom">Enviar</button>
            </form>
          </div>
        </div>
      </section>

      {/* Botón flotante para contactar por WhatsApp (integración futura) */}
      <a href="https://wa.me/TU_NUMERO_DE_WHATSAPP?text=Hola%2C%20estoy%20interesado%20en%20sus%20agentes%20inteligentes." 
         target="_blank" 
         rel="noopener noreferrer" 
         className="whatsapp-float-btn">
        <FontAwesomeIcon icon={faWhatsapp} className="whatsapp-icon" />
      </a>

      {/* Testimonials Section - Sección de testimonios de clientes */}
      <section id="testimonials-section" className="py-5">
        <div className="container">
          <h2 className="text-center mb-5">Lo que opinan nuestros clientes</h2>
          <div className="row justify-content-center">
            <div className="col-md-6 mb-4">
              <div className="card p-4 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-center mb-3">
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning" />
                  </div>
                  <p className="card-text">"IABOT ha revolucionado la forma en que atendemos a nuestros clientes. La automatización es increíble y el soporte es de primera."</p>
                  <div className="d-flex align-items-center mt-3">
                    <img src="https://randomuser.me/api/portraits/women/32.jpg" className="rounded-circle me-3" width="50" alt="Cliente" />
                    <div>
                      <h6 className="mb-0">María González</h6>
                      <small className="text-muted">CEO, TiendaOnline</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-4">
              <div className="card p-4 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-center mb-3">
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning-half" />
                  </div>
                  <p className="card-text">"La implementación fue sencilla y el bot ha mejorado significativamente la eficiencia de nuestro equipo de atención."</p>
                  <div className="d-flex align-items-center mt-3">
                    <img src="https://randomuser.me/api/portraits/men/45.jpg" className="rounded-circle me-3" width="50" alt="Cliente" />
                    <div>
                      <h6 className="mb-0">Carlos Mendoza</h6>
                      <small className="text-muted">Gerente, ServiTech</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-4">
              <div className="card p-4 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-center mb-3">
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning" />
                  </div>
                  <p className="card-text">"Nuestras ventas aumentaron un 30% gracias al bot que guía a los clientes en el proceso de compra."</p>
                  <div className="d-flex align-items-center mt-3">
                    <img src="https://randomuser.me/api/portraits/women/68.jpg" className="rounded-circle me-3" width="50" alt="Cliente" />
                    <div>
                      <h6 className="mb-0">Ana López</h6>
                      <small className="text-muted">Marketing, FashionStore</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section - Sección del formulario de contacto (PARA CONSULTAS GENERALES) */}
      <section id="contact-section" className="py-5 bg-dark text-white">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <h2 className="mb-4">¿Tienes otras preguntas? ¡Contáctanos!</h2>
              <p className="lead mb-4">Si deseas una demo personalizada o tienes más preguntas no relacionadas con el pago, completa este formulario.</p>
              <form onSubmit={handleSubmit} className="row g-3 justify-content-center">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Teléfono"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6">
                  <select
                    className="form-select"
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                  >
                    {loadingPlanes ? (
                      <option>Cargando planes...</option>
                    ) : errorPlanes ? (
                      <option>Error al cargar planes</option>
                    ) : planes.length === 0 ? (
                      <option>No hay planes</option>
                    ) : (
                      planes.map(plan => (
                        <option key={plan.id} value={plan.nombre}>{plan.nombre}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="col-12 mt-4 text-start">
                    <h4>Resumen de tu selección actual:</h4>
                    <ul className="list-unstyled">
                        <li><strong>Plan:</strong> {formData.plan} - ${planes.find(p => p.nombre === formData.plan)?.precio || 'N/A'}</li>
                        <li><strong>Funciones Adicionales:</strong></li>
                        {features.filter(f => selectedFeatures[f.id]).map(f => (
                            <li key={f.id} className="ms-3"><FontAwesomeIcon icon={faCheck} className="me-2 text-success" /> {f.nombre} - ${f.precio}</li>
                        ))}
                        {features.filter(f => selectedFeatures[f.id]).length === 0 && (
                            <li className="ms-3 text-muted">Ninguna función adicional seleccionada.</li>
                        )}
                    </ul>
                    <h4 className="fw-bold">TOTAL ESTIMADO: ${calculateTotalPrice()}</h4>
                </div>
                <div className="col-12">
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Mensaje"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-custom btn-lg">Enviar Consulta</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Pie de página */}
      <footer className="footer py-3 bg-black text-white text-center">
        <div className="container">
          <p className="mb-0">© {new Date().getFullYear()} IABOT Soluciones. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
};

export default App;

    