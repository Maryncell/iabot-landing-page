from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from flask_cors import CORS
import json
from flask_mail import Mail, Message
import stripe # Importar la librería de Stripe

# Cargar variables de entorno desde el archivo .env
load_dotenv()

app = Flask(__name__, static_folder='dist')

# Inicializar CORS para permitir solicitudes desde el frontend
CORS(app)

# Configuración de Flask-Mail (obtenida de variables de entorno)
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

mail = Mail(app) # Inicializar la extensión Flask-Mail

# Configurar la clave secreta de Stripe (¡IMPORTANTE: Usar la clave de TEST en desarrollo!)
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Configuración de la base de datos (SQLite)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///site.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Definición del modelo para Planes
class Plan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    precio = db.Column(db.Float, nullable=False)
    descripcion = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Plan {self.nombre}>'

# Definición del modelo para Funciones Adicionales
class Feature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    precio = db.Column(db.Float, nullable=False)
    descripcion = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Feature {self.nombre}>'

# Definición del modelo para las consultas del formulario de contacto
class ContactSubmission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    plan_selected = db.Column(db.String(80), nullable=False)
    selected_features_json = db.Column(db.Text, nullable=True) 
    total_price = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f'<ContactSubmission {self.name} - {self.plan_selected}>'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "plan_selected": self.plan_selected,
            "selected_features": json.loads(self.selected_features_json) if self.selected_features_json else [],
            "total_price": self.total_price,
            "message": self.message,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


# Rutas para servir el front-end (React build)
@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)


