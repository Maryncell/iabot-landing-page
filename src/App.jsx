import React, { useState, useEffect } from 'react';
import './style.css'; // Asegúrate de que tus estilos originales estén importados
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Importa todos los iconos necesarios: faRobot, faChartLine, faHeadset, faCheck para planes/features, faStar para testimonios, faPlusCircle para añadir funciones.
import { faRobot, faChartLine, faHeadset, faCheck, faStar, faPlusCircle, faFacebookF, faTwitter, faLinkedinIn, faInstagram } from '@fortawesome/free-solid-svg-icons'; // Agregué íconos de redes sociales

const App = () => {
  // Estado para los datos del formulario de contacto
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'Básico', // Valor inicial por defecto para el plan (se actualizará al cargar los planes)
    message: ''
  });

  // Estado para almacenar los planes obtenidos del backend
  const [planes, setPlanes] = useState([]);
  // Estado para las funciones adicionales obtenidas del backend
  const [features, setFeatures] = useState([]);
  // Estado para controlar qué funciones adicionales están seleccionadas por el usuario
  const [selectedFeatures, setSelectedFeatures] = useState({});

  // Estados de carga y error para los planes
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [errorPlanes, setErrorPlanes] = useState(null);
  // Estados de carga y error para las funciones
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [errorFeatures, setErrorFeatures] = useState(null);

  // useEffect para cargar los planes cuando el componente se monta por primera vez
  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        // Realiza una solicitud GET al endpoint /api/planes de tu backend Flask
        const response = await fetch('/api/planes');
        if (!response.ok) {
          throw new Error(`Error HTTP! status: ${response.status}`);
        }
        const data = await response.json(); // Parsea la respuesta JSON
        setPlanes(data); // Almacena los planes en el estado

        // Si hay planes, establece el primer plan como valor inicial en el formulario de contacto
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, plan: data[0].nombre }));
        }
      } catch (error) {
        console.error("Error al obtener los planes:", error);
        setErrorPlanes("No se pudieron cargar los planes. Por favor, intente más tarde.");
      } finally {
        setLoadingPlanes(false); // Finaliza el estado de carga, independientemente del resultado
      }
    };

    fetchPlanes(); // Llama a la función para cargar los planes
  }, []); // El array de dependencias vacío asegura que este efecto se ejecute solo una vez al montar

  // useEffect para cargar las funciones adicionales cuando el componente se monta
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        // Realiza una solicitud GET al endpoint /api/features de tu backend Flask
        const response = await fetch('/api/features');
        if (!response.ok) {
          throw new Error(`Error HTTP! status: ${response.status}`);
        }
        const data = await response.json(); // Parsea la respuesta JSON
        setFeatures(data); // Almacena las funciones en el estado

        // Inicializa el estado 'selectedFeatures': todas las funciones empiezan como no seleccionadas
        const initialSelected = data.reduce((acc, feature) => {
          acc[feature.id] = false;
          return acc;
        }, {});
        setSelectedFeatures(initialSelected);
      } catch (error) {
        console.error("Error al obtener las funciones:", error);
        setErrorFeatures("No se pudieron cargar las funciones adicionales.");
      } finally {
        setLoadingFeatures(false); // Finaliza el estado de carga
      }
    };

    fetchFeatures(); // Llama a la función para cargar las funciones
  }, []); // El array de dependencias vacío asegura que este efecto se ejecute solo una vez

  // Función para alternar la selección de una función adicional (check/uncheck)
  const handleFeatureToggle = (featureId) => {
    setSelectedFeatures(prev => {
      const newState = {
        ...prev,
        [featureId]: !prev[featureId] // Invierte el estado de selección de la función
      };
      // console.log('Selected features updated:', newState); // Debugging
      return newState;
    });
  };

  // Función para calcular el precio total estimado (Plan + Funciones seleccionadas)
  const calculateTotalPrice = () => {
    let total = 0;

    // 1. Suma el precio del plan actualmente seleccionado
    const currentPlan = planes.find(p => p.nombre === formData.plan);
    if (currentPlan) {
      total += currentPlan.precio;
    }

    // 2. Suma los precios de las funciones adicionales que están seleccionadas
    features.forEach(feature => {
      if (selectedFeatures[feature.id]) {
        total += feature.precio;
      }
    });
    // console.log('Total price calculated:', total); // Debugging
    return total.toFixed(2); // Retorna el total formateado a 2 decimales
  };

  // Manejador del envío del formulario de contacto
  const handleSubmit = async (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario (recargar la página)
    try {
      // Prepara los detalles de las funciones seleccionadas para enviarlos al backend
      const selectedFeatureDetails = features
        .filter(f => selectedFeatures[f.id])
        .map(f => ({ id: f.id, nombre: f.nombre, precio: f.precio }));

      // Combina los datos del formulario con las funciones seleccionadas y el precio total
      const dataToSend = {
        ...formData, // Datos como nombre, email, etc.
        selectedFeatures: selectedFeatureDetails, // Detalles de las funciones seleccionadas
        totalPrice: calculateTotalPrice() // Precio total calculado
      };

      // Realiza una solicitud POST al endpoint /api/contacto de tu backend
      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Indica que el cuerpo de la solicitud es JSON
        },
        body: JSON.stringify(dataToSend), // Convierte el objeto de datos a una cadena JSON
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor al enviar formulario');
      }

      const responseData = await response.json(); // Parsea la respuesta JSON del servidor
      alert(`¡Gracias ${formData.name}! ${responseData.message}`); // Muestra un mensaje al usuario

      // Resetear el formulario a sus valores iniciales
      setFormData({
        name: '',
        email: '',
        phone: '',
        plan: planes.length > 0 ? planes[0].nombre : 'Básico', // Vuelve al primer plan o 'Básico'
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

  // Manejador de cambios en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
                <a className="nav-link" href="#plans-section">Planes</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#addons-section">Funciones Adicionales</a> {/* Nuevo enlace a la sección de funciones */}
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

      {/* Plans Section - Sección para mostrar los planes de suscripción dinámicamente */}
      {/* Eliminadas clases bg-light y text-dark de aquí para que style.css controle el fondo */}
      <section id="plans-section" className="py-5">
        <div className="container">
          <h2 className="text-center mb-5">Nuestros Planes</h2> {/* Removido text-dark de aquí */}
          <div className="row">
            {loadingPlanes ? (
              <p className="text-center">Cargando planes...</p>
            ) : errorPlanes ? (
              <p className="text-center text-danger">{errorPlanes}</p>
            ) : planes.length === 0 ? (
              <p className="text-center">No hay planes disponibles en este momento.</p>
            ) : (
              // Mapea y renderiza cada plan obtenido del backend
              planes.map((plan, index) => (
                <div className="col-md-4 mb-4" key={plan.id || index}> {/* Usa plan.id como key */}
                  {/* Removidas bg-white/bg-primary/text-white/text-dark. El style.css debe manejar el background y color de texto. */}
                  {/* Se mantiene la clase 'popular' para el segundo plan */}
                  <div className={`plan-card p-4 rounded shadow-sm h-100 ${index === 1 ? 'popular' : ''}`}>
                    <h3 className="plan-title">{plan.nombre}</h3>
                    <div className="price h4 mb-3">${plan.precio}<span className="fs-6">/mes</span></div>
                    {/* Renderiza la descripción detallada del plan, dividiendo por saltos de línea */}
                    <ul className="mb-4 list-unstyled">
                      {plan.descripcion && plan.descripcion.split('\n').map((item, i) => (
                        <li key={i}><FontAwesomeIcon icon={faCheck} className="me-2" /> {item}</li>
                      ))}
                    </ul>
                    <button
                      className={`btn ${index === 1 ? 'btn-light' : 'btn-custom'} w-100`}
                      onClick={() => setFormData(prev => ({...prev, plan: plan.nombre}))} // Actualiza el plan seleccionado en el formulario
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
              // Mapea y renderiza cada función adicional
              features.map(feature => (
                <div className="col-md-4 col-sm-6 mb-4" key={feature.id}>
                  {/* Tarjeta de función adicional: cambia de estilo al ser seleccionada */}
                  <div className={`feature-addon-card p-3 rounded shadow-sm h-100 ${selectedFeatures[feature.id] ? 'bg-info text-white' : 'bg-secondary text-white'}`}
                       style={{ cursor: 'pointer' }}
                       onClick={() => handleFeatureToggle(feature.id)}> {/* Manejador de click para seleccionar */}
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faPlusCircle} className="me-2" />
                      <h5 className="mb-0">{feature.nombre}</h5>
                      <span className="ms-auto h5 mb-0">${feature.precio}</span>
                    </div>
                    <p className="text-muted small mb-2">{feature.descripcion}</p>
                    {/* Indicador de selección */}
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
          {/* Resumen del precio total estimado */}
          <div className="text-center mt-5 p-4 bg-light text-dark rounded shadow-lg">
            <h3 className="mb-3">Precio Total Estimado:</h3>
            <p className="display-4 fw-bold text-primary">${calculateTotalPrice()}</p>
            <p className="lead">Incluye el plan seleccionado y las funciones adicionales.</p>
            <a href="#contact-section" className="btn btn-custom btn-lg mt-3">Continuar y Contratar</a>
          </div>
        </div>
      </section>

      {/* Demo Section - Sección de demostración del bot */}
      <section id="demo-section" className="py-5">
        <div className="container text-center">
          <h2 className="mb-4">Prueba nuestro Bot</h2>
          <p className="lead mb-4">Interactúa con un ejemplo de nuestro chatbot y descubre su potencial.</p>
          {/* Placeholder para la demo del bot */}
          <div className="bot-demo-placeholder" style={{ height: '400px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <p className="lead">¡Aquí estará la demo interactiva de tu bot!</p>
          </div>
          <a href="#" className="btn btn-outline-light btn-lg mt-4">Solicitar Demo Personalizada</a>
        </div>
      </section>

      {/* Testimonials Section - Sección de testimonios de clientes */}
      {/* Eliminadas clases bg-light y text-dark de aquí para que style.css o las clases de card manejen el fondo */}
      <section id="testimonials-section" className="py-5">
        <div className="container">
          <h2 className="text-center mb-5">Lo que opinan nuestros clientes</h2>
          <div className="row justify-content-center">
            <div className="col-md-6 mb-4">
              {/* Añadidas clases bg-dark y text-white a la tarjeta */}
              <div className="card p-4 shadow-sm h-100 bg-dark text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-center mb-3">
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning" />
                  </div>
                  <p className="card-text">"IABOT ha revolucionado la forma en que atendemos a nuestros clientes. La automatización es increíble y el soporte es de primera."</p>
                  <div className="d-flex align-items-center mt-3"> {/* Reinsertado el div para la imagen del autor */}
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
              {/* Añadidas clases bg-dark y text-white a la tarjeta */}
              <div className="card p-4 shadow-sm h-100 bg-dark text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-center mb-3">
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                    <FontAwesomeIcon icon={faStar} className="text-warning-half" /> {/* Puedes usar un icono para media estrella si tienes */}
                  </div>
                  <p className="card-text">"La implementación fue sencilla y el bot ha mejorado significativamente la eficiencia de nuestro equipo de atención."</p>
                  <div className="d-flex align-items-center mt-3"> {/* Reinsertado el div para la imagen del autor */}
                    <img src="https://randomuser.me/api/portraits/men/45.jpg" className="rounded-circle me-3" width="50" alt="Cliente" />
                    <div>
                      <h6 className="mb-0">Carlos Mendoza</h6>
                      <small className="text-muted">Gerente, ServiTech</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-4"> {/* Tercer comentario original */}
              <div className="card p-4 shadow-sm h-100 bg-dark text-white">
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

      {/* Contact Section - Sección del formulario de contacto */}
      <section id="contact-section" className="py-5 bg-dark text-white">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <h2 className="mb-4">¿Listo para comenzar?</h2>
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
                {/* Resumen de la selección de plan y funciones en el formulario de contacto */}
                <div className="col-12 mt-4 text-start">
                    <h4>Resumen de tu selección:</h4>
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
                    {/* Precio total final en el formulario */}
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
    