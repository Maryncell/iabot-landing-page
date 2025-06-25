import React, { useState, useEffect, useRef } from 'react'; // Importa useRef
import './style.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Íconos sólidos y de marcas (Añadidos nuevos para los tipos de negocio y acciones)
import { faRobot, faChartLine, faHeadset, faCheck, faStar, faPlusCircle, faQuestionCircle, faInfoCircle, faLightbulb, faCreditCard, faComments, faUsers, faCalendarAlt, faListOl, faDollarSign, faTools, faHandshake, faShoppingCart, faConciergeBell, faTasks, faBullhorn, faEnvelope, faPhone, faBookOpen, faGraduationCap, faPaintBrush, faLaptopCode, faStore, faChalkboardTeacher, faUserTie, faBuilding, faSpa, faTag, faClipboardList, faCookieBite, faDollarSign as faDollarSignSolid, faPlayCircle, faCalendarCheck, faSyncAlt, faEuroSign, faHandHoldingUsd, faSearch, faBriefcase, faChalkboard, faHeartbeat, faPalette, faFileAlt, faQuoteRight, faMapMarkerAlt, faClock, faWallet, faHandsHelping, faBoxes, faHandPointRight, faVideo, faCalendarDay, faUserClock, faCapsules, faLink, faTruck, faStethoscope, faReply, faPaperPlane, faHome, faUserPlus, faChild, faUserMd, faVials, faExclamationTriangle, faUserTie as faUserTieSolid } from '@fortawesome/free-solid-svg-icons'; 
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'; // Importación correcta para faWhatsapp