# Endpoint para el formulario de contacto (Guarda en la DB y envía email)
@app.route('/api/contacto', methods=['POST'])
def contacto():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No se recibieron datos"}), 400

    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    plan = data.get('plan')
    message_from_form = data.get('message')
    selected_features = data.get('selectedFeatures', [])
    total_price = data.get('totalPrice')

    if not name or not email or not plan or total_price is None:
        return jsonify({"status": "error", "message": "Datos obligatorios faltantes (nombre, email, plan, precio total)."}), 400

    try:
        selected_features_json = json.dumps(selected_features)

        new_submission = ContactSubmission(
            name=name,
            email=email,
            phone=phone,
            plan_selected=plan,
            selected_features_json=selected_features_json,
            total_price=float(total_price),
            message=message_from_form
        )
        db.session.add(new_submission)
        db.session.commit()
        print(f"Nueva consulta de contacto guardada en DB: {new_submission.name} - Plan: {new_submission.plan_selected}")

        notification_email_address = os.getenv('NOTIFICATION_EMAIL')
        if notification_email_address:
            msg = Message(
                subject=f"Nueva Consulta IABOT de: {name} (Plan: {plan})",
                recipients=[notification_email_address],
                html=f"""
                <p>Hola,</p>
                <p>Has recibido una nueva consulta a través de tu página de IABOT Soluciones.</p>
                <p><strong>Detalles del Cliente:</strong></p>
                <ul>
                    <li><strong>Nombre:</strong> {name}</li>
                    <li><strong>Email:</strong> {email}</li>
                    <li><strong>Teléfono:</strong> {phone if phone else 'No proporcionado'}</li>
                </ul>
                <p><strong>Selección del Plan y Funciones:</strong></p>
                <ul>
                    {''.join([f'<li>{f["nombre"]} (${f["precio"]:.2f})</li>' for f in selected_features]) if selected_features else '<li>Ninguna</li>'}
                </ul>
                <li><strong>Precio Total Estimado:</strong> ${float(total_price):.2f}</li>
                <p><strong>Mensaje del Cliente:</strong></p>
                <p>{message_from_form if message_from_form else 'No proporcionado'}</p>
                <br/>
                <p>Atentamente,</p>
                <p>Tu sistema IABOT</p>
                """
            )
            try:
                mail.send(msg)
                print(f"Email de notificación enviado a {notification_email_address}")
            except Exception as mail_error:
                print(f"ERROR al enviar email de notificación: {mail_error}")
        else:
            print("ADVERTENCIA: NOTIFICATION_EMAIL no configurado en .env. No se envió email de notificación.")

        return jsonify({"status": "success", "message": f"¡Gracias {name}! Tu consulta sobre el plan {plan} ha sido recibida y guardada. Te contactaremos pronto."}), 201

    except ValueError:
        return jsonify({"status": "error", "message": "El precio total no es un número válido."}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error general en contacto endpoint: {e}")
        return jsonify({"status": "error", "message": "Error interno del servidor al procesar la consulta."}), 500


# --- ENDPOINTS PARA LA BASE DE DATOS (PLANES) ---
@app.route('/api/planes', methods=['GET'])
def get_planes():
    try:
        planes = Plan.query.order_by(Plan.id).all()
        planes_data = [
            {"id": p.id, "nombre": p.nombre, "precio": p.precio, "descripcion": p.descripcion}
            for p in planes
        ]
        return jsonify(planes_data), 200
    except Exception as e:
        print(f"Error al obtener planes: {e}")
        return jsonify({"error": "Error interno del servidor al obtener planes"}), 500

@app.route('/api/planes', methods=['POST'])
def add_plan():
    data = request.get_json()
    if not data or not all(key in data for key in ['nombre', 'precio']):
        return jsonify({"error": "Faltan datos de nombre o precio"}), 400
    
    try:
        existing_plan = Plan.query.filter_by(nombre=data['nombre']).first()
        if existing_plan:
            return jsonify({"error": f"El plan '{data['nombre']}' ya existe"}), 409

        new_plan = Plan(
            nombre=data['nombre'],
            precio=float(data['precio']),
            descripcion=data.get('descripcion', '')
        )
        db.session.add(new_plan)
        db.session.commit()
        return jsonify({
            "message": "Plan añadido exitosamente",
            "plan": {"id": new_plan.id, "nombre": new_plan.nombre, "precio": new_plan.precio, "descripcion": new_plan.descripcion}
        }), 201
    except ValueError:
        return jsonify({"error": "El precio debe ser un número válido"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error al añadir plan: {e}")
        return jsonify({"error": "Error interno del servidor al añadir plan"}), 500


# --- ENDPOINTS PARA LAS FUNCIONES ADICIONALES ---
@app.route('/api/features', methods=['GET'])
def get_features():
    try:
        features = Feature.query.order_by(Feature.id).all()
        features_data = [
            {"id": f.id, "nombre": f.nombre, "precio": f.precio, "descripcion": f.descripcion}
            for f in features
        ]
        return jsonify(features_data), 200
    except Exception as e:
        print(f"Error al obtener funciones: {e}")
        return jsonify({"error": "Error interno del servidor al obtener funciones"}), 500

@app.route('/api/features', methods=['POST'])
def add_feature():
    data = request.get_json()
    if not data or not all(key in data for key in ['nombre', 'precio']):
        return jsonify({"error": "Faltan datos de nombre o precio"}), 400
    
    try:
        existing_feature = Feature.query.filter_by(nombre=data['nombre']).first()
        if existing_feature:
            return jsonify({"error": f"La función '{data['nombre']}' ya existe"}), 409

        new_feature = Feature(
            nombre=data['nombre'],
            precio=float(data['precio']),
            descripcion=data.get('descripcion', '')
        )
        db.session.add(new_feature)
        db.session.commit()
        return jsonify({
            "message": "Función añadida exitosamente",
            "feature": {"id": new_feature.id, "nombre": new_feature.nombre, "precio": new_feature.precio, "descripcion": new_feature.descripcion}
        }), 201
    except ValueError:
        return jsonify({"error": "El precio debe ser un número válido"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error al añadir función: {e}")
        return jsonify({"error": "Error interno del servidor al añadir función"}), 500

# Endpoint para ver todas las consultas de contacto guardadas
@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    try:
        submissions = ContactSubmission.query.order_by(ContactSubmission.timestamp.desc()).all()
        submissions_data = [sub.to_dict() for sub in submissions]
        return jsonify(submissions_data), 200
    except Exception as e:
        print(f"Error al obtener consultas: {e}")
        return jsonify({"error": "Error interno del servidor al obtener consultas"}), 500


# --- NUEVOS ENDPOINTS PARA LA INTEGRACIÓN DE PAGOS CON STRIPE ---
@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No se recibieron datos para la sesión de pago"}), 400

    plan_nombre = data.get('plan')
    selected_features_ids = data.get('selectedFeaturesIds', []) 
    cliente_email = data.get('email', 'cliente@ejemplo.com')
    cliente_nombre = data.get('name', 'Cliente IABOT')

    if not plan_nombre:
        return jsonify({"error": "Plan no especificado para la sesión de pago"}), 400

    line_items = []
    total_amount_calculated = 0

    try:
        plan_obj = Plan.query.filter_by(nombre=plan_nombre).first()
        if not plan_obj:
            return jsonify({"error": f"Plan '{plan_nombre}' no encontrado"}), 404
        
        line_items.append({
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': plan_obj.nombre,
                    'description': f"Plan base: {plan_obj.nombre}",
                    'images': ['https://placehold.co/100x100/0f2027/4cc9f0?text=Plan']
                },
                'unit_amount': int(plan_obj.precio * 100),
            },
            'quantity': 1,
        })
        total_amount_calculated += plan_obj.precio

        for feature_id in selected_features_ids:
            feature_obj = Feature.query.get(feature_id)
            if feature_obj:
                line_items.append({
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': feature_obj.nombre,
                            'description': f"Función adicional: {feature_obj.nombre}",
                            'images': ['https://placehold.co/100x100/0f2027/4cc9f0?text=Addon']
                        },
                        'unit_amount': int(feature_obj.precio * 100),
                    },
                    'quantity': 1,
                })
                total_amount_calculated += feature_obj.precio
            else:
                print(f"ADVERTENCIA: Función con ID {feature_id} no encontrada en la base de datos. Se omitirá.")

        if not line_items:
            return jsonify({"error": "No se encontraron ítems válidos para la compra."}), 400

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'], 
            line_items=line_items,
            mode='payment',
            success_url=request.url_root + 'success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.url_root + 'cancel',
            customer_email=cliente_email, 
            metadata={
                'plan_nombre': plan_nombre,
                'cliente_nombre': cliente_nombre,
                'cliente_email': cliente_email,
                'precio_calculado_backend': f"{total_amount_calculated:.2f}"
            }
        )
        return jsonify({'id': checkout_session.id})

    except stripe.error.StripeError as e:
        print(f"Error de Stripe al crear sesión: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Error inesperado al crear sesión de pago: {e}")
        return jsonify({'error': 'Error interno del servidor al crear sesión de pago'}), 500

