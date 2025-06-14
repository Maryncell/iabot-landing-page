import React, { useState } from 'react';
// Importa los iconos de Font Awesome que usarás
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faSlidersH, faChartLine, faCheck } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faTwitter, faLinkedinIn, faInstagram } from '@fortawesome/free-brands-svg-icons';

const App = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'Plan de interés',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      alert(`¡Gracias ${formData.name}! Hemos recibido tu consulta sobre el plan ${formData.plan}`);
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        plan: 'Plan de interés',
        message: ''
      });

    } catch (error) {
      console.error('Error:', error);
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
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark sticky-top">
        <div className="container">
          <a className="navbar-brand" href="#">IABOT Soluciones</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link" href="#features">Características</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#plans">Planes</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#demo">Demo</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contact">Contacto</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1 className="display-4 fw-bold mb-4">Transforma tu negocio con chatbots inteligentes</h1>
          <p className="lead mb-5">Automatiza la atención al cliente, genera leads y aumenta tus ventas con nuestra solución de IA</p>
          <a href="#plans" className="btn btn-custom btn-lg me-2">Ver Planes</a>
          <a href="#demo" className="btn btn-outline-light btn-lg">Probar Demo</a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="text-center mb-5">¿Por qué elegir IABOT?</h2>
          <div className="row">
            <div className="col-md-4 text-center mb-4">
              <div className="feature-icon">
                <FontAwesomeIcon icon={faRobot} />
              </div>
              <h3>IA Avanzada</h3>
              <p>Chatbots que aprenden y mejoran continuamente con tecnología de última generación.</p>
            </div>
            <div className="col-md-4 text-center mb-4">
              <div className="feature-icon">
                <FontAwesomeIcon icon={faSlidersH} />
              </div>
              <h3>Personalización Total</h3>
              <p>Adaptamos el bot a tu marca, tono de comunicación y necesidades específicas.</p>
            </div>
            <div className="col-md-4 text-center mb-4">
              <div className="feature-icon">
                <FontAwesomeIcon icon={faChartLine} />
              </div>
              <h3>Analíticas en Tiempo Real</h3>
              <p>Accede a métricas detalladas del desempeño de tu bot y la interacción con clientes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="plans">
        <div className="container">
          <h2 className="text-center mb-5">Nuestros Planes</h2>
          <div className="row">
            <div className="col-md-4">
              <div className="plan-card">
                <h2 className="plan-title">Básico</h2>
                <div className="price">$49<span>/mes</span></div>
                <ul className="mb-4">
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Chatbot web básico</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Hasta 500 sesiones/mes</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Soporte por email</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Integración con 1 canal</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Plantillas predefinidas</li>
                </ul>
                <a href="#contact" className="btn btn-custom w-100" onClick={() => setFormData(prev => ({...prev, plan: 'Básico ($49/mes)'}))}>Contratar</a>
              </div>
            </div>
            <div className="col-md-4">
              <div className="plan-card popular">
                <div className="badge bg-primary position-absolute top-0 end-0 m-3">Popular</div>
                <h2 className="plan-title">Avanzado</h2>
                <div className="price">$149<span>/mes</span></div>
                <ul className="mb-4">
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Chatbot multicanal</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Hasta 3,000 sesiones/mes</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Soporte prioritario</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Integración con 3 canales</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Panel de control avanzado</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> API básica</li>
                </ul>
                <a href="#contact" className="btn btn-custom w-100" onClick={() => setFormData(prev => ({...prev, plan: 'Avanzado ($149/mes)'}))}>Contratar</a>
              </div>
            </div>
            <div className="col-md-4">
              <div className="plan-card">
                <h2 className="plan-title">Premium</h2>
                <div className="price">$249<span>/mes</span></div>
                <ul className="mb-4">
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Chatbot con IA avanzada</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Sesiones ilimitadas*</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Soporte 24/7</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Todos los canales</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> API completa</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Entrenamiento personalizado</li>
                  <li><FontAwesomeIcon icon={faCheck} className="me-2" /> Integración con CRM</li>
                </ul>
                <a href="#contact" className="btn btn-custom w-100" onClick={() => setFormData(prev => ({...prev, plan: 'Premium ($249/mes)'}))}>Contratar</a>
              </div>
            </div>
          </div>
          <p className="text-center mt-3">*Sujeto a políticas de uso justo</p>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="demo-section">
        <div className="container">
          <h2 className="text-center mb-5">Prueba nuestro bot demo</h2>
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="ratio ratio-16x9">
                {/* Reemplaza "YOUR-BOT-NAME" y "YOUR_SECRET_HERE" con los detalles de tu bot */}
                <iframe src="https://webchat.botframework.com/embed/YOUR-BOT-NAME?s=YOUR_SECRET_HERE" 
                        style={{ border: 'none', borderRadius: '10px' }}
                        title="Bot Demo"></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <h2 className="text-center mb-5">Lo que dicen nuestros clientes</h2>
          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="card bg-dark text-white p-3 h-100">
                <div className="card-body">
                  <p className="card-text">"IABOT revolucionó nuestra atención al cliente. Redujimos el tiempo de respuesta de horas a segundos."</p>
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
            <div className="col-md-4 mb-4">
              <div className="card bg-dark text-white p-3 h-100">
                <div className="card-body">
                  <p className="card-text">"La implementación fue sencilla y el bot aprendió rápidamente sobre nuestros productos. Increíble."</p>
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
            <div className="col-md-4 mb-4">
              <div className="card bg-dark text-white p-3 h-100">
                <div className="card-body">
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

      {/* Contact Section */}
      <section id="contact" className="py-5 bg-dark">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <h2 className="mb-4">¿Listo para comenzar?</h2>
              <p className="lead mb-5">Contáctanos y te ayudaremos a elegir la mejor solución para tu negocio</p>
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
                    <option>Plan de interés</option>
                    <option>Básico ($49/mes)</option>
                    <option>Avanzado ($149/mes)</option>
                    <option>Premium ($249/mes)</option>
                  </select>
                </div>
                <div className="col-12">
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="Cuéntanos sobre tu proyecto"
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

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="mb-4">
            <a href="#" className="text-white me-3"><FontAwesomeIcon icon={faFacebookF} /></a>
            <a href="#" className="text-white me-3"><FontAwesomeIcon icon={faTwitter} /></a>
            <a href="#" className="text-white me-3"><FontAwesomeIcon icon={faLinkedinIn} /></a>
            <a href="#" className="text-white"><FontAwesomeIcon icon={faInstagram} /></a>
          </div>
          <p className="mb-2">© 2023 IABOT Soluciones. Todos los derechos reservados.</p>
          <p className="small text-muted">
            <a href="#" className="text-muted me-2">Términos de servicio</a>
            <a href="#" className="text-muted">Política de privacidad</a>
          </p>
        </div>
      </footer>
    </>
  );
};

export default App;
    