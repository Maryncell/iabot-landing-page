import React, { useState, useEffect, useRef } from 'react'; // Importa useRef
import './style.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Íconos sólidos y de marcas (Añadidos nuevos para los tipos de negocio)
import { faRobot, faChartLine, faHeadset, faCheck, faStar, faPlusCircle, faQuestionCircle, faInfoCircle, faLightbulb, faCreditCard, faComments, faUsers, faCalendarAlt, faListOl, faDollarSign, faTools, faHandshake, faShoppingCart, faConciergeBell, faTasks, faBullhorn, faEnvelope, faPhone, faBookOpen, faGraduationCap, faPaintBrush, faLaptopCode, faStore, faChalkboardTeacher, faUserTie, faBuilding } from '@fortawesome/free-solid-svg-icons'; 
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
  // ESTA ES LA LÍNEA CRÍTICA CORREGIDA:
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
    productRecommendation: false, // Este ahora maneja el árbol de decisión de planes
  });
  // demoContext ahora es un objeto para almacenar múltiples estados dentro del flujo
  const [demoContext, setDemoContext] = useState({
    flow: null, // 'reco_plan', 'human_agent_transfer', 'faq'
    step: null, // paso dentro del flujo
    data: {} // para almacenar datos temporales como el tipo de negocio, nombre, email, etc.
  }); 

  // Referencia para el scroll a la sección de pago
  const directPaymentSectionRef = useRef(null);

  // CLAVE PUBLICABLE DE STRIPE (¡MODO DE PRUEBA!)
  const STRIPE_PUBLIC_KEY = 'pk_test_TU_CLAVE_PUBLICABLE_GENERADA_POR_STRIPE'; 

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

    // Simular la respuesta del bot después de un breve retraso
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
    setDemoContext({ flow: null, step: null, data: {} }); // Reinicia cualquier contexto de conversación
  };

  // Función principal para simular la respuesta del bot, ahora más compleja y con árbol de decisión
  const getBotResponse = (userMsg) => {
    // Normalizar la entrada del usuario al principio
    const normalizedUserMsg = normalizeInput(userMsg); 
    let botResponse = "";

    // Lógica para INICIAR o REINICIAR el flujo de Recomendación de Plan
    // Esta es la más alta prioridad para las frases de inicio de este flujo.
    if (selectedDemoFeatures.productRecommendation &&
        (normalizedUserMsg.includes("recomendar plan") || normalizedUserMsg.includes("que plan me conviene") || normalizedUserMsg.includes("ayuda a elegir") || normalizedUserMsg.includes("que bot") || normalizedUserMsg.includes("solucion ideal"))) {
        
        // Si el flujo ya está activo y es el mismo, o si es un inicio limpio, lo reiniciamos al primer paso.
        if (demoContext.flow !== 'reco_plan' || demoContext.step !== 'ask_business_type') {
            setDemoContext({ flow: 'reco_plan', step: 'ask_business_type', data: {} });
            return "¡Excelente! Para recomendarte la solución ideal y el plan perfecto, ¿podrías decirme a qué tipo de negocio o sector pertenece tu empresa? Por ejemplo: Servicios, Ventas/Ecommerce, Educación, Freelance/Profesional Independiente, u Otro.";
        }
        // Si ya estamos en el primer paso y el usuario repite la frase de inicio, simplemente confirmamos.
        return "Ya estamos en el proceso de recomendación de plan. Por favor, selecciona el tipo de negocio o escríbelo.";
    }


    // Lógica para CONTINUAR flujos activos (solo si hay un flujo activo)
    if (demoContext.flow === 'reco_plan') {
      switch (demoContext.step) {
        case 'ask_business_type':
          const businessType = normalizedUserMsg; // Usar la entrada normalizada
          // Validar y almacenar el tipo de negocio
          if (['servicios', 'ventas', 'ecommerce', 'educacion', 'freelance', 'profesional independiente'].includes(businessType)) {
            setDemoContext(prev => ({ ...prev, step: 'ask_priority', data: { ...prev.data, businessType: businessType } }));
            let priorityQuestion = "";
            if (['servicios', 'freelance', 'profesional independiente'].includes(businessType)) {
              priorityQuestion = "¿Cuál es tu prioridad principal: 'Optimizar agenda y reservas', 'Mejorar atención 24/7' o 'Captar más clientes'?";
            } else if (businessType === 'ventas' || businessType === 'ecommerce') {
              priorityQuestion = "¿Qué te interesa más: 'Mostrar catálogo de productos', 'Gestionar pedidos y envíos' o 'Generar ofertas y promociones'?";
            } else if (businessType === 'educacion') {
              priorityQuestion = "¿Qué necesidad te gustaría cubrir: 'Información sobre cursos', 'Proceso de matrícula' o 'Soporte a estudiantes 24/7'?";
            }
            return `¡Excelente! Para tu negocio de ${userMsg}, ${priorityQuestion}`; // userMsg para mostrar la versión original
          } else if (businessType === 'otro') { 
            setDemoContext(prev => ({ ...prev, step: 'get_name_and_email_for_action', data: { ...prev.data, businessType: businessType, requestedAction: 'direct_contact_other' } }));
            return "Comprendo. ¡Nuestros bots son muy adaptables! Para entender mejor tu caso específico, ¿podrías dejarnos tu nombre y email para una consulta personalizada?";
          } else {
             return "No pude identificar ese tipo de negocio. Por favor, selecciona uno de los sugeridos (Servicios, Ventas/Ecommerce, Educación, Freelance/Profesional Independiente, Otro) o descríbelo brevemente.";
          }

        case 'ask_priority':
          const priority = normalizedUserMsg; // Usar la entrada normalizada
          const type = demoContext.data.businessType;
          let nextActionPrompt = "";
          let nextStepForAction = ''; 

          if (type === 'servicios' || type === 'freelance' || type === 'profesional independiente') {
              if (priority.includes('optimizar agenda') || priority.includes('agenda') || priority.includes('reservas')) {
                  nextActionPrompt = "Nuestro bot puede gestionar citas automáticamente y enviar recordatorios. ¿Te gustaría 'Agendar una demo gratuita' de 15 minutos o 'Recibir más información por email'?";
                  nextStepForAction = 'reco_action_service_agenda';
              } else if (priority.includes('mejorar atencion') || priority.includes('atencion') || priority.includes('24/7')) {
                  nextActionPrompt = "Un agente inteligente puede mejorar drásticamente la atención al cliente. Para explorar cómo, ¿podrías 'Dejar tu contacto' para una propuesta personalizada?";
                  nextStepForAction = 'get_name_and_email_for_action'; 
              } else if (priority.includes('captar clientes') || priority.includes('captar')) {
                  nextActionPrompt = "Podemos ayudarte a generar más leads. Para mostrarte estrategias, ¿podrías 'Dejar tu contacto' para una consulta?";
                  nextStepForAction = 'get_name_and_email_for_action'; 
              } else {
                  nextActionPrompt = "No pude identificar tu prioridad. Para que un experto te asesore, ¿podrías 'Dejar tu contacto' para una propuesta personalizada?";
                  nextStepForAction = 'get_name_and_email_for_action';
              }
          } else if (type === 'ventas' || type === 'ecommerce') {
              if (priority.includes('mostrar catalogo') || priority.includes('catalogo') || priority.includes('productos')) {
                  nextActionPrompt = "Un bot puede presentar tu catálogo de forma interactiva en WhatsApp. ¿Te gustaría que te 'Enviemos un ejemplo de catálogo' o 'Ver nuestros planes' que incluyen esta función?";
                  nextStepForAction = 'reco_action_sales_catalog';
              } else if (priority.includes('gestionar pedidos') || priority.includes('pedidos') || priority.includes('envios')) {
                  nextActionPrompt = "Gestionar pedidos automáticamente es posible. Para más detalles, ¿podrías 'Dejar tu contacto' para una demo personalizada?";
                  nextStepForAction = 'get_name_and_email_for_action';
              } else if (priority.includes('generar ofertas') || priority.includes('ofertas') || priority.includes('promociones')) {
                  nextActionPrompt = "Podemos automatizar el envío de ofertas personalizadas. ¿Te gustaría 'Recibir un ejemplo de oferta' o 'Agendar una demo'?";
                  nextStepForAction = 'get_name_and_email_for_action'; 
              } else {
                  nextActionPrompt = "No pude identificar tu prioridad. Para que un experto te asesore, ¿podrías 'Dejar tu contacto' para una propuesta personalizada?";
                  nextStepForAction = 'get_name_and_email_for_action';
              }
          } else if (type === 'educacion') {
              if (priority.includes('informacion sobre cursos') || priority.includes('cursos') || priority.includes('programas') || priority.includes('informacion')) {
                  nextActionPrompt = "El bot puede responder todas las preguntas sobre tus cursos. ¿Te gustaría 'Ver un demo educativo' o 'Recibir un folleto digital por email'?";
                  nextStepForAction = 'reco_action_edu_courses';
              } else if (priority.includes('proceso de matricula') || priority.includes('matricula') || priority.includes('admisiones')) {
                  nextActionPrompt = "Optimizar el proceso de matrícula es clave. Para más detalles, ¿podrías 'Dejar tu contacto' para una consulta?";
                  nextStepForAction = 'get_name_and_email_for_action';
              } else if (priority.includes('soporte a estudiantes') || priority.includes('soporte') || priority.includes('estudiantes')) {
                  nextActionPrompt = "Podemos mejorar el soporte 24/7 a tus estudiantes. Para explorar cómo, ¿podrías 'Dejar tu contacto' para una propuesta?";
                  nextStepForAction = 'get_name_and_email_for_action';
              } else {
                  nextActionPrompt = "No pude identificar tu prioridad. Para que un experto te asesore, ¿podrías 'Dejar tu contacto' para una propuesta personalizada?";
                  nextStepForAction = 'get_name_and_email_for_action';
              }
          } else { 
              nextActionPrompt = "No pude identificar tu prioridad. Para que un experto te asesore, ¿podrías 'Dejar tu contacto' para una propuesta personalizada?";
              nextStepForAction = 'get_name_and_email_for_action';
          }
          setDemoContext(prev => ({ ...prev, step: nextStepForAction, data: { ...prev.data, priority: priority } }));
          return nextActionPrompt;

        case 'reco_action_service_agenda': // Para Servicios -> Agenda/Reservas (Acciones)
          if (normalizedUserMsg.includes('agendar demo gratuita') || normalizedUserMsg.includes('agendar demo')) {
            setDemoContext(prev => ({ ...prev, step: 'get_name_and_email_for_action', data: { ...prev.data, requestedAction: 'demo_agenda' } }));
            return "¡Excelente! Para agendar tu demo, por favor, ingresa tu nombre y email (ej. Juan Pérez, juan@ejemplo.com).";
          } else if (normalizedUserMsg.includes('recibir mas informacion por email') || normalizedUserMsg.includes('recibir info')) {
            setDemoContext(prev => ({ ...prev, step: 'get_name_and_email_for_action', data: { ...prev.data, requestedAction: 'info_email_agenda' } }));
            return "¡Claro! Para enviarte la información, por favor, ingresa tu nombre y email (ej. Juan Pérez, juan@ejemplo.com).";
          }
          return "No entendí esa opción. Por favor, elige 'Agendar demo gratuita' o 'Recibir más información por email'.";

        case 'reco_action_sales_catalog': // Para Ventas -> Catálogo (Acciones)
            if (normalizedUserMsg.includes('enviemos un ejemplo de catalogo') || normalizedUserMsg.includes('enviar ejemplo')) {
                setDemoContext(prev => ({ ...prev, step: 'get_name_and_email_for_action', data: { ...prev.data, requestedAction: 'example_catalog' } }));
                return "¡Claro! Para enviarte un ejemplo del catálogo conversacional, por favor, ingresa tu nombre y email (ej. Juan Pérez, juan@ejemplo.com).";
            } else if (normalizedUserMsg.includes('ver nuestros planes') || normalizedUserMsg.includes('ver planes')) {
                setDemoContext({ flow: null, step: null, data: {} }); // Finaliza el flujo
                return "Claro, puedes ver todos nuestros planes en la sección 'Nuestros Planes' de esta página. ¡Haz clic en el botón 'Planes' en el menú de navegación!";
            }
            return "No entendí esa opción. Por favor, elige 'Enviemos un ejemplo de catálogo' o 'Ver nuestros planes'.";

        case 'reco_action_edu_courses': // Para Educación -> Cursos (Acciones)
            if (normalizedUserMsg.includes('ver un demo educativo') || normalizedUserMsg.includes('ver demo')) {
                setDemoContext(prev => ({ ...prev, step: 'get_name_and_email_for_action', data: { ...prev.data, requestedAction: 'edu_demo' } }));
                return "¡Genial! Para acceder al demo educativo, por favor, ingresa tu nombre y email (ej. Juan Pérez, juan@ejemplo.com).";
            } else if (normalizedUserMsg.includes('recibir un folleto digital por email') || normalizedUserMsg.includes('recibir folleto')) {
                setDemoContext(prev => ({ ...prev, step: 'get_name_and_email_for_action', data: { ...prev.data, requestedAction: 'edu_brochure' } }));
                return "¡Perfecto! Para enviarte el folleto digital, por favor, ingresa tu nombre y email (ej. Juan Pérez, juan@ejemplo.com).";
            }
            return "No entendí esa opción. Por favor, elige 'Ver un demo educativo' o 'Recibir un folleto digital por email'.";

        case 'get_name_and_email_for_action': // Paso unificado para nombre y email
            // Regex más permisiva: busca un email y considera el resto como nombre.
            // Permite formatos como "nombre, email", "nombre - email", "email nombre", o "nombre y mi email es email"
            const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
            const emailMatch = userMsg.match(emailRegex);
            
            let name = "Cliente";
            let email = "";

            if (emailMatch) {
                email = emailMatch[1].trim();
                let remainingText = userMsg.replace(emailMatch[0], '').trim();

                // Intentar extraer el nombre de lo que queda, buscando patrones comunes
                const nameKeywords = ["mi nombre es", "soy", "me llamo"];
                let foundName = false;
                for (const keyword of nameKeywords) {
                    const keywordIndex = normalizeInput(remainingText).indexOf(normalizeInput(keyword));
                    if (keywordIndex !== -1) {
                        name = remainingText.substring(keywordIndex + keyword.length).trim();
                        foundName = true;
                        break;
                    }
                }
                
                if (!foundName && remainingText.length > 0) {
                    // Si no se encontró un patrón explícito, toma la parte restante como nombre (hasta 20 caracteres para evitar spam/errores)
                    name = remainingText.split(/[\s,.-]/).filter(Boolean)[0] || remainingText.substring(0, 20).trim();
                    if (name.toLowerCase() === 'y') name = "Cliente"; // Evitar "y" como nombre
                } else if (!foundName && userMsg.length > 0) {
                    // Fallback si no se encontró nombre explícito, y el mensaje original es largo, intenta usar la primera palabra como nombre
                    name = userMsg.split(/[\s,.-]/).filter(Boolean)[0] || "Cliente";
                }

                if (name.length > 30) name = name.substring(0, 30) + "..."; // Limitar longitud del nombre
                if (!name || name.toLowerCase().includes('email')) name = "Cliente"; // Si el nombre aún es inválido o es parte del email
            }

            if (email.includes("@") && email.includes(".")) {
                setDemoContext({ flow: null, step: null, data: {} }); // Finaliza el flujo

                let finalMessage = "";
                const action = demoContext.data.requestedAction;
                switch(action) {
                    case 'demo_agenda':
                        finalMessage = `¡Demo agendada para ${name}! Recibirás los detalles en ${email}. Esto demuestra nuestra capacidad de agendar y recopilar datos de forma efectiva.`;
                        break;
                    case 'info_email_agenda':
                        finalMessage = `¡Información enviada a ${email}! Revisa tu bandeja de entrada. Esto demuestra nuestra capacidad de enviar contenido personalizado automáticamente.`;
                        break;
                    case 'example_catalog':
                        finalMessage = `¡Ejemplo de catálogo enviado a ${email}! Revisa tu bandeja de entrada. Esto demuestra cómo presentamos productos de forma interactiva.`;
                        break;
                    case 'edu_demo':
                        finalMessage = `¡Demo educativa lista para ${name}! Detalles enviados a ${email}. Así ayudamos a instituciones educativas a atraer interesados.`;
                        break;
                    case 'edu_brochure':
                        finalMessage = `¡Folleto digital enviado a ${email}! Esto demuestra la distribución automática de materiales y contenido valioso.`;
                        break;
                    case 'direct_contact':
                    case 'direct_contact_other': 
                        finalMessage = `¡Gracias, ${name}! Hemos recibido tu información y un experto te contactará pronto en ${email}. Esto demuestra nuestra capacidad de calificar leads y gestionar contactos de manera eficiente.`;
                        break;
                    default:
                        finalMessage = `¡Gracias, ${name}! Tu solicitud ha sido procesada y te contactaremos en ${email}.`;
                }
                return finalMessage;
            } else {
                return `Ese no parece un formato de nombre y email válido. Por favor, ingresa tu nombre y email (ej. Juan Pérez, juan@ejemplo.com).`;
            }
        
        default:
          // Si demoContext.flow es 'reco_plan' pero step no es reconocido, reinicia el flujo.
          setDemoContext({ flow: null, step: null, data: {} }); 
          return "Lo siento, hubo un problema con el flujo de la conversación y lo hemos reiniciado. ¿En qué puedo ayudarte ahora? Si quieres intentar de nuevo, puedes decir 'Recomiéndame un plan'.";
      }
    }

    // --- Lógica para otras funcionalidades activas o respuestas generales (si no hay flujo activo) ---
    // PRIORIDAD: Respuestas de funcionalidades de demo específicas si están activas (si flow es null)
    if (selectedDemoFeatures.whatsapp && (normalizedUserMsg.includes("whatsapp") || normalizedUserMsg.includes("multicanal") || normalizedUserMsg.includes("telegram"))) {
        return "¡Absolutamente! Este bot puede integrarse fácilmente con WhatsApp y otros canales como Telegram, permitiéndote ofrecer soporte continuo donde tus clientes ya están. Si deseas explorar más, haz clic en el botón 'Hablar con un Experto por WhatsApp' flotante en la esquina inferior derecha.";
    }

    if (selectedDemoFeatures.humanAgent && (normalizedUserMsg.includes("agente") || normalizedUserMsg.includes("humano") || normalizedUserMsg.includes("hablar con alguien"))) {
        return "Entendido. Un momento, por favor. Te estoy conectando con uno de nuestros agentes humanos especializados. Esto es posible con nuestra función de 'Transferencia a Agente Humano'. Haz clic en el botón 'Hablar con un Experto por WhatsApp' flotante en la esquina inferior derecha para continuar.";
    }

    if (selectedDemoFeatures.faqResponder) {
        if (normalizedUserMsg.includes("horario") || normalizedUserMsg.includes("abierto")) {
            return "Nuestras oficinas están abiertas de lunes a viernes, de 9 AM a 6 PM (hora local de Guernica, Argentina). ¡Siempre listos para atenderte!";
        } else if (normalizedUserMsg.includes("devoluciones") || normalizedUserMsg.includes("reembolso")) {
            return "Nuestra política de devoluciones permite solicitar un reembolso completo dentro de los 30 días posteriores a la compra, bajo ciertas condiciones. ¿Necesitas más detalles?";
        } else if (normalizedUserMsg.includes("soporte") || normalizedUserMsg.includes("ayuda")) {
            return "Ofrecemos soporte 24/7 para nuestros planes Avanzado y Premium. Para el plan Básico, el soporte es por email en horario de oficina.";
        }
    }

    if (selectedDemoFeatures.leadQualification) {
        if (normalizedUserMsg.includes("industria") || normalizedUserMsg.includes("negocio")) {
            return "¡Claro! Para ofrecerte el mejor servicio, ¿podrías indicarme a qué industria pertenece tu negocio (ej. retail, salud, servicios, manufactura)?";
        } else if (normalizedUserMsg.includes("retail") || normalizedUserMsg.includes("comercio") || normalizedUserMsg.includes("ventas")) {
            return "Entendido, la industria minorista es clave para la automatización. ¿Te gustaría que el bot gestionara consultas de productos o el estado de pedidos?";
        } else if (normalizedUserMsg.includes("salud") || normalizedUserMsg.includes("clinica") || normalizedUserMsg.includes("hospital")) {
            return "Perfecto, en salud la confidencialidad es vital. Nuestro bot puede agendar citas y responder FAQs de forma segura. ¿Qué te interesa más?";
        } else if (normalizedUserMsg.includes("servicios") || normalizedUserMsg.includes("consultoria")) {
            return "Excelente, los bots pueden optimizar la atención al cliente en servicios. ¿Te gustaría automatizar la reserva de citas o el soporte inicial?";
        }
    }

    // Respuestas predefinidas generales (si ninguna función de demo o flujo es relevante)
    if (normalizedUserMsg.includes("hola")) {
      return "¡Hola! Soy IABOT, tu asistente virtual. ¿En qué puedo ayudarte hoy? Para explorar nuestras capacidades, puedes activar las funciones de demo en la parte superior del chat.";
    } else if (normalizedUserMsg.includes("precio") || normalizedUserMsg.includes("costo") || normalizedUserMsg.includes("planes")) {
      return "Puedes ver nuestros planes y funciones adicionales en las secciones 'Planes' y 'Funciones Adicionales' de esta página. ¡Haz clic para explorar! Si tienes preguntas específicas, ¡prueba activar las funciones de demo!";
    } else if (normalizedUserMsg.includes("gracias")) {
      return "¡De nada! Estoy aquí para ayudarte a transformar tu negocio.";
    } else if (normalizedUserMsg.includes("contacto")) {
      return "Si deseas una demo personalizada o tienes más preguntas, puedes contactarnos a través del formulario al final de la página. También puedes hacer clic en el botón 'Hablar con un Experto por WhatsApp' flotante en la esquina inferior derecha.";
    } 

    // Mensaje de fallback por defecto si nada de lo anterior coincide
    if (userMsg.length > 0) {
        // Si la funcionalidad de recomendación está activa y el flujo no ha iniciado, guiar al usuario
        if (selectedDemoFeatures.productRecommendation && demoContext.flow !== 'reco_plan') {
            return `Has dicho: "${userMsg}". Para iniciar la recomendación de plan, por favor, haz clic en el botón "Recomiéndame un plan" o escribe "qué plan me conviene".`;
        }
      return `Has dicho: "${userMsg}". Este es un demo interactivo. Para experimentar más, te sugiero activar las funcionalidades en la parte superior del chat y probar los botones de sugerencia o frases clave. Si necesitas ayuda más específica, haz clic en el botón 'Hablar con un Experto por WhatsApp' flotante.`;
    }
    return "¿Podrías repetir eso? Para una demo más avanzada, selecciona las funcionalidades y usa las sugerencias.";
  };

  // Genera botones de sugerencia dinámicamente basados en el contexto y las funciones activas
  const getSuggestionButtons = () => {
    let suggestions = [];

    // Sugerencias basadas en el contexto activo (tienen prioridad)
    if (demoContext.flow === 'reco_plan') {
      switch (demoContext.step) {
        case 'ask_business_type':
          suggestions.push({ text: "Servicios", key: "servicios", icon: faUserTie });
          suggestions.push({ text: "Ventas / Ecommerce", key: "ventas", icon: faShoppingCart });
          suggestions.push({ text: "Educación", key: "educacion", icon: faGraduationCap });
          suggestions.push({ text: "Freelance / Profesional Independiente", key: "freelance", icon: faLaptopCode }); 
          suggestions.push({ text: "Otro", key: "otro", icon: faBuilding }); // Use faBuilding for general business/other
          break;
        case 'ask_priority':
          const type = demoContext.data.businessType;
          if (type === 'servicios' || type === 'freelance' || type === 'profesional independiente') {
            suggestions.push({ text: "Optimizar agenda y reservas", key: "optimizar agenda" });
            suggestions.push({ text: "Mejorar atención 24/7", key: "mejorar atencion" });
            suggestions.push({ text: "Captar más clientes", key: "captar clientes" });
          } else if (type === 'ventas' || type === 'ecommerce') {
            suggestions.push({ text: "Mostrar catálogo de productos", key: "mostrar catalogo" });
            suggestions.push({ text: "Gestionar pedidos y envíos", key: "gestionar pedidos" });
            suggestions.push({ text: "Generar ofertas y promociones", key: "generar ofertas" });
          } else if (type === 'educacion') {
            suggestions.push({ text: "Información sobre cursos", key: "informacion sobre cursos" }); // Clave completa para match preciso
            suggestions.push({ text: "Proceso de matrícula", key: "proceso de matricula" });
            suggestions.push({ text: "Soporte a estudiantes 24/7", key: "soporte a estudiantes" });
          } else { // For "Otro" business type, directly ask for contact if no specific priority path is chosen
             suggestions.push({ text: "Dejar mi contacto", key: "dejar mi contacto" });
          }
          break;
        case 'reco_action_service_agenda':
          suggestions.push({ text: "Agendar Demo Gratuita", key: "agendar demo gratuita" });
          suggestions.push({ text: "Recibir más información por email", key: "recibir mas informacion por email" });
          break;
        case 'reco_action_sales_catalog':
          suggestions.push({ text: "Enviemos un ejemplo de catálogo", key: "enviemos un ejemplo de catalogo" });
          suggestions.push({ text: "Ver nuestros planes", key: "ver nuestros planes" });
          break;
        case 'reco_action_edu_courses':
          suggestions.push({ text: "Ver un demo educativo", key: "ver un demo educativo" });
          suggestions.push({ text: "Recibir un folleto digital por email", key: "recibir un folleto digital por email" });
          break;
        case 'get_name_and_email_for_action':
          suggestions.push({ text: "Juan Pérez, juan@ejemplo.com", key: "ejemplo_contacto" }); // Ejemplo para guiar al usuario
          break;
        default:
          break;
      }
    } else { // Sugerencias si no hay un flujo específico activo
        suggestions.push({ text: "Hola", key: "hola" });
        suggestions.push({ text: "¿Qué planes tienen?", key: "planes" });
        suggestions.push({ text: "Contacto", key: "contacto" });
        
        // Si la función de recomendación de plan está activa, sugiere iniciarla
        if (selectedDemoFeatures.productRecommendation) {
            suggestions.push({ text: "Recomiéndame un plan", key: "recomendar plan" });
        }
        if (selectedDemoFeatures.whatsapp) {
            suggestions.push({ text: "Demo WhatsApp", key: "whatsapp" });
        }
        if (selectedDemoFeatures.humanAgent) {
            suggestions.push({ text: "Conectar con un agente", key: "hablar con alguien" });
        }
        if (selectedDemoFeatures.leadQualification) {
            suggestions.push({ text: "¿Cuál es mi industria?", key: "industria" });
        }
        if (selectedDemoFeatures.faqResponder) {
            suggestions.push({ text: "Horarios de atención", key: "horario" });
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
                    id="productRecommendationSwitch" 
                    checked={selectedDemoFeatures.productRecommendation} 
                    onChange={() => handleDemoFeatureToggle('productRecommendation')} 
                  />
                  <label className="form-check-label" htmlFor="productRecommendationSwitch">Recomendación de Plan (interactivo)</label>
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

    