@app.route('/success')
def success():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/cancel')
def cancel():
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    with app.app_context():
        db.create_all() 

        if Plan.query.count() == 0:
            print("No se encontraron planes. Insertando planes iniciales...")
            plan_basico = Plan(
                nombre="Básico",
                precio=100.00,
                descripcion=(
                    "Bot web básico\n"
                    "- 50 conversaciones/mes\n"
                    "- Soporte por email\n"
                    "- Implementación rápida"
                )
            )
            plan_avanzado = Plan(
                nombre="Avanzado",
                precio=300.00,
                descripcion=(
                    "Multicanal + alertas\n"
                    "- 500 conversaciones/mes\n"
                    "- Integración WhatsApp/Telegram\n"
                    "- Alertas por email/SMS\n"
                    "- Reportes avanzados\n"
                    "- Acceso API básico"
                )
            )
            plan_premium = Plan(
                nombre="Premium",
                precio=500.00,
                descripcion=(
                    "Bot IA + soporte + tickets\n"
                    "- Conversaciones ilimitadas\n"
                    "- Integración con IA generativa (OpenAI/Gemini)\n"
                    "- Soporte 24/7 y SLA\n"
                    "- Sistema de tickets dedicado\n"
                    "- Personalización a medida del bot\n"
                    "- Agentes humanos ilimitados"
                )
            )
            db.session.add_all([plan_basico, plan_avanzado, plan_premium])
            db.session.commit()
            print("Planes iniciales añadidos a la base de datos.")
        else:
            print("La base de datos ya contiene planes. No se insertan planes iniciales.")

        if Feature.query.count() == 0:
            print("No se encontraron funciones adicionales. Insertando funciones iniciales...")
            feature_whatsapp = Feature(nombre="Integración WhatsApp", precio=50.00, descripcion="Permite al bot operar en WhatsApp.")
            feature_telegram = Feature(nombre="Integración Telegram", precio=30.00, descripcion="Extiende el bot a Telegram.")
            feature_alerts_sms = Feature(nombre="Alertas SMS", precio=20.00, descripcion="Notificaciones importantes por SMS.")
            feature_agents = Feature(nombre="Agentes Humanos (extra)", precio=100.00, descripcion="Soporte para transferencia a agentes humanos (por 5 agentes).")
            feature_custom_reports = Feature(nombre="Reportes Personalizados", precio=75.00, descripcion="Generación de reportes a medida de tus KPIs.")
            
            db.session.add_all([
                feature_whatsapp,
                feature_telegram,
                feature_alerts_sms,
                feature_agents,
                feature_custom_reports
            ])
            db.session.commit()
            print("Funciones adicionales iniciales añadidas a la base de datos.")
        else:
            print("La base de datos ya contiene funciones adicionales. No se insertan funciones iniciales.")

    app.run(port=3000, debug=True)