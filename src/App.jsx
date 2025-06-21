import React, { useState, useEffect } from 'react';
import './style.css'; // Asegúrate de que tus estilos originales estén importados
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faChartLine, faHeadset, faCheck, faStar, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

// Importa y carga Stripe.js (esto es lo recomendado por Stripe para el frontend)
// window.Stripe se hará globalmente disponible una vez que el script se cargue.
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

  const [planes, setPlanes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState({});

  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [errorPlanes, setErrorPlanes] = useState(null);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [errorFeatures, setErrorFeatures] = useState(null);
  const [stripePromise, setStripePromise] = useState(null); // Estado para almacenar la instancia de Stripe

  // CLAVE PUBLICABLE DE STRIPE (¡MODO DE PRUEBA!)
  // Obtén esta clave de tu Dashboard de Stripe en la sección "Desarrolladores" -> "Claves de API"
  // ¡Es la que empieza con 'pk_test_...'! NO ES LA CLAVE SECRETA.
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
    const currentPlan = planes.find(p => p.nombre === formData.plan);
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

  // --- NUEVA FUNCIÓN: Manejador de clic para iniciar el proceso de pago con Stripe ---
  const handleCheckout = async () => {
    // Validaciones básicas antes de enviar a Stripe
    if (!formData.name || !formData.email || !formData.plan) {
      alert("Por favor, completa tu nombre y email en el formulario de contacto para proceder con el pago.");
      // Opcional: Desplazar a la sección de contacto para que el usuario complete los datos
      document.getElementById('contact-section').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    try {
      // Recolectar solo los IDs de las funciones seleccionadas para enviarlos al backend
      const selectedFeatureIds = features
        .filter(f => selectedFeatures[f.id])
        .map(f => f.id); 

      // Realizar una solicitud POST a tu backend para crear la sesión de pago de Stripe
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: formData.plan, // Nombre del plan seleccionado
          selectedFeaturesIds: selectedFeatureIds, // IDs de las funciones seleccionadas
          email: formData.email, // Email del cliente para pre-rellenar el formulario de Stripe
          name: formData.name,   // Nombre del cliente
          totalPrice: calculateTotalPrice() // Precio total calculado (para verificación en backend)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Intentar leer el error si el backend lo envía en JSON
        throw new Error(errorData.error || 'Error al crear la sesión de pago en el servidor.');
      }

      const session = await response.json(); // Obtener la ID de la sesión de Stripe

      // Redirigir al cliente a la página de pago de Stripe
      const stripe = await stripePromise;
      if (stripe) {
        const result = await stripe.redirectToCheckout({
          sessionId: session.id,
        });

        if (result.error) {
          alert(result.error.message); // Mostrar cualquier error de redirección de Stripe
        }
      } else {
        alert("La librería de Stripe no está cargada correctamente. Por favor, intenta de nuevo.");
      }

    } catch (error) {
      console.error('Error durante el proceso de pago:', error);
      alert('Hubo un error al iniciar el proceso de pago: ' + error.message);
    }
  };

  // Manejador del envío del formulario de contacto (sin cambios importantes, ya envía a DB y email)
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

      setFormData({
        name: '',
        email: '',
        phone: '',
        plan: planes.length > 0 ? planes[0].nombre : 'Básico',
        message: ''
      });
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
                <a className="nav-link" href="#addons-section">Funciones Adicionales</a>
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
                      onClick={() => setFormData(prev => ({...prev, plan: plan.nombre}))}
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
          {/* Resumen del precio total estimado */}
          <div className="text-center mt-5 p-4 bg-light text-dark rounded shadow-lg">
            <h3 className="mb-3">Precio Total Estimado:</h3>
            <p className="display-4 fw-bold text-primary">${calculateTotalPrice()}</p>
            <p className="lead">Incluye el plan seleccionado y las funciones adicionales.</p>
            {/* Botón para iniciar el proceso de pago con Stripe */}
            <button type="button" className="btn btn-custom btn-lg mt-3" onClick={handleCheckout}>
              Proceder al Pago
            </button>
          </div>
        </div>
      </section>

      {/* Demo Section - Sección de demostración del bot */}
      <section id="demo-section" className="py-5">
        <div className="container text-center">
          <h2 className="mb-4">Prueba nuestro Bot</h2>
          <p className="lead mb-4">Interactúa con un ejemplo de nuestro chatbot y descubre su potencial.</p>
          <div className="bot-demo-placeholder" style={{ height: '400px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <p className="lead">¡Aquí estará la demo interactiva de tu bot!</p>
          </div>
          <a href="#" className="btn btn-outline-light btn-lg mt-4">Solicitar Demo Personalizada</a>
        </div>
      </section>

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
    