// Función auxiliar para normalizar el texto de entrada del usuario
const normalizeInput = (text) => {
  return text
    .toLowerCase() // Convertir a minúsculas
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/\//g, '') // Eliminar barras (para "Ventas/Ecommerce")
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
    .trim(); // Eliminar espacios al inicio y final
};

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

  const [directPaymentName, setDirectPaymentName] = useState('');
  const [directPaymentEmail, setDirectPaymentEmail] = useState('');

  const [planes, setPlanes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState({}); 

  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [errorPlanes, setErrorPlanes] = useState(null);
  const [loadingFeatures, setLoadingFeatures] = useState(true); // <<-- CORRECCIÓN AQUI
  const [errorFeatures, setErrorFeatures] = useState(null);
  const [stripePromise, setStripePromise] = useState(null); 

  // ESTADOS PARA EL CHATBOT DEMO MEJORADO
  const [chatHistory, setChatHistory] = useState([]); 
  const [currentMessage, setCurrentMessage] = useState(''); 
  const [selectedDemoFeatures, setSelectedDemoFeatures] = useState({ 
    productRecommendation: false, // Este es ahora el ÚNICO switch de la demo principal
  });
  // demoContext ahora es un objeto para almacenar múltiples estados dentro del flujo
  const [demoContext, setDemoContext] = useState({
    active: false, // Controla si la simulación de IA está activa
    flow: null, // 'ai_simulation_flow'
    step: 'welcome', // 'welcome', 'ask_business_type', 'select_scenario_for_business_type', 'simulate_X_flow', 'final_call_to_action', 'collect_contact_info', 'demo_end'
    businessType: null, // Tipo de negocio elegido por el usuario (ej. 'servicios', 'ventas')
    scenario: null, // Escenario de simulación elegido (ej. 'agendamiento', 'consulta de stock')
    data: {} // para almacenar datos temporales como el tipo de negocio, etc.
  }); 

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

    }
    catch (error) {
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

  // Función para reiniciar la demo
  const resetDemo = () => {
    setChatHistory([]);
    setDemoContext({ active: false, flow: null, step: 'welcome', businessType: null, scenario: null, data: {} });
    return "Simulación reiniciada. Activa el switch 'Simulación de IA' para empezar otra demo.";
  };

  // Manejador para enviar mensajes en el chat del demo
  const handleSendMessage = (e) => { 
    e.preventDefault(); 
    if (currentMessage.trim() === '') return; 

    const userMsg = currentMessage;

    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setCurrentMessage(''); 

    // Simular la respuesta del bot después de un breve retraso
    setTimeout(() => {
      const { response, newDemoContext } = getBotResponse(userMsg, demoContext);
      setDemoContext(newDemoContext); // Actualiza el contexto DESPUÉS de obtener la respuesta
      setChatHistory(prev => [...prev, { sender: 'bot', text: response }]);
    }, 500); 
  };


  // Manejador para alternar las funciones de demo y reiniciar el chat
  const handleDemoFeatureToggle = (featureName) => {
    setSelectedDemoFeatures(prev => {
        const newState = {
            ...prev,
            [featureName]: !prev[featureName]
        };

        // Si se activa/desactiva el switch "Simulación de IA"
        if (featureName === 'productRecommendation') {
            setChatHistory([]); // Limpia el historial
            setDemoContext({ active: false, flow: null, step: 'welcome', businessType: null, scenario: null, data: {} }); // Reinicia el contexto del demo
            if (newState.productRecommendation) {
                // Si se activó, iniciar el flujo de simulación
                setDemoContext({ active: true, flow: 'ai_simulation_flow', step: 'ask_business_type', data: {} });
                setChatHistory(prev => [...prev, { sender: 'bot', text: "👋 ¡Hola! Soy IABOT, tu asistente virtual personalizado.\n\nEstoy diseñado para adaptarme a tu tipo de negocio y ayudarte a responder clientes automáticamente.\n\nAntes de comenzar, contame:\n¿A qué rubro pertenece tu negocio?" }]);
            } else {
                // Si se desactivó, solo un mensaje informativo
                setChatHistory(prev => [...prev, { sender: 'bot', text: "¡Demo de IA desactivada! Puedes explorar otras secciones de la página." }]);
            }
        }
        return newState;
    });
  };

  // Función principal para simular la respuesta del bot, ahora más compleja y con árbol de decisión
  const getBotResponse = (userMsg, currentDemoContext) => {
    const normalizedUserMsg = normalizeInput(userMsg); 
    let response = "";
    let newDemoContext = { ...currentDemoContext }; // Copia el contexto actual para modificarlo

    // Lógica para reiniciar la simulación en cualquier momento (prioritaria)
    if (normalizedUserMsg.includes("reiniciar simulacion") || normalizedUserMsg.includes("reiniciar demo") || normalizedUserMsg.includes("reset")) {
        return { response: resetDemo(), newDemoContext: { active: false, flow: null, step: 'welcome', businessType: null, scenario: null, data: {} } };
    }
    
    // NUEVA Lógica para volver al Menú Principal (prioritaria)
    if (normalizedUserMsg.includes("menu principal")) {
        newDemoContext.step = 'ask_business_type';
        newDemoContext.businessType = null;
        newDemoContext.scenario = null;
        newDemoContext.data = {}; // Limpiar datos de contexto específicos del rubro
        response = "¡Perfecto! Volviendo al menú principal. ¿A qué rubro pertenece tu negocio?";
        return { response, newDemoContext }; // Retorna inmediatamente para procesar este comando
    }

    // Lógica para ir al CTA final (prioritaria)
    if (normalizedUserMsg.includes("finalizar demo y contactar")) {
        newDemoContext.step = 'final_call_to_action';
        response = "¿Querés tener un asistente como este trabajando para vos?\n\nTe puedo ayudar a configurarlo según tu negocio.\n\nPara coordinar, por favor, déjanos tu **nombre** y **email** (ej. Juan Pérez, juan@ejemplo.com).";
        return { response, newDemoContext }; // Retorna inmediatamente
    }


    // Si la simulación de IA no está activa (el switch está off)
    if (!selectedDemoFeatures.productRecommendation || !newDemoContext.active) {
        // Manejar "iniciar demo ia" para activar el flujo
        if (normalizedUserMsg.includes("iniciar demo ia") || normalizedUserMsg.includes("iniciar demo")) {
            newDemoContext = { active: true, flow: 'ai_simulation_flow', step: 'ask_business_type', data: {} };
            response = "👋 ¡Hola! Soy IABOT, tu asistente virtual personalizado.\n\nEstoy diseñado para adaptarme a tu tipo de negocio y ayudarte a responder clientes automáticamente.\n\nAntes de comenzar, contame:\n¿A qué rubro pertenece tu negocio?";
            return { response, newDemoContext };
        }
        // Respuestas de fallback generales si la demo de IA no está activa
        if (normalizedUserMsg.includes("hola")) {
          return { response: "¡Hola! Soy IABOT, tu asistente virtual. ¿En qué puedo ayudarte hoy? Activa el switch 'Simulación de IA' para ver mi potencial.", newDemoContext };
        } else if (normalizedUserMsg.includes("precio") || normalizedUserMsg.includes("costo") || normalizedUserMsg.includes("planes")) {
          return { response: "Puedes ver nuestros planes y funciones adicionales en las secciones 'Planes' y 'Funciones Adicionales' de esta página. ¡Haz clic para explorar! Si quieres ver una simulación, ¡prueba activar la 'Simulación de IA'!", newDemoContext };
        } else if (normalizedUserMsg.includes("gracias")) {
          return { response: "¡De nada! Estoy aquí para ayudarte a transformar tu negocio.", newDemoContext };
        } else if (normalizedUserMsg.includes("contacto")) {
          return { response: "Si deseas una demo personalizada o tienes más preguntas, puedes contactarnos a través del formulario al final de la página. También puedes hacer clic en el botón 'Hablar con un Experto por WhatsApp' flotante en la esquina inferior derecha.", newDemoContext };
        } 
        return { response: `Has dicho: "${userMsg}". Este es un demo interactivo. Para experimentar más, te sugiero activar el switch 'Simulación de IA' para ver mi potencial.`, newDemoContext };
    }

    // --- Flujo de la Demo de IA (cuando selectedDemoFeatures.productRecommendation está activo) ---
    switch (currentDemoContext.step) {
        case 'ask_business_type':
            // Ahora solo evaluamos si la entrada normalizada está en nuestra lista de tipos válidos
            const validBusinessTypesNormalized = ["servicios", "ventas", "educacion", "salud", "freelance", "otro"]; 
            let chosenBusinessType = null;

            if (normalizedUserMsg.includes("ventas") || normalizedUserMsg.includes("ecommerce")) {
                chosenBusinessType = "ventas"; // Normalizar a "ventas"
            } else if (validBusinessTypesNormalized.includes(normalizedUserMsg)) {
                chosenBusinessType = normalizedUserMsg;
            }

            if (chosenBusinessType) {
                newDemoContext.businessType = chosenBusinessType;
                newDemoContext.step = 'select_scenario_for_business_type';
                let displayType = chosenBusinessType.charAt(0).toUpperCase() + chosenBusinessType.slice(1);
                if (chosenBusinessType === 'ventas') { // Ajustar display para ventas
                    displayType = "Ventas/Ecommerce";
                }
                
                response = `¡Genial! Un negocio de **${displayType}** puede beneficiarse enormemente de IABOT.`;

                switch (newDemoContext.businessType) {
                    case 'servicios':
                        response += "\n\n¿Querés que simule una conversación sobre...?";
                        break;
                    case 'ventas':
                        response += "\n\n¡Perfecto! Imaginá que te escribe un cliente preguntando por productos. Simulo una consulta automática:\n\n*\"Hola, ¿tenés stock de este producto? ¿Cuánto cuesta? ¿Cómo es el envío?\"*";
                        break;
                    case 'educacion':
                        response += "\n\n¡Excelente! Este bot puede:\n- Informar sobre horarios\n- Pasar precios\n- Enviar links de inscripción\n- Responder dudas frecuentes.";
                        break;
                    case 'salud':
                        response += "\n\n¡Genial! Nuestro bot de salud puede:\n- Agendar turnos por especialidad\n- Informar sobre estudios y tratamientos\n- Resolver FAQs de pacientes\n- Asistir en el registro de nuevos pacientes.";
                        break;
                    case 'freelance':
                        response += "\n\nPara profesionales independientes, el bot puede:\n- Presentar tu portfolio\n- Mostrar precios por servicios\n- Agendar entrevistas\n- Responder automáticamente si estás ocupado.";
                        break;
                    case 'otro':
                        response += "\n\n¡Contame más sobre tu rubro! Mientras tanto, mirá un ejemplo general de cómo tu bot puede:\n- Recibir consultas\n- Clasificar al cliente (Calificación de Lead)\n- Agendarte reuniones\n- Vender por vos las 24hs (Integración WhatsApp).";
                        break;
                }
            } else {
                response = "No pude identificar ese tipo de negocio. Por favor, selecciona uno de los sugeridos (Servicios, Ventas, Educación, Salud, Freelance, Otro) o descríbelo brevemente.";
            }
            break;

        case 'select_scenario_for_business_type':
            newDemoContext.scenario = normalizedUserMsg; 
            
            let scenarioFound = true; // Bandera para saber si se encontró un escenario válido

            switch (newDemoContext.businessType) {
                case 'servicios':
                    if (normalizedUserMsg.includes('agendamiento de turnos')) {
                        newDemoContext.step = 'simulate_service_booking';
                        response = "Perfecto, simulemos un **Agendamiento de Turnos**.\n\nUn cliente dice: '*Hola, quisiera agendar una cita.*' ¿Qué le preguntarías para agendarle?";
                    } else if (normalizedUserMsg.includes('preguntas frecuentes')) {
                        newDemoContext.step = 'simulate_service_faq';
                        response = "Entendido, simulemos **Preguntas Frecuentes (FAQs Inteligentes)**.\n\nUn cliente pregunta: '*¿Cuáles son los requisitos para un masaje descontracturante?'*";
                    } else if (normalizedUserMsg.includes('precios')) {
                        newDemoContext.step = 'simulate_service_pricing';
                        response = "Muy bien, simulemos una consulta de **Precios**.\n\nUn cliente dice: '*Hola, ¿cuánto cuesta la sesión de masajes descontracturantes?'*";
                    } else if (normalizedUserMsg.includes('otra consulta')) {
                        newDemoContext.step = 'simulate_service_general_query';
                        response = "OK, para una **Otra Consulta General**. Un cliente podría preguntar: '*¿Atienden los fines de semana?'*";
                    } else {
                        scenarioFound = false;
                    }
                    break;
                case 'ventas':
                    if (normalizedUserMsg.includes('consulta de stock y precio')) {
                        newDemoContext.step = 'simulate_sales_inquiry';
                        response = "¡Excelente! Simulemos una **Consulta de Stock y Precio**.\n\nUn cliente escribe: '*Hola, ¿tenés stock de este producto? ¿Cuánto cuesta? ¿Cómo es el envío?'*";
                    } else if (normalizedUserMsg.includes('proceso de compra')) {
                        newDemoContext.step = 'simulate_sales_purchase_process';
                        response = "Vamos a simular un **Proceso de Compra**.\n\nUn cliente dice: '*Quiero comprar el producto que vi en la web.*' El bot puede guiarlo.";
                    } else {
                        scenarioFound = false;
                    }
                    break;
                case 'educacion':
                    if (normalizedUserMsg.includes('simular consulta de curso')) {
                        newDemoContext.step = 'simulate_education_info';
                        response = "Perfecto, **Consulta de Curso**.\n\nSimulación: '*Hola, ¿cuándo empieza el curso de inglés y cuánto vale?'*";
                    } else if (normalizedUserMsg.includes('simular inscripcion')) {
                        newDemoContext.step = 'simulate_education_enrollment';
                        response = "Simulemos un **Proceso de Inscripción**.\n\nUn cliente: '*Quiero inscribirme en el curso de matemáticas.*' El bot puede enviar un link y guiar el proceso.";
                    } else {
                        scenarioFound = false;
                    }
                    break;
                case 'salud':
                    if (normalizedUserMsg.includes('agendamiento de turnos')) {
                        newDemoContext.step = 'simulate_health_booking';
                        response = "Ok, simulemos **Agendamiento de Turnos**.\n\nUn paciente dice: '*Quisiera agendar un turno. ¿Con qué especialidad cuentan?*' ¿Cómo respondería tu bot?";
                    } else if (normalizedUserMsg.includes('consultas sobre estudios')) {
                        newDemoContext.step = 'simulate_health_treatment_info';
                        response = "Muy bien, simulemos **Consultas sobre Estudios o Tratamientos**.\n\nUn paciente pregunta: '*Necesito resultados de mi análisis de sangre. ¿Cómo los obtengo?*' ¿Cómo le respondería el bot?";
                    } else if (normalizedUserMsg.includes('faqs pacientes')) {
                        newDemoContext.step = 'simulate_health_faq';
                        response = "Simulemos **FAQs de Pacientes**.\n\nUn paciente dice: '*¿El consultorio atiende los sábados?*' ¿Qué diría el bot?";
                    } else if (normalizedUserMsg.includes('registro nuevo paciente')) {
                        newDemoContext.step = 'simulate_health_new_patient';
                        response = "Perfecto, **Registro de Nuevo Paciente** (Demostrando Calificación de Lead).\n\nUn usuario: '*Quiero sacar un turno pero soy paciente nuevo.*' ¿Qué datos le pedirías primero?";
                    } else {
                        scenarioFound = false;
                    }
                    break;
                case 'freelance': 
                    if (normalizedUserMsg.includes('presentar mi portfolio')) {
                        newDemoContext.step = 'simulate_freelance_portfolio';
                        response = "¡Genial! **Presentar tu Portfolio**.\n\nSimulación: '*Hola, necesito un logo para mi marca. ¿Cuánto cobrás y qué incluye?'*";
                    } else if (normalizedUserMsg.includes('mostrar precios de servicios')) {
                        newDemoContext.step = 'simulate_freelance_pricing'; 
                        response = "Perfecto, **Mostrar Precios de Servicios**.\n\nSimulación: '*Estoy interesado en tu servicio de diseño web. ¿Cuáles son tus tarifas?'*";
                    }
                     else if (normalizedUserMsg.includes('agendar entrevista')) {
                        newDemoContext.step = 'simulate_freelance_interview';
                        response = "Vamos a simular **Agendar Entrevista**.\n\nUn cliente: '*Me gustaría hablar contigo sobre un proyecto.*' El bot puede agendar una reunión.";
                    } else {
                        scenarioFound = false;
                    }
                    break;
                case 'otro':
                    if (normalizedUserMsg.includes('simular consulta general')) {
                        newDemoContext.step = 'simulate_other_general_features';
                        response = "Perfecto, una **Consulta General**. Aquí tu bot puede:\n- Recibir consultas\n- Clasificar al cliente (Calificación de Lead)\n- Agendarte reuniones\n- Vender por vos las 24hs (Integración WhatsApp).";
                    } else {
                        scenarioFound = false;
                    }
                    break;
                default:
                    scenarioFound = false; 
                    break;
            }

            if (!scenarioFound) {
                response = `Por favor, elige una de las opciones sugeridas para **${currentDemoContext.businessType.charAt(0).toUpperCase() + currentDemoContext.businessType.slice(1)}**.`;
                newDemoContext.step = 'select_scenario_for_business_type'; 
            }
            break;

        // --- Flujos específicos de simulación detallados ---
        // Estos casos ahora se mantienen en el mismo paso para permitir más exploración
        case 'simulate_service_booking':
            if (normalizedUserMsg.includes('para que dia y hora')) {
                response = "¡Perfecto! IABOT respondería: '¡Claro! ¿Para qué fecha y hora te gustaría agendar tu cita?' (Esto es una simulación). Luego, el bot confirmaría la reserva y enviaría recordatorios, optimizando tu agenda.";
            } else if (normalizedUserMsg.includes('que servicios buscas')) {
                response = "IABOT te preguntaría: '¿Qué tipo de servicio buscas agendar? Por ejemplo: Masaje descontracturante, limpieza facial, etc.' Esto ayuda a refinar la búsqueda del cliente.";
            } else {
                response = "No pude entender tu pregunta. IABOT te guiaría para agendar. Prueba otra opción relacionada con agendamiento.";
            }
            break; 

        case 'simulate_service_faq':
            if (normalizedUserMsg.includes('cuanto dura la sesion')) {
                response = "IABOT, con sus **FAQs Inteligentes**, respondería: 'La sesión de masaje descontracturante tiene una duración de 60 minutos.' ¡No más preguntas repetitivas!";
            } else if (normalizedUserMsg.includes('necesito turno previo')) {
                response = "IABOT diría: 'Sí, para garantizar tu lugar, es necesario agendar tu turno con antelación. Puedes hacerlo fácilmente por aquí.'";
            } else {
                response = "No pude entender tu pregunta. IABOT puede responder muchas FAQs. Prueba otra opción.";
            }
            break; 

        case 'simulate_service_pricing':
            if (normalizedUserMsg.includes('precio de masajes')) {
                response = "IABOT consultaría tu lista de precios en tiempo real y diría: 'La sesión de masaje descontracturante tiene un costo de $15.000.'";
            } else if (normalizedUserMsg.includes('precios de otros tratamientos')) {
                response = "IABOT te mostraría una lista: 'También ofrecemos: Limpieza facial $10.000, Drenaje linfático $18.000, etc.'";
            } else {
                response = "No pude entender tu pregunta. IABOT maneja precios. Prueba otra opción.";
            }
            break;

        case 'simulate_service_general_query':
            if (normalizedUserMsg.includes('horarios de atencion')) {
                response = "IABOT informaría: 'Nuestros horarios de atención son de lunes a viernes, de 9:00 a 19:00 y sábados de 10:00 a 14:00.'";
            } else if (normalizedUserMsg.includes('donde estan ubicados')) {
                response = "IABOT te daría la dirección: 'Estamos ubicados en [Dirección de Ejemplo]. Puedes vernos en el mapa aquí: [Link de Google Maps].'";
            } else {
                response = "No pude entender tu pregunta. IABOT maneja consultas generales. Prueba otra opción.";
            }
            break;

        case 'simulate_sales_inquiry':
            if (normalizedUserMsg.includes('cuanto vale el producto x') || normalizedUserMsg.includes('stock de este producto') || normalizedUserMsg.includes('costo') || normalizedUserMsg.includes('precio') && (normalizedUserMsg.includes('producto') || normalizedUserMsg.includes('zapatilla'))) {
                response = "El bot respondería: '¡Claro! El producto que buscas está disponible. Tiene un precio de $45.000. El envío se realiza en 24 hs o puedes retirar en nuestro local.'";
            } else if (normalizedUserMsg.includes('hay envio a mi ciudad') || normalizedUserMsg.includes('tiempo de entrega')) {
                 response = "El bot respondería: 'Sí, hacemos envíos a tu ciudad. ¿Nos puedes indicar tu código postal para calcular el costo y tiempo de entrega exacto?'";
            } else {
                response = "No pude entender tu pregunta. IABOT puede dar información de productos. Prueba otra opción.";
            }
            break;

        case 'simulate_sales_purchase_process':
            if (normalizedUserMsg.includes('como hago para pagar') || normalizedUserMsg.includes('formas de pago')) {
                response = "IABOT guiaría el pago: 'Puedes pagar con tarjeta de crédito/débito, transferencia bancaria o en efectivo al retirar. ¿Cuál prefieres? (Esto es una simulación).'";
            } else if (normalizedUserMsg.includes('cuales son las formas de envio') || normalizedUserMsg.includes('metodos de envio')) {
                response = "IABOT te informaría: 'Ofrecemos envío a domicilio por correo o retiro en nuestro local. ¿Cuál te conviene más? (Esto es una simulación).'";
            } else {
                response = "No pude entender tu pregunta. IABOT puede asistir en el proceso de compra. Prueba otra opción.";
            }
            break;

        case 'simulate_education_info':
            if (normalizedUserMsg.includes('horario del curso') || normalizedUserMsg.includes('cuando empieza el curso')) {
                response = "IABOT respondería: 'El curso de inglés nivel avanzado comienza el 15 de septiembre y tiene clases los martes y jueves de 18:00 a 20:00 hs.'";
            } else if (normalizedUserMsg.includes('precio del curso') || normalizedUserMsg.includes('cuanto vale')) {
                response = "IABOT te informaría: 'El costo del curso de inglés nivel avanzado es de $30.000 mensuales, con una matrícula de $5.000.'";
            } else {
                response = "No pude entender tu pregunta. IABOT tiene información sobre tus cursos. Prueba otra opción.";
            }
            break;

        case 'simulate_education_enrollment':
            if (normalizedUserMsg.includes('link de inscripcion') || normalizedUserMsg.includes('quiero inscribirme')) {
                response = "IABOT diría: '¡Claro! Aquí tienes el link directo para inscribirte al curso de matemáticas: [Link de Inscripción Falso]. Solo sigue los pasos y estarás dentro.'";
            } else if (normalizedUserMsg.includes('metodos de pago') || normalizedUserMsg.includes('formas de pago')) {
                response = "IABOT informaría: 'Puedes pagar con tarjeta de crédito/débito, transferencia bancaria o en cuotas. ¿Necesitas más detalles sobre alguna opción?'";
            } else {
                response = "No pude entender tu pregunta. IABOT asiste en la inscripción. Prueba otra opción.";
            }
            break;

        // --- SALUD FLUJOS REVISADOS ---
        case 'simulate_health_booking':
            if (normalizedUserMsg.includes('cardiologia') || normalizedUserMsg.includes('pediatria') || normalizedUserMsg.includes('clinica general') || normalizedUserMsg.includes('laboratorio')) {
                newDemoContext.data.specialty = userMsg; // Guardar la especialidad elegida
                response = `Perfecto, tenemos turnos disponibles en **${userMsg}**. ¿Para qué fecha y hora te convendría agendar?`;
            } else if (normalizedUserMsg.includes('manana a las 10 am') || normalizedUserMsg.includes('pasado manana') || normalizedUserMsg.includes('25 de julio 14hs')) {
                response = `Confirmado. Su turno para ${newDemoContext.data.specialty || 'la consulta'} es para ${userMsg}. Recibirá un recordatorio por WhatsApp. ¡Esto demuestra nuestro **Agendamiento Inteligente** en acción!`;
            } else {
                response = "No pude entender tu pregunta. Para agendar, por favor, indica una especialidad o un horario.";
            }
            break;

        case 'simulate_health_treatment_info':
            if (normalizedUserMsg.includes('resultados analisis sangre') || normalizedUserMsg.includes('como obtengo resultados')) {
                response = "Puedes acceder a los resultados de laboratorio en nuestro portal de pacientes con tu DNI y número de estudio aquí: [Link a Portal Falso]. Esto demuestra cómo gestionamos **FAQs Inteligentes**.";
            } else if (normalizedUserMsg.includes('estudios de cardiologia')) {
                response = "Realizamos electrocardiogramas, ecocardiogramas, ergometrías y Holter. ¿Te gustaría saber más sobre alguno en particular?";
            } else {
                response = "No pude entender tu pregunta. Podemos informarte sobre diversos estudios y tratamientos. Prueba otra consulta.";
            }
            break;

        case 'simulate_health_faq':
            if (normalizedUserMsg.includes('consultorio atiende sabados')) {
                response = "IABOT respondería: 'Sí, nuestro consultorio de Clínicas y Traumatología atiende los sábados de 9:00 a 13:00 hs. para consultas y urgencias.'";
            } else if (normalizedUserMsg.includes('atienden urgencias')) {
                response = "IABOT te informaría: 'Sí, contamos con servicio de urgencias 24 horas para casos que requieren atención inmediata. Por favor, especifique el tipo de emergencia.'";
            } else {
                response = "No pude entender tu pregunta. IABOT puede responder FAQs comunes para pacientes. Prueba otra opción.";
            }
            break;

        case 'simulate_health_new_patient':
            if (normalizedUserMsg.includes('nombre completo dni fecha nacimiento') || normalizedUserMsg.includes('mis datos')) {
                response = "¡Excelente! Gracias por tus datos. Con esto, IABOT ya puede iniciar tu registro como nuevo paciente y ayudarte a agendar tu primera consulta. Esto es un ejemplo de **Calificación de Lead** automatizada.";
            } else if (normalizedUserMsg.includes('documentacion necesaria')) {
                response = "IABOT te diría: 'Para el registro, necesitarás tu DNI y carnet de obra social si posees. ¿Ya tienes todo listo?'";
            } else {
                response = "No pude entender tu pregunta. Para el registro de nuevo paciente, IABOT te pediría los datos básicos.";
            }
            break;

        case 'simulate_freelance_portfolio':
            if (normalizedUserMsg.includes('precios de logos') || normalizedUserMsg.includes('cuanto cobras') || normalizedUserMsg.includes('que incluye') || normalizedUserMsg.includes('costo de servicios')) {
                response = "IABOT podría decir: 'Mis paquetes de diseño de logo van desde $50.000 para un diseño básico, incluyendo 3 revisiones y archivos en diferentes formatos.'";
            } else if (normalizedUserMsg.includes('ver portfolio') || normalizedUserMsg.includes('muestrame tu trabajo') || normalizedUserMsg.includes('presentar mi portfolio')) {
                response = "IABOT te daría el link: '¡Claro! Puedes ver mi portfolio completo aquí: [Link a Portfolio Falso]. Ahí encontrarás ejemplos de logos y otros trabajos.'";
            } else {
                response = "No pude entender tu pregunta. IABOT puede presentar tu trabajo. Prueba otra opción.";
            }
            break;

        case 'simulate_freelance_pricing': 
            if (normalizedUserMsg.includes('cuales son tus tarifas') || normalizedUserMsg.includes('precio de diseño web') || normalizedUserMsg.includes('tarifas')) {
                response = "IABOT te informaría: 'Mis tarifas para diseño web varían según la complejidad del proyecto. Un sitio básico empieza en $80.000, incluyendo 5 secciones y un mes de soporte.'";
            } else if (normalizedUserMsg.includes('ejemplos de trabajos') || normalizedUserMsg.includes('ver proyectos')) {
                response = "IABOT te daría el link: '¡Claro! Puedes ver ejemplos de mi trabajo de diseño web aquí: [Link a Ejemplos Diseño Web Falso].'";
            } else {
                response = "No pude entender tu pregunta. IABOT puede darte detalles sobre precios. Prueba otra opción.";
            }
            break;

        case 'simulate_freelance_interview':
            if (normalizedUserMsg.includes('agendar reunion') || normalizedUserMsg.includes('hablar contigo')) {
                response = "IABOT te diría: '¡Perfecto! Puedes agendar una reunión conmigo directamente desde este link: [Link a Calendario Falso]. Elige el horario que mejor te convenga.'";
            } else if (normalizedUserMsg.includes('estas disponible esta semana')) {
                response = "IABOT consultaría tu agenda y respondería: 'Sí, tengo disponibilidad el miércoles a las 10:00 AM y el viernes a las 14:00 PM. ¿Cuál te va mejor?'";
            } else {
                response = "No pude entender tu pregunta. IABOT facilita el contacto. Prueba otra opción.";
            }
            break;

        case 'simulate_other_general_features':
            if (normalizedUserMsg.includes('como clasifica leads') || normalizedUserMsg.includes('califica leads')) {
                response = "IABOT clasifica leads haciendo preguntas clave predefinidas (ej. '¿Cuál es tu presupuesto?', '¿Qué tan pronto necesitas el servicio?'), y luego te notifica con los datos más relevantes para que califiques al cliente. ¡Esto es **Calificación de Lead** en acción!";
            } else if (normalizedUserMsg.includes('puede agendar por mi') || normalizedUserMsg.includes('agendar reuniones')) {
                response = "IABOT puede integrarse con tu calendario (ej. Google Calendar) y agendar reuniones automáticamente, enviando invitaciones y recordatorios. ¡Es como tener un asistente virtual 24/7!";
            } else {
                response = "No pude entender tu pregunta. IABOT es muy versátil. Prueba otra opción.";
            }
            break;

        case 'final_call_to_action':
            const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
            const emailMatch = userMsg.match(emailRegex);
            
            let nameForContact = "Cliente Interesado"; 
            let emailForContact = "";

            if (emailMatch) {
                emailForContact = emailMatch[1].trim();
                let remainingText = userMsg.replace(emailMatch[0], '').trim();

                const nameKeywords = ["mi nombre es", "soy", "me llamo", "mi nombre", "me llamo es", "soy el"];
                let foundName = false;
                for (const keyword of nameKeywords) {
                    const keywordIndex = normalizeInput(remainingText).indexOf(normalizeInput(keyword));
                    if (keywordIndex !== -1) {
                        nameForContact = remainingText.substring(keywordIndex + keyword.length).trim().split(' ')[0]; 
                        if (nameForContact.length > 0) foundName = true;
                        break;
                    }
                }
                
                if (!foundName && remainingText.length > 0) {
                    const parts = remainingText.split(/[\s,.-]/).filter(Boolean);
                    if (parts.length > 0 && normalizeInput(parts[0]) !== 'y') {
                        nameForContact = parts[0];
                    }
                } else if (!foundName && userMsg.length > 0) {
                    const originalParts = userMsg.split(/[\s,.-]/).filter(Boolean);
                    if (originalParts.length > 0 && originalParts[0].toLowerCase() !== 'mi' && originalParts[0].toLowerCase() !== 'es') {
                        nameForContact = originalParts[0];
                    }
                }

                if (nameForContact.length > 30) nameForContact = nameForContact.substring(0, 30) + "..."; 
                if (!nameForContact || normalizeInput(nameForContact).includes('email') || normalizeInput(nameForContact).includes('e-mail') || nameForContact.length < 2) nameForContact = "Cliente Interesado"; 

            }

            if (emailForContact.includes("@") && emailForContact.includes(".")) {
                newDemoContext.data.name = nameForContact;
                newDemoContext.data.email = emailForContact;
                newDemoContext.step = 'demo_end'; 
                response = `¡Gracias, ${nameForContact}! Hemos recibido tu información (${emailForContact}) y un experto de IABOT se pondrá en contacto contigo pronto. Esto demuestra nuestra capacidad de calificar leads y gestionar contactos de manera eficiente.`;
                response += "\n\n**Recuerda:** Esto es solo una demo. Al contratar el servicio, tendrás todas las opciones conversacionales habilitadas con IA, integraciones reales y un flujo completamente personalizado para tu negocio.";
                
            } else if (normalizedUserMsg.includes('quiero una demo completa') || normalizedUserMsg.includes('enviar video demo') || normalizedUserMsg.includes('agendar cita') || normalizedUserMsg.includes('quiero mi asistente') || normalizedUserMsg.includes('agendate una reunion gratuita')) {
                response = "¿Querés tener un asistente como este trabajando para vos?\n\nTe puedo ayudar a configurarlo según tu negocio.\n\nPara coordinar, por favor, déjanos tu **nombre** y **email** (ej. Juan Pérez, juan@ejemplo.com).";
            }
            else {
                 response = "Ese no parece un formato de nombre y email válido. Por favor, ingresa tu nombre y email (ej. Juan Pérez, juan@ejemplo.com).";
                 newDemoContext.step = 'final_call_to_action'; 
            }
            break;

        case 'demo_end': 
            response = "Gracias por participar en la demo. Si deseas explorar más, puedes reiniciar la simulación.";
            break;

        default:
            response = "Lo siento, hubo un problema en la simulación. Por favor, reinicia para comenzar de nuevo.";
            break;
    }

    return { response, newDemoContext };
  };

  // Genera botones de sugerencia dinámicamente basados en el contexto y las funciones activas
  const getSuggestionButtons = () => {
    let suggestions = [];

    // Botón para iniciar la demo de IA si no está activa
    if (selectedDemoFeatures.productRecommendation && !demoContext.active) {
        suggestions.push({ text: "Iniciar Demo de IA", key: "iniciar demo ia", icon: faLightbulb });
    } else if (demoContext.active) {
      switch (demoContext.step) {
        case 'ask_business_type':
          suggestions = [
            { text: "Servicios", key: "servicios", icon: faUserTieSolid }, // Icono actualizado
            { text: "Ventas", key: "ventas", icon: faShoppingCart }, // Cambiado a "Ventas"
            { text: "Educación", key: "educacion", icon: faGraduationCap },
            { text: "Salud", key: "salud", icon: faHeartbeat },
            { text: "Freelance", key: "freelance", icon: faLaptopCode }, 
            { text: "Otro", key: "otro", icon: faBuilding }
          ];
          break;
        case 'select_scenario_for_business_type':
            switch (demoContext.businessType) {
                case 'servicios':
                    suggestions = [
                        { text: "Agendamiento de Turnos", key: "agendamiento de turnos", icon: faCalendarAlt },
                        { text: "Preguntas Frecuentes", key: "preguntas frecuentes", icon: faQuestionCircle },
                        { text: "Precios", key: "precios", icon: faDollarSignSolid },
                        { text: "Otra Consulta", key: "otra consulta", icon: faInfoCircle }
                    ];
                    break;
                case 'ventas':
                    suggestions = [
                        { text: "Consulta de Stock y Precio", key: "consulta de stock y precio", icon: faSearch },
                        { text: "Proceso de Compra", key: "proceso de compra", icon: faTruck } 
                    ];
                    break;
                case 'educacion':
                    suggestions = [
                        { text: "Simular Consulta de Curso", key: "simular consulta de curso", icon: faBookOpen },
                        { text: "Simular Inscripción", key: "simular inscripcion", icon: faLink } 
                    ];
                    break;
                case 'salud':
                    suggestions = [
                        { text: "Agendamiento de Turnos", key: "agendamiento de turnos", icon: faCalendarCheck },
                        { text: "Consultas sobre Estudios", key: "consultas sobre estudios", icon: faStethoscope },
                        { text: "FAQs Pacientes", key: "faqs pacientes", icon: faQuestionCircle },
                        { text: "Registro Nuevo Paciente", key: "registro nuevo paciente", icon: faUserPlus } 
                    ];
                    break;
                case 'freelance': 
                    suggestions = [
                        { text: "Presentar mi Portfolio", key: "presentar mi portfolio", icon: faPalette }, 
                        { text: "Mostrar Precios de Servicios", key: "mostrar precios de servicios", icon: faDollarSignSolid }, 
                        { text: "Agendar Entrevista", key: "agendar entrevista", icon: faCalendarCheck }
                    ];
                    break;
                case 'otro':
                    suggestions = [
                        { text: "Simular Consulta General", key: "simular consulta general", icon: faComments }
                    ];
                    break;
                default:
                    suggestions.push({ text: "Reiniciar Simulación", key: "reiniciar simulacion", icon: faSyncAlt });
                    break;
            }
            break;

        // Sugerencias dentro de cada simulación (pasos de 'simulate_X_flow')
        // Aquí se mostrarán las opciones de interacción para CADA simulación, más los botones de navegación
        case 'simulate_service_booking':
            suggestions = [
                { text: "Para qué día y hora", key: "para que dia y hora", icon: faCalendarDay },
                { text: "Qué servicios buscas", key: "que servicios buscas", icon: faSpa }
            ];
            break;
        case 'simulate_service_faq':
            suggestions = [
                { text: "¿Cuánto dura la sesión?", key: "cuanto dura la sesion", icon: faClock },
                { text: "¿Necesito turno previo?", key: "necesito turno previo", icon: faQuestionCircle }
            ];
            break;
        case 'simulate_service_pricing':
            suggestions = [
                { text: "Precio de masajes", key: "precio de masajes", icon: faDollarSignSolid },
                { text: "Precios de otros tratamientos", key: "precios de otros tratamientos", icon: faEuroSign } 
            ];
            break;
        case 'simulate_service_general_query':
            suggestions = [
                { text: "Horarios de atención", key: "horarios de atencion", icon: faClock },
                { text: "Dónde están ubicados", key: "donde estan ubicados", icon: faMapMarkerAlt }
            ];
            break;
        case 'simulate_sales_inquiry':
            suggestions = [
                { text: "¿Cuánto vale el producto X?", key: "cuanto vale el producto x", icon: faTag },
                { text: "¿Hay envío a mi ciudad?", key: "hay envio a mi ciudad", icon: faBoxes }
            ];
            break;
        case 'simulate_sales_purchase_process':
            suggestions = [
                { text: "Cómo hago para pagar", key: "como hago para pagar", icon: faWallet },
                { text: "¿Cuáles son las formas de envío?", key: "cuales son las formas de envio", icon: faTruck } 
            ];
            break;
        case 'simulate_education_info':
            suggestions = [
                { text: "Horario del curso", key: "horario del curso", icon: faClock },
                { text: "Precio del curso", key: "precio del curso", icon: faDollarSignSolid }
            ];
            break;
        case 'simulate_education_enrollment':
            suggestions = [
                { text: "Link de inscripción", key: "link de inscripcion", icon: faLink }, 
                { text: "Métodos de pago", key: "metodos de pago", icon: faCreditCard }
            ];
            break;

        // --- SALUD SUGERENCIAS REVISADAS ---
        case 'simulate_health_booking':
            suggestions = [
                { text: "Cardiología", key: "cardiologia", icon: faHeartbeat },
                { text: "Pediatría", key: "pediatria", icon: faChild }, 
                { text: "Clínica General", key: "clinica general", icon: faUserMd }, 
                { text: "Laboratorio", key: "laboratorio", icon: faVials },
                { text: "Mañana a las 10 AM", key: "manana a las 10 am", icon: faClock }, 
                { text: "25 de Julio, 14hs", key: "25 de julio 14hs", icon: faCalendarDay }
            ];
            break;
        case 'simulate_health_treatment_info':
            suggestions = [
                { text: "Resultados análisis sangre", key: "resultados analisis sangre", icon: faFileAlt },
                { text: "Estudios de Cardiología", key: "estudios de cardiologia", icon: faLungs } 
            ];
            break;
        case 'simulate_health_faq':
            suggestions = [
                { text: "¿El consultorio atiende sábados?", key: "consultorio atiende sabados", icon: faClock },
                { text: "¿Atienden urgencias?", key: "atienden urgencias", icon: faExclamationTriangle } 
            ];
            break;
        case 'simulate_health_new_patient':
            suggestions = [
                { text: "Nombre completo, DNI, fecha nacimiento", key: "nombre completo dni fecha nacimiento", icon: faUserPlus }, 
                { text: "¿Qué documentación necesito?", key: "documentacion necesaria", icon: faClipboardList }
            ];
            break;

        case 'simulate_freelance_portfolio':
            suggestions = [
                { text: "Precios de logos", key: "precios de logos", icon: faDollarSignSolid },
                { text: "Ver portfolio", key: "ver portfolio", icon: faPalette }
            ];
            break;
        case 'simulate_freelance_pricing': 
            suggestions = [
                { text: "Cuáles son tus tarifas", key: "cuales son tus tarifas", icon: faDollarSignSolid },
                { text: "Ejemplos de trabajos", key: "ejemplos de trabajos", icon: faFileAlt } 
            ];
            break;
        case 'simulate_freelance_interview':
            suggestions = [
                { text: "Agendar reunión", key: "agendar reunion", icon: faCalendarCheck },
                { text: "¿Estás disponible esta semana?", key: "estas disponible esta semana", icon: faCalendarAlt }
            ];
            break;
        case 'simulate_other_general_features':
            suggestions = [
                { text: "¿Cómo clasifica leads?", key: "como clasifica leads", icon: faUsers },
                { text: "¿Puede agendar por mí?", key: "puede agendar por mi", icon: faUserClock }
            ];
            break;


        case 'final_call_to_action':
          suggestions = [
              { text: "Quiero una demo completa", key: "quiero una demo completa", icon: faVideo },
              { text: "Enviar video demo", key: "enviar video demo", icon: faPlayCircle },
              { text: "Agendar cita", key: "agendar cita", icon: faCalendarCheck },
              { text: "Juan Pérez, juan@ejemplo.com", key: "ejemplo_contacto", icon: faEnvelope }
          ];
          break;
        
        case 'demo_end':
            suggestions = [{ text: "Reiniciar Simulación", key: "reiniciar simulacion", icon: faSyncAlt }];
            break;

        default:
          suggestions = [];
          break;
      }
    }

    // Siempre añadir Reiniciar Simulación si la demo está activa y no está en el paso de bienvenida o fin
    if (demoContext.active && demoContext.step !== 'welcome' && demoContext.step !== 'demo_end') {
        suggestions.push({ text: "Reiniciar Simulación", key: "reiniciar simulacion", icon: faSyncAlt });
    }

    // AÑADIDO: "Menú Principal" si estamos en un paso de selección de escenario o simulación específica
    if (demoContext.active && (demoContext.step === 'select_scenario_for_business_type' || demoContext.step.startsWith('simulate_'))) {
        // Asegurarse de que el botón "Menú Principal" sea el primero si está presente
        suggestions.unshift({ text: "Menú Principal", key: "menu principal", icon: faHome });
    }


    // Añadir "Finalizar Demo y Contactar" si estamos en un paso donde tiene sentido pasar al CTA (no en el CTA mismo, ni en el final ni en el welcome)
    if (demoContext.active && demoContext.step !== 'welcome' && demoContext.step !== 'final_call_to_action' && demoContext.step !== 'demo_end') {
        suggestions.push({ text: "Finalizar Demo y Contactar", key: "finalizar demo y contactar", icon: faPaperPlane });
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
                <a className="nav-link" href="#services-section">Nuestros Servicios</a> 
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
            {/* Controles de funciones de demo (SIMPLIFICADO) */}
            <div className="demo-features-controls mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="fw-bold mb-2">Activar demo de IA:</p>
              <div className="d-flex flex-wrap gap-3 justify-content-center">
                 <div className="form-check form-switch"> 
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="productRecommendationSwitch" 
                    checked={selectedDemoFeatures.productRecommendation} 
                    onChange={() => handleDemoFeatureToggle('productRecommendation')} 
                  />
                  <label className="form-check-label" htmlFor="productRecommendationSwitch">Simulación de IA</label>
                </div>
              </div>
            </div>

            {/* Historial de mensajes */}
            <div className="chat-history flex-grow-1 overflow-auto p-3 mb-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
              {chatHistory.length === 0 ? (
                <p className="text-muted text-center mt-5">Activa el switch "Simulación de IA" y luego selecciona una opción para empezar.</p>
              ) : (
                chatHistory.map((msg, index) => (
                  <div key={index} className={`d-flex mb-2 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div className={`message-bubble p-2 rounded ${msg.sender === 'user' ? 'bg-primary text-dark' : 'bg-secondary text-white'}`} style={{ whiteSpace: 'pre-wrap', maxWidth: '80%' }}>
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
                            // Simular el envío del mensaje programáticamente
                            handleSendMessage({ preventDefault: () => {} }); 
                        }}
                    >
                        {suggestion.icon && <FontAwesomeIcon icon={suggestion.icon} className="me-2" />} {/* Render icon if available */}
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